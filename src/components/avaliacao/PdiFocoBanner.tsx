import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { entradaCard } from './entradaCards';

/**
 * ============================================================================
 * BANNER "FOCO AGORA" — PDI.
 *
 * Faixa compacta de atenção, no MESMO idioma visual do banner de metas críticas
 * (`MetasCriticasBanner`) e do banner de feedbacks: bordô translúcido
 * (`--destructive-vivid`), ícone em caixa arredondada, leitura principal +
 * secundária e UMA ação à direita.
 *
 * ── OS NÚMEROS VÊM DO DADO ──────────────────────────────────────────────────
 * `total`/`vencidos`/`pendentes` chegam prontos de `pdiComum.resumoAtencao`, que
 * usa apenas duas regras comprováveis:
 *   • prazo vencido e plano não concluído (`estaAtrasado`, a MESMA regra que o
 *     `PerformanceDashboard` já aplica aos PDIs);
 *   • status `pendente` no registro.
 * Nenhum limiar inventado ("sem atualização há N dias" NÃO é usado — a tabela
 * não tem regra de estagnação aprovada). Sem nenhum PDI em atenção o componente
 * devolve `null`: a cor de alerta nunca é decorativa.
 *
 * A ação "Ver PDIs em atenção" liga o filtro REAL da aba (o mesmo conjunto
 * usado no resumo), então o botão nunca fica sem efeito.
 * ============================================================================
 */

interface PdiFocoBannerProps {
  /** Total de PDIs em atenção (vencidos + pendentes, sem repetir). */
  total: number;
  /** Quantos estão com prazo vencido. */
  vencidos: number;
  /** Quantos estão com status pendente (e prazo não vencido). */
  pendentes: number;
  /** Posição na cascata de entrada (mesma régua do Dashboard Executivo). */
  indice?: number;
  /** True quando o filtro de atenção já está aplicado na lista. */
  ativo?: boolean;
  /** Aplica/remove o filtro de atenção — ação real da aba. */
  onVerAtencao?: () => void;
}

export function PdiFocoBanner({
  total,
  vencidos,
  pendentes,
  indice = 0,
  ativo = false,
  onVerAtencao,
}: PdiFocoBannerProps) {
  if (total <= 0) return null;

  const resumo = [
    vencidos > 0 && `${vencidos} com prazo vencido`,
    pendentes > 0 && `${pendentes} aguardando início`,
  ]
    .filter(Boolean)
    .join('  •  ');

  return (
    <motion.div
      {...entradaCard(indice)}
      className="flex flex-col gap-3 rounded-xl border border-destructive-vivid/30 bg-destructive-vivid/10 px-4 py-3 lg:flex-row lg:items-center lg:gap-5"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive-vivid/15 text-destructive-vivid">
          <AlertTriangle className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-destructive-vivid">Foco agora</p>
          <p className="text-[13px] font-medium leading-tight">
            {total} {total === 1 ? 'PDI precisa' : 'PDIs precisam'} de atenção.
          </p>
          {resumo && <p className="text-[11px] leading-tight text-muted-foreground">{resumo}</p>}
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onVerAtencao}
        className="h-8 shrink-0 gap-1.5 self-start border-destructive-vivid/30 bg-transparent text-xs text-destructive-vivid transition-colors hover:bg-destructive-vivid/10 hover:text-destructive-vivid lg:self-auto"
      >
        {ativo ? 'Mostrar todos os PDIs' : 'Ver PDIs em atenção'}
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  );
}
