import { useMemo } from 'react';
import { DndContext, DragEndEvent, PointerSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { CardProgramacao } from './CardProgramacao';
import type { ProgramacaoFerias } from '@/hooks/ferias/useProgramacaoFerias';

const MESES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

interface Props {
  programacoes: ProgramacaoFerias[];
  totalColaboradores: number;
  canManage: boolean;
  isRH: boolean;
  onMove: (id: string, novoMes: number) => void;
  onAprovarGestor: (id: string) => void;
  onAprovarRH: (id: string) => void;
  onRejeitar: (p: ProgramacaoFerias) => void;
  onConverter: (p: ProgramacaoFerias) => void;
}

function ColunaMes({
  mes,
  itens,
  totalColaboradores,
  children,
}: {
  mes: number;
  itens: ProgramacaoFerias[];
  totalColaboradores: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `mes-${mes}` });
  const pct = totalColaboradores > 0 ? (itens.length / totalColaboradores) * 100 : 0;
  const overload = pct > 30;

  return (
    <div
      ref={setNodeRef}
      role="list"
      aria-label={`Mês ${MESES[mes - 1]}`}
      className={cn(
        'flex min-h-[400px] w-64 shrink-0 flex-col rounded-xl border bg-muted/20 p-2 transition-colors',
        isOver && 'border-primary bg-primary/5',
        overload && 'border-amber-500/50'
      )}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <div>
          <p className="text-sm font-semibold">{MESES[mes - 1]}</p>
          <p className={cn('text-xs', overload ? 'text-amber-600' : 'text-muted-foreground')}>
            {itens.length} colaborador{itens.length === 1 ? '' : 'es'}
            {overload ? ` • ${pct.toFixed(0)}% do time` : ''}
          </p>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">{children}</div>
    </div>
  );
}

export function KanbanMes({
  programacoes,
  totalColaboradores,
  canManage,
  isRH,
  onMove,
  onAprovarGestor,
  onAprovarRH,
  onRejeitar,
  onConverter,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const porMes = useMemo(() => {
    const map = new Map<number, ProgramacaoFerias[]>();
    for (let m = 1; m <= 12; m++) map.set(m, []);
    programacoes.forEach((p) => map.get(p.mes_previsto)?.push(p));
    return map;
  }, [programacoes]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith('mes-')) return;
    const novoMes = Number(overId.slice(4));
    const prog = programacoes.find((p) => p.id === active.id);
    if (!prog || prog.mes_previsto === novoMes) return;
    onMove(String(active.id), novoMes);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
          <ColunaMes
            key={mes}
            mes={mes}
            itens={porMes.get(mes) ?? []}
            totalColaboradores={totalColaboradores}
          >
            {(porMes.get(mes) ?? []).map((p) => (
              <CardProgramacao
                key={p.id}
                programacao={p}
                canManage={canManage}
                isRH={isRH}
                onAprovarGestor={onAprovarGestor}
                onAprovarRH={onAprovarRH}
                onRejeitar={onRejeitar}
                onConverter={onConverter}
              />
            ))}
          </ColunaMes>
        ))}
      </div>
    </DndContext>
  );
}
