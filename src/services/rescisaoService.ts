import { supabase } from '@/integrations/supabase/client';
import { calcularRescisao } from '@/utils/rescisaoCalc';
import { auditLogger } from '@/utils/auditLogger';
import { loggerService } from './loggerService';
import type { Tables } from '@/integrations/supabase/database.types';

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Ordem lógica das etapas para validação
const ORDEM_ETAPAS = ['comunicacao', 'documentacao', 'calculo', 'homologacao', 'pagamento', 'finalizado'];

export interface CalcularRescisaoParams {
  salario_base?: number;
  data_admissao?: string;
  data_desligamento?: string;
  tipo?: string;
  aviso_trabalhado?: boolean;
  ferias_vencidas?: boolean;
  saldo_fgts?: number;
}

export const rescisaoService = {
  async validarTransicao(id: string, novaEtapa: string, empresaId: string): Promise<boolean> {
    try {
      const { data: atual, error } = await supabase
        .from('desligamentos')
        .select('etapa, status')
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .single();

      if (error) throw new Error('Erro ao buscar dados do desligamento');

      const indexAtual = ORDEM_ETAPAS.indexOf(atual.etapa || 'comunicacao');
      const indexNova = ORDEM_ETAPAS.indexOf(novaEtapa);

      if (indexNova > indexAtual + 1) {
        throw new Error(
          `Transição bloqueada: Você deve concluir a etapa '${ORDEM_ETAPAS[indexAtual]}' e passar por '${ORDEM_ETAPAS[indexAtual + 1]}' antes de chegar em '${novaEtapa}'.`
        );
      }

      if (novaEtapa === 'homologacao' && atual.status !== 'calculado') {
        throw new Error('A rescisão precisa estar com status "calculado" para prosseguir para a homologação.');
      }

      return true;
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'Erro inesperado na validação de transição', { cause: e });
    }
  },

  async calcularESalvar(
    id: string,
    params: CalcularRescisaoParams,
    empresaId: string
  ): Promise<Tables<'desligamentos'>> {
    if (!id) throw new Error('ID do desligamento é obrigatório');
    if (!empresaId) throw new Error('empresa_id é obrigatório');

    try {
      // `colaboradores` não tem `nome` (é `nome_completo`) nem `dependentes_irrf`
      // (aposentado há tempo em favor de `dependentes.para_irrf`, mesmo caso do
      // calcular-folha Edge Function). O embed anterior pedia as duas colunas
      // inexistentes: sob `any` isso compilava, mas o PostgREST recusaria a
      // query inteira em runtime, quebrando 100% das tentativas de calcular
      // uma rescisão pela UI (chamador real: DesligamentoDetailSheet.tsx).
      const { data: anterior, error: fetchError } = await supabase
        .from('desligamentos')
        .select('*, colaborador:colaboradores!desligamentos_colaborador_id_fkey(data_admissao)')
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .single();

      if (fetchError) throw fetchError;

      await this.validarTransicao(id, 'calculo', empresaId);

      const { data: depsRows, error: depsError } = await supabase
        .from('dependentes')
        .select('id')
        .eq('colaborador_id', anterior.colaborador_id)
        .eq('para_irrf', true);
      if (depsError) throw depsError;
      const dependentesIRRF = depsRows?.length ?? 0;

      const result = await calcularRescisao({
        salario: params.salario_base ?? anterior.salario_base,
        dataAdmissao: anterior.colaborador?.data_admissao || params.data_admissao || '',
        dataDesligamento: params.data_desligamento || anterior.data_desligamento,
        tipo: params.tipo || anterior.tipo,
        avisoTrabalhado: params.aviso_trabalhado ?? false,
        feriasVencidas: params.ferias_vencidas ?? false,
        saldoFGTS: params.saldo_fgts ?? 0,
        dependentes: dependentesIRRF,
      });
      const resultado = result;

      // SCHEMA GAP (achado ao remover `any` desta função, não corrigido aqui):
      // `desligamentos` não tem coluna `detalhes_calculo`, mas
      // DesligamentoDetailSheet.tsx:205 lê `d.detalhes_calculo || d` para
      // montar o PDF da rescisão — ou seja, o código em dois lugares assume
      // uma coluna que nunca existiu. Sob `any`, este `.update()` incluía
      // `detalhes_calculo` no MESMO payload que os campos reais
      // (saldo_salario, decimo_terceiro, ...): o PostgREST rejeita o UPDATE
      // INTEIRO por uma chave inválida, então `calcularESalvar` sempre
      // lançava aqui — nenhuma rescisão jamais foi salva com sucesso por
      // este caminho. Removido do payload para o salvamento funcionar; os
      // valores decompostos abaixo já são a fonte de verdade persistida.
      // O fallback `|| d` do PDF passa a usar sempre a linha crua (campos
      // snake_case, não o formato de RescisaoResult) — comportamento
      // pré-existente, não alterado aqui. Requer migration própria
      // (`ALTER TABLE desligamentos ADD COLUMN detalhes_calculo jsonb`) se o
      // JSON completo for realmente necessário.
      const dadosAtualizados: Partial<Tables<'desligamentos'>> = {
        saldo_salario: resultado.saldoSalario,
        decimo_terceiro: resultado.decimoTerceiro,
        ferias_proporcionais: resultado.feriasProporcionais,
        ferias_vencidas: resultado.feriasVencidas,
        terco_constitucional: resultado.tercoFerias,
        aviso_previo: resultado.avisoIndenizado,
        multa_fgts: resultado.multaFGTS,
        total_proventos: resultado.totalProventos,
        total_descontos: resultado.totalDescontos,
        valor_liquido: resultado.totalLiquido,
        status: 'calculado',
        etapa: 'homologacao',
        checklist_calculo_rescisao: true,
      };

      const { data: novo, error: updateError } = await supabase
        .from('desligamentos')
        .update(dadosAtualizados)
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .select()
        .single();

      if (updateError) throw updateError;

      await auditLogger.log({
        tabela: 'desligamentos',
        registro_id: id,
        acao: 'EXECUTE_CALC',
        empresa_id: empresaId,
        dados_anteriores: { etapa: anterior.etapa, status: anterior.status },
        dados_novos: {
          etapa: novo.etapa,
          status: novo.status,
          valor_liquido: novo.valor_liquido,
          hash_integridade: await sha256Hex(JSON.stringify(resultado)),
        },
      });

      return novo;
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'Erro crítico ao processar cálculo de rescisão', { cause: e });
    }
  },

  async homologar(
    id: string,
    empresaId: string,
    etapa: 'rh' | 'financeiro' | 'juridico' | 'colaborador' = 'rh',
    parecer?: string
  ): Promise<Tables<'desligamentos'>> {
    if (!empresaId) throw new Error('empresa_id é obrigatório');
    try {
      const { data: d, error: fetchError } = await supabase
        .from('desligamentos')
        .select('valor_liquido, etapa, checklist_calculo_rescisao, status')
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .single();

      if (fetchError) throw fetchError;
      if (!d.valor_liquido || !d.checklist_calculo_rescisao) {
        throw new Error('A homologação exige que o cálculo da rescisão tenha sido realizado e salvo primeiro.');
      }

      const { data: userData } = await supabase.auth.getUser();
      const { error: homError } = await supabase.from('homologacoes_rescisao').upsert(
        {
          desligamento_id: id,
          etapa,
          status: 'aprovado',
          parecer,
          usuario_id: userData?.user?.id,
          data_decisao: new Date().toISOString(),
        },
        { onConflict: 'desligamento_id,etapa' }
      );

      if (homError) throw homError;

      const proximaEtapa =
        etapa === 'rh'
          ? 'financeiro'
          : etapa === 'financeiro'
            ? 'juridico'
            : etapa === 'juridico'
              ? 'colaborador'
              : 'finalizado';
      const novoStatus = proximaEtapa === 'finalizado' ? 'homologado' : 'em_homologacao';

      const { data, error } = await supabase
        .from('desligamentos')
        .update({
          status: novoStatus,
          etapa: proximaEtapa === 'finalizado' ? 'pagamento' : 'homologacao',
          checklist_homologacao: proximaEtapa === 'finalizado',
        })
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .select()
        .single();

      if (error) throw error;

      await auditLogger.log({
        tabela: 'desligamentos',
        registro_id: id,
        acao: 'UPDATE',
        empresa_id: empresaId,
        dados_novos: {
          status: novoStatus,
          etapa: proximaEtapa,
          evento: 'HOMOLOGACAO_PARCIAL',
          etapa_concluida: etapa,
          timestamp: new Date().toISOString(),
        },
      });

      return data;
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'Erro ao processar homologação', { cause: e });
    }
  },

  async assinarDigitalmente(id: string, tipo: 'empresa' | 'colaborador', empresaId?: string): Promise<boolean> {
    try {
      // Delegado à RPC assinar_desligamento (SECURITY DEFINER):
      // - hash SHA-256 é calculado server-side (trigger bloqueia escrita direta);
      // - a RPC valida is_admin, status válido e dupla-assinatura.
      const { data, error } = await supabase.rpc('assinar_desligamento', {
        _desligamento_id: id,
        _parte: tipo,
      });
      // Normaliza o PostgrestError em Error nativo — objetos crus viram "[object Object]"
      // na UI e escondem a regra de negócio violada no servidor.
      if (error) throw new Error(error.message || 'Falha ao assinar digitalmente o desligamento');

      await auditLogger.log({
        tabela: 'desligamentos',
        registro_id: id,
        acao: 'SIGN',
        empresa_id: empresaId,
        dados_novos: { tipo_assinatura: tipo },
      });

      return data;
    } catch (e: unknown) {
      if (e instanceof Error) throw e;
      throw new Error(String(e), { cause: e });
    }
  },

  // `comprovanteUrl` nunca foi persistido pela versão anterior desta função
  // (parâmetro aceito e nunca lido); preservado assim deliberadamente — não é
  // escopo desta limpeza de tipos decidir se isso é um bug.
  async processarPagamento(id: string, empresaId: string, comprovanteUrl?: string): Promise<Tables<'desligamentos'>> {
    void comprovanteUrl;
    if (!empresaId) throw new Error('empresa_id é obrigatório');
    try {
      const { data: d, error: fetchError } = await supabase
        .from('desligamentos')
        .select(
          'colaborador_id, data_desligamento, valor_liquido, assinado_empresa, assinado_colaborador, checklist_homologacao'
        )
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .single();

      if (fetchError) throw fetchError;
      if (!d.assinado_empresa || !d.assinado_colaborador) {
        throw new Error(
          'Pagamento bloqueado: rescisão deve ser assinada pela empresa e pelo colaborador antes do pagamento.'
        );
      }
      if (!d.checklist_homologacao) {
        throw new Error('Pagamento bloqueado: homologação não foi concluída.');
      }

      const { data, error } = await supabase
        .from('desligamentos')
        .update({
          status: 'pago',
          etapa: 'finalizado',
          checklist_pagamento: true,
          data_pagamento: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('empresa_id', empresaId)
        .select()
        .single();

      if (error) throw error;

      const { error: colabError } = await supabase
        .from('colaboradores')
        .update({
          status: 'desligado',
          data_desligamento: d.data_desligamento,
        })
        .eq('id', d.colaborador_id)
        .eq('empresa_id', empresaId);

      if (colabError)
        loggerService.error(
          'Erro ao desativar colaborador',
          { colaboradorId: d.colaborador_id, desligamentoId: id },
          colabError
        );

      await auditLogger.log({
        tabela: 'desligamentos',
        registro_id: id,
        acao: 'UPDATE',
        empresa_id: empresaId,
        dados_novos: { status: 'pago', etapa: 'concluido', colaborador_desativado: true },
      });

      return data;
    } catch (e: unknown) {
      if (e instanceof Error) throw e;
      throw new Error(String(e), { cause: e });
    }
  },
};
