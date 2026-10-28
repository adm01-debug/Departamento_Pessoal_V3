import { supabase, type QueryBuilderType } from '@/integrations/supabase/client';
import type { Json, TablesInsert } from '@/integrations/supabase/types';
import { folhaCalc } from '@/utils/folhaCalc';
import { SALARIO_FAMILIA_TETO, SALARIO_FAMILIA_VALOR } from '@/calculators/tabelas';
import { toast } from 'sonner';
import { pontoIntegracaoUtils } from '@/utils/folha/pontoIntegracaoUtils';
import { safeErrorMessage } from '@/utils/safeError';
import { formatDateLocalISO } from '@/utils/dateLocal';
import { loggerService } from '../loggerService';
import { folhaSchema } from '@/schemas/folha';
import { validateInput, validateTablePayload } from '@/schemas/validate';

export interface BatchProgress {
  total: number;
  current: number;
  success: number;
  errors: number;
}

interface EventoFolha {
  codigo: string;
  descricao: string;
  tipo: 'provento' | 'desconto';
  valor: number;
}

interface ColaboradorFolha {
  id: string;
  nome_completo: string;
  salario_base: number | null;
  jornada_horas_mensais?: string | null;
  tipo_contrato?: string | null;
  dependentes?: Array<{ id: string; para_irrf?: boolean | null; para_salario_familia?: boolean | null }> | null;
}

export const COLABORADOR_FOLHA_SELECT = `
  *,
  dependentes (id, para_irrf, para_salario_familia)
`;

// Código, descrição e natureza do evento vêm da rubrica, não do lançamento.
export const EVENTO_VARIAVEL_SELECT = 'colaborador_id, valor, rubrica:rubricas_folha(codigo, descricao, tipo)';

interface EventoVariavelRow {
  colaborador_id: string;
  valor: number | string;
  rubrica: { codigo: string; descricao: string; tipo: string } | null;
}

interface BeneficioVinculo {
  valor: number;
  desconto: number | null;
  beneficio: { codigo?: string; nome: string } | null;
}

interface PensaoRow {
  colaborador_id: string;
  percentual: number | string | null;
  valor_fixo: number | string | null;
  beneficiario: string | null;
}

interface ConsignadoRow {
  colaborador_id: string;
  valor_parcela: number | string | null;
  numero_parcelas: number | null;
  parcelas_pagas: number | null;
  instituicao_financeira: string | null;
}

interface AdiantamentoRow {
  colaborador_id: string;
  valor_solicitado: number | string | null;
}

