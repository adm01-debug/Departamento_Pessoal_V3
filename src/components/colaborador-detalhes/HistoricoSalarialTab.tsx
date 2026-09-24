import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useHistoricoSalarial, useCriarRegistroSalarial } from '@/hooks/useColaboradorDetalhes';

const MOTIVOS = ['Promoção', 'Mérito', 'Enquadramento', 'Dissídio coletivo', 'Acordo coletivo', 'Transferência', 'Outro'];

export function HistoricoSalarialTab({ colaboradorId }: { colaboradorId: string }) {
  const { data, isLoading } = useHistoricoSalarial(colaboradorId);
  const criar = useCriarRegistroSalarial();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ salario_novo: '', motivo: '', data_vigencia: '', descricao: '' });

  const handleSubmit = async () => {
    if (!form.salario_novo || Number(form.salario_novo) <= 0) { toast.error('Salário deve ser maior que zero'); return; }
    if (!form.motivo) { toast.error('Motivo é obrigatório'); return; }
    if (!form.data_vigencia) { toast.error('Data de vigência é obrigatória'); return; }
    try {
      await criar.mutateAsync({ ...form, salario_novo: Number(form.salario_novo), colaborador_id: colaboradorId });
      toast.success('Registro salarial adicionado');
      setOpen(false);
      setForm({ salario_novo: '', motivo: '', data_vigencia: '', descricao: '' });
    } catch { toast.error('Erro ao registrar alteração'); }
  };

  const formatCurrency = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Histórico Salarial</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Nova Alteração</Button></DialogTrigger>
          <DialogContent className="max-w-[440px]">
            <DialogHeader><DialogTitle>Registrar Alteração Salarial</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Novo Salário *</Label><Input type="number" step="0.01" min="0" value={form.salario_novo} onChange={e => setForm(f => ({ ...f, salario_novo: e.target.value }))} /></div>
              <div><Label>Motivo *</Label>
                <Select value={form.motivo} onValueChange={v => setForm(f => ({ ...f, motivo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{MOTIVOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Data Vigência *</Label><Input type="date" value={form.data_vigencia} onChange={e => setForm(f => ({ ...f, data_vigencia: e.target.value }))} /></div>
              <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
              <div className="flex justify-end pt-1">
                <Button size="sm" className="rounded-lg px-4" onClick={handleSubmit} disabled={criar.isPending}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <Spinner /> : !data?.length ? <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Data</TableHead><TableHead>Salário Anterior</TableHead><TableHead>Novo Salário</TableHead><TableHead>Motivo</TableHead><TableHead>Descrição</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map((h: any) => (
                <TableRow key={h.id}>
                  <TableCell>{h.data_vigencia}</TableCell>
                  <TableCell>{h.salario_anterior ? formatCurrency(h.salario_anterior) : '-'}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(h.salario_novo)}</TableCell>
                  <TableCell><Badge variant="outline">{h.motivo}</Badge></TableCell>
                  <TableCell>{h.descricao || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
