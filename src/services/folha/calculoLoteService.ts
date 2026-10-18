import { supabase, type QueryBuilderType } from '@/integrations/supabase/client';
import type { Json, TablesInsert } from '@/integrations/supabase/types';
import { folhaCalc } from '@/utils/folhaCalc';
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
  dependentes?: Array<{ id: string; para_irrf?: boolean | null }> | null;
}

export const COLABORADOR_FOLHA_SELECT = `
  *,
  dependentes (id, para_irrf)
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
  beneficio: { tipo?: string; nome: string } | null;
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
      let domingosFeriados = new Set<string>(
        (feriadosMes ?? []).filter((f) => f.empresa_id === null || f.empresa_id === empresaId).map((f) => f.data)
      ).size;
      for (let d = 1; d <= diasNoMes; d++) {
        const dt = new Date(Number(ano), Number(mes) - 1, d);
        if (dt.getDay() === 0) domingosFeriados++;
      }
      const diasUteis = Math.max(0, diasNoMes - domingosFeriados);
      for (const ev of (eventosData ?? []) as unknown as EventoVariavelRow[]) {
        const tipo = ev.rubrica?.tipo;
        if (!ev.rubrica || (tipo !== 'provento' && tipo !== 'desconto')) continue;
        const lista = eventosPorColaborador.get(ev.colaborador_id) ?? [];
        lista.push({ codigo: ev.rubrica.codigo, descricao: ev.rubrica.descricao, tipo, valor: Number(ev.valor) });
        eventosPorColaborador.set(ev.colaborador_id, lista);
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
            .select('horas_extras, horas_extras_50, horas_extras_100, horas_noturnas, horas_falta')
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
              // Colunas novas (onda 5) guardam a parte PAGA já separada por
              // adicional; registros antigos só têm o total em horas_extras
              // (tratado como 50% como antes — nunca conta duas vezes).
              const he50 = pontoIntegracaoUtils.intervalToDecimal(r.horas_extras_50);
              const he100 = pontoIntegracaoUtils.intervalToDecimal(r.horas_extras_100);
              if (he50 === 0 && he100 === 0) {
                totalHE += pontoIntegracaoUtils.intervalToDecimal(r.horas_extras);
              } else {
                totalHE += he50;
                totalHE100 += he100;
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
                if (v.beneficio.tipo === 'VT') {
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
                if (v.desconto && v.beneficio.tipo !== 'VT') {
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

          const res = folhaCalc.processar(Number(colab.salario_base || 0), {
            dependentes: dependentesCount,
            eventos: [...eventosVariaveis, ...beneficiosEventos],
            horasExtras50: totalHE,
            horasExtras100: totalHE100,
            horasNoturnas: totalNoturno,
            diasUteis,
            domingosFeriados,
            horasFalta: totalFaltas,
            jornada,
            descontosExtras: 0,
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

      const { error: totaisError } = await supabase
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
        .eq('status', 'aberta');

      if (totaisError) throw totaisError;

      return progress;
    } catch (error) {
      toast.error(safeErrorMessage(error, 'Falha no processamento em lote.'));
      throw error;
    }
  },
};
