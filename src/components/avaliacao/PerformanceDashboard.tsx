import { useMemo } from 'react';
import { CicloAtivoPanel } from './CicloAtivoPanel';
import { AlertasDesempenho } from './AlertasDesempenho';
import { AnaliticosDesempenho } from './AnaliticosDesempenho';
import { contarItens, estaAtrasado, mediaProgresso, normalizarStatus } from './desempenhoComum';
import { EntradaPresenca } from './entradaCards';

/**
 * ============================================================================
 * PAINEL DA ABA CICLOS — Gestão de Desempenho.
 *
 * Hierarquia (referência visual): Ciclo Ativo em destaque → faixa de alertas
 * (só quando há pendências reais) → três cards analíticos. A antiga faixa de
 * cinco indicadores (Ciclos/Metas/Feedbacks/PDIs/Competências) foi REMOVIDA a
 * pedido, junto com o espaço vertical que ocupava — os analíticos sobem e usam
 * o gap padrão do container (`space-y-4`).
 *
 * Todos os números derivam do ciclo SELECIONADO usando dados reais de
 * `metas_okrs` / `feedbacks_360`. Nada de estados ou percentuais simulados.
 * ============================================================================
 */

interface PerformanceDashboardProps {
  feedbacks: any[];
  metas: any[];
  /** PDIs da empresa (não são escopados por ciclo). */
  pdis?: any[];
  /** Ciclo em destaque no painel (o selecionado no cabeçalho). */
  ciclo?: any;
  /** Troca de aba a partir das ações contextuais. */
  onNavigate?: (tab: string) => void;
}

export function PerformanceDashboard({ feedbacks, metas, pdis = [], ciclo, onNavigate }: PerformanceDashboardProps) {
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
    <EntradaPresenca>
      <div className="space-y-4">
        {ciclo && (
          <CicloAtivoPanel
            ciclo={ciclo}
            progresso={progresso}
            contadores={contadores}
            onNavigate={onNavigate}
            indice={0}
          />
        )}

        <AlertasDesempenho
          metasAtrasadas={contadores.atrasadas}
          feedbacksPendentes={feedbacksPendentes}
          pdisAtrasados={pdisAtrasados}
          onNavigate={onNavigate}
          indice={1}
        />

        <AnaliticosDesempenho feedbacks={feedbacksCiclo} metas={metasCiclo} onNavigate={onNavigate} indiceBase={2} />
      </div>
    </EntradaPresenca>
  );
}
