import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ShieldCheck } from 'lucide-react';
import { useAssinarAvisoFerias } from '@/hooks/useAssinarAvisoFerias';
import { useEmpresas } from '@/hooks/useEmpresas';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  solicitacao: any;
}

export function AssinarAvisoDialog({ open, onOpenChange, solicitacao }: Props) {
  const [ciencia, setCiencia] = useState(false);
  const { empresaAtual } = useEmpresas();
  const { assinar, isSigning } = useAssinarAvisoFerias();

  const handleAssinar = async () => {
    await assinar({
      ferias: solicitacao,
      colaborador: solicitacao?.colaborador ?? {},
      empresa: empresaAtual ?? {},
    });
    setCiencia(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-success" />
            Assinar Aviso de Férias
          </DialogTitle>
          <DialogDescription>
            Você aprovará como RH e assinará eletronicamente o Aviso de Férias
            (CLT arts. 135 e 145 · MP 2.200-2/2001).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <p><strong>Colaborador:</strong> {solicitacao?.colaborador?.nome_completo || '—'}</p>
            <p><strong>Período:</strong> {solicitacao?.data_inicio} a {solicitacao?.data_fim}</p>
            <p><strong>Dias de gozo:</strong> {solicitacao?.dias_gozo ?? '—'}</p>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <Checkbox
              checked={ciencia}
              onCheckedChange={(v) => setCiencia(Boolean(v))}
              className="mt-0.5"
            />
            <span className="text-xs text-muted-foreground">
              Confirmo a ciência do colaborador e aprovo estas férias conforme
              CLT art. 135. Assinarei eletronicamente com validade jurídica
              (SHA-256, timestamp, IP e user-agent registrados).
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSigning}>
            Cancelar
          </Button>
          <Button
            onClick={handleAssinar}
            disabled={!ciencia || isSigning}
            className="gap-2"
          >
            {isSigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Assinar e Aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
