import { useMemo, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Network } from 'lucide-react';
import { OrganogramaNode } from '@/components/organograma/OrganogramaNode';
import { buildCascadeIndex, buildRevealWave, pluralize, type OrgDepartamento } from '@/lib/organogramaTree';

interface OrganogramaTreeProps {
  nodes: OrgDepartamento[];
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  visibleDeptos: number;
  visibleColabs: number;
  emptyState: ReactNode;
}

export function OrganogramaTree({
  nodes,
  expandedIds,
  onToggle,
  visibleDeptos,
  visibleColabs,
  emptyState,
}: OrganogramaTreeProps) {
  // Posição de cada row na cascata de entrada (raiz → subdepartamentos →
  // colaboradores). Depende de quem está expandido: só rows realmente
  // renderizadas consomem posição, então abrir um departamento renumera o que
  // vem depois sem deixar buraco de delay nas rows seguintes.
  const cascadeIndex = useMemo(() => buildCascadeIndex(nodes, expandedIds), [nodes, expandedIds]);

  // Onda dos blocos (ver organogramaReveal.ts): onde cada bloco está na fila de
  // abrir e na de fechar. Depende SÓ da árvore — não de quem está expandido —
  // de propósito: os slots de fechamento precisam continuar iguais enquanto a
  // página recolhe um nível por vez (buildCollapseStages), e a ordem de abertura
  // é a mesma da cascata das rows, então a fila não pode se remexer a cada clique.
  const revealWave = useMemo(() => buildRevealWave(nodes), [nodes]);

  return (
    <div className="rounded-xl border border-border/60 bg-card">
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border/50 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Network className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[14px] font-display font-semibold leading-tight">Estrutura Organizacional</h2>
            <p className="text-[11px] text-muted-foreground leading-tight">Visualize a hierarquia da sua empresa</p>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground shrink-0">
          Exibindo {visibleDeptos} {pluralize(visibleDeptos, 'departamento', 'departamentos')} e {visibleColabs}{' '}
          {pluralize(visibleColabs, 'colaborador', 'colaboradores')}
        </p>
      </div>

      <div className="p-3">
        {/* `AnimatePresence` local sem props: a rota já vive dentro de um
            `<AnimatePresence initial={false}>` (PageTransition.tsx) e esse
            contexto de presença é lido por QUALQUER `motion.*` descendente —
            com `initial={false}`, a Motion pula o keyframe inicial e a cascata
            nem chega a tocar (mesmo caso já documentado e contornado em
            HistoryEventRow.tsx / HistoricoColaborador.tsx). Um contexto novo
            aqui (initial=true por padrão) libera a entrada de toda a árvore de
            uma vez, sem precisar repetir em cada row. Ele não renderiza DOM
            nenhum: layout e espaçamento seguem idênticos. */}
        {nodes.length === 0 ? (
          emptyState
        ) : (
          <AnimatePresence>
            <div className="flex flex-col gap-4">
              {nodes.map((node) => (
                <OrganogramaNode
                  key={node.id}
                  node={node}
                  level={0}
                  expandedIds={expandedIds}
                  onToggle={onToggle}
                  cascadeIndex={cascadeIndex}
                  waveIndex={revealWave}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
