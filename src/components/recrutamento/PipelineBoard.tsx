import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Archive, Clock } from 'lucide-react';
import type { CandidaturaComRelacoes } from '@/types/recrutamento';
import { ETAPAS, etapaPorId, formatarUltimaAtualizacao, type EtapaPipelineId } from './pipelineEtapas';
import { podeArrastarCandidatura, ehEtapaDoPipeline, normalizarEtapa } from './pipelineDragDrop';
import { PipelineCard, type MoverEtapaHandler } from './PipelineCard';
import { PipelineColumn } from './PipelineColumn';

/**
 * PIPELINE — board das cinco etapas no MESMO padrão do Kanban de Admissão.
 *
 * ── ESTRUTURA (referência: `admissoes/AdmissoesKanban.tsx`) ──────────────────
 * • A faixa rola só na HORIZONTAL (`overflow-x-auto overflow-y-hidden`); cada
 *   coluna tem largura fixa de 272px e a MESMA altura externa
 *   (`h-[calc(100vh-19rem)] max-h-[900px] min-h-[520px]`), então 4 colunas
 *   inteiras + parte da 5ª aparecem em 1600px — nada é comprimido.
 * • Dentro da coluna, só a LISTA rola na vertical (cabeçalho e rodapé fixos).
 *   A lista NÃO usa `overscroll-behavior: contain`: ao chegar ao fim, a roda
 *   continua rolando a página (sem o aprisionamento que existia antes).
 * • As colunas vazias mostram a caixa tracejada discreta "Solte aqui" — sem
 *   bloco colorido gigante.
 *
 * ── ARRASTE (referência: `AdmissoesKanban.tsx` + `KanbanColumn.tsx`) ────────
 * • `PointerSensor` com `distance: 6`: clique no card/menu não vira arraste; a
 *   roda do mouse nem dispara `pointerdown`, então rolar nunca arrasta.
 * • Os cards são `useDraggable`; CADA COLUNA é a única zona de soltura
 *   (`useDroppable` com o id da etapa). O card de origem fica em 30% e o
 *   `DragOverlay` (portalado no `body`) segue o cursor com o mesmo desenho.
 * • No drop, a etapa é gravada pelo fluxo QUE JÁ EXISTIA (`onMoverEtapa` →
 *   `moverCandidaturaMock` no demo, `atualizarCandidatura` no real). Enquanto a
 *   gravação está em voo, o card fica na coluna de destino por um override
 *   otimista; falha = rollback + toast da página.
 * • Estados arquivado/cancelado/rejeitado não são arrastáveis; o menu "Mover
 *   para" continua sendo a via acessível (teclado incluído).
 * • Contratado é apenas uma etapa do funil: soltar ali NÃO efetiva contratação,
 *   exatamente como o menu existente.
 *
 * A ordem dos cards é a do servidor/mock (não há ordenação manual na coluna —
 * igual à Admissão). Nenhuma migration foi criada.
 */
export interface PipelineBoardProps {
  candidaturas: readonly CandidaturaComRelacoes[];
  onAbrir: (cand: CandidaturaComRelacoes) => void;
  onMoverEtapa: MoverEtapaHandler;
  onContatar: (cand: CandidaturaComRelacoes) => void;
  onSimular: (acao: string) => void;
}

type EtapasLocais = Record<string, EtapaPipelineId>;

