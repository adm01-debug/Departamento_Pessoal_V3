import { useMemo, useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { admissaoService } from '@/services/admissaoService';
import { useQueryClient } from '@tanstack/react-query';
import { useEmpresas } from '@/hooks/useEmpresas';
import { formatDate } from '@/utils/format';
import { GripVertical } from 'lucide-react';

type Admissao = {
  id: string;
  nome: string;
  cargo?: string | null;
  departamento?: string | null;
  etapa: string;
  data_prevista?: string | null;
  salario_proposto?: number | null;
};

const COLUMNS: { key: string; label: string; accent: string }[] = [
  { key: 'solicitacao', label: 'Solicitação', accent: 'from-muted to-muted/50' },
  { key: 'documentos', label: 'Documentos', accent: 'from-warning/20 to-warning/5' },
  { key: 'validacao', label: 'Validação', accent: 'from-info/20 to-info/5' },
  { key: 'pendente', label: 'Pendente', accent: 'from-muted to-muted/40' },
  { key: 'exame', label: 'Exame', accent: 'from-warning/20 to-warning/5' },
  { key: 'contrato', label: 'Contrato', accent: 'from-info/20 to-info/5' },
  { key: 'assinatura', label: 'Assinatura', accent: 'from-primary/20 to-primary/5' },
  { key: 'esocial', label: 'eSocial', accent: 'from-success/20 to-success/5' },
];

/**
 * Escudo de entrada do board (aba "Kanban").
 *
 * Duas coisas em jogo, as duas já documentadas nos outros cards da área:
 *  1. o card do board é um `motion.create(Card)` — a Motion entra no PRÓPRIO nó
 *     do `<Card>` (mesmo caminho de `DashboardExecutivoPage.tsx`), sem wrapper
 *     novo. O `<div>` do dnd-kit (`useDraggable`) continua exatamente onde
 *     estava, então as medições do sensor de arraste e a largura da coluna não
 *     mudam;
 *  2. `cardVariants` vem IMPORTADO de `dashboard/MetricCard.tsx` — é a MESMA
 *     animação de entrada dos KPI Cards do Dashboard Executivo (fade + subida
 *     de 20px, 0.08s de cadência por card, 0.4s de duração), não uma cópia.
 */
const MotionCard = motion.create(Card);

/**
 * Teto do `custom` (posição na fila) — MESMA trava de
 * `ColaboradorDirectoryGrid.tsx`/`DIRECTORY_MAX_STAGGER_INDEX`: a cadência do
 * `cardVariants` é 0.08s por card e o board real tem dezenas de admissões, então
 * uma contagem contínua faria o último card da última coluna entrar segundos
 * depois do primeiro. Do 6º card em diante todos entram juntos (0.4s), o que
 * preserva a leitura esquerda → direita, topo antes da base, sem alongar a
 * entrada do board.
 */
const KANBAN_MAX_STAGGER_INDEX = 5;

function KanbanCard({
  item,
  dragging,
  index = 0,
  reveal = true,
}: {
  item: Admissao;
  dragging?: boolean;
  /**
   * Posição do card na ORDEM DE LEITURA do board (coluna por coluna, de cima
   * para baixo) — é o `custom` que `cardVariants` usa como atraso da cascata:
   * a esquerda entra antes da direita, e o topo antes da base.
   */
  index?: number;
  /**
   * `false` = o card já entrou (ou acabou de ser arrastado): monta direto no
   * estado final, sem refazer a animação. Usado no card promovido a
   * `DragOverlay` e nos cards movidos por drag nesta sessão — eles trocam de
   * coluna (o React desmonta/remonta o nó ao mudar de lista), o que sem essa
   * trava faria o card reaparecer "subindo" no meio da operação.
   */
  reveal?: boolean;
}) {
  return (
    <MotionCard
      custom={index}
      variants={cardVariants}
      initial={reveal ? 'hidden' : false}
      animate="visible"
      className={cn(
        'p-3 space-y-1.5 cursor-grab active:cursor-grabbing bg-card border-border/40 hover:border-primary/40 transition-colors',
        dragging && 'shadow-lg ring-2 ring-primary/40 opacity-90'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{item.nome}</p>
          <p className="text-xs text-muted-foreground truncate">{item.cargo}</p>
        </div>
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
      </div>
      <div className="flex items-center justify-between gap-2">
        {item.departamento && (
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 truncate max-w-[120px]">
            {item.departamento}
          </Badge>
        )}
        {item.data_prevista && (
          <span className="text-[10px] text-muted-foreground">{formatDate(item.data_prevista)}</span>
        )}
      </div>
    </MotionCard>
  );
}

function DraggableCard({ item, index, reveal }: { item: Admissao; index: number; reveal: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={cn(isDragging && 'opacity-30')}>
      <KanbanCard item={item} index={index} reveal={reveal} />
    </div>
  );
}

function Column({
  columnKey,
  label,
  accent,
  items,
  indices,
  movidos,
}: {
  columnKey: string;
  label: string;
  accent: string;
  items: Admissao[];
  /** id do card → posição dele na ordem de leitura do board (o `custom` da cascata). */
  indices: ReadonlyMap<string, number>;
  /** ids que já foram movidos por drag nesta sessão: não refazem a entrada. */
  movidos: ReadonlySet<string>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-xl border border-border/30 bg-gradient-to-b p-3 min-w-[260px] w-[260px] transition-colors',
        accent,
        isOver && 'ring-2 ring-primary/60'
      )}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-foreground/80">{label}</h4>
        <Badge variant="secondary" className="text-[10px] h-5 min-w-[22px]">
          {items.length}
        </Badge>
      </div>
      <div className="flex-1 space-y-2 min-h-[100px] overflow-y-auto max-h-[calc(100vh-320px)]">
        {items.map((it, i) => (
          /* `indices` mantém a contagem contínua entre as colunas (0…N na ordem
             de leitura do board); `i` é só o fallback se o id ainda não estiver
             no mapa. O `custom` é limitado por `KANBAN_MAX_STAGGER_INDEX` para a
             cascata não esticar (ver a constante). `reveal` falso = card movido
             por drag: entra direto no lugar, sem "subir de novo". */
          <DraggableCard
            key={it.id}
            item={it}
            index={Math.min(indices.get(it.id) ?? i, KANBAN_MAX_STAGGER_INDEX)}
            reveal={!movidos.has(it.id)}
          />
        ))}
        {items.length === 0 && (
          <div className="text-[11px] text-muted-foreground/60 text-center py-6 border border-dashed border-border/40 rounded-lg">
            Solte aqui
          </div>
        )}
      </div>
    </div>
  );
}

export function AdmissoesKanban({ admissoes }: { admissoes: Admissao[] }) {
  const qc = useQueryClient();
  const { empresaAtual } = useEmpresas();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, string>>({});

  const grouped = useMemo(() => {
    const map: Record<string, Admissao[]> = {};
    COLUMNS.forEach((c) => (map[c.key] = []));
    for (const a of admissoes) {
      const etapa = optimistic[a.id] ?? a.etapa;
      if (!map[etapa]) map[etapa] = [];
      map[etapa].push({ ...a, etapa });
    }
    return map;
  }, [admissoes, optimistic]);

  const activeItem = useMemo(() => admissoes.find((a) => a.id === activeId) || null, [activeId, admissoes]);

  /**
   * Posição de cada card na ORDEM DE LEITURA do board: as colunas da esquerda
   * primeiro (todas as delas, de cima para baixo), depois as da direita. É o
   * `custom` que a cascata usa — a mesma leitura esquerda → direita, topo antes
   * da base dos KPI Cards do Dashboard Executivo.
   */
  const indicesDeEntrada = useMemo(() => {
    const mapa = new Map<string, number>();
    let i = 0;
    COLUMNS.forEach((col) => (grouped[col.key] || []).forEach((item) => mapa.set(item.id, i++)));
    return mapa;
  }, [grouped]);

  /**
   * Cards movidos por drag NESTA sessão. Eles trocam de coluna, o React
   * desmonta/remonta o nó dessa lista e, sem a trava, o card refaria a entrada
   * (voltando a "subir") toda vez que fosse solto. Com ela, só os cards que
   * estão chegando agora é que animam.
   */
  const movidos = useMemo(() => new Set(Object.keys(optimistic)), [optimistic]);

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const id = String(e.active.id);
    const target = e.over?.id ? String(e.over.id) : null;
    if (!target) return;
    const current = admissoes.find((a) => a.id === id);
    if (!current || current.etapa === target) return;

    setOptimistic((s) => ({ ...s, [id]: target }));
    try {
      await admissaoService.atualizar(id, { etapa: target }, empresaAtual?.id);
      toast.success(`Movido para ${COLUMNS.find((c) => c.key === target)?.label ?? target}`);
      await qc.invalidateQueries({ queryKey: ['admissoes'] });
    } catch (err) {
      setOptimistic((s) => {
        const next = { ...s };
        delete next[id];
        return next;
      });
      toast.error(safeErrorMessage(err, 'Falha ao mover admissão.'));
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* `AnimatePresence` local, sem props (ver `COLUMNS`/KanbanCard acima):
          a aba "Kanban" só monta quando o usuário entra nela e a rota já publica
          um contexto de presença com `initial={false}` (`PageTransition.tsx`) —
          sem o contexto novo aqui, o keyframe `hidden` seria suprimido e a
          cascata não tocaria. Não renderiza DOM: a faixa com scroll horizontal
          continua sendo o mesmo `<div className="flex gap-3 overflow-x-auto …">`. */}
      <AnimatePresence>
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
          {COLUMNS.map((col) => (
            <Column
              key={col.key}
              columnKey={col.key}
              label={col.label}
              accent={col.accent}
              items={grouped[col.key] || []}
              indices={indicesDeEntrada}
              movidos={movidos}
            />
          ))}
        </div>
      </AnimatePresence>
      <DragOverlay dropAnimation={null}>
        {/* `reveal={false}`: o card que está na mão já entrou no board antes de
            ser levantado — o clone do overlay monta no estado final, sem
            cascata (uma animação de entrada aqui pareceria o card "nascendo"
            durante o arraste). */}
        {activeItem ? <KanbanCard item={activeItem} dragging reveal={false} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
