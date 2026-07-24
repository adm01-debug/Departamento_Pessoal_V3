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

function KanbanCard({ item, dragging }: { item: Admissao; dragging?: boolean }) {
  return (
    <Card
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
    </Card>
  );
}

function DraggableCard({ item }: { item: Admissao }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(isDragging && 'opacity-30')}
    >
      <KanbanCard item={item} />
    </div>
  );
}

function Column({
  columnKey,
  label,
  accent,
  items,
}: {
  columnKey: string;
  label: string;
  accent: string;
  items: Admissao[];
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
        <Badge variant="secondary" className="text-[10px] h-5 min-w-[22px]">{items.length}</Badge>
      </div>
      <div className="flex-1 space-y-2 min-h-[100px] overflow-y-auto max-h-[calc(100vh-320px)]">
        {items.map((it) => (
          <DraggableCard key={it.id} item={it} />
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

  const activeItem = useMemo(
    () => admissoes.find((a) => a.id === activeId) || null,
    [activeId, admissoes]
  );

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
    } catch (err: any) {
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
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
        {COLUMNS.map((col) => (
          <Column
            key={col.key}
            columnKey={col.key}
            label={col.label}
            accent={col.accent}
            items={grouped[col.key] || []}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeItem ? <KanbanCard item={activeItem} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
