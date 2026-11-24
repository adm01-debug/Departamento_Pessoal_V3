import { useState } from 'react';
import { format } from 'date-fns';
import { useProrrogacoesAfastamento } from '@/hooks/useAfastamentos';
import type { AfastamentoCrudItem } from '@/types/afastamentos';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ProrrogacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  afastamento: AfastamentoCrudItem | null;
}

const initialForm = { data_fim_nova: '', motivo: '', data_pericia: '', numero_beneficio_novo: '' };

function diasEntre(inicioISO: string, fimISO: string): number {
  const inicio = new Date(`${inicioISO}T00:00:00`);
  const fim = new Date(`${fimISO}T00:00:00`);
  return Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
}

export function ProrrogacaoDialog({ open, onOpenChange, afastamento }: ProrrogacaoDialogProps) {
  const { criar, isCriando } = useProrrogacoesAfastamento(afastamento?.id);
  const [form, setForm] = useState(initialForm);

  const handleOpenChange = (aberto: boolean) => {
    if (!aberto) setForm(initialForm);
    onOpenChange(aberto);
  };

  const fimAnterior = afastamento?.data_fim_prevista ?? '';
  const diasAdicionais = fimAnterior && form.data_fim_nova ? diasEntre(fimAnterior, form.data_fim_nova) : 0;
  const dataInvalida = !!form.data_fim_nova && diasAdicionais <= 0;

  const handleSubmit = async () => {
    if (!afastamento || !fimAnterior || diasAdicionais <= 0) return;
    try {
      await criar({
        afastamento_id: afastamento.id,
        data_fim_anterior: fimAnterior,
        data_fim_nova: form.data_fim_nova,
        dias_adicionais: diasAdicionais,
        motivo: form.motivo || null,
        data_pericia: form.data_pericia || null,
        numero_beneficio_novo: form.numero_beneficio_novo || null,
      });
      handleOpenChange(false);
    } catch {
      // Erro já notificado pelo onError do hook (toast).
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Prorrogar Afastamento</DialogTitle>
          <div className="text-sm text-muted-foreground">
            {afastamento?.colaborador?.nome_completo}
            {fimAnterior && ` — fim previsto atual: ${format(new Date(`${fimAnterior}T00:00:00`), 'dd/MM/yyyy')}`}
          </div>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="prorr-data-fim">Nova data de fim *</Label>
            <Input
              id="prorr-data-fim"
              type="date"
              min={fimAnterior || undefined}
              value={form.data_fim_nova}
              onChange={(e) => setForm((p) => ({ ...p, data_fim_nova: e.target.value }))}
            />
            {dataInvalida ? (
              <p className="text-xs text-destructive mt-1">A nova data deve ser posterior ao fim previsto atual.</p>
            ) : diasAdicionais > 0 ? (
              <p className="text-xs text-muted-foreground mt-1">+{diasAdicionais} dia(s)</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="prorr-pericia">Data da perícia</Label>
              <Input
                id="prorr-pericia"
                type="date"
                value={form.data_pericia}
                onChange={(e) => setForm((p) => ({ ...p, data_pericia: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="prorr-beneficio">Nº benefício (novo)</Label>
              <Input
                id="prorr-beneficio"
                value={form.numero_beneficio_novo}
                onChange={(e) => setForm((p) => ({ ...p, numero_beneficio_novo: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="prorr-motivo">Motivo</Label>
            <Textarea
              id="prorr-motivo"
              value={form.motivo}
              onChange={(e) => setForm((p) => ({ ...p, motivo: e.target.value }))}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!afastamento || !fimAnterior || diasAdicionais <= 0 || isCriando}
          >
            {isCriando ? 'Salvando...' : 'Registrar Prorrogação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
