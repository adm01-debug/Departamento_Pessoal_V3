import { useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Umbrella, Calendar, FileText, Heart, HeartPulse, History,
  ChevronLeft, ChevronRight, BarChart3,
} from 'lucide-react';
import {
  startOfMonth, endOfMonth, addMonths, subMonths, addDays,
  eachDayOfInterval, differenceInCalendarDays, isSameDay, isSameMonth, getDay,
} from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { useFeriasResumoColaborador, useAfastamentosRecentes } from '@/hooks';
import { usePeriodosAquisitivos } from '@/hooks/useColaboradorDetalhes';
import { useEmpresas } from '@/hooks/useEmpresas';
import { todayLocalISO, formatDateLocalISO } from '@/utils/dateLocal';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', aprovada: 'Aprovada', em_gozo: 'Em gozo',
  concluida: 'Concluída', cancelada: 'Cancelada', rejeitada: 'Rejeitada',
};
const STATUS_TONE: Record<string, 'warning' | 'info' | 'success' | 'secondary' | 'destructive'> = {
  pendente: 'warning', aprovada: 'info', em_gozo: 'success',
  concluida: 'success', cancelada: 'destructive', rejeitada: 'destructive',
};
const PERIODO_STATUS_LABEL: Record<string, string> = {
  em_aquisicao: 'Em aquisição', adquirido: 'Adquirido', vencido: 'Vencido',
  gozado: 'Gozado', pago: 'Pago',
};
const TIPO_AFASTAMENTO_LABEL: Record<string, string> = {
  doenca: 'Doença', acidente_trabalho: 'Acidente de trabalho', acidente_trajeto: 'Acidente de trajeto',
  licenca_maternidade: 'Licença maternidade', licenca_paternidade: 'Licença paternidade',
  licenca_casamento: 'Licença casamento', licenca_obito: 'Licença óbito',
  licenca_nao_remunerada: 'Licença não remunerada', servico_militar: 'Serviço militar',
  mandato_sindical: 'Mandato sindical', suspensao_disciplinar: 'Suspensão disciplinar', outros: 'Outros',
};
const isLicenca = (tipo: string) => tipo.startsWith('licenca_');

const MES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MES_NOME = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const DIA_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function parseLocalDate(iso?: string | null): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function formatCurto(date: Date): string {
  return `${date.getDate()} ${MES_ABREV[date.getMonth()]}`;
}
function formatCurtoAno(date: Date): string {
  return `${formatCurto(date)} ${date.getFullYear()}`;
}
function formatDMY(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
}
function formatRange(inicio: Date, fim: Date): string {
  return `${formatCurto(inicio)} – ${formatCurtoAno(fim)}`;
}
function toneParaStatusFerias(status: string): 'success' | 'info' | 'warning' | 'destructive' {
  if (status === 'aprovada' || status === 'em_gozo' || status === 'concluida') return 'success';
  return 'warning';
}

interface FeriasRow { id: string; data_inicio: string; data_fim: string; dias_gozo: number; status: string; }
interface PeriodoAquisitivoRow {
  id: string; data_inicio: string; data_fim: string; dias_direito: number;
  dias_descontados: number | null; status: string | null; data_limite_concessao: string | null;
}
interface AfastamentoLite {
  id: string; tipo: string; status: string | null; data_inicio: string;
  data_fim_prevista: string | null; data_fim_real: string | null; dias_total: number | null;
}
type EventoTone = 'success' | 'info' | 'warning' | 'destructive';
interface EventoFerias { data: Date; titulo: string; sub?: string; tone: EventoTone; }

const TONE_DOT: Record<EventoTone, string> = {
  success: 'bg-success', info: 'bg-info', warning: 'bg-warning', destructive: 'bg-destructive',
};
const CATEGORIA_CLASSE: Record<string, string> = {
  ferias: 'bg-success/15 text-success',
  licenca: 'bg-warning/15 text-warning',
  retorno: 'bg-info/15 text-info',
  afastamento: 'bg-destructive/15 text-red-500 font-bold',
};

