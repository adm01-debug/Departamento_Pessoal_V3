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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { Plus, Handshake, Trash2, Users } from 'lucide-react';

export default function ConveniosPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [tab, setTab] = useState('convenios');

  // === Convênios ===
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', tipo: '', limite_global: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['convenios', empresaAtual?.id],
    queryFn: async () => {
      let q = supabase.from('convenios').select('*').order('nome');
      if (empresaAtual?.id) q = q.eq('empresa_id', empresaAtual.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const criar = useMutation({
    mutationFn: async (d: typeof form) => {
      const { error } = await supabase.from('convenios').insert({ nome: d.nome, tipo: d.tipo || null, limite_global: d.limite_global ? Number(d.limite_global) : null, empresa_id: empresaAtual?.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['convenios'] }); setOpen(false); setForm({ nome: '', tipo: '', limite_global: '' }); toast.success('Convênio criado'); },
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('convenios').delete().eq('id', id).eq('empresa_id', empresaAtual!.id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['convenios'] }); toast.success('Excluído'); },
  });

  // === Convênios ↔ Colaboradores ===
  const [openVinc, setOpenVinc] = useState(false);
  const [vincForm, setVincForm] = useState({ convenio_id: '', colaborador_id: '', limite_individual: '' });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-conv', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('colaboradores').select('id, nome_completo').eq('status', 'ativo');
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const { data: vinculos = [], isLoading: loadVinc } = useQuery({
    queryKey: ['convenios-colaboradores', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('convenios_colaboradores').select('*, colaborador:colaboradores(nome_completo), convenio:convenios(nome)').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const criarVinculo = useMutation({
    mutationFn: async (d: typeof vincForm) => {
      const { error } = await supabase.from('convenios_colaboradores').insert({
        convenio_id: d.convenio_id, colaborador_id: d.colaborador_id,
        limite_individual: d.limite_individual ? Number(d.limite_individual) : null,
        ativo: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['convenios-colaboradores'] }); setOpenVinc(false); setVincForm({ convenio_id: '', colaborador_id: '', limite_individual: '' }); toast.success('Colaborador vinculado ao convênio'); },
    onError: () => toast.error('Erro ao vincular'),
  });

  const excluirVinculo = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('convenios_colaboradores').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['convenios-colaboradores'] }); toast.success('Vínculo removido'); },
  });

  const fmt = (v: number | null) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-';

  return (
    <>
    <PageTitle title="Convênios" description="Gestão de convênios" />
    <PageLayout title="Convênios" description="Gestão de convênios empresariais" icon={<Handshake className="h-5 w-5 text-primary-foreground" />}>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="convenios">Convênios</TabsTrigger>
          <TabsTrigger value="colaboradores">Colaboradores Vinculados</TabsTrigger>
        </TabsList>

        <TabsContent value="convenios">
          <div className="flex justify-end mb-4">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Novo Convênio</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Convênio</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
                  <div><Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="farmacia">Farmácia</SelectItem>
                        <SelectItem value="educacao">Educação</SelectItem>
                        <SelectItem value="saude">Saúde</SelectItem>
                        <SelectItem value="lazer">Lazer</SelectItem>
                        <SelectItem value="outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Limite Global (R$)</Label><Input type="number" value={form.limite_global} onChange={e => setForm(p => ({ ...p, limite_global: e.target.value }))} /></div>
                  <Button onClick={() => criar.mutate(form)} disabled={!form.nome} className="w-full">Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="p-0">
            {isLoading ? <div className="p-8 flex justify-center"><Spinner /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Limite Global</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {data?.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell className="capitalize">{r.tipo || '-'}</TableCell>
                      <TableCell>{r.limite_global ? fmt(Number(r.limite_global)) : '-'}</TableCell>
                      <TableCell><Badge variant={r.ativo ? 'default' : 'secondary'}>{r.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                      <TableCell><Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluir.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {!data?.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum convênio cadastrado</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="colaboradores">
          <div className="flex justify-end mb-4">
            <Dialog open={openVinc} onOpenChange={setOpenVinc}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Vincular Colaborador</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Vincular Colaborador a Convênio</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Convênio</Label>
                    <Select value={vincForm.convenio_id} onValueChange={v => setVincForm(p => ({ ...p, convenio_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{data?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Colaborador</Label>
                    <Select value={vincForm.colaborador_id} onValueChange={v => setVincForm(p => ({ ...p, colaborador_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Limite Individual (R$)</Label><Input type="number" value={vincForm.limite_individual} onChange={e => setVincForm(p => ({ ...p, limite_individual: e.target.value }))} /></div>
                  <Button onClick={() => criarVinculo.mutate(vincForm)} disabled={!vincForm.convenio_id || !vincForm.colaborador_id || criarVinculo.isPending} className="w-full">{criarVinculo.isPending ? 'Salvando...' : 'Vincular'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="p-0">
            {loadVinc ? <div className="p-8 flex justify-center"><Spinner /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Convênio</TableHead><TableHead>Colaborador</TableHead><TableHead>Limite Individual</TableHead><TableHead>Saldo Utilizado</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {vinculos.map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell>{(v as any).convenio?.nome || '-'}</TableCell>
                      <TableCell className="font-medium">{(v as any).colaborador?.nome_completo || '-'}</TableCell>
                      <TableCell>{v.limite_individual ? fmt(v.limite_individual) : '-'}</TableCell>
                      <TableCell>{v.saldo_utilizado ? fmt(v.saldo_utilizado) : 'R$ 0,00'}</TableCell>
                      <TableCell><Badge variant={v.ativo ? 'default' : 'secondary'}>{v.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                      <TableCell><Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluirVinculo.mutate(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {vinculos.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum colaborador vinculado a convênios</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
    </>
  );
}