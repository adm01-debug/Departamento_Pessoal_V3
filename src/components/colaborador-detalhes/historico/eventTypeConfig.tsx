import {
  UserPlus, LogOut, DollarSign, FileText, Briefcase, Activity, ArrowLeftRight,
  Umbrella, HeartPulse, GraduationCap, Users, ClipboardCheck, FileWarning, History,
  type LucideIcon,
} from 'lucide-react';
import { donutColors } from '@/components/dashboard/analytics/widgets';
import type { TimelineEvent, TimelineEventType } from '@/types/timelineEvent';

// Ícones e cores por tipo de evento — reaproveita exatamente a linguagem
// visual já usada em outras telas do dossiê pro mesmo domínio:
// vínculo/admissão → UserPlus (ColaboradorKpiCards), desligamento → LogOut
// (idem), cargo/transferência → Briefcase/ArrowLeftRight (TrabalhoHierarquiaTab),
// férias → Umbrella (FeriasResumoTab), afastamento → HeartPulse (já usado
// nesta mesma página), treinamento → GraduationCap (ícone da aba
// "Desenvolvimento"), avaliação/Feedback 360 → Users (DesenvolvimentoProfissionalCard),
// onboarding → ClipboardCheck (já importado nesta página), medida disciplinar
// → FileWarning (MedidasTimeline), auditoria → History (ícone da própria
// aba "Timeline"). Cores seguem os tokens semânticos já usados nesses
// mesmos lugares (success/warning/destructive/info/primary) — nada de hex novo.
export interface EventTypeConfig {
  label: string;
  icon: LucideIcon;
  /** classes pro container do ícone/ponto da timeline */
  chip: string;
  /** classe de cor "sólida" pro ponto da timeline e legenda do donut */
  dot: string;
}

export const EVENT_TYPE_CONFIG: Record<TimelineEventType, EventTypeConfig> = {
  vinculo: { label: 'Vínculo', icon: UserPlus, chip: 'bg-success/10 text-success', dot: 'bg-success' },
  desligamento: { label: 'Desligamento', icon: LogOut, chip: 'bg-destructive/10 text-destructive', dot: 'bg-destructive' },
  salario: { label: 'Salário', icon: DollarSign, chip: 'bg-warning/10 text-warning', dot: 'bg-warning' },
  contrato: { label: 'Contrato', icon: FileText, chip: 'bg-info/10 text-info', dot: 'bg-info' },
  cargo: { label: 'Cargo', icon: Briefcase, chip: 'bg-primary/10 text-primary', dot: 'bg-primary' },
  promocao: { label: 'Promoção', icon: Activity, chip: 'bg-success/10 text-success', dot: 'bg-success' },
  transferencia: { label: 'Transferência', icon: ArrowLeftRight, chip: 'bg-info/10 text-info', dot: 'bg-info' },
  ferias: { label: 'Férias', icon: Umbrella, chip: 'bg-info/10 text-info', dot: 'bg-info' },
  afastamento: { label: 'Afastamento', icon: HeartPulse, chip: 'bg-warning/10 text-warning', dot: 'bg-warning' },
  treinamento: { label: 'Treinamento', icon: GraduationCap, chip: 'bg-primary/10 text-primary', dot: 'bg-primary' },
  avaliacao: { label: 'Avaliação', icon: Users, chip: 'bg-primary/10 text-primary', dot: 'bg-primary' },
  onboarding: { label: 'Onboarding', icon: ClipboardCheck, chip: 'bg-success/10 text-success', dot: 'bg-success' },
  medida_disciplinar: { label: 'Medida disciplinar', icon: FileWarning, chip: 'bg-destructive/10 text-destructive', dot: 'bg-destructive' },
  auditoria: { label: 'Auditoria', icon: History, chip: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
};

/**
 * Mesma cor por tipo usada no donut "Tipos de eventos" (EventTypesSummary) —
 * também aplicada no badge de categoria de cada linha da timeline, pra um
 * tipo ter sempre a mesma cor nos dois lugares. A cor não é fixa por tipo:
 * segue o RANKING de frequência (tipo mais comum → primeira cor da paleta),
 * então precisa ser recalculada a partir dos mesmos eventos em ambos os
 * lugares — por isso essa função pura em vez de um mapa estático.
 */
export function buildEventTypeColorMap(events: TimelineEvent[]): Partial<Record<TimelineEventType, string>> {
  const counts = new Map<TimelineEventType, number>();
  for (const e of events) counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const map: Partial<Record<TimelineEventType, string>> = {};
  sorted.forEach(([type], i) => { map[type] = donutColors[i % donutColors.length]; });
  return map;
}
