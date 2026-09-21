// PARTE J — Dossiê do Colaborador, Resumo → Próximos Eventos reais.
// Agrega datas futuras já disponíveis em hooks existentes (nenhuma tabela de
// agenda nova, nenhuma query própria além de reusar hooks já usados nas
// outras abas do Dossiê).
import {
  usePeriodoExperiencia, usePeriodosAquisitivos, useASOs,
  useFeriasResumoColaborador,
} from './useColaboradorDetalhes';
import { useDocumentosPessoais } from './useTabelasReferencia';
import { useOnboardingColaborador } from './useDesenvolvimentoColaborador';
import { todayLocalISO } from '@/utils/dateLocal';

export type ProximoEventoBadgeTone = 'info' | 'success' | 'warning';

export interface ProximoEvento {
  data: string;
  tipo: string;
  titulo: string;
  descricao?: string;
  /** Texto secundário exibido junto ao badge (categoria do evento ou, para
   * férias já programadas, a duração — ex.: "Onboarding", "15 dias"). */
  categoria: string;
  badge: { label: string; tone: ProximoEventoBadgeTone };
}

/** "Em N dias" para prazos; férias programadas usam o status real em vez de contagem. */
function countdownBadge(dataEvento: string, hoje: string): { label: string; tone: ProximoEventoBadgeTone } {
  const dias = Math.max(0, Math.round(
    (new Date(`${dataEvento}T00:00:00`).getTime() - new Date(`${hoje}T00:00:00`).getTime()) / 86400000
  ));
  const label = dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `Em ${dias} dias`;
  return { label, tone: 'info' };
}

export function useProximosEventos(colaboradorId: string, empresaId?: string) {
  const { data: periodoExperiencia } = usePeriodoExperiencia(colaboradorId);
  const { data: periodosAquisitivos } = usePeriodosAquisitivos(colaboradorId);
  const { data: ferias } = useFeriasResumoColaborador(colaboradorId, empresaId);
  const { data: asos } = useASOs(colaboradorId);
  const { data: documentosPessoais } = useDocumentosPessoais(colaboradorId);
  const onboarding = useOnboardingColaborador(colaboradorId);

  const hoje = todayLocalISO();
  const eventos: ProximoEvento[] = [];

  const pe = periodoExperiencia as { segunda_etapa_fim?: string; primeira_etapa_fim?: string; status?: string } | null | undefined;
  const fimExperiencia = pe?.segunda_etapa_fim ?? pe?.primeira_etapa_fim;
  if (fimExperiencia && fimExperiencia >= hoje && pe?.status !== 'concluido' && pe?.status !== 'efetivado') {
    eventos.push({
      data: fimExperiencia, tipo: 'experiencia', titulo: 'Fim do período de experiência',
      categoria: 'Experiência', badge: countdownBadge(fimExperiencia, hoje),
    });
  }

  for (const p of (periodosAquisitivos as { fim_concessivo?: string; status?: string }[] | undefined) || []) {
    if (p.fim_concessivo && p.fim_concessivo >= hoje && p.status !== 'vencido') {
      eventos.push({
        data: p.fim_concessivo, tipo: 'ferias_vencimento', titulo: 'Vencimento do período concessivo de férias',
        categoria: 'Férias', badge: countdownBadge(p.fim_concessivo, hoje),
      });
    }
  }

  for (const f of (ferias as { data_inicio?: string; status?: string; dias_gozo?: number }[] | undefined) || []) {
    if (f.data_inicio && f.data_inicio >= hoje && ['pendente', 'aprovada'].includes(f.status ?? '')) {
      eventos.push({
        data: f.data_inicio, tipo: 'ferias_inicio', titulo: 'Início de férias programadas',
        categoria: f.dias_gozo ? `${f.dias_gozo} dias` : 'Férias',
        badge: f.status === 'aprovada'
          ? { label: 'Aprovado', tone: 'success' }
          : { label: 'Pendente', tone: 'warning' },
      });
    }
  }

  for (const a of (asos as { data_validade?: string }[] | undefined) || []) {
    if (a.data_validade && a.data_validade >= hoje) {
      eventos.push({
        data: a.data_validade, tipo: 'aso', titulo: 'Vencimento de ASO / exame periódico',
        categoria: 'SST', badge: countdownBadge(a.data_validade, hoje),
      });
    }
  }

  for (const d of (documentosPessoais as { data_validade?: string; tipo_documento?: string }[] | undefined) || []) {
    if (d.data_validade && d.data_validade >= hoje) {
      eventos.push({
        data: d.data_validade, tipo: 'documento', titulo: d.tipo_documento ?? 'Documento pessoal',
        categoria: 'Documento', badge: countdownBadge(d.data_validade, hoje),
      });
    }
  }

  for (const t of onboarding.pendentes) {
    const tarefa = t as { data_prazo?: string; titulo?: string };
    if (tarefa.data_prazo && tarefa.data_prazo >= hoje) {
      eventos.push({
        data: tarefa.data_prazo, tipo: 'onboarding', titulo: tarefa.titulo ?? 'Tarefa pendente',
        categoria: 'Onboarding', badge: countdownBadge(tarefa.data_prazo, hoje),
      });
    }
  }

  eventos.sort((a, b) => a.data.localeCompare(b.data));
  return eventos;
}
