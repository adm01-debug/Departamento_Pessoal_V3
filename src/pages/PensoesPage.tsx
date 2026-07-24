import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { colaboradorService } from '@/services';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { Plus, Scale, Trash2 } from 'lucide-react';

export default function PensoesPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ colaborador_id: '', beneficiario: '', cpf_beneficiario: '', tipo: 'alimenticia', percentual: '', valor_fixo: '', banco: '', agencia: '', conta: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['pensoes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pensoes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: colaboradores } = useQuery({
    queryKey: ['colaboradores', empresaAtual?.id],
    queryFn: () => colaboradorService.list(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const criar = useMutation({
    mutationFn: async (d: typeof form) => {
      const { error } = await supabase.from('pensoes').insert({
        colaborador_id: d.colaborador_id, beneficiario: d.beneficiario, cpf_beneficiario: d.cpf_beneficiario || null,
        tipo: d.tipo, percentual: d.percentual ? Number(d.percentual) : null, valor_fixo: d.valor_fixo ? Number(d.valor_fixo) : null,
        banco: d.banco || null, agencia: d.agencia || null, conta: d.conta || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pensoes'] }); setOpen(false); toast.success('Pensão cadastrada'); },
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('pensoes').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pensoes'] }); toast.success('Excluída'); },
  });

  return (
    <>
    <PageTitle title="Pensões" description="Gestão de pensões alimentícias" />
    <PageLayout title="Pensões" description="Pensões alimentícias e judiciais" icon={<Scale className="h-5 w-5 text-primary-foreground" />}>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nova Pensão</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Pensão</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Colaborador</Label>
                <Select value={form.colaborador_id} onValueChange={v => setForm(p => ({ ...p, colaborador_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{colaboradores?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Beneficiário</Label><Input value={form.beneficiario} onChange={e => setForm(p => ({ ...p, beneficiario: e.target.value }))} /></div>
              <div><Label>CPF Beneficiário</Label><Input value={form.cpf_beneficiario} onChange={e => setForm(p => ({ ...p, cpf_beneficiario: e.target.value }))} /></div>
              <div><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="alimenticia">Alimentícia</SelectItem><SelectItem value="judicial">Judicial</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Percentual (%)</Label><Input type="number" value={form.percentual} onChange={e => setForm(p => ({ ...p, percentual: e.target.value }))} /></div>
                <div><Label>Valor Fixo (R$)</Label><Input type="number" value={form.valor_fixo} onChange={e => setForm(p => ({ ...p, valor_fixo: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Banco</Label><Input value={form.banco} onChange={e => setForm(p => ({ ...p, banco: e.target.value }))} /></div>
                <div><Label>Agência</Label><Input value={form.agencia} onChange={e => setForm(p => ({ ...p, agencia: e.target.value }))} /></div>
                <div><Label>Conta</Label><Input value={form.conta} onChange={e => setForm(p => ({ ...p, conta: e.target.value }))} /></div>
              </div>
              <Button onClick={() => criar.mutate(form)} disabled={!form.colaborador_id || !form.beneficiario} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        {isLoading ? <div className="p-8 flex justify-center"><Spinner /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Beneficiário</TableHead><TableHead>CPF</TableHead><TableHead>Tipo</TableHead><TableHead>% / Valor</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {data?.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.beneficiario}</TableCell>
                  <TableCell>{r.cpf_beneficiario || '-'}</TableCell>
                  <TableCell className="capitalize">{r.tipo || '-'}</TableCell>
                  <TableCell>{r.percentual ? `${r.percentual}%` : r.valor_fixo ? `R$ ${Number(r.valor_fixo).toLocaleString('pt-BR')}` : '-'}</TableCell>
                  <TableCell><Badge variant={r.ativo ? 'default' : 'secondary'}>{r.ativo ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluir.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {!data?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma pensão cadastrada</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </PageLayout>
    </>
  );
}
