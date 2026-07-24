import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { Plus, MapPin, Trash2 } from 'lucide-react';

export default function LotacoesPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', codigo: '', endereco: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['lotacoes', empresaAtual?.id],
    queryFn: async () => {
      let q = supabase.from('lotacoes').select('*').order('nome');
      if (empresaAtual?.id) q = q.eq('empresa_id', empresaAtual.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const criar = useMutation({
    mutationFn: async (d: typeof form) => {
      const { error } = await supabase.from('lotacoes').insert({ nome: d.nome, codigo: d.codigo || null, endereco: d.endereco || null, empresa_id: empresaAtual?.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lotacoes'] }); setOpen(false); toast.success('Lotação criada'); },
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('lotacoes').delete().eq('id', id).eq('empresa_id', empresaAtual!.id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['lotacoes'] }); toast.success('Excluída'); },
  });

  return (
    <>
    <PageTitle title="Lotações" description="Gestão de lotações" />
    <PageLayout title="Lotações" description="Lotações tributárias e locais (eSocial)" icon={<MapPin className="h-5 w-5 text-primary-foreground" />}>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nova Lotação</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Lotação</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
              <div><Label>Código</Label><Input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} /></div>
              <div><Label>Endereço</Label><Input value={form.endereco} onChange={e => setForm(p => ({ ...p, endereco: e.target.value }))} /></div>
              <Button onClick={() => criar.mutate(form)} disabled={!form.nome} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        {isLoading ? <div className="p-8 flex justify-center"><Spinner /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Código</TableHead><TableHead>Endereço</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {data?.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell>{r.codigo || '-'}</TableCell>
                  <TableCell>{r.endereco || '-'}</TableCell>
                  <TableCell><Badge variant={r.ativa ? 'default' : 'secondary'}>{r.ativa ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluir.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {!data?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma lotação cadastrada</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </PageLayout>
    </>
  );
}
