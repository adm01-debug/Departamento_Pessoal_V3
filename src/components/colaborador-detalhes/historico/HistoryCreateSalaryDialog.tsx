import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

const MOTIVOS = ['Promoção', 'Mérito', 'Enquadramento', 'Dissídio coletivo', 'Acordo coletivo', 'Transferência', 'Outro'];

interface HistoryCreateSalaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaboradorId: string;
  onSubmit: (data: { salario_novo: number; motivo: string; data_vigencia: string; descricao: string; colaborador_id: string }) => Promise<unknown>;
  isPending: boolean;
}

// Mesmo formulário/mutation que já existia em HistoricoSalarialTab.tsx —
// só muda de aba própria pra ação acionada pelo menu "+" da toolbar unificada.
export function HistoryCreateSalaryDialog({ open, onOpenChange, colaboradorId, onSubmit, isPending }: HistoryCreateSalaryDialogProps) {
  const [form, setForm] = useState({ salario_novo: '', motivo: '', data_vigencia: '', descricao: '' });

  const handleSubmit = async () => {
    if (!form.salario_novo || Number(form.salario_novo) <= 0) { toast.error('Salário deve ser maior que zero'); return; }
    if (!form.motivo) { toast.error('Motivo é obrigatório'); return; }
    if (!form.data_vigencia) { toast.error('Data de vigência é obrigatória'); return; }
    try {
      await onSubmit({ ...form, salario_novo: Number(form.salario_novo), colaborador_id: colaboradorId });
      toast.success('Registro salarial adicionado');
      onOpenChange(false);
      setForm({ salario_novo: '', motivo: '', data_vigencia: '', descricao: '' });
    } catch {
      toast.error('Erro ao registrar alteração');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px]">
        <DialogHeader><DialogTitle>Registrar Alteração Salarial</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Novo Salário *</Label><Input type="number" step="0.01" min="0" value={form.salario_novo} onChange={(e) => setForm((f) => ({ ...f, salario_novo: e.target.value }))} /></div>
          <div>
            <Label>Motivo *</Label>
            <Select value={form.motivo} onValueChange={(v) => setForm((f) => ({ ...f, motivo: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{MOTIVOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Data Vigência *</Label><Input type="date" value={form.data_vigencia} onChange={(e) => setForm((f) => ({ ...f, data_vigencia: e.target.value }))} /></div>
          <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} /></div>
          <div className="flex justify-end pt-1">
            <Button size="sm" className="rounded-lg px-4" onClick={handleSubmit} disabled={isPending}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
