import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface HistoryCreateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    data_inicio: string; cargo: string; departamento: string; tipo_contrato: string;
    salario: number | null; carga_horaria_semanal: number | null; motivo_alteracao: string;
  }) => Promise<unknown>;
}

const emptyForm = { data_inicio: '', cargo: '', departamento: '', tipo_contrato: '', salario: '', carga_horaria_semanal: '', motivo_alteracao: '' };

// Mesmo formulário/mutation que já existia em HistoricoContratosTab.tsx —
// só muda de aba própria pra ação acionada pelo menu "+" da toolbar unificada.
export function HistoryCreateContractDialog({ open, onOpenChange, onSubmit }: HistoryCreateContractDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.data_inicio || !form.motivo_alteracao) { toast.error('Data e motivo são obrigatórios'); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        salario: form.salario ? Number(form.salario) : null,
        carga_horaria_semanal: form.carga_horaria_semanal ? Number(form.carga_horaria_semanal) : null,
      });
      setForm(emptyForm);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader><DialogTitle>Registrar Alteração Contratual</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div><Label>Data Início *</Label><Input type="date" value={form.data_inicio} onChange={(e) => setForm((f) => ({ ...f, data_inicio: e.target.value }))} /></div>
          <div><Label>Cargo</Label><Input value={form.cargo} onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))} /></div>
          <div><Label>Departamento</Label><Input value={form.departamento} onChange={(e) => setForm((f) => ({ ...f, departamento: e.target.value }))} /></div>
          <div><Label>Tipo Contrato</Label><Input value={form.tipo_contrato} onChange={(e) => setForm((f) => ({ ...f, tipo_contrato: e.target.value }))} /></div>
          <div><Label>Salário</Label><Input type="number" value={form.salario} onChange={(e) => setForm((f) => ({ ...f, salario: e.target.value }))} /></div>
          <div><Label>Carga Horária Semanal</Label><Input type="number" value={form.carga_horaria_semanal} onChange={(e) => setForm((f) => ({ ...f, carga_horaria_semanal: e.target.value }))} /></div>
          <div className="md:col-span-2"><Label>Motivo da Alteração *</Label><Input value={form.motivo_alteracao} onChange={(e) => setForm((f) => ({ ...f, motivo_alteracao: e.target.value }))} /></div>
        </div>
        <div className="flex justify-end pt-1">
          <Button size="sm" className="rounded-lg px-4" onClick={handleSubmit} disabled={submitting}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