/** Anel de percentual compacto para o card "Saldo de férias" — sem
 * equivalente pronto no design system (o `DonutChart` fixa "Total" no
 * centro), por isso um SVG local mínimo em vez de adaptar um componente
 * pensado para outro caso de uso. */
function AnelPercentual({ percent }: { percent: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true });
  const size = 58;
  const stroke = 6;
  // `pad`: o SVG recorta (overflow: hidden) qualquer traço que toque a borda
  // do viewBox — sem essa margem, r + stroke/2 batia exatamente em size/2 e
  // o anel aparecia cortado nos pontos cardeais (direita/embaixo).
  const pad = 3;
  const box = size + pad * 2;
  const center = box / 2;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = c - (clamped / 100) * c;
  return (
    <svg ref={ref} width={box} height={box} viewBox={`0 0 ${box} ${box}`} className="shrink-0">
      <circle cx={center} cy={center} r={r} fill="none" stroke="hsl(var(--muted-foreground) / 0.25)" strokeWidth={stroke} />
      {/* Mesma técnica de traçado progressivo do `DonutChart` ("Tipo de
          Vínculo"): anima do anel vazio até o valor final uma única vez,
          quando o elemento entra na viewport. */}
      <motion.circle
        cx={center} cy={center} r={r} fill="none" stroke="hsl(var(--warning))" strokeWidth={stroke}
        strokeDasharray={c} strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: isInView ? offset : c }}
        transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
      />
      <text x={center} y={center} textAnchor="middle" dominantBaseline="central" className="fill-foreground text-xs font-semibold">
        {Math.round(clamped)}%
      </text>
    </svg>
  );
}

const MotionCard = motion.create(Card);

/** Um dos 4 cards da faixa de KPIs no topo — mesma linguagem visual do
 * indicador de resumo já usado em TrabalhoHierarquiaTab (ícone + título +
 * valor em destaque), com espaço opcional para gráfico/rodapé. */
