import type { TomStatusTreinamento } from './treinamentosDerivacoes';

/**
 * Ponto colorido do status REAL da turma — a MESMA paleta usada pelos selos de
 * `TreinamentoBadges`. Fonte única para a agenda semanal e para o calendário
 * mensal; nenhuma cor nova é criada.
 */
export const PONTO_STATUS: Record<TomStatusTreinamento, string> = {
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  teal: 'bg-[hsl(var(--aqua))]',
  neutral: 'bg-muted-foreground/70',
  danger: 'bg-destructive',
};
