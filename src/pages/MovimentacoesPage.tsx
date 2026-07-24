import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { colaboradorService } from '@/services';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Plus, ArrowRightLeft, TrendingUp, MapPin, Trash2 } from 'lucide-react';

export default function MovimentacoesPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [openTransf, setOpenTransf] = useState(false);
  const [openPromo, setOpenPromo] = useState(false);
  const [formTransf, setFormTransf] = useState({ colaborador_id: '', tipo: 'transferencia', origem: '', destino: '', data_efetivacao: '', motivo: '' });
  const [formPromo, setFormPromo] = useState({ colaborador_id: '', cargo_anterior: '', cargo_novo: '', data_promocao: '', novo_salario: '', motivo: '' });

  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores', empresaAtual?.id], queryFn: () => colaboradorService.list(empresaAtual!.id), enabled: !!empresaAtual?.id });

  const { data: transferencias = [], isLoading: loadTransf } = useQuery({
    queryKey: ['transferencias', empresaAtual?.id],
    queryFn: async () => {
      let q = supabase.from('transferencias').select('*, colaborador:colaboradores(nome_completo)').order('data_efetivacao', { ascending: false });
      if (empresaAtual?.id) q = (q as any).eq('empresa_id', empresaAtual.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const { data: promocoes = [], isLoading: loadPromo } = useQuery({
    queryKey: ['promocoes', empresaAtual?.id],
    queryFn: async () => {
      let q = supabase.from('promocoes').select('*, colaborador:colaboradores(nome_completo)').order('data_promocao', { ascending: false });
      if (empresaAtual?.id) q = (q as any).eq('empresa_id', empresaAtual.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const criarTransf = useMutation({
    mutationFn: async (d: any) => {
      const { data, error } = await supabase.from('transferencias').insert({ ...d, empresa_id: empresaAtual?.id }).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transferencias'] }); setOpenTransf(false); toast.success('Transferência registrada!'); },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar movimentação.')),
  });

  const criarPromo = useMutation({
    mutationFn: async (d: any) => {
      const { data, error } = await supabase.from('promocoes').insert({ ...d, empresa_id: empresaAtual?.id, novo_salario: d.novo_salario ? Number(d.novo_salario) : null }).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promocoes'] }); setOpenPromo(false); toast.success('Promoção registrada!'); },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar movimentação.')),
  });

  const isLoading = loadTransf || loadPromo;
  if (isLoading) return <PageLayout title="Movimentações"><Spinner /></PageLayout>;

  return (
    <>
    <PageTitle title="Movimentações" description="Histórico de movimentações" />
    <PageLayout title="Movimentações de Pessoal" description="Transferências, promoções e lotações">
      <Tabs defaultValue="transferencias">
        <TabsList>
          <TabsTrigger value="transferencias"><ArrowRightLeft className="h-4 w-4 mr-1" />Transferências ({transferencias.length})</TabsTrigger>
          <TabsTrigger value="promocoes"><TrendingUp className="h-4 w-4 mr-1" />Promoções ({promocoes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="transferencias">
          <Card><CardContent className="pt-6">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">Transferências</h3>
              <Dialog open={openTransf} onOpenChange={setOpenTransf}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Transferência</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Registrar Transferência</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Colaborador *</Label>
                      <Select value={formTransf.colaborador_id} onValueChange={v => setFormTransf(p => ({ ...p, colaborador_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Origem</Label><Input value={formTransf.origem} onChange={e => setFormTransf(p => ({ ...p, origem: e.target.value }))} /></div>
                      <div><Label>Destino</Label><Input value={formTransf.destino} onChange={e => setFormTransf(p => ({ ...p, destino: e.target.value }))} /></div>
                    </div>
                    <div><Label>Data *</Label><Input type="date" value={formTransf.data_efetivacao} onChange={e => setFormTransf(p => ({ ...p, data_efetivacao: e.target.value }))} /></div>
                    <div><Label>Motivo</Label><Textarea value={formTransf.motivo} onChange={e => setFormTransf(p => ({ ...p, motivo: e.target.value }))} /></div>
                    <Button className="w-full" onClick={() => criarTransf.mutate(formTransf)} disabled={!formTransf.colaborador_id || !formTransf.data_efetivacao}>Salvar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>Origem</TableHead><TableHead>Destino</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
              <TableBody>
                {transferencias.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.colaborador?.nome_completo || '—'}</TableCell>
                    <TableCell>{t.origem || '—'}</TableCell>
                    <TableCell>{t.destino || '—'}</TableCell>
                    <TableCell>{t.data_efetivacao}</TableCell>
                  </TableRow>
                ))}
                {transferencias.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhuma transferência</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="promocoes">
          <Card><CardContent className="pt-6">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">Promoções</h3>
              <Dialog open={openPromo} onOpenChange={setOpenPromo}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Promoção</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Registrar Promoção</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Colaborador *</Label>
                      <Select value={formPromo.colaborador_id} onValueChange={v => setFormPromo(p => ({ ...p, colaborador_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Cargo Anterior</Label><Input value={formPromo.cargo_anterior} onChange={e => setFormPromo(p => ({ ...p, cargo_anterior: e.target.value }))} /></div>
                      <div><Label>Cargo Novo</Label><Input value={formPromo.cargo_novo} onChange={e => setFormPromo(p => ({ ...p, cargo_novo: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Data *</Label><Input type="date" value={formPromo.data_promocao} onChange={e => setFormPromo(p => ({ ...p, data_promocao: e.target.value }))} /></div>
                      <div><Label>Novo Salário</Label><Input type="number" value={formPromo.novo_salario} onChange={e => setFormPromo(p => ({ ...p, novo_salario: e.target.value }))} /></div>
                    </div>
                    <div><Label>Motivo</Label><Textarea value={formPromo.motivo} onChange={e => setFormPromo(p => ({ ...p, motivo: e.target.value }))} /></div>
                    <Button className="w-full" onClick={() => criarPromo.mutate(formPromo)} disabled={!formPromo.colaborador_id || !formPromo.data_promocao}>Salvar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>De</TableHead><TableHead>Para</TableHead><TableHead>Salário</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
              <TableBody>
                {promocoes.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.colaborador?.nome_completo || '—'}</TableCell>
                    <TableCell>{p.cargo_anterior || '—'}</TableCell>
                    <TableCell className="font-medium">{p.cargo_novo || '—'}</TableCell>
                    <TableCell>{p.novo_salario ? `R$ ${Number(p.novo_salario).toLocaleString('pt-BR')}` : '—'}</TableCell>
                    <TableCell>{p.data_promocao}</TableCell>
                  </TableRow>
                ))}
                {promocoes.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhuma promoção</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
    </>
  );
}
