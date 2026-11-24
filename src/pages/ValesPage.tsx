import { currentCompetenciaLocal, todayLocalISO } from '@/utils/dateLocal';
import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { UtensilsCrossed, Bus, CreditCard, Plus, RefreshCw } from 'lucide-react';

export default function ValesPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();

  const { data: va, isLoading: loadVA } = useQuery({
    queryKey: ['vales-alimentacao', empresaAtual?.id],
    queryFn: async () => {
      let q = supabase.from('vales_alimentacao').select('*, colaborador:colaboradores(nome_completo)');
      if (empresaAtual?.id) q = q.eq('empresa_id', empresaAtual.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const { data: vt, isLoading: loadVT } = useQuery({
    queryKey: ['vales-transporte'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vales_transporte').select('*, colaborador:colaboradores(nome_completo)');
      if (error) throw error;
      return data || [];
    },
  });

  // === Recargas ===
  const [openRec, setOpenRec] = useState(false);
  const [recForm, setRecForm] = useState({ colaborador_id: '', vale_id: '', valor: '', data_recarga: '', mes_referencia: currentCompetenciaLocal() });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-vale', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('colaboradores').select('id, nome_completo').eq('status', 'ativo');
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const { data: recargas = [], isLoading: loadRec } = useQuery({
    queryKey: ['recargas-vale', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('recargas_vale').select('*, colaborador:colaboradores(nome_completo)').order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const criarRecarga = useMutation({
    mutationFn: async (d: typeof recForm) => {
      const { error } = await supabase.from('recargas_vale').insert({
        colaborador_id: d.colaborador_id || null,
        vale_id: d.vale_id || null,
        valor: Number(d.valor),
        data_recarga: d.data_recarga || todayLocalISO(),
        status: 'processado',
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recargas-vale'] }); setOpenRec(false); setRecForm({ colaborador_id: '', vale_id: '', valor: '', data_recarga: '', mes_referencia: currentCompetenciaLocal() }); toast.success('Recarga registrada'); },
    onError: () => toast.error('Erro ao registrar recarga'),
  });

  const fmt = (v: number | null) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-';

  return (
    <>
    <PageTitle title="Vales" description="Gestão de vales" />
    <PageLayout title="Vales" description="Vale Alimentação, Vale Refeição e Vale Transporte" icon={<CreditCard className="h-5 w-5 text-primary-foreground" />}>
      <Tabs defaultValue="alimentacao" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alimentacao"><UtensilsCrossed className="mr-1 h-4 w-4" />VA / VR</TabsTrigger>
          <TabsTrigger value="transporte"><Bus className="mr-1 h-4 w-4" />VT</TabsTrigger>
          <TabsTrigger value="recargas"><RefreshCw className="mr-1 h-4 w-4" />Recargas</TabsTrigger>
        </TabsList>

        <TabsContent value="alimentacao">
          <Card><CardContent className="p-0">
            {loadVA ? <div className="p-8 flex justify-center"><Spinner /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>Tipo</TableHead><TableHead>Valor/Dia</TableHead><TableHead>Valor Mensal</TableHead><TableHead>Dias Úteis</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {va?.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.colaborador?.nome_completo || '-'}</TableCell>
                      <TableCell className="capitalize">{r.tipo || 'VA'}</TableCell>
                      <TableCell>{fmt(r.valor_por_dia)}</TableCell>
                      <TableCell>{fmt(r.valor_mensal)}</TableCell>
                      <TableCell>{r.dias_uteis ?? '-'}</TableCell>
                      <TableCell><Badge variant={r.ativo ? 'default' : 'secondary'}>{r.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {!va?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum VA/VR cadastrado</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="transporte">
          <Card><CardContent className="p-0">
            {loadVT ? <div className="p-8 flex justify-center"><Spinner /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>Optante</TableHead><TableHead>Valor Diário</TableHead><TableHead>Valor Mensal</TableHead><TableHead>Desconto</TableHead><TableHead>Líquido</TableHead></TableRow></TableHeader>
                <TableBody>
                  {vt?.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.colaborador?.nome_completo || '-'}</TableCell>
                      <TableCell>{r.optante ? 'Sim' : 'Não'}</TableCell>
                      <TableCell>{fmt(r.valor_diario)}</TableCell>
                      <TableCell>{fmt(r.valor_mensal)}</TableCell>
                      <TableCell>{fmt(r.desconto)}</TableCell>
                      <TableCell>{fmt(r.valor_liquido)}</TableCell>
                    </TableRow>
                  ))}
                  {!vt?.length && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum VT cadastrado</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="recargas">
          <div className="flex justify-end mb-4">
            <Dialog open={openRec} onOpenChange={setOpenRec}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nova Recarga</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar Recarga</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Colaborador</Label>
                    <Select value={recForm.colaborador_id} onValueChange={v => setRecForm(p => ({ ...p, colaborador_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Mês de Referência</Label><Input type="month" value={recForm.mes_referencia} onChange={e => setRecForm(p => ({ ...p, mes_referencia: e.target.value }))} /></div>
                    <div><Label>Valor (R$)</Label><Input type="number" value={recForm.valor} onChange={e => setRecForm(p => ({ ...p, valor: e.target.value }))} /></div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <Button size="sm" onClick={() => criarRecarga.mutate(recForm)} disabled={!recForm.valor || criarRecarga.isPending}>{criarRecarga.isPending ? 'Salvando...' : 'Registrar'}</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="p-0">
            {loadRec ? <div className="p-8 flex justify-center"><Spinner /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>Valor</TableHead><TableHead>Mês Ref.</TableHead><TableHead>Data Recarga</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {recargas.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{(r as any).colaborador?.nome_completo || '-'}</TableCell>
                      <TableCell>{fmt(r.valor)}</TableCell>
                      <TableCell>{r.mes_referencia || '-'}</TableCell>
                      <TableCell>{r.data_recarga ? new Date(r.data_recarga).toLocaleDateString('pt-BR') : '-'}</TableCell>
                      <TableCell><Badge variant={r.status === 'processado' ? 'default' : 'secondary'}>{r.status || 'pendente'}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {recargas.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma recarga registrada</TableCell></TableRow>}
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