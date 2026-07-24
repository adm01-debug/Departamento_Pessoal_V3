import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (motivo: string) => Promise<void> | void;
  isPending?: boolean;
}

export function RejeitarDialog({ open, onOpenChange, onConfirm, isPending }: Props) {
  const [motivo, setMotivo] = useState('');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rejeitar programação</DialogTitle>
        </DialogHeader>
        <div>
          <Label>Motivo</Label>
          <Textarea
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ex.: mês com pico operacional, conflito com outro colaborador do time..."
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="destructive"
            disabled={motivo.trim().length < 3 || isPending}
            onClick={async () => {
              await onConfirm(motivo.trim());
              setMotivo('');
              onOpenChange(false);
            }}
          >
            Rejeitar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
