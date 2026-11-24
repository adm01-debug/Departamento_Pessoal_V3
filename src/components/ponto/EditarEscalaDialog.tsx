import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Clock } from 'lucide-react';
import { turnoService } from '@/services/turnoService';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

interface Turno {
  id: string;
  nome: string;
  horario_inicio: string;
  horario_fim: string;
}

interface EscalaAtual {
  id: string;
  turno_id: string;
  turno?: { nome: string; horario_inicio: string; horario_fim: string } | null;
}

interface EditarEscalaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaboradorId: string;
  colaboradorNome?: string;
  empresaId: string;
  data: string;
  escalaAtual: EscalaAtual | null;
}

function formatTurno(t: { nome: string; horario_inicio: string; horario_fim: string }) {
  return `${t.nome} · ${t.horario_inicio.slice(0, 5)}–${t.horario_fim.slice(0, 5)}`;
}

export function EditarEscalaDialog({ open, onOpenChange, colaboradorId, colaboradorNome, empresaId, data, escalaAtual }: EditarEscalaDialogProps) {
  const qc = useQueryClient();
  const [turnoId, setTurnoId] = useState(escalaAtual?.turno_id || '');

  const { data: turnos = [], isLoading } = useQuery({
    queryKey: ['turnos', empresaId],
    queryFn: () => turnoService.listarTurnos(empresaId),
    enabled: open && !!empresaId,
  });

  const salvar = useMutation({
    mutationFn: async () => {
      if (escalaAtual?.id) {
        return turnoService.atualizarEscala(escalaAtual.id, { turno_id: turnoId }, empresaId);
      }
      return turnoService.criarEscala({
        empresa_id: empresaId,
        colaborador_id: colaboradorId,
        turno_id: turnoId,
        data,
        status: 'agendado',
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escala-hoje'] });
      toast.success('Escala atualizada com sucesso.');
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Não foi possível atualizar a escala.')),
  });

  return (
    <AnimatedCascadeDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Alterar Escala"
      titleIcon={Clock}
      titleIconClassName="h-5 w-5 text-primary"
      emptyMessage=""
      items={[
        <div key="form" className="space-y-3">
          {colaboradorNome && (
            <div>
              <Label className="text-xs text-muted-foreground">Colaborador</Label>
              <p className="text-sm font-medium">{colaboradorNome}</p>
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">Escala atual</Label>
            <p className="text-sm font-medium">
              {escalaAtual?.turno ? formatTurno(escalaAtual.turno) : 'Não definida'}
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : turnos.length === 0 ? (
            <div className="space-y-2 p-3 rounded-xl bg-muted/50 text-sm">
              <p>Nenhum turno cadastrado.</p>
              <p className="text-muted-foreground">Cadastre um turno em Turnos &amp; Escalas.</p>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/turnos">Ir para Turnos &amp; Escalas</Link>
              </Button>
            </div>
          ) : (
            <div>
              <Label>Novo turno</Label>
              <Select value={turnoId} onValueChange={setTurnoId}>
                <SelectTrigger><SelectValue placeholder="Selecionar turno" /></SelectTrigger>
                <SelectContent>
                  {turnos.map((t: Turno) => (
                    <SelectItem key={t.id} value={t.id}>{formatTurno(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={() => salvar.mutate()} disabled={!turnoId || salvar.isPending || turnos.length === 0}>
              Salvar
            </Button>
          </div>
        </div>,
      ]}
    />
  );
}
