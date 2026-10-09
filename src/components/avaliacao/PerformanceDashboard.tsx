import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CicloAtivoPanel } from './CicloAtivoPanel';
import { AlertasDesempenho } from './AlertasDesempenho';
import { ResumoDesempenho } from './ResumoDesempenho';
import { AnaliticosDesempenho } from './AnaliticosDesempenho';
import { contarItens, estaAtrasado, mediaProgresso, normalizarStatus } from './desempenhoComum';

/**
 * ============================================================================
 * PAINEL DA ABA CICLOS — Gestão de Desempenho.
 *
 * Nova hierarquia (referência visual): Ciclo Ativo em destaque → faixa de
 * alertas (só quando há pendências reais) → resumo compacto dos 5 totais →
 * três cards analíticos. Os cinco totais continuam existindo, apenas como
 * informação secundária (chips), em vez da faixa de cards grandes.
 *
 * Todos os números derivam do ciclo SELECIONADO usando dados reais de
 * `metas_okrs` / `feedbacks_360`. Nada de estados ou percentuais simulados.
 * ============================================================================
 */

interface PerformanceDashboardProps {
  stats: {
    ciclos: number;
    metas: number;
    feedbacks: number;
    pdis: number;
    competencias: number;
  };
  feedbacks: any[];
  metas: any[];
  /** PDIs da empresa (não são escopados por ciclo). */
  pdis?: any[];
  /** Ciclo em destaque no painel (o selecionado no cabeçalho). */
  ciclo?: any;
  /** Troca de aba a partir das ações contextuais. */
  onNavigate?: (tab: string) => void;
}

export function PerformanceDashboard({
  stats,
  feedbacks,
  metas,
  pdis = [],
  ciclo,
  onNavigate,
}: PerformanceDashboardProps) {
  const { feedbacksCiclo, metasCiclo, progresso, contadores, pdisAtrasados, feedbacksPendentes } = useMemo(() => {
    // Sem ciclo definido (ex.: uso isolado do componente), o painel mostra o
    // conjunto completo — mantém o comportamento anterior.
    const feedbacksCiclo = ciclo ? feedbacks.filter((f) => f?.ciclo_id === ciclo.id) : feedbacks;
    const metasCiclo = ciclo ? metas.filter((m) => m?.ciclo_id === ciclo.id) : metas;

    return {
      feedbacksCiclo,
      metasCiclo,
      progresso: mediaProgresso(metasCiclo),
      contadores: contarItens(metasCiclo),
      pdisAtrasados: pdis.filter((p) => estaAtrasado(p)).length,
      feedbacksPendentes: feedbacksCiclo.filter((f) => normalizarStatus(f?.status) === 'pendente').length,
    };
  }, [ciclo, feedbacks, metas, pdis]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {ciclo && <CicloAtivoPanel ciclo={ciclo} progresso={progresso} contadores={contadores} onNavigate={onNavigate} />}

      <AlertasDesempenho
        metasAtrasadas={contadores.atrasadas}
        feedbacksPendentes={feedbacksPendentes}
        pdisAtrasados={pdisAtrasados}
        onNavigate={onNavigate}
      />

      <ResumoDesempenho stats={stats} />

      <AnaliticosDesempenho feedbacks={feedbacksCiclo} metas={metasCiclo} onNavigate={onNavigate} />
    </motion.div>
  );
}
