import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HandCoins } from 'lucide-react';
import { currentCompetenciaLocal } from '@/utils/dateLocal';

export function NewAdvanceDialog({ colaboradores, onSave }: any) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    colaborador_id: '',
    valor_solicitado: '',
    competencia_desconto: currentCompetenciaLocal(),
    motivo: ''
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 rounded-xl"><HandCoins className="h-4 w-4" /> Novo Adiantamento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar Adiantamento Salarial</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Colaborador</Label>
            <Select value={form.colaborador_id} onValueChange={(v) => setForm(p => ({ ...p, colaborador_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
              <SelectContent>
                {colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Solicitado (R$)</Label>
              <Input type="number" value={form.valor_solicitado} onChange={e => setForm(p => ({ ...p, valor_solicitado: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Competência para Desconto</Label>
              <Input type="month" value={form.competencia_desconto} onChange={e => setForm(p => ({ ...p, competencia_desconto: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Motivo (Opcional)</Label>
            <Input value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} placeholder="Ex: Emergência médica" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => { onSave(form); setOpen(false); }}>Enviar Solicitação</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
