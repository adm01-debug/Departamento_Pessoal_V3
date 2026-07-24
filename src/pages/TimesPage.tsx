import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Plus, Users, Trash2, Edit2 } from 'lucide-react';
import type { LooseRow } from '@/types/db';
export default function TimesPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LooseRow<'times'> | null>(null);
  const [form, setForm] = useState({ nome: '', descricao: '' });

  const { data: times = [], isLoading } = useQuery({
    queryKey: ['times', empresaAtual?.id],
    queryFn: async () => {
      let q = supabase.from('times').select('*').order('nome');
      if (empresaAtual?.id) q = q.eq('empresa_id', empresaAtual.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const handleSubmit = useMutation({
    mutationFn: async (d: any) => {
      if (editingItem) {
        const { error } = await supabase.from('times').update(d).eq('id', editingItem.id!).eq('empresa_id', empresaAtual!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('times').insert({ ...d, empresa_id: empresaAtual?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['times'] }); 
      setOpen(false); 
      setEditingItem(null);
      setForm({ nome: '', descricao: '' });
      toast.success(editingItem ? 'Time atualizado!' : 'Time criado!'); 
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar equipe.')),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('times').delete().eq('id', id).eq('empresa_id', empresaAtual!.id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['times'] }); toast.success('Time excluído!'); },
  });

  if (isLoading) return <PageLayout title="Times"><Spinner /></PageLayout>;

  return (
    <>
    <PageTitle title="Times" description="Gestão de equipes" />
    <PageLayout title="Times e Equipes" description="Gerencie os times da empresa">
      <Card><CardContent className="pt-6">
        <div className="flex justify-between mb-4">
          <h3 className="text-lg font-semibold">Times ({times.length})</h3>
          <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) {
              setEditingItem(null);
              setForm({ nome: '', descricao: '' });
            }
          }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo Time</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editingItem ? 'Editar Time' : 'Novo Time'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
                <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
                <Button className="w-full" onClick={() => handleSubmit.mutate(form)} disabled={!form.nome || handleSubmit.isPending}>
                  {handleSubmit.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                  {editingItem ? 'Salvar Alterações' : 'Salvar'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Descrição</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {times.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.nome}</TableCell>
                <TableCell>{t.descricao || '—'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => {
                      setEditingItem(t);
                      setForm({ nome: t.nome, descricao: t.descricao || '' });
                      setOpen(true);
                    }}>
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => {
                      if (confirm('Deseja excluir este time?')) excluir.mutate(t.id);
                    }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {times.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Nenhum time cadastrado</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </PageLayout>
    </>
  );
}