export function PipelineBoard({ candidaturas, onAbrir, onMoverEtapa, onContatar, onSimular }: PipelineBoardProps) {
  const sensores = useSensors(
    useSensor(PointerSensor, {
      // Mesmo sensor/constraint do Kanban de Admissão.
      activationConstraint: { distance: 6 },
    })
  );

  const [ativo, setAtivo] = useState<string | null>(null);
  const [larguraAtiva, setLarguraAtiva] = useState<number | null>(null);
  const [etapasLocais, setEtapasLocais] = useState<EtapasLocais>({});
  /**
   * O browser emite `click` no fim de um arraste (inclusive após cancelar com
   * Escape). Bloqueia UM clique residual para não abrir o dossiê sem intenção.
   */
  const bloqueioClique = useRef<{ handler: (event: MouseEvent) => void; timer: number } | null>(null);

  const porId = useMemo(() => new Map(candidaturas.map((cand) => [cand.id, cand])), [candidaturas]);

  // Quando o dado do servidor/mock já reflete a etapa otimista, o override sai
  // de cena. Sincronização legítima de estado efêmero com props.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincronização de estado efêmero com o dado que chegou
    setEtapasLocais((anterior) => {
      const entradas = Object.entries(anterior);
      if (entradas.length === 0) return anterior;
      let mudou = false;
      const proximo = { ...anterior };
      for (const [id, etapa] of entradas) {
        const cand = porId.get(id);
        if (!cand || normalizarEtapa(cand.etapa) === etapa) {
          delete proximo[id];
          mudou = true;
        }
      }
      return mudou ? proximo : anterior;
    });
  }, [porId]);

  /** Agrupa por etapa EFETIVA (base + override otimista), preservando a ordem recebida. */
  const grupos = useMemo(() => {
    const mapa: Record<EtapaPipelineId, CandidaturaComRelacoes[]> = {
      triagem: [],
      entrevista: [],
      teste: [],
      proposta: [],
      contratado: [],
    };
    for (const cand of candidaturas) {
      const etapa = etapasLocais[cand.id] ?? normalizarEtapa(cand.etapa);
      mapa[etapa].push(cand);
    }
    return mapa;
  }, [candidaturas, etapasLocais]);

  const limparBloqueioClique = useCallback(() => {
    const atual = bloqueioClique.current;
    if (!atual) return;
    document.removeEventListener('click', atual.handler, true);
    window.clearTimeout(atual.timer);
    bloqueioClique.current = null;
  }, []);

  const suprimirClique = useCallback(() => {
    limparBloqueioClique();
    const handler = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      limparBloqueioClique();
    };
    const timer = window.setTimeout(limparBloqueioClique, 1500);
    bloqueioClique.current = { handler, timer };
    document.addEventListener('click', handler, true);
  }, [limparBloqueioClique]);

  useEffect(() => limparBloqueioClique, [limparBloqueioClique]);

  const aoIniciarArraste = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (!porId.has(id)) return;
    setAtivo(id);
    setLarguraAtiva(event.active.rect.current.initial?.width ?? null);
  };

  const aoSoltar = async (event: DragEndEvent) => {
    const id = String(event.active.id);
    const cand = porId.get(id);
    const alvo = event.over?.id ? String(event.over.id) : null;

    setAtivo(null);
    setLarguraAtiva(null);
    suprimirClique();

    if (!cand || !ehEtapaDoPipeline(alvo) || !podeArrastarCandidatura(cand.status)) return;

    const origem = etapasLocais[id] ?? normalizarEtapa(cand.etapa);
    if (alvo === origem) return;

    setEtapasLocais((anterior) => ({ ...anterior, [id]: alvo }));

    let resultado: void | boolean;
    try {
      resultado = await onMoverEtapa(id, alvo);
    } catch {
      resultado = false;
    }

    if (resultado === false) {
      setEtapasLocais((anterior) => {
        const proximo = { ...anterior };
        delete proximo[id];
        return proximo;
      });
    }
  };

  const aoCancelarArraste = () => {
    setAtivo(null);
    setLarguraAtiva(null);
    suprimirClique();
  };

  const ultimaAtualizacao = formatarUltimaAtualizacao(candidaturas);
  const arquivadas = candidaturas.filter((cand) =>
    ['arquivado', 'arquivada', 'rejeitado', 'rejeitada', 'cancelado', 'cancelada'].includes(cand.status ?? '')
  ).length;
  const candAtivo = ativo ? (porId.get(ativo) ?? null) : null;
  const etapaAtiva = ativo ? etapaPorId(etapasLocais[ativo] ?? porId.get(ativo)?.etapa) : null;

  return (
    <div className="flex min-w-0 flex-col">
      <DndContext
        sensors={sensores}
        onDragStart={aoIniciarArraste}
        onDragEnd={aoSoltar}
        onDragCancel={aoCancelarArraste}
      >
        <div data-pipeline-board className="-mx-2 flex items-end gap-3 overflow-x-auto overflow-y-hidden px-2 pb-4">
          {ETAPAS.map((etapa) => (
            <PipelineColumn
              key={etapa.id}
              etapa={etapa}
              items={grupos[etapa.id]}
              onAdicionar={(alvo) => onSimular(`adicionar candidato em ${alvo.label}`)}
              onAbrir={onAbrir}
              onMoverEtapa={onMoverEtapa}
              onContatar={onContatar}
            />
          ))}
        </div>

        {/* Portal no body: imune ao overflow do board e ao `transform`/`filter`
            dos wrappers de transição — o overlay fica preso ao ponteiro. */}
        {createPortal(
          <DragOverlay dropAnimation={null}>
            {candAtivo && etapaAtiva ? (
              <div data-pipeline-arrastado className="pointer-events-none" style={{ width: larguraAtiva ?? undefined }}>
                <PipelineCard
                  cand={candAtivo}
                  etapa={etapaAtiva}
                  dragging
                  onAbrir={() => undefined}
                  onMoverEtapa={() => undefined}
                  onContatar={() => undefined}
                />
              </div>
            ) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>

      <footer
        data-pipeline-footer
        className="mt-3 flex flex-col gap-2 border-t border-border/40 pt-3 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            Mostrando <strong className="font-semibold tabular-nums text-foreground">{candidaturas.length}</strong>{' '}
            {candidaturas.length === 1 ? 'candidato' : 'candidatos'}
          </span>
          <span aria-hidden className="hidden h-3 w-px bg-border/60 sm:block" />
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden />
            Última atualização: {ultimaAtualizacao}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onSimular('ver etapas arquivadas')}
          className="inline-flex items-center gap-1.5 self-start rounded-md px-1 py-0.5 font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:self-auto"
        >
          <Archive className="h-3 w-3" aria-hidden />
          Ver etapas arquivadas
          <span className="tabular-nums text-muted-foreground/70">({arquivadas})</span>
        </button>
      </footer>
    </div>
  );
}
