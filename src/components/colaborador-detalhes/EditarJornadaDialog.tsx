import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { jornadaService } from '@/services';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

interface Jornada {
  id: string;
  horario_entrada?: string | null;
  horario_saida?: string | null;
  intervalo_minutos?: number | null;
  carga_horaria_semanal?: number | null;
}

interface EditarJornadaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jornada: Jornada | null;
  empresaId: string;
}

export function EditarJornadaDialog({ open, onOpenChange, jornada, empresaId }: EditarJornadaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        {jornada && (
          <EditarJornadaForm key={jornada.id} jornada={jornada} empresaId={empresaId} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Remontado (via `key={jornada.id}`) sempre que o modal abre para uma jornada
 *  diferente — o estado inicial já nasce correto, sem precisar de um efeito
 *  para sincronizar o form com a prop depois da montagem. */
function EditarJornadaForm({ jornada, empresaId, onDone }: { jornada: Jornada; empresaId: string; onDone: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    horario_entrada: (jornada.horario_entrada || '').slice(0, 5),
    horario_saida: (jornada.horario_saida || '').slice(0, 5),
    intervalo_minutos: String(jornada.intervalo_minutos ?? ''),
    carga_horaria_semanal: String(jornada.carga_horaria_semanal ?? ''),
  });

  const salvar = useMutation({
    mutationFn: () => jornadaService.atualizarJornada(jornada.id, {
      horario_entrada: form.horario_entrada,
      horario_saida: form.horario_saida,
      intervalo_minutos: Number(form.intervalo_minutos),
      carga_horaria_semanal: Number(form.carga_horaria_semanal),
    }, empresaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jornadas'] });
      qc.invalidateQueries({ queryKey: ['jornada-colaborador'] });
      toast.success('Escala atualizada com sucesso.');
      onDone();
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Não foi possível atualizar a escala.')),
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar Jornada</DialogTitle>
      </DialogHeader>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Entrada</Label>
            <Input type="time" value={form.horario_entrada} onChange={e => setForm(p => ({ ...p, horario_entrada: e.target.value }))} />
          </div>
          <div>
            <Label>Saída</Label>
            <Input type="time" value={form.horario_saida} onChange={e => setForm(p => ({ ...p, horario_saida: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Intervalo (minutos)</Label>
            <Input type="number" value={form.intervalo_minutos} onChange={e => setForm(p => ({ ...p, intervalo_minutos: e.target.value }))} />
          </div>
          <div>
            <Label>Carga semanal (horas)</Label>
            <Input type="number" value={form.carga_horaria_semanal} onChange={e => setForm(p => ({ ...p, carga_horaria_semanal: e.target.value }))} />
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20 text-xs text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Atenção: esta jornada pode ser utilizada por outros colaboradores. Alterações neste horário podem
            refletir em outros vínculos que utilizam esta jornada.
          </span>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancelar</Button>
        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          Salvar alterações
        </Button>
      </DialogFooter>
    </>
  );
}
