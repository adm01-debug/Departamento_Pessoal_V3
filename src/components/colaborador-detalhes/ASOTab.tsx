import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useASOs, useCriarASO } from '@/hooks/useColaboradorDetalhes';

const TIPOS = ['Admissional', 'Periódico', 'Retorno ao trabalho', 'Mudança de risco', 'Demissional'];

export function ASOTab({ colaboradorId }: { colaboradorId: string }) {
  const { data, isLoading } = useASOs(colaboradorId);
  const criar = useCriarASO();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tipo: '', data_exame: '', resultado: 'apto', medico_nome: '', medico_crm: '', clinica: '', data_validade: '', observacoes: '' });

  const handleSubmit = async () => {
    if (!form.tipo) { toast.error('Tipo é obrigatório'); return; }
    if (!form.data_exame) { toast.error('Data do exame é obrigatória'); return; }
    try {
      await criar.mutateAsync({ ...form, colaborador_id: colaboradorId });
      toast.success('ASO registrado');
      setOpen(false);
      setForm({ tipo: '', data_exame: '', resultado: 'apto', medico_nome: '', medico_crm: '', clinica: '', data_validade: '', observacoes: '' });
    } catch { toast.error('Erro ao registrar ASO'); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Atestados de Saúde Ocupacional</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Novo ASO</Button></DialogTrigger>
          <DialogContent className="max-w-[460px]">
            <DialogHeader><DialogTitle>Registrar ASO</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data Exame *</Label><Input type="date" value={form.data_exame} onChange={e => setForm(f => ({ ...f, data_exame: e.target.value }))} /></div>
                <div><Label>Data Validade</Label><Input type="date" value={form.data_validade} onChange={e => setForm(f => ({ ...f, data_validade: e.target.value }))} /></div>
              </div>
              <div><Label>Resultado</Label>
                <Select value={form.resultado} onValueChange={v => setForm(f => ({ ...f, resultado: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apto">Apto</SelectItem>
                    <SelectItem value="inapto">Inapto</SelectItem>
                    <SelectItem value="apto_com_restricao">Apto com Restrição</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Médico</Label><Input value={form.medico_nome} onChange={e => setForm(f => ({ ...f, medico_nome: e.target.value }))} /></div>
                <div><Label>CRM</Label><Input value={form.medico_crm} onChange={e => setForm(f => ({ ...f, medico_crm: e.target.value }))} /></div>
              </div>
              <div><Label>Clínica</Label><Input value={form.clinica} onChange={e => setForm(f => ({ ...f, clinica: e.target.value }))} /></div>
              <div className="flex justify-end pt-1">
                <Button size="sm" className="rounded-lg px-4" onClick={handleSubmit} disabled={criar.isPending}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <Spinner /> : !data?.length ? <p className="text-sm text-muted-foreground">Nenhum ASO registrado.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Tipo</TableHead><TableHead>Data</TableHead><TableHead>Validade</TableHead><TableHead>Resultado</TableHead><TableHead>Médico</TableHead><TableHead>Clínica</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell><Badge variant="outline">{a.tipo}</Badge></TableCell>
                  <TableCell>{a.data_exame}</TableCell>
                  <TableCell>{a.data_validade || '-'}</TableCell>
                  <TableCell><Badge variant={a.resultado === 'apto' ? 'default' : 'destructive'}>{a.resultado}</Badge></TableCell>
                  <TableCell>{a.medico_nome || '-'} {a.medico_crm ? `(CRM: ${a.medico_crm})` : ''}</TableCell>
                  <TableCell>{a.clinica || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
