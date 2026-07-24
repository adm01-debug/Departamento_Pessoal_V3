import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Plus, Landmark, Trash2 } from 'lucide-react';

export default function SindicatosPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', cnpj: '', telefone: '', email: '', data_base: '' });

  const { data: sindicatos = [], isLoading } = useQuery({
    queryKey: ['sindicatos', empresaAtual?.id],
    queryFn: async () => {
      let q = supabase.from('sindicatos').select('*').order('nome');
      if (empresaAtual?.id) q = (q as any).eq('empresa_id', empresaAtual.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const criar = useMutation({
    mutationFn: async (d: any) => {
      const { data, error } = await supabase.from('sindicatos').insert({ ...d, empresa_id: empresaAtual?.id }).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sindicatos'] }); setOpen(false); toast.success('Sindicato cadastrado!'); },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar sindicato.')),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from('sindicatos').delete().eq('id', id).eq('empresa_id', empresaAtual!.id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sindicatos'] }); toast.success('Sindicato excluído!'); },
  });

  if (isLoading) return <PageLayout title="Sindicatos"><Spinner /></PageLayout>;

  return (
    <>
    <PageTitle title="Sindicatos" description="Gestão de sindicatos" />
    <PageLayout title="Sindicatos" description="Gerencie sindicatos e acordos coletivos">
      <Card><CardContent className="pt-6">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-semibold">Sindicatos ({sindicatos.length})</h3>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo Sindicato</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Cadastrar Sindicato</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
                <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={e => setForm(p => ({ ...p, cnpj: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} /></div>
                  <div><Label>Email</Label><Input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                </div>
                <div><Label>Data-base</Label><Input value={form.data_base} onChange={e => setForm(p => ({ ...p, data_base: e.target.value }))} placeholder="Ex: Janeiro" /></div>
                <Button className="w-full" onClick={() => criar.mutate(form)} disabled={!form.nome}>Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>CNPJ</TableHead><TableHead>Contato</TableHead><TableHead>Data-base</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {sindicatos.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.nome}</TableCell>
                <TableCell>{s.cnpj || '—'}</TableCell>
                <TableCell>{s.email || s.telefone || '—'}</TableCell>
                <TableCell>{s.data_base || '—'}</TableCell>
                <TableCell><Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => excluir.mutate(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
            {sindicatos.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum sindicato cadastrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </PageLayout>
    </>
  );
}
