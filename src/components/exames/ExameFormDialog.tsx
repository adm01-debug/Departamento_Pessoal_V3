import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';

const tiposExame = [
  { value: 'admissional', label: 'Admissional' },
  { value: 'periodico', label: 'Periódico' },
  { value: 'retorno_trabalho', label: 'Retorno ao Trabalho' },
  { value: 'mudanca_funcao', label: 'Mudança de Função' },
  { value: 'demissional', label: 'Demissional' },
];

const resultados = [
  { value: 'apto', label: 'Apto' },
  { value: 'inapto', label: 'Inapto' },
  { value: 'apto_restricao', label: 'Apto com Restrição' },
];

interface ExameFormDialogProps {
  colaboradores: any[];
  onSubmit: (form: {
    colaborador_id: string;
    tipo: string;
    data_exame: string;
    data_validade: string;
    medico: string;
    crm: string;
    resultado: string;
  }) => void;
  isPending?: boolean;
}

const emptyForm = { colaborador_id: '', tipo: '', data_exame: '', data_validade: '', medico: '', crm: '', resultado: '' };

export function ExameFormDialog({ colaboradores, onSubmit, isPending }: ExameFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const handleSubmit = () => {
    onSubmit(form);
    setForm(emptyForm);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-xl shrink-0">
          <Plus className="h-4 w-4 mr-1" />Novo Exame
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Registrar Exame Ocupacional</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Colaborador *</Label>
            <Select value={form.colaborador_id} onValueChange={v => setForm(p => ({ ...p, colaborador_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
              <SelectContent>
                {colaboradores.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo de Exame *</Label>
            <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>
                {tiposExame.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Data do Exame</Label>
              <Input type="date" value={form.data_exame} onChange={e => setForm(p => ({ ...p, data_exame: e.target.value }))} />
            </div>
            <div>
              <Label>Validade</Label>
              <Input type="date" value={form.data_validade} onChange={e => setForm(p => ({ ...p, data_validade: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Médico Responsável</Label>
              <Input value={form.medico} onChange={e => setForm(p => ({ ...p, medico: e.target.value }))} placeholder="Dr. Nome" />
            </div>
            <div>
              <Label>CRM</Label>
              <Input value={form.crm} onChange={e => setForm(p => ({ ...p, crm: e.target.value }))} placeholder="12345/UF" />
            </div>
          </div>

          <div>
            <Label>Resultado</Label>
            <Select value={form.resultado} onValueChange={v => setForm(p => ({ ...p, resultado: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione o resultado" /></SelectTrigger>
              <SelectContent>
                {resultados.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full rounded-xl"
            onClick={handleSubmit}
            disabled={!form.colaborador_id || !form.tipo || isPending}
          >
            Registrar Exame
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
