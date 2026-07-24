import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { toast } from 'sonner';
import { AlertCircle, Archive, Check, ClipboardList, Gavel, ShieldCheck, UserCheck, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { medidasDisciplinaresService } from '@/services/medidasDisciplinaresService';
import { useEmpresas } from '@/hooks/useEmpresas';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Status =
  | 'rascunho'
  | 'aguardando_gestor'
  | 'aguardando_rh'
  | 'aguardando_juridico'
  | 'aplicada'
  | 'rejeitada'
  | 'arquivada';

interface Medida {
  id: string;
  tipo: string;
  descricao: string;
  status_workflow: Status;
  data_ocorrencia: string;
  gravidade?: string | null;
  colaborador?: { nome_completo: string } | null;
}

const COLUNAS: Array<{ id: Status; titulo: string; icon: typeof ClipboardList; cor: string }> = [
  { id: 'rascunho',            titulo: 'Rascunho',            icon: ClipboardList, cor: 'border-muted-foreground/30' },
  { id: 'aguardando_gestor',   titulo: 'Gestor',              icon: UserCheck,     cor: 'border-blue-500/50' },
  { id: 'aguardando_rh',       titulo: 'RH',                  icon: ShieldCheck,   cor: 'border-purple-500/50' },
  { id: 'aguardando_juridico', titulo: 'Jurídico',            icon: Gavel,         cor: 'border-orange-500/50' },
  { id: 'aplicada',            titulo: 'Aplicada',            icon: Check,         cor: 'border-primary/60' },
  { id: 'rejeitada',           titulo: 'Rejeitada',           icon: X,             cor: 'border-destructive/60' },
  { id: 'arquivada',           titulo: 'Arquivada',           icon: Archive,       cor: 'border-muted-foreground/20' },
];

const TIPO_LABEL: Record<string, string> = {
  advertencia_verbal: 'Adv. verbal',
  advertencia_escrita: 'Adv. escrita',
  suspensao: 'Suspensão',
  justa_causa: 'Justa causa',
};

function CardMedida({ medida }: { medida: Medida }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: medida.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'rounded-md border border-border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing transition-opacity',
        isDragging && 'opacity-30',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {TIPO_LABEL[medida.tipo] ?? medida.tipo}
        </span>
        {medida.gravidade && (
          <Badge variant={medida.gravidade === 'gravissima' || medida.gravidade === 'grave' ? 'destructive' : 'secondary'} className="text-[10px]">
            {medida.gravidade}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-sm font-medium text-foreground line-clamp-1">
        {medida.colaborador?.nome_completo ?? '—'}
      </p>
      <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{medida.descricao}</p>
      <p className="mt-2 text-[10px] text-muted-foreground">
        {format(new Date(medida.data_ocorrencia), "dd/MM/yyyy", { locale: ptBR })}
      </p>
    </div>
  );
}

function Coluna({
  status,
  titulo,
  Icon,
  cor,
  medidas,
}: {
  status: Status;
  titulo: string;
  Icon: typeof ClipboardList;
  cor: string;
  medidas: Medida[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <Card ref={setNodeRef} className={cn('flex min-w-[260px] flex-1 flex-col border-t-4', cor, isOver && 'ring-2 ring-primary')}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {titulo}
          </span>
          <Badge variant="outline">{medidas.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ScrollArea className="h-[520px] pr-2">
          <div className="space-y-2">
            {medidas.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Vazio</p>
            ) : (
              medidas.map((m) => <CardMedida key={m.id} medida={m} />)
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function MedidasKanban() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const [dragId, setDragId] = useState<string | null>(null);
  const [rejeitarOpen, setRejeitarOpen] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  const { data: medidas = [], isLoading } = useQuery<Medida[]>({
    queryKey: ['medidas-kanban', empresaAtual?.id],
    queryFn: () => medidasDisciplinaresService.listar(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const grupos = useMemo(() => {
    const g: Record<Status, Medida[]> = {
      rascunho: [], aguardando_gestor: [], aguardando_rh: [], aguardando_juridico: [],
      aplicada: [], rejeitada: [], arquivada: [],
    };
    for (const m of medidas) {
      const s = (m.status_workflow ?? 'aplicada') as Status;
      if (g[s]) g[s].push(m);
    }
    return g;
  }, [medidas]);

  const invalidar = () => qc.invalidateQueries({ queryKey: ['medidas-kanban', empresaAtual?.id] });

  const enviar = useMutation({
    mutationFn: (id: string) => medidasDisciplinaresService.enviarAprovacao(id),
    onSuccess: () => { toast.success('Enviado para aprovação do gestor'); invalidar(); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao enviar'),
  });
  const aprovar = useMutation({
    mutationFn: (id: string) => medidasDisciplinaresService.aprovar(id),
    onSuccess: (r: any) => { toast.success(`Aprovado → ${r?.status ?? 'próxima etapa'}`); invalidar(); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao aprovar'),
  });
  const rejeitar = useMutation({
    mutationFn: ({ id, m }: { id: string; m: string }) => medidasDisciplinaresService.rejeitar(id, m),
    onSuccess: () => { toast.success('Medida rejeitada'); invalidar(); setRejeitarOpen(null); setMotivo(''); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao rejeitar'),
  });
  const arquivar = useMutation({
    mutationFn: (id: string) => medidasDisciplinaresService.arquivar(id),
    onSuccess: () => { toast.success('Medida arquivada'); invalidar(); },
    onError: (e: any) => toast.error(e?.message ?? 'Erro ao arquivar'),
  });

  function onDragStart(e: DragStartEvent) {
    setDragId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setDragId(null);
    const id = String(e.active.id);
    const alvo = e.over?.id as Status | undefined;
    if (!alvo) return;
    const medida = medidas.find((m) => m.id === id);
    if (!medida) return;
    const origem = medida.status_workflow;
    if (origem === alvo) return;

    // Transições suportadas via drag
    if (origem === 'rascunho' && alvo === 'aguardando_gestor') return enviar.mutate(id);
    if (origem === 'aguardando_gestor' && alvo === 'aguardando_rh') return aprovar.mutate(id);
    if (origem === 'aguardando_rh' && (alvo === 'aguardando_juridico' || alvo === 'aplicada')) return aprovar.mutate(id);
    if (origem === 'aguardando_juridico' && alvo === 'aplicada') return aprovar.mutate(id);
    if ((origem === 'aplicada' || origem === 'rejeitada') && alvo === 'arquivada') return arquivar.mutate(id);
    if (['aguardando_gestor','aguardando_rh','aguardando_juridico'].includes(origem) && alvo === 'rejeitada') {
      setRejeitarOpen(id);
      return;
    }
    toast.error(`Transição inválida: ${origem} → ${alvo}`);
  }

  const draggedMedida = dragId ? medidas.find((m) => m.id === dragId) : null;

  if (!empresaAtual?.id) {
    return (
      <div className="flex items-center gap-2 rounded border border-border p-4 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" /> Selecione uma empresa para visualizar o Kanban.
      </div>
    );
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {COLUNAS.map((c) => (
            <Coluna key={c.id} status={c.id} titulo={c.titulo} Icon={c.icon} cor={c.cor} medidas={grupos[c.id]} />
          ))}
        </div>
        <DragOverlay>
          {draggedMedida ? <CardMedida medida={draggedMedida} /> : null}
        </DragOverlay>
      </DndContext>

      {isLoading && <p className="mt-2 text-xs text-muted-foreground">Carregando…</p>}

      <p className="mt-3 text-xs text-muted-foreground">
        Dica: arraste para <strong>Gestor → RH → Jurídico → Aplicada</strong>. Suspensões e casos graves/gravíssimos passam pelo Jurídico automaticamente. Arraste para <strong>Rejeitada</strong> para informar o motivo. Aplicadas ou rejeitadas podem ser <strong>Arquivadas</strong>.
      </p>

      <Dialog open={!!rejeitarOpen} onOpenChange={(o) => { if (!o) { setRejeitarOpen(null); setMotivo(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar medida disciplinar</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição (mínimo 5 caracteres). Ficará registrado no histórico do fluxo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo-rejeicao">Motivo</Label>
            <Textarea
              id="motivo-rejeicao"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: Fato precisa de mais evidências antes de aplicação."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejeitarOpen(null); setMotivo(''); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={motivo.trim().length < 5 || rejeitar.isPending}
              onClick={() => rejeitarOpen && rejeitar.mutate({ id: rejeitarOpen, m: motivo.trim() })}
            >
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
