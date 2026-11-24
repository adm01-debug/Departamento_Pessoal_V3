import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { AnimatePresence } from 'framer-motion';
import { Spinner } from '@/components/ui/spinner';
import { useOrganograma } from '@/hooks/useOrganograma';
import { OrganogramaStats } from '@/components/organograma/OrganogramaStats';
import { OrganogramaToolbar } from '@/components/organograma/OrganogramaToolbar';
import { OrganogramaTree } from '@/components/organograma/OrganogramaTree';
import { Network, Building2, SearchX } from 'lucide-react';
import { SyncErrorState } from '@/components/ui/sync-error-state';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  buildCollapseStages,
  countTree,
  maxDepth,
  collectAllIds,
  getDefaultExpandedIds,
  filterTree,
  type OrgDepartamento,
} from '@/lib/organogramaTree';
import { revealStageGap } from '@/components/organograma/organogramaReveal';

export default function OrganogramaPage() {
  const { dados, isLoading, error, refetch } = useOrganograma();
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const hasInitializedExpansion = useRef(false);

  const nodes = useMemo(() => (dados || []) as OrgDepartamento[], [dados]);

  useEffect(() => {
    if (!hasInitializedExpansion.current && nodes.length > 0) {
      setExpandedIds(getDefaultExpandedIds(nodes));
      hasInitializedExpansion.current = true;
    }
  }, [nodes]);

  const stats = useMemo(() => countTree(nodes), [nodes]);
  const niveis = useMemo(() => maxDepth(nodes), [nodes]);
  const allIds = useMemo(() => collectAllIds(nodes), [nodes]);

  const { nodes: filteredNodes, matchedIds } = useMemo(() => filterTree(nodes, search), [nodes, search]);
  const isSearching = search.trim().length > 0;
  const visibleStats = useMemo(() => countTree(filteredNodes), [filteredNodes]);

  const effectiveExpandedIds = isSearching ? matchedIds : expandedIds;

  // Timers da onda de recolhimento (abaixo). Ficam numa ref pra poderem ser
  // cancelados quando o usuário toma o controle no meio do caminho.
  const collapseTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** Cancela a onda de recolhimento em andamento (nada fica "meio recolhido" depois). */
  const cancelCollapseWave = useCallback(() => {
    collapseTimers.current.forEach((timer) => clearTimeout(timer));
    collapseTimers.current = [];
  }, []);

  // Sair da página no meio da onda não deixa timer pendente mudando estado de um
  // componente que não existe mais.
  useEffect(() => cancelCollapseWave, [cancelCollapseWave]);

  const handleToggle = (id: string) => {
    if (isSearching) return;
    cancelCollapseWave();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => {
    cancelCollapseWave();
    setExpandedIds(new Set(allIds));
  };

  /**
   * Recolhimento em onda, de baixo pra cima. Antes daqui saía um
   * `setExpandedIds(new Set())` e a árvore inteira era desmontada no mesmo
   * commit: quem estava dentro de um bloco que já estava saindo NÃO rodava a
   * própria saída (o `AnimatePresence` congela a subárvore que está saindo), então
   * "Recolher tudo" pulava a animação dos níveis de dentro — sobrava só o nível
   * de fora fechando, tudo junto.
   *
   * Agora os `expandedIds` saem um NÍVEL por vez (`buildCollapseStages`, do fundo
   * pra raiz) e cada passo espera a janela do passo anterior
   * (`revealStageGap` = `revealLevelWindow` — bloco mais atrasado do nível +
   * saída dos itens + duração do fechamento — menos `REVEAL_STAGE_OVERLAP`, a
   * cauda em que o vão já está praticamente fechado e o nível de cima pode
   * começar). O resultado é a onda invertida da abertura: o conteúdo do fundo
   * sai, depois o vão dele fecha, depois o nível de cima — até sobrar só a raiz.
   * O primeiro passo sai no mesmo clique (é o que o usuário acabou de pedir); os
   * outros são agendados.
   *
   * A conta é feita sobre a árvore INTEIRA (e não sobre a filtrada pela busca) pra
   * que o estado termine sempre vazio, como antes: departamento escondido pelo
   * filtro não pode ficar "esquecido" aberto pra reaparecer expandido quando a
   * busca for limpa.
   */
  const handleCollapseAll = () => {
    cancelCollapseWave();

    const stages = buildCollapseStages(nodes, expandedIds);
    if (stages.length === 0) return;

    const dropStage = (ids: string[]) =>
      setExpandedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });

    dropStage(stages[0].ids);

    let elapsed = 0;
    stages.forEach((stage, index) => {
      elapsed += revealStageGap(stage);
      if (index === stages.length - 1) return;

      const nextStage = stages[index + 1];
      collapseTimers.current.push(
        setTimeout(() => dropStage(nextStage.ids), elapsed * 1000)
      );
    });
  };

  return (
    <>
      <PageTitle title="Organograma" description="Estrutura de departamentos e colaboradores" />
      <PageLayout
        title="Organograma"
        description="Estrutura de departamentos e colaboradores"
        icon={<Network className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-primary-glow"
      >
        {/* `AnimatePresence` local sem props: o cabeçalho entra em cascata com a
            MESMA animação dos KPI Cards do Dashboard Executivo (`cardVariants` de
            dashboard/MetricCard.tsx — fade + subida de 20px, 0.4s, `delay =
            índice × 0.08s`), da esquerda para a direita: cards (0..2), busca (3),
            "Expandir tudo" (4) e "Recolher tudo" (5), na ordem declarada em
            organogramaHeaderReveal.ts.

            Por que o `AnimatePresence` aqui: o app renderiza as rotas dentro de
            `<AnimatePresence initial={false}>` (PageTransition.tsx) e esse
            contexto de presença é lido por QUALQUER `motion.*` descendente — com
            `initial={false}` a Motion pula o keyframe inicial e a cascata nem
            chega a tocar (mesmo caso já documentado e contornado em
            OrganogramaTree.tsx, HistoricoColaborador.tsx e
            HeadcountOverviewCard.tsx). Um contexto novo aqui libera a entrada do
            cabeçalho de uma vez, sem repetir em cada card/botão. Ele não
            renderiza DOM nenhum: layout, cores e tamanhos seguem idênticos, e a
            árvore do Organograma (que tem o próprio `AnimatePresence` e as
            próprias animações) não passa por aqui. */}
        <AnimatePresence>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <OrganogramaStats totalDeptos={stats.totalDeptos} totalColabs={stats.totalColabs} niveis={niveis} />
            <OrganogramaToolbar
              search={search}
              onSearchChange={setSearch}
              onExpandAll={handleExpandAll}
              onCollapseAll={handleCollapseAll}
            />
          </div>
        </AnimatePresence>

        {error ? (
          <SyncErrorState error={error} onRetry={refetch} entityName="organograma" />
        ) : isLoading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : nodes.length === 0 ? (
          <div className="text-center py-16 rounded-xl border border-border/60 bg-card">
            <Building2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
            <p className="font-display font-medium text-sm">Nenhuma estrutura definida</p>
            <p className="text-xs text-muted-foreground mt-1">
              Cadastre departamentos e defina seus relacionamentos hierárquicos.
            </p>
          </div>
        ) : (
          <OrganogramaTree
            nodes={filteredNodes}
            expandedIds={effectiveExpandedIds}
            onToggle={handleToggle}
            visibleDeptos={visibleStats.totalDeptos}
            visibleColabs={visibleStats.totalColabs}
            emptyState={
              <div className="text-center py-10">
                <SearchX className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">Nenhum resultado para "{search}"</p>
              </div>
            }
          />
        )}
      </PageLayout>
    </>
  );
}
