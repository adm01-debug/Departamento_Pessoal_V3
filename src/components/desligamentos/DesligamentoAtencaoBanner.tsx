import { motion } from 'framer-motion';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { EntradaPresenca } from './entradaCards';
import type { ResumoAtencao } from './desligamentosDerivacoes';

interface Props {
  /** Contagem derivada da própria lista (ver `resumoAtencao`). */
  resumo: ResumoAtencao;
  /** Leva o usuário à Gestão já filtrada pelos processos que precisam de atenção. */
  onVerProcessos: () => void;
  /** Índice na cascata de entrada da página. */
  index?: number;
}

/**
 * Faixa horizontal compacta logo abaixo dos KPIs: NÃO é uma subárea — é um
 * resumo inteligente dos processos que precisam de atenção, com os mesmos
 * números já calculados para a coluna de prazo. "Ver processos" filtra a própria
 * Gestão de Desligamentos (nenhuma página nova é criada).
 */
export function DesligamentoAtencaoBanner({ resumo, onVerProcessos, index = 0 }: Props) {
  const temAlerta = resumo.total > 0;
  const destacados = resumo.total;

  const segmentos = [
    { valor: resumo.atrasados, label: resumo.atrasados === 1 ? 'atrasado' : 'atrasados' },
    { valor: resumo.pendentes, label: resumo.pendentes === 1 ? 'pendente' : 'pendentes' },
    { valor: resumo.hoje, label: 'com prazo hoje' },
  ];

  return (
    /* `EntradaPresenca`: sem ela o `initial={false}` do `PageTransition` bloqueia
       o keyframe `hidden` e a faixa não entra (ver entradaCards.tsx). */
    <EntradaPresenca>
      <motion.div
        custom={index}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      className={
        temAlerta
          ? 'flex flex-col gap-3 rounded-2xl border border-destructive-vivid/30 bg-destructive-vivid/[0.07] px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
          : 'flex flex-col gap-3 rounded-2xl border border-success/25 bg-success/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
      }
    >
      <div className="flex items-center gap-3">
        <div
          className={
            temAlerta
              ? 'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-destructive-vivid/15 text-destructive-vivid'
              : 'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-success/15 text-success'
          }
        >
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-medium leading-tight text-foreground">
            {temAlerta
              ? `${destacados} ${destacados === 1 ? 'processo precisa' : 'processos precisam'} de atenção`
              : 'Nenhum processo precisa de atenção'}
          </p>
          {/* Tópicos em destaque: um pouco maiores (13px de 12px), números em
              vermelho vibrante + negrito e rótulos em `foreground` (os mesmos
              três recortes de `resumoAtencao`: atrasados / pendentes / prazo
              hoje). Valores 0 voltam ao tom discreto para não poluir. */}
          <p className="mt-1 text-[13px] leading-snug">
            {segmentos.map((s, i) => (
              <span key={i}>
                {i > 0 && (
                  <span aria-hidden className="px-1.5 text-border">
                    •
                  </span>
                )}
                <span
                  className={
                    s.valor > 0
                      ? 'font-semibold tabular-nums text-destructive-vivid'
                      : 'font-medium text-muted-foreground'
                  }
                >
                  {s.valor}
                </span>{' '}
                <span className={s.valor > 0 ? 'text-foreground' : 'text-muted-foreground'}>{s.label}</span>
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* Botão no MESMO tom do card (vermelho vibrante quando há alerta) com
          contorno mais vibrante que o da faixa (`/70` no normal, cheio no hover,
          contra `/30` do card) — reforça a ação principal sem sair da paleta. */}
      <Button
        variant="outline"
        size="sm"
        onClick={onVerProcessos}
        className={
          temAlerta
            ? 'shrink-0 gap-2 rounded-xl border-destructive-vivid/70 bg-destructive-vivid/10 font-body text-destructive-vivid hover:border-destructive-vivid hover:bg-destructive-vivid/20 hover:text-destructive-vivid'
            : 'shrink-0 gap-2 rounded-xl border-success/50 bg-success/10 font-body text-success hover:border-success hover:bg-success/20 hover:text-success'
        }
      >
        Ver processos
        <ArrowRight className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
    </EntradaPresenca>
  );
}
