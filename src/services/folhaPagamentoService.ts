import { supabase } from '@/integrations/supabase/client';
import { CalculoResultado } from '@/utils/folhaCalc';

async function sha256Hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
export interface HoleriteData extends CalculoResultado {
  colaboradorNome: string;
  cpf: string;
  cargo: string;
  dataAdmissao: string;
  competencia: string;
  empresaNome: string;
  cnpj: string;
  assinado: boolean;
  hashAssinatura?: string;
  dataAssinatura?: string;
}

export const folhaPagamentoService = {
  /**
   * Gera os dados para um holerite (contracheque)
   */
  gerarDadosHolerite: async (folhaId: string, colaboradorId: string): Promise<HoleriteData> => {
    try {
      const { data: item, error: itemError } = await supabase
        .from('folha_itens')
        .select('*, colaborador:colaboradores(*), folha:folhas_pagamento(*)')
        .eq('folha_id', folhaId)
        .eq('colaborador_id', colaboradorId)
        .single();

      if (itemError || !item) {
        throw new Error('Dados da folha não encontrados');
      }

      const folhaHeader = item.folha as any;
      
      const { data: emp } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', folhaHeader.empresa_id)
        .single();

      const colab = item.colaborador as any;
      const detalhes = item.detalhes as any;

      const { data: holerite } = await supabase
        .from('holerites')
        .select('*')
        .eq('folha_id', folhaId)
        .eq('colaborador_id', colaboradorId)
        .maybeSingle();

      return ({
        proventos: item.total_proventos || 0,
        descontos: item.total_descontos || 0,
        liquido: item.total_liquido || 0,
        inss: item.inss_mes || 0,
        irrf: item.irrf_mes || 0,
        fgts: item.fgts_mes || 0,
        horasExtras: detalhes?.horasExtras || 0,
        dsr: detalhes?.dsr || 0,
        decimoTerceiro: detalhes?.decimoTerceiro || 0,
        faixaInss: detalhes?.faixaInss || '',
        faixaIrrf: detalhes?.faixaIrrf || '',
        detalheEventos: detalhes?.detalheEventos || [],
        colaboradorNome: colab.nome_completo,
        cpf: colab.cpf,
        cargo: colab.cargo || 'Não informado',
        dataAdmissao: colab.data_admissao,
        competencia: folhaHeader.competencia,
        empresaNome: emp?.razao_social || 'N/A',
        cnpj: emp?.cnpj || 'N/A',
        assinado: holerite?.assinado || false,
        hashAssinatura: holerite?.hash_assinatura ?? undefined,
        dataAssinatura: holerite?.data_assinatura ?? undefined
      });
    } catch (e: any) {
      throw new Error(e.message || 'Falha ao gerar holerite', { cause: e });
    }
  },

  /**
   * Assina digitalmente um holerite
   */
  assinarHolerite: async (folhaId: string, colaboradorId: string): Promise<string> => {
    try {
      const hash = await sha256Hex(`assinatura-${folhaId}-${colaboradorId}-${new Date().toISOString()}`);
      
      const { data: colab } = await supabase
        .from('colaboradores')
        .select('nome_completo, cpf, cargo')
        .eq('id', colaboradorId)
        .single();

      const { error } = await supabase
        .from('holerites')
        .upsert({
          folha_id: folhaId,
          colaborador_id: colaboradorId,
          colaborador_nome: colab?.nome_completo || 'N/A',
          colaborador_cpf: colab?.cpf || 'N/A',
          colaborador_cargo: colab?.cargo || 'N/A',
          hash_assinatura: hash,
          data_assinatura: new Date().toISOString(),
          assinado: true
        } as any);

      if (error) throw error;
      return (hash);
    } catch (e: any) {
      throw new Error('Falha ao assinar holerite digitalmente', { cause: e });
    }
  },

  /**
   * Finaliza e fecha a folha de competência.
   *
   * Locking otimista: lê `version` + `empresa_id` da folha, delega o fechamento
   * autoritativo à edge function `fechar-folha` (que executa
   * `UPDATE ... WHERE version=X AND status='aberta'`). Se outro processo
   * alterou a folha entre a leitura e o UPDATE, a edge function retorna
   * `VERSION_CONFLICT` e o erro é propagado — a UI deve recarregar e reexibir
   * ao usuário. Nenhum retry silencioso: fechamento duplicado é intolerável.
   */
  fecharFolha: async (
    folhaId: string,
    opts?: { observacoes?: string },
  ): Promise<{ success: boolean; version: number; audit_hash: string; warnings: string[] }> => {
    try {
      const { validadorFolha } = await import('@/utils/folha/validadorFolha');
      const alertas = await validadorFolha.validarFolha(folhaId);
      const alertasCriticos = alertas.filter((a) => a.gravidade === 'alta');
      if (alertasCriticos.length > 0) {
        throw new Error(
          `Não é possível fechar a folha: existem ${alertasCriticos.length} alertas críticos.`,
        );
      }

      // 1) Snapshot de version + empresa_id (necessário para optimistic lock)
      const { data: folha, error: folhaErr } = await supabase
        .from('folhas_pagamento')
        .select('version, empresa_id, status')
        .eq('id', folhaId)
        .maybeSingle();

      if (folhaErr) throw folhaErr;
      if (!folha) throw new Error('Folha não encontrada');
      if (folha.status !== 'aberta') {
        throw new Error(`Folha não está aberta (status: ${folha.status})`);
      }

      // 2) Delega para edge function autoritativa (locking + integridade + auditoria)
      const { data, error } = await supabase.functions.invoke('fechar-folha', {
        body: {
          empresaId: folha.empresa_id,
          folhaId,
          version: folha.version ?? 1,
          ...(opts?.observacoes ? { observacoes: opts.observacoes } : {}),
        },
      });

      if (error) {
        const msg = (error as { message?: string })?.message
          ?? (data as { error?: { message?: string } })?.error?.message
          ?? 'Falha ao fechar folha';
        throw new Error(msg);
      }

      const payload = data as { ok?: boolean; version?: number; audit_hash?: string; warnings?: string[] };
      if (!payload?.ok) throw new Error('Resposta inválida do servidor');

      return {
        success: true,
        version: payload.version ?? (folha.version ?? 1) + 1,
        audit_hash: payload.audit_hash ?? '',
        warnings: payload.warnings ?? [],
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro crítico ao fechar folha';
      throw new Error(msg, { cause: e });
    }
  },

  /**
   * Reabre uma folha fechada com locking otimista + auditoria bloqueante.
   *
   * Requer `motivo` (10..500 chars). Se a folha já foi transmitida ao eSocial,
   * exige `override_esocial=true` + role admin. Se fechada há mais de 90 dias,
   * também exige role admin (janela de auditoria contábil).
   */
  reabrirFolha: async (
    folhaId: string,
    motivo: string,
    opts?: { override_esocial?: boolean },
  ): Promise<{ success: boolean; version: number; audit_hash: string }> => {
    try {
      const { data: folha, error: folhaErr } = await supabase
        .from('folhas_pagamento')
        .select('version, empresa_id, status')
        .eq('id', folhaId)
        .maybeSingle();

      if (folhaErr) throw folhaErr;
      if (!folha) throw new Error('Folha não encontrada');
      if (folha.status !== 'fechada') {
        throw new Error(`Folha não está fechada (status: ${folha.status})`);
      }

      const { data, error } = await supabase.functions.invoke('reabrir-folha', {
        body: {
          empresaId: folha.empresa_id,
          folhaId,
          version: folha.version ?? 1,
          motivo,
          override_esocial: opts?.override_esocial ?? false,
        },
      });

      if (error) {
        const msg = (error as { message?: string })?.message
          ?? (data as { error?: { message?: string } })?.error?.message
          ?? 'Falha ao reabrir folha';
        throw new Error(msg);
      }

      const payload = data as { ok?: boolean; version?: number; audit_hash?: string };
      if (!payload?.ok) throw new Error('Resposta inválida do servidor');

      return {
        success: true,
        version: payload.version ?? (folha.version ?? 1) + 1,
        audit_hash: payload.audit_hash ?? '',
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro crítico ao reabrir folha';
      throw new Error(msg, { cause: e });
    }
  },

  emitirPDF: async (folhaId: string): Promise<string> => {
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    return `https://storage.lovable.dev/holerites/holerite_${folhaId}.pdf`;
  
  }
};