function KpiCard({
  index, icon: Icon, iconClassName, titulo, valor, valorClassName, sub, subClassName, aside, footer,
}: {
  index: number;
  icon: ComponentType<{ className?: string }>;
  iconClassName: string;
  titulo: string;
  valor: ReactNode;
  /** Sobrepõe o tamanho padrão do valor/sub — usado pelo card "Período aquisitivo", que tem mais linhas de conteúdo que os demais. */
  valorClassName?: string;
  sub?: ReactNode;
  subClassName?: string;
  aside?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <MotionCard custom={index} initial="hidden" animate="visible" variants={cardVariants} className="border border-border/30 rounded-2xl shadow-elevated h-full">
      <CardContent className="px-3 py-2 h-full flex flex-col justify-center">
        <div className="flex items-center gap-2.5">
          <div className={cn('h-9 w-9 rounded-full flex items-center justify-center shrink-0', iconClassName)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs leading-none text-muted-foreground truncate">{titulo}</p>
            <p className={cn('text-lg font-semibold leading-tight truncate mt-0.5', valorClassName)}>{valor}</p>
            {sub && <div className={cn('text-xs leading-none text-muted-foreground mt-0.5 truncate', subClassName)}>{sub}</div>}
            {footer}
          </div>
          {aside && <div className="shrink-0 self-center">{aside}</div>}
        </div>
      </CardContent>
    </MotionCard>
  );
}

/** Cabeçalho compacto dos cards de segunda/terceira linha — ícone + título
 * (+ subtítulo) à esquerda, slot livre (navegação, ação) à direita. */
function SecaoHeader({
  icon: Icon, titulo, subtitulo, right,
}: {
  icon: ComponentType<{ className?: string }>;
  titulo: string;
  subtitulo?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-none truncate">{titulo}</p>
          {subtitulo && <p className="text-xs text-muted-foreground mt-1 truncate">{subtitulo}</p>}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

function VerTodosButton({ onClick, label = 'Ver todos' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline shrink-0"
    >
      {label} <ChevronRight className="h-3 w-3" />
    </button>
  );
}

function EventoItem({ evento, layout = 'stacked' }: { evento: EventoFerias; layout?: 'stacked' | 'linha' }) {
  if (layout === 'linha') {
    return (
      <div className="flex items-center gap-3">
        <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', TONE_DOT[evento.tone])} />
        <span className="text-xs text-muted-foreground w-[92px] shrink-0">{formatCurtoAno(evento.data)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{evento.titulo}</p>
          {evento.sub && <p className="text-xs text-muted-foreground truncate">{evento.sub}</p>}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2.5">
      <span className={cn('mt-1.5 h-2 w-2 rounded-full shrink-0', TONE_DOT[evento.tone])} />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{formatCurtoAno(evento.data)}</p>
        <p className="text-sm font-medium truncate">{evento.titulo}</p>
        {evento.sub && <p className="text-xs text-muted-foreground truncate">{evento.sub}</p>}
      </div>
    </div>
  );
}

function LinhaResumoMes({
  icon: Icon, valor, label, corIcone,
}: { icon: ComponentType<{ className?: string }>; valor: number; label: string; corIcone: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className={cn('h-4 w-4 shrink-0', corIcone)} />
      <span className="font-semibold w-6 text-right shrink-0">{valor}</span>
      <span className="text-muted-foreground truncate">{label}</span>
    </div>
  );
}

function LinhaAfastamentoResumo({
  icon: Icon, corIcone, titulo, sub, valor,
}: {
  icon: ComponentType<{ className?: string }>;
  corIcone: string;
  titulo: string;
  sub: string;
  valor: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-muted/40', corIcone)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{titulo}</p>
        <p className="text-xs text-muted-foreground truncate">{sub}</p>
      </div>
      <span className="text-sm font-semibold shrink-0">{valor}</span>
    </div>
  );
}

export function FeriasResumoTab({ colaboradorId, onVerTodosMarcos }: { colaboradorId: string; onVerTodosMarcos?: () => void }) {
  const { empresaAtual } = useEmpresas();
  const { data: feriasData, isLoading: isLoadingFerias } = useFeriasResumoColaborador(colaboradorId, empresaAtual?.id);
  const { data: periodosData, isLoading: isLoadingPeriodos } = usePeriodosAquisitivos(colaboradorId);
  const { data: afastamentosData, isLoading: isLoadingAfastamentos } = useAfastamentosRecentes(colaboradorId, 365);
  const [mesAtual, setMesAtual] = useState(new Date());
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);

  if (isLoadingFerias || isLoadingPeriodos || isLoadingAfastamentos) {
    return <div className="flex items-center justify-center h-32"><Spinner /></div>;
  }

  const lista = (feriasData ?? []) as FeriasRow[];
  const periodos = (periodosData ?? []) as PeriodoAquisitivoRow[];
  const afastamentos = (afastamentosData ?? []) as AfastamentoLite[];

  const hoje = todayLocalISO();
  const hojeDate = parseLocalDate(hoje)!;

  const feriasValidas = lista.filter((f) => f.status !== 'cancelada' && f.status !== 'rejeitada');
  const proxima = lista
    .filter((f) => ['pendente', 'aprovada'].includes(f.status) && f.data_inicio >= hoje)
    .sort((a, b) => a.data_inicio.localeCompare(b.data_inicio))[0];
  const historico = lista.filter((f) => f.status === 'concluida');

  const periodoAtual = periodos.find((p) => p.status !== 'vencido' && p.status !== 'gozado' && p.status !== 'pago') ?? periodos[0] ?? null;

  const afastamentoAtivo = afastamentos.find((a) => !a.data_fim_real);
  const afastamentosHistorico = afastamentos.filter((a) => a.data_fim_real);
  const ultimoAfastamentoConcluido = afastamentosHistorico[0];

  // KPI 1 — Saldo de férias: dias de direito líquidos de faltas, no período aquisitivo atual.
  const diasDireitoBruto = periodoAtual?.dias_direito ?? null;
  const diasDescontados = periodoAtual?.dias_descontados ?? 0;
  const diasLiquidos = diasDireitoBruto !== null ? Math.max(0, diasDireitoBruto - diasDescontados) : null;
  const percentualSaldo = diasDireitoBruto ? Math.round(((diasLiquidos ?? 0) / diasDireitoBruto) * 100) : 0;

  // KPI 3 — Progresso do período aquisitivo atual (dias decorridos / duração total da janela).
  const periodoInicio = parseLocalDate(periodoAtual?.data_inicio);
  const periodoFim = parseLocalDate(periodoAtual?.data_fim);
  const periodoVencimento = parseLocalDate(periodoAtual?.data_limite_concessao);
  let diasDecorridos: number | null = null;
  let diasTotaisPeriodo: number | null = null;
  let percentualPeriodo = 0;
  if (periodoInicio && periodoFim) {
    diasTotaisPeriodo = differenceInCalendarDays(periodoFim, periodoInicio) + 1;
    const referencia = hojeDate < periodoInicio ? periodoInicio : hojeDate > periodoFim ? periodoFim : hojeDate;
    diasDecorridos = Math.min(diasTotaisPeriodo, differenceInCalendarDays(referencia, periodoInicio) + 1);
    percentualPeriodo = diasTotaisPeriodo > 0 ? Math.round((diasDecorridos / diasTotaisPeriodo) * 100) : 0;
  }

  // Eventos reais derivados de férias/afastamentos/período — alimentam "Próximos
  // marcos", "Agenda do mês" e a coloração do calendário (nenhuma data inventada).
  const eventos: EventoFerias[] = [];
  for (const f of feriasValidas) {
    const inicio = parseLocalDate(f.data_inicio);
    const fim = parseLocalDate(f.data_fim);
    if (inicio) {
      eventos.push({
        data: inicio, titulo: 'Início das férias',
        sub: `${f.dias_gozo} dias · ${STATUS_LABEL[f.status] ?? f.status}`,
        tone: toneParaStatusFerias(f.status),
      });
    }
    if (fim) {
      eventos.push({ data: fim, titulo: 'Fim das férias', sub: 'Retorno ao trabalho', tone: 'info' });
      eventos.push({ data: addDays(fim, 1), titulo: 'Retorno ao trabalho', sub: 'Retorno previsto', tone: 'info' });
    }
  }
  if (periodoVencimento && periodoAtual?.status !== 'vencido') {
    eventos.push({ data: periodoVencimento, titulo: 'Fim do período aquisitivo', sub: 'Novo período será iniciado', tone: 'warning' });
  }
  for (const a of afastamentos) {
    const inicio = parseLocalDate(a.data_inicio);
    const fimReal = parseLocalDate(a.data_fim_real);
    const fimPrevisto = parseLocalDate(a.data_fim_prevista);
    if (inicio) {
      eventos.push({ data: inicio, titulo: 'Início de afastamento', sub: TIPO_AFASTAMENTO_LABEL[a.tipo] ?? a.tipo, tone: 'destructive' });
    }
    const fim = fimReal ?? fimPrevisto;
    if (fim) {
      eventos.push({
        data: fim, titulo: fimReal ? 'Fim de afastamento' : 'Previsão de retorno',
        sub: TIPO_AFASTAMENTO_LABEL[a.tipo] ?? a.tipo, tone: 'info',
      });
    }
  }
  eventos.sort((a, b) => a.data.getTime() - b.data.getTime());

  const proximosMarcos = eventos.filter((e) => e.data.getTime() >= hojeDate.getTime()).slice(0, 4);
  const agendaDoMes = eventos.filter((e) => isSameMonth(e.data, mesAtual));

  // Calendário — mapa dia → categoria (prioridade: afastamento > licença > retorno > férias).
  const monthStart = startOfMonth(mesAtual);
  const monthEnd = endOfMonth(mesAtual);
  const diaCategoria = new Map<string, 'ferias' | 'licenca' | 'afastamento' | 'retorno'>();
  const PRIORIDADE: Record<string, number> = { ferias: 1, retorno: 2, licenca: 3, afastamento: 4 };
  const marcarIntervalo = (inicio: Date | null, fim: Date | null, categoria: 'ferias' | 'licenca' | 'afastamento' | 'retorno') => {
    if (!inicio || !fim) return;
    const start = inicio > monthStart ? inicio : monthStart;
    const end = fim < monthEnd ? fim : monthEnd;
    if (start > end) return;
    for (const dia of eachDayOfInterval({ start, end })) {
      const key = formatDateLocalISO(dia);
      const atual = diaCategoria.get(key);
      if (!atual || PRIORIDADE[categoria] >= PRIORIDADE[atual]) diaCategoria.set(key, categoria);
    }
  };
  for (const f of feriasValidas) {
    const inicio = parseLocalDate(f.data_inicio);
    const fim = parseLocalDate(f.data_fim);
    marcarIntervalo(inicio, fim, 'ferias');
    if (fim) marcarIntervalo(addDays(fim, 1), addDays(fim, 1), 'retorno');
  }
  for (const a of afastamentos) {
    const inicio = parseLocalDate(a.data_inicio);
    const fim = parseLocalDate(a.data_fim_real) ?? parseLocalDate(a.data_fim_prevista);
    marcarIntervalo(inicio, fim, isLicenca(a.tipo) ? 'licenca' : 'afastamento');
  }

  const diasDoMes = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const espacosVazios = Array.from({ length: getDay(monthStart) });

  // Resumo do mês — dias sobrepostos com o mês exibido no calendário.
  const overlapDias = (inicio: Date | null, fim: Date | null) => {
    if (!inicio || !fim) return 0;
    const start = inicio > monthStart ? inicio : monthStart;
    const end = fim < monthEnd ? fim : monthEnd;
    if (start > end) return 0;
    return differenceInCalendarDays(end, start) + 1;
  };
  const diasFeriasNoMes = feriasValidas.reduce((soma, f) => soma + overlapDias(parseLocalDate(f.data_inicio), parseLocalDate(f.data_fim)), 0);
  const diasLicencaNoMes = afastamentos.filter((a) => isLicenca(a.tipo))
    .reduce((soma, a) => soma + overlapDias(parseLocalDate(a.data_inicio), parseLocalDate(a.data_fim_real) ?? parseLocalDate(a.data_fim_prevista)), 0);
  const diasAfastamentoNoMes = afastamentos.filter((a) => !isLicenca(a.tipo))
    .reduce((soma, a) => soma + overlapDias(parseLocalDate(a.data_inicio), parseLocalDate(a.data_fim_real) ?? parseLocalDate(a.data_fim_prevista)), 0);
  const diasUteisNoMes = diasDoMes.filter((d) => d.getDay() !== 0 && d.getDay() !== 6).length;

  // Afastamentos — resumo por categoria (janela de 365 dias já buscada pelo hook).
  const duracaoDias = (inicio: Date | null, fim: Date | null) => (inicio && fim ? differenceInCalendarDays(fim, inicio) + 1 : 0);
  const afastamentosLicenca = afastamentos.filter((a) => isLicenca(a.tipo));
  const afastamentosMedicos = afastamentos.filter((a) => !isLicenca(a.tipo));
  const diasFeriasResumo = proxima ? proxima.dias_gozo : feriasValidas.reduce((s, f) => s + (f.dias_gozo || 0), 0);
  const diasLicencaTotal = afastamentosLicenca.reduce((s, a) => s + (a.dias_total ?? duracaoDias(parseLocalDate(a.data_inicio), parseLocalDate(a.data_fim_real) ?? parseLocalDate(a.data_fim_prevista))), 0);
  const diasMedicosTotal = afastamentosMedicos.reduce((s, a) => s + (a.dias_total ?? duracaoDias(parseLocalDate(a.data_inicio), parseLocalDate(a.data_fim_real) ?? parseLocalDate(a.data_fim_prevista))), 0);

  return (
    <>
    <div className="space-y-4">
      {/* Linha 1 — KPIs de resumo (saldo, próximas férias, período aquisitivo, situação atual) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <KpiCard
          index={0}
          icon={Umbrella}
          iconClassName="bg-warning/10 text-warning"
          titulo="Saldo de férias"
          valor={diasLiquidos !== null ? `${diasLiquidos} dias` : '—'}
          sub={diasDireitoBruto !== null ? `de ${diasDireitoBruto} dias` : 'Nenhum período aquisitivo em aberto'}
          aside={diasDireitoBruto !== null ? (
            <div className="-translate-x-1.5 -translate-y-1">
              <AnelPercentual percent={percentualSaldo} />
            </div>
          ) : undefined}
        />
        <KpiCard
          index={1}
          icon={Calendar}
          iconClassName="bg-info/10 text-info"
          titulo="Próximas férias"
          valor={proxima ? formatRange(parseLocalDate(proxima.data_inicio)!, parseLocalDate(proxima.data_fim)!) : 'Nenhuma programada'}
          sub={proxima ? (
            <span className="flex items-center gap-1.5">
              {proxima.dias_gozo} dias
              <Badge variant={STATUS_TONE[proxima.status] ?? 'outline'} size="sm">{STATUS_LABEL[proxima.status] ?? proxima.status}</Badge>
            </span>
          ) : undefined}
        />
        <KpiCard
          index={2}
          icon={FileText}
          iconClassName="bg-primary/10 text-primary"
          titulo="Período aquisitivo"
          valor={diasDecorridos !== null ? `${diasDecorridos} / ${diasTotaisPeriodo} dias` : '—'}
          valorClassName="text-sm"
          sub={periodoInicio && periodoFim ? `${formatDMY(periodoInicio)} → ${formatDMY(periodoFim)}` : 'Nenhum período aquisitivo em aberto'}
          subClassName="text-[11px]"
          footer={diasDecorridos !== null ? (
            <div className="mt-0.5 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
                  {/* Mesma técnica de animação das barras de "Amplitude de Liderança"
                      (DashboardExecutivoPage): `motion.div` com `width` de 0 até o
                      percentual final, uma vez, ao montar. */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentualPeriodo}%` }}
                    transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-success to-primary"
                  />
                </div>
                <span className="text-[10px] leading-none text-muted-foreground shrink-0">{percentualPeriodo}%</span>
              </div>
              {periodoAtual?.status === 'vencido' ? (
                <Badge variant="destructive" size="sm">{PERIODO_STATUS_LABEL.vencido}</Badge>
              ) : periodoVencimento ? (
                <p className="text-[10px] leading-none text-muted-foreground truncate">Vence em {formatDMY(periodoVencimento)}</p>
              ) : null}
            </div>
          ) : undefined}
        />
        <KpiCard
          index={3}
          icon={Heart}
          iconClassName={afastamentoAtivo ? 'bg-red-500/15 text-red-500' : 'bg-success/10 text-success'}
          titulo="Situação atual"
          valor={afastamentoAtivo ? (TIPO_AFASTAMENTO_LABEL[afastamentoAtivo.tipo] ?? afastamentoAtivo.tipo) : 'Sem afastamentos ativos'}
          sub={afastamentoAtivo
            ? `Desde ${formatCurtoAno(parseLocalDate(afastamentoAtivo.data_inicio)!)}`
            : ultimoAfastamentoConcluido
              ? `Último registro: concluído em ${formatCurtoAno(parseLocalDate(ultimoAfastamentoConcluido.data_fim_real)!)}`
              : 'Último registro: sem ocorrências recentes'}
        />
      </div>

      {/* Linha 2 — Histórico recente, próximos marcos, resumo de afastamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr_1.15fr] gap-3">
        <MotionCard
          custom={4} initial="hidden" animate="visible" variants={cardVariants}
          className="border border-border/30 rounded-2xl shadow-elevated h-[192px]"
        >
          <CardContent className="p-4 h-full flex flex-col">
            <SecaoHeader
              icon={History}
              titulo="Histórico recente"
              right={historico.length > 0 ? (
                <VerTodosButton onClick={() => setHistoricoDialogOpen(true)} />
              ) : undefined}
            />
            {!historico.length ? (
              <p className="text-sm text-muted-foreground">Nenhuma férias concluída até o momento.</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1">
                <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground font-medium px-1 pb-1">
                  <span className="flex-1">Período</span>
                  <span className="w-24 text-center">Tipo</span>
                  <span className="w-16 text-center">Duração</span>
                  <span className="w-20 text-center">Status</span>
                </div>
                {historico.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 text-xs px-1 py-1.5 rounded-lg hover:bg-background/70 transition-colors">
                    <span className="flex-1 truncate">
                      {formatDMY(parseLocalDate(f.data_inicio)!)} – {formatDMY(parseLocalDate(f.data_fim)!)}
                    </span>
                    <span className="w-24 text-center truncate shrink-0">Férias</span>
                    <span className="w-16 text-center shrink-0">{f.dias_gozo} dias</span>
                    <span className="w-20 flex justify-center shrink-0">
                      <Badge variant={STATUS_TONE[f.status] ?? 'outline'} size="sm">{STATUS_LABEL[f.status] ?? f.status}</Badge>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </MotionCard>

        <MotionCard
          custom={5} initial="hidden" animate="visible" variants={cardVariants}
          className="border border-border/30 rounded-2xl shadow-elevated h-[192px]"
        >
          <CardContent className="p-4 h-full flex flex-col">
            <SecaoHeader
              icon={Calendar}
              titulo="Próximos marcos"
              right={onVerTodosMarcos ? <VerTodosButton onClick={onVerTodosMarcos} /> : undefined}
            />
            {!proximosMarcos.length ? (
              <p className="text-sm text-muted-foreground">Nenhum marco futuro.</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5">
                {proximosMarcos.map((evento, i) => <EventoItem key={i} evento={evento} layout="linha" />)}
              </div>
            )}
          </CardContent>
        </MotionCard>

        <MotionCard
          custom={6} initial="hidden" animate="visible" variants={cardVariants}
          className="border border-border/30 rounded-2xl shadow-elevated self-start"
        >
          <CardContent className="p-4">
            <SecaoHeader icon={Heart} titulo="Afastamentos" />
            <div className="space-y-3">
              <LinhaAfastamentoResumo
                icon={Umbrella} corIcone="text-warning" titulo="Férias"
                sub={proxima ? '1 período programado' : historico.length ? `${historico.length} período(s) concluído(s)` : 'Nenhum registro'}
                valor={`${diasFeriasResumo} dias`}
              />
              <LinhaAfastamentoResumo
                icon={FileText} corIcone="text-warning" titulo="Licenças"
                sub={afastamentosLicenca.length ? `${afastamentosLicenca.length} registro(s)` : 'Nenhum registro'}
                valor={`${diasLicencaTotal} dias`}
              />
              <LinhaAfastamentoResumo
                icon={HeartPulse} corIcone="text-destructive" titulo="Afastamentos médicos"
                sub={afastamentosMedicos.length ? `${afastamentosMedicos.length} registro(s)` : 'Nenhum registro'}
                valor={`${diasMedicosTotal} dias`}
              />
            </div>
          </CardContent>
        </MotionCard>
      </div>

      {/* Linha 3 — Calendário de ausências, agenda do mês, resumo do mês */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1.05fr_0.75fr] gap-3">
        <MotionCard
          custom={7} initial="hidden" animate="visible" variants={cardVariants}
          className="border border-border/30 rounded-2xl shadow-elevated self-start h-[188px]"
        >
          <CardContent className="p-3 h-full flex gap-3">
            <div className="flex-1 min-w-0">
              <SecaoHeader
                icon={Calendar}
                titulo="Calendário de ausências"
                subtitulo="Visualize os períodos de férias e afastamentos"
              />
              <div className="grid grid-cols-7 gap-0.5 text-center">
                {DIA_SEMANA.map((d) => (
                  <div key={d} className="text-[10px] font-medium text-muted-foreground uppercase">{d}</div>
                ))}
                {espacosVazios.map((_, i) => <div key={`vazio-${i}`} />)}
                {diasDoMes.map((dia) => {
                  const key = formatDateLocalISO(dia);
                  const categoria = diaCategoria.get(key);
                  const ehHoje = isSameDay(dia, hojeDate);
                  return (
                    <div
                      key={key}
                      className={cn(
                        'h-5 flex items-center justify-center rounded text-[10px]',
                        categoria ? CATEGORIA_CLASSE[categoria] : 'text-foreground',
                        ehHoje && 'ring-1 ring-primary font-semibold'
                      )}
                    >
                      {dia.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="shrink-0 flex flex-col gap-2 pl-3 border-l border-border/20">
              <div className="flex items-center justify-end gap-0.5">
                <Button variant="outline" size="icon" aria-label="Mês anterior" className="h-6 w-6 rounded-full" onClick={() => setMesAtual((m) => subMonths(m, 1))}>
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-[11px] font-medium min-w-[80px] text-center">{MES_NOME[mesAtual.getMonth()]} {mesAtual.getFullYear()}</span>
                <Button variant="outline" size="icon" aria-label="Próximo mês" className="h-6 w-6 rounded-full" onClick={() => setMesAtual((m) => addMonths(m, 1))}>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              <div className="flex-1 flex flex-col justify-between py-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="h-2 w-2 rounded-full bg-success shrink-0" /> Férias</span>
                <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="h-2 w-2 rounded-full bg-warning shrink-0" /> Licença</span>
                <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="h-2 w-2 rounded-full bg-info shrink-0" /> Retorno</span>
                <span className="flex items-center gap-1.5 whitespace-nowrap"><span className="h-2 w-2 rounded-full bg-destructive shrink-0" /> Afastamento</span>
              </div>
            </div>
          </CardContent>
        </MotionCard>

        <MotionCard
          custom={8} initial="hidden" animate="visible" variants={cardVariants}
          className="border border-border/30 rounded-2xl shadow-elevated self-start h-[188px]"
        >
          <CardContent className="p-4 h-full flex flex-col">
            <SecaoHeader icon={Calendar} titulo="Agenda do mês" />
            {!agendaDoMes.length ? (
              <p className="text-sm text-muted-foreground">Nenhum evento neste mês.</p>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5">
                {agendaDoMes.map((evento, i) => <EventoItem key={i} evento={evento} layout="linha" />)}
              </div>
            )}
          </CardContent>
        </MotionCard>

        <MotionCard
          custom={9} initial="hidden" animate="visible" variants={cardVariants}
          className="border border-border/30 rounded-2xl shadow-elevated self-start"
        >
          <CardContent className="p-4">
            <SecaoHeader icon={BarChart3} titulo="Resumo do mês" subtitulo={`${MES_NOME[mesAtual.getMonth()]} ${mesAtual.getFullYear()}`} />
            <div className="space-y-2.5">
              <LinhaResumoMes icon={Umbrella} valor={diasFeriasNoMes} label="Dias de férias" corIcone="text-warning" />
              <LinhaResumoMes icon={FileText} valor={diasLicencaNoMes} label="Dias de licença" corIcone="text-warning" />
              <LinhaResumoMes icon={Heart} valor={diasAfastamentoNoMes} label="Dias de afastamento" corIcone="text-destructive" />
              <LinhaResumoMes icon={Calendar} valor={diasUteisNoMes} label="Dias úteis no mês" corIcone="text-primary" />
            </div>
          </CardContent>
        </MotionCard>
      </div>
    </div>

    {/* Mesmo popup/coreografia de entrada usado em "Pendências" — a caixa
        e a animação moram em AnimatedCascadeDialog, aqui só descrevemos o
        conteúdo (um item por período de férias concluído). */}
    <AnimatedCascadeDialog
      open={historicoDialogOpen}
      onOpenChange={setHistoricoDialogOpen}
      title="Histórico recente"
      titleIcon={History}
      titleIconClassName="h-5 w-5 text-primary"
      emptyMessage="Nenhuma férias concluída até o momento."
      items={historico.map((f) => (
        <div key={f.id} className="rounded-xl border border-border/30 p-3.5 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {formatDMY(parseLocalDate(f.data_inicio)!)} – {formatDMY(parseLocalDate(f.data_fim)!)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Férias · {f.dias_gozo} dias</p>
          </div>
          <Badge variant={STATUS_TONE[f.status] ?? 'outline'} size="sm">{STATUS_LABEL[f.status] ?? f.status}</Badge>
        </div>
      ))}
    />
    </>
  );
}
