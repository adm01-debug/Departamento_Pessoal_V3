import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { safeErrorMessage } from '@/utils/safeError';

// E50-33: tela de RH para cadastrar/redefinir o PIN pessoal (segundo fator)
// usado no quiosque de ponto. O hash nunca chega ao cliente — só a RPC
// SECURITY DEFINER `admin_definir_pin_quiosque` grava, e só quem tem
// `pode_gerir_rh` na empresa do colaborador pode chamá-la.
export function DefinirPinQuiosqueDialog({ colaboradorId }: { colaboradorId: string }) {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmacao, setConfirmacao] = useState('');

  const definir = useMutation({
    mutationFn: async () => {
      if (pin.length < 4 || pin.length > 6) throw new Error('PIN deve ter de 4 a 6 dígitos');
      if (pin !== confirmacao) throw new Error('PINs não conferem');
      const { error } = await supabase.rpc('admin_definir_pin_quiosque', {
        p_colaborador_id: colaboradorId,
        p_pin: pin,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('PIN do quiosque atualizado. Informe o colaborador em canal seguro.');
      setOpen(false);
      setPin('');
      setConfirmacao('');
    },
    onError: (error: Error) => toast.error(safeErrorMessage(error, 'Erro ao definir PIN.')),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-11 rounded-xl px-4 gap-2 shadow-xs bg-card/50">
          <KeyRound className="h-4 w-4" />
          <span className="hidden sm:inline">PIN do quiosque</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Definir PIN do quiosque</DialogTitle>
          <DialogDescription>
            Segundo fator exigido para bater ponto quando a empresa habilita "Exigir PIN no quiosque". Combine o novo
            PIN com o colaborador fora deste sistema (não é enviado por e-mail).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Novo PIN (4 a 6 dígitos)</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <Label>Confirmar PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={() => definir.mutate()} disabled={definir.isPending}>
            {definir.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar PIN'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