export const calculoLoteService = {
  /**
   * Processa a folha de pagamento de todos os colaboradores ativos de uma empresa
   */
  processarLote: async (empresaId: string, competencia: string, onProgress?: (progress: BatchProgress) => void) => {
    try {
      const [ano, mes] = competencia.split('-');
      const dataInicio = `${ano}-${mes}-01`;
      const dataFim = formatDateLocalISO(new Date(Number(ano), Number(mes), 0));

      // 1. Buscar colaboradores ativos da empresa
      const { data: colaboradoresData, error: colabError } = await (
        supabase.from('colaboradores') as unknown as QueryBuilderType
      )
        .select(COLABORADOR_FOLHA_SELECT)
        .eq('empresa_id', empresaId)
        .eq('status', 'ativo');

      if (colabError) throw colabError;
      const colaboradores = (colaboradoresData ?? []) as unknown as ColaboradorFolha[];
      if (colaboradores.length === 0) {
        throw new Error('Nenhum colaborador ativo encontrado para esta empresa.');
      }

      // 2. Garantir cabeçalho da folha
      const { data: header, error: headerError } = await supabase
        .from('folhas_pagamento')
        .select('id, status')
        .eq('empresa_id', empresaId)
        .eq('competencia', competencia)
        .eq('tipo', 'mensal')
        .maybeSingle();

      if (headerError) throw headerError;

      if (header && header.status === 'fechada') {
        throw new Error('A folha desta competência já está fechada e não pode ser recalculada.');
      }

      let folhaId = header?.id;
      if (!folhaId) {
        validateInput(
          folhaSchema,
          { empresa_id: empresaId, competencia, status: 'aberta', tipo: 'mensal' },
          'folhaPagamento.criar'
        );
        const { data: newHeader, error: createError } = await supabase
          .from('folhas_pagamento')
          .insert(
            validateTablePayload(
              'folhas_pagamento',
              {
                empresa_id: empresaId,
                competencia,
                status: 'aberta',
                tipo: 'mensal',
              },
              'calculoLoteService:folhas_pagamento'
            )
          )
          .select('id')
          .single();

        if (createError) throw createError;
        folhaId = newHeader.id;
      }

      // 2.1 Eventos variáveis da competência. A geração automática de férias
      // grava a competência como data (YYYY-MM-01); o lançamento manual, YYYY-MM.
      const { data: eventosData, error: eventosError } = await (
        supabase.from('eventos_variaveis') as unknown as QueryBuilderType
      )
        .select(EVENTO_VARIAVEL_SELECT)
        .eq('empresa_id', empresaId)
        .in('competencia', [competencia, dataInicio]);

      if (eventosError) throw eventosError;
      const eventosPorColaborador = new Map<string, EventoFolha[]>();

      // DSR real da competência: domingos + feriados (empresa ou nacionais)
      // dentro do mês — antes era a constante 26/4 para qualquer mês.
      // Sem .or(): o bridge não aceita — filtra empresa/global no cliente.
      const { data: feriadosMes } = await supabase
        .from('feriados')
        .select('data, empresa_id')
        .gte('data', dataInicio)
        .lte('data', dataFim);
      const diasNoMes = Number(dataFim.slice(8, 10));
      // Set único de datas DSR — feriado em domingo conta uma vez só.
      const dsrDatas = new Set<string>(
        (feriadosMes ?? []).filter((f) => f.empresa_id === null || f.empresa_id === empresaId).map((f) => f.data)
      );
      for (let d = 1; d <= diasNoMes; d++) {
        const dt = new Date(Number(ano), Number(mes) - 1, d);
        if (dt.getDay() === 0) dsrDatas.add(formatDateLocalISO(dt));
      }
      const domingosFeriados = dsrDatas.size;
      const diasUteis = Math.max(0, diasNoMes - domingosFeriados);
      for (const ev of (eventosData ?? []) as unknown as EventoVariavelRow[]) {
        const tipo = ev.rubrica?.tipo;
        if (!ev.rubrica || (tipo !== 'provento' && tipo !== 'desconto')) continue;
        const lista = eventosPorColaborador.get(ev.colaborador_id) ?? [];
        lista.push({ codigo: ev.rubrica.codigo, descricao: ev.rubrica.descricao, tipo, valor: Number(ev.valor) });
        eventosPorColaborador.set(ev.colaborador_id, lista);
      }

      // Cadastros que alimentam o cálculo (pensão, consignado e adiantamento
      // aprovado na competência) — mesma ponte da edge calcular-folha.
      const { data: pensoesRows } = await (supabase.from('pensoes') as unknown as QueryBuilderType)
        .select('colaborador_id, percentual, valor_fixo, beneficiario')
        .eq('empresa_id', empresaId)
        .eq('ativo', true);
      const pensoesPorColaborador = new Map<string, PensaoRow[]>();
      for (const p of (pensoesRows ?? []) as unknown as PensaoRow[]) {
        const lista = pensoesPorColaborador.get(p.colaborador_id) ?? [];
        lista.push(p);
        pensoesPorColaborador.set(p.colaborador_id, lista);
      }
      const { data: consignadosRows } = await (supabase.from('emprestimos_consignados') as unknown as QueryBuilderType)
        .select('colaborador_id, valor_parcela, numero_parcelas, parcelas_pagas, instituicao_financeira')
        .eq('empresa_id', empresaId)
        .eq('status', 'ativo');
      const consignadosPorColaborador = new Map<string, ConsignadoRow[]>();
      for (const e of (consignadosRows ?? []) as unknown as ConsignadoRow[]) {
        if ((e.parcelas_pagas ?? 0) >= (e.numero_parcelas ?? 0)) continue;
        const lista = consignadosPorColaborador.get(e.colaborador_id) ?? [];
        lista.push(e);
        consignadosPorColaborador.set(e.colaborador_id, lista);
      }
      const { data: adiantamentosRows } = await (
        supabase.from('adiantamentos_salariais') as unknown as QueryBuilderType
      )
        .select('colaborador_id, valor_solicitado')
        .eq('empresa_id', empresaId)
        .eq('status', 'aprovado')
        .eq('competencia_desconto', competencia);
      const adiantamentosPorColaborador = new Map<string, AdiantamentoRow[]>();
      for (const a of (adiantamentosRows ?? []) as unknown as AdiantamentoRow[]) {
        const lista = adiantamentosPorColaborador.get(a.colaborador_id) ?? [];
        lista.push(a);
        adiantamentosPorColaborador.set(a.colaborador_id, lista);
      }

      const progress: BatchProgress = {
        total: colaboradores.length,
        current: 0,
        success: 0,
        errors: 0,
      };

      // 3. Processar cada colaborador
      for (const colab of colaboradores) {
        try {
          const dependentesCount = colab.dependentes?.filter((d) => d.para_irrf === true).length || 0;
          const eventosVariaveis = eventosPorColaborador.get(colab.id) ?? [];
          const jornadaInformada = Number(colab.jornada_horas_mensais);
          const jornada = Number.isFinite(jornadaInformada) && jornadaInformada > 0 ? jornadaInformada : 220;

          // 3.1 Integrar dados de PONTO ELETRÔNICO (Horas Extras e Faltas Aprovadas)
          const { data: registrosPonto } = await supabase
            .from('registros_ponto')
            .select('horas_extras, horas_extras_50, horas_extras_100, horas_noturnas, he_banco_horas, horas_falta')
            .eq('colaborador_id', colab.id)
            .eq('aprovado', true)
            .gte('data', dataInicio)
            .lte('data', dataFim);

          let totalHE = 0;
          let totalHE100 = 0;
          let totalNoturno = 0;
          let totalFaltas = 0;

          if (registrosPonto) {
            registrosPonto.forEach((r) => {
              // Legado = colunas novas NULL (escritas antes da onda 5): o total
              // vira HE 50% como antes. Registro novo sempre grava '00:00' nas
              // parcelas — zero explícito NÃO é legado; se fosse, horas já
              // enviadas ao banco seriam pagas de novo via horas_extras.
              const legado = r.horas_extras_50 === null && r.horas_extras_100 === null && r.he_banco_horas === null;
              if (legado) {
                totalHE += pontoIntegracaoUtils.intervalToDecimal(r.horas_extras);
              } else {
                totalHE += pontoIntegracaoUtils.intervalToDecimal(r.horas_extras_50);
                totalHE100 += pontoIntegracaoUtils.intervalToDecimal(r.horas_extras_100);
              }
              totalNoturno += pontoIntegracaoUtils.intervalToDecimal(r.horas_noturnas);
              totalFaltas += pontoIntegracaoUtils.intervalToDecimal(r.horas_falta);
            });
          }

          // 3.2 Buscar Benefícios Ativos (Vale Transporte / Vale Alimentação / Refeição)
          // Tenta na tabela unificada 'beneficios_colaborador'
          const { data: beneficiosVinculosData } = await supabase
            .from('beneficios_colaborador')
            .select(
              `
              *,
              beneficio:tipos_beneficio(*)
            `
            )
            .eq('colaborador_id', colab.id)
            .eq('ativo', true);

          const beneficiosVinculos = (beneficiosVinculosData ?? []) as unknown as BeneficioVinculo[];
          const beneficiosEventos: EventoFolha[] = [];
          if (beneficiosVinculos && beneficiosVinculos.length > 0) {
            beneficiosVinculos.forEach((v) => {
              if (v.beneficio) {
                if (v.beneficio.codigo === 'VT') {
                  const custoVT = Number(v.valor || 0);
                  const descontoMaximoVT = Number(colab.salario_base || 0) * 0.06;
                  const valorDescontoVT = Math.min(custoVT, descontoMaximoVT);
                  if (valorDescontoVT > 0) {
                    beneficiosEventos.push({
                      codigo: '5010',
                      descricao: 'Desconto Vale Transporte (Portaria 671)',
                      tipo: 'desconto',
                      valor: Math.trunc(valorDescontoVT * 100) / 100,
                    });
                  }
                }
                if (v.desconto && v.beneficio.codigo !== 'VT') {
                  beneficiosEventos.push({
                    codigo: '5020',
                    descricao: `Coparticipação ${v.beneficio.nome}`,
                    tipo: 'desconto',
                    valor: Number(v.desconto),
                  });
                }
              }
            });
          } else {
            // Fallback para tabelas individuais legacy
            const { data: vtLegacy } = await supabase
              .from('vales_transporte')
              .select('*')
              .eq('colaborador_id', colab.id)
              .eq('optante', true)
              .maybeSingle();

            if (vtLegacy) {
              const custoVT = Number(vtLegacy.valor_mensal || 0);
              const descontoMaximoVT = Number(colab.salario_base || 0) * 0.06;
              const valorDescontoVT = Math.min(custoVT, descontoMaximoVT);
              if (valorDescontoVT > 0) {
                beneficiosEventos.push({
                  codigo: '5010',
                  descricao: 'Desconto Vale Transporte (Legacy)',
                  tipo: 'desconto',
                  valor: Math.trunc(valorDescontoVT * 100) / 100,
                });
              }
            }

            const { data: vaLegacy } = await supabase
              .from('vales_alimentacao')
              .select('*')
              .eq('colaborador_id', colab.id)
              .eq('ativo', true);

            if (vaLegacy) {
              vaLegacy.forEach((v) => {
                const desc = v.valor_mensal ? v.valor_mensal * 0.2 : 0;
                if (desc > 0) {
                  beneficiosEventos.push({
                    codigo: '5020',
                    descricao: `Coparticipação ${v.tipo || 'Ticket'} (Legacy)`,
                    tipo: 'desconto',
                    valor: Math.trunc(desc * 100) / 100,
                  });
                }
              });
            }
          }

          // Cadastros → eventos (mesma regra da edge calcular-folha):
          // pensão (também deduz a base do IRRF), consignado e adiantamento
          // aprovado; salário-família por dependente marcado.
          const salarioBase = Number(colab.salario_base || 0);
          const cadastroEventos: EventoFolha[] = [];
          let pensaoValor = 0;
          for (const p of pensoesPorColaborador.get(colab.id) ?? []) {
            const valor = p.percentual ? salarioBase * (Number(p.percentual) / 100) : Number(p.valor_fixo ?? 0);
            if (valor > 0) {
              pensaoValor += Math.round(valor * 100) / 100;
              cadastroEventos.push({
                codigo: '5015',
                descricao: `Pensão Alimentícia${p.beneficiario ? ` — ${p.beneficiario}` : ''}`,
                tipo: 'desconto',
                valor: Math.round(valor * 100) / 100,
              });
            }
          }
          for (const e of consignadosPorColaborador.get(colab.id) ?? []) {
            const valor = Number(e.valor_parcela ?? 0);
            if (valor > 0) {
              cadastroEventos.push({
                codigo: '5016',
                descricao: `Consignado${e.instituicao_financeira ? ` — ${e.instituicao_financeira}` : ''}`,
                tipo: 'desconto',
                valor,
              });
            }
          }
          for (const a of adiantamentosPorColaborador.get(colab.id) ?? []) {
            const valor = Number(a.valor_solicitado ?? 0);
            if (valor > 0) {
              cadastroEventos.push({ codigo: '5017', descricao: 'Adiantamento Salarial', tipo: 'desconto', valor });
            }
          }
          const salFamiliaDeps = colab.dependentes?.filter((d) => d.para_salario_familia === true).length || 0;
          const salarioFamilia =
            salFamiliaDeps > 0 && salarioBase <= SALARIO_FAMILIA_TETO
              ? Math.round(SALARIO_FAMILIA_VALOR * salFamiliaDeps * 100) / 100
              : 0;
          if (salarioFamilia > 0) {
            cadastroEventos.push({
              codigo: '1010',
              descricao: 'Salário-Família',
              tipo: 'provento',
              valor: salarioFamilia,
            });
          }

          const res = folhaCalc.processar(salarioBase, {
            dependentes: dependentesCount,
            eventos: [...eventosVariaveis, ...beneficiosEventos, ...cadastroEventos],
            horasExtras50: totalHE,
            horasExtras100: totalHE100,
            horasNoturnas: totalNoturno,
            diasUteis,
            domingosFeriados,
            horasFalta: totalFaltas,
            jornada,
            descontosExtras: 0,
            deducoesIrrf: pensaoValor,
            ano: Number(ano),
          });

          // Salva o item da folha
          const itemData: TablesInsert<'folha_itens'> = {
            folha_id: folhaId,
            colaborador_id: colab.id,
            salario_base: colab.salario_base,
            total_proventos: res.proventos,
            total_descontos: res.descontos,
            total_liquido: res.liquido,
            inss_mes: res.inss,
            irrf_mes: res.irrf,
            fgts_mes: res.fgts,
            detalhes: res as unknown as Json,
          };

          const { error: itemUpsertError } = await supabase
            .from('folha_itens')
            .upsert(validateTablePayload('folha_itens', itemData, 'calculoLoteService:folha_itens'), {
              onConflict: 'folha_id,colaborador_id',
            });
          if (itemUpsertError) throw itemUpsertError;

          // Auditoria analítica
          await supabase.from('folha_auditoria').insert(
            validateTablePayload(
              'folha_auditoria',
              {
                folha_id: folhaId,
                colaborador_id: colab.id,
                tipo_evento: 'CALCULO',
                mensagem: `Cálculo analítico processado para ${colab.nome_completo}. Eventos: ${res.detalheEventos?.length || 0}. Integração Ponto: ${res.horasExtras?.toFixed(1)}h extras.`,
                severidade: 'INFO',
                detalhes: {
                  timestamp: new Date().toISOString(),
                  liquido: res.liquido,
                  compliance: 'Portaria 671 MTP',
                },
              },
              'calculoLoteService:folha_auditoria'
            )
          );

          progress.success++;
          onProgress?.({ ...progress });
        } catch (err) {
          void loggerService.error(
            'Erro no processamento de colaborador',
            { colaboradorId: colab.id },
            err instanceof Error ? err : new Error(String(err))
          );
          progress.errors++;
          onProgress?.({ ...progress });
        }

        progress.current++;
      }

      // 4. Totais do cabeçalho = soma dos itens (o fechamento exige que batam)
      const { data: itensFolha, error: itensError } = await supabase
        .from('folha_itens')
        .select('total_proventos, total_descontos, total_liquido, fgts_mes')
        .eq('folha_id', folhaId);

      if (itensError) throw itensError;
      const somar = (campo: 'total_proventos' | 'total_descontos' | 'total_liquido' | 'fgts_mes') =>
        Math.round((itensFolha ?? []).reduce((acc, i) => acc + Number(i[campo] ?? 0), 0) * 100) / 100;

      // 'aberta' (primeiro cálculo) e 'calculada' (recálculo de competência
      // aberta) — o bridge só aceita eq em UPDATE, então lê o status atual e
      // casa exatamente ele (in() era rejeitado e o cabeçalho ficava velho).
      const { data: folhaAtual, error: folhaAtualError } = await supabase
        .from('folhas_pagamento')
        .select('status')
        .eq('id', folhaId)
        .maybeSingle();
      if (folhaAtualError) throw folhaAtualError;
      const statusFolha = (folhaAtual as { status?: string } | null)?.status;
      if (statusFolha !== 'aberta' && statusFolha !== 'calculada') {
        throw new Error(`Folha não está aberta para atualização de totais (status: ${statusFolha ?? 'inexistente'}).`);
      }
      // O bridge retorna data=[] SEM erro quando o filtro de status não casa
      // nenhuma linha. Um status diferente indica outro cálculo em andamento
      // (o calcular-folha grava o header antes dos itens) — retentar com o
      // snapshot de itens lido antes sobrescreveria os totais dele. 0 linhas =
      // conflito: aborta e o operador reexecuta o lote, que relê tudo.
      const { data: atualizados, error: totaisError } = await supabase
        .from('folhas_pagamento')
        .update({
          total_proventos: somar('total_proventos'),
          total_descontos: somar('total_descontos'),
          total_liquido: somar('total_liquido'),
          total_fgts: somar('fgts_mes'),
          total_colaboradores: itensFolha?.length ?? 0,
          data_calculo: new Date().toISOString(),
        })
        .eq('id', folhaId)
        .eq('status', statusFolha)
        .select('id');
      if (totaisError) throw totaisError;
      if (!atualizados || (atualizados as unknown[]).length === 0) {
        throw new Error(
          'Conflito: outra execução alterou o status da folha durante o lote — reexecute o cálculo em lote.'
        );
      }

      return progress;
    } catch (error) {
      toast.error(safeErrorMessage(error, 'Falha no processamento em lote.'));
      throw error;
    }
  },
};
