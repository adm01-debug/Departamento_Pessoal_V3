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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { beneficiariosSeguroService, segurosColaboradoresService } from '@/services/tabelasComplementaresService';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { Plus, ShieldCheck, Trash2, AlertTriangle, Users, UserPlus } from 'lucide-react';

// ========== Beneficiários de um Seguro ==========
function BeneficiariosSeguroSection({ seguroId }: { seguroId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', cpf: '', parentesco: '', percentual: '' });

  const { data: beneficiarios = [], isLoading } = useQuery({
    queryKey: ['beneficiarios-seguro', seguroId],
    queryFn: () => beneficiariosSeguroService.listar(seguroId),
    enabled: !!seguroId,
  });

  const criar = useMutation({
    mutationFn: () => beneficiariosSeguroService.criar({
      seguro_vida_id: seguroId, nome: form.nome, cpf: form.cpf || null,
      parentesco: form.parentesco || null, percentual: form.percentual ? Number(form.percentual) : null, status: 'ativo',
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['beneficiarios-seguro', seguroId] }); setOpen(false); setForm({ nome: '', cpf: '', parentesco: '', percentual: '' }); toast.success('Beneficiário incluído!'); },
    onError: () => toast.error('Erro ao incluir'),
  });

  const ativos = beneficiarios.filter((b: any) => b.status !== 'inativo');

  return (
    <>
    <PageTitle title="Seguros de Vida" description="Gestão de seguros de vida" />
    <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex items-center gap-1"><Users className="h-3 w-3" /> Beneficiários ({ativos.length})</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Beneficiário</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Incluir Beneficiário do Seguro</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
              <div><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} /></div>
              <div><Label>Parentesco</Label><Input value={form.parentesco} onChange={e => setForm(p => ({ ...p, parentesco: e.target.value }))} /></div>
              <div><Label>% do Capital</Label><Input type="number" value={form.percentual} onChange={e => setForm(p => ({ ...p, percentual: e.target.value }))} /></div>
              <Button onClick={() => criar.mutate()} disabled={!form.nome}>Incluir</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? <Spinner size="sm" /> : ativos.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhum beneficiário</p>
      ) : (
        <div className="space-y-1">
          {ativos.map((b: any) => (
            <div key={b.id} className="flex items-center gap-2 text-sm p-1.5 rounded bg-background">
              <span className="flex-1">{b.nome} {b.cpf ? `(${b.cpf})` : ''}</span>
              <Badge variant="outline" className="text-xs">{b.parentesco || '—'}</Badge>
              {b.percentual && <span className="text-xs text-muted-foreground">{b.percentual}%</span>}
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}

export default function SegurosVidaPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [tab, setTab] = useState('seguros');
  const [expandedSeguro, setExpandedSeguro] = useState<string | null>(null);

  // === Seguros ===
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ seguradora: '', numero_apolice: '', capital_segurado: '', premio_mensal: '', data_inicio: '', data_fim: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['seguros-vida', empresaAtual?.id],
    queryFn: async () => {
      let q = supabase.from('seguros_vida').select('*').order('created_at', { ascending: false });
      if (empresaAtual?.id) q = q.eq('empresa_id', empresaAtual.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const criar = useMutation({
    mutationFn: async (d: typeof form) => {
      const { error } = await supabase.from('seguros_vida').insert({
        seguradora: d.seguradora, numero_apolice: d.numero_apolice || null,
        capital_segurado: d.capital_segurado ? Number(d.capital_segurado) : null,
        premio_mensal: d.premio_mensal ? Number(d.premio_mensal) : null,
        data_inicio: d.data_inicio || null, data_fim: d.data_fim || null,
        empresa_id: empresaAtual?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seguros-vida'] }); setOpen(false); toast.success('Seguro cadastrado'); },
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('seguros_vida').delete().eq('id', id).eq('empresa_id', empresaAtual!.id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seguros-vida'] }); toast.success('Excluído'); },
  });

  // === Sinistros ===
  const [openSin, setOpenSin] = useState(false);
  const [sinForm, setSinForm] = useState({ seguro_vida_id: '', colaborador_id: '', tipo: '', data_sinistro: '', descricao: '' });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-seguro', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('colaboradores').select('id, nome_completo').eq('status', 'ativo');
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const { data: sinistros = [], isLoading: loadSin } = useQuery({
    queryKey: ['sinistros-seguro', empresaAtual?.id],
    queryFn: async () => {
      const { data: d, error } = await supabase.from('sinistros_seguro').select('*, colaborador:colaboradores(nome_completo), seguro:seguros_vida(seguradora)').order('created_at', { ascending: false });
      if (error) throw error;
      return d || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const criarSinistro = useMutation({
    mutationFn: async (d: typeof sinForm) => {
      const { error } = await supabase.from('sinistros_seguro').insert({ seguro_vida_id: d.seguro_vida_id || null, colaborador_id: d.colaborador_id || null, tipo: d.tipo || null, data_sinistro: d.data_sinistro || null, descricao: d.descricao || null, status: 'aberto' });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sinistros-seguro'] }); setOpenSin(false); setSinForm({ seguro_vida_id: '', colaborador_id: '', tipo: '', data_sinistro: '', descricao: '' }); toast.success('Sinistro registrado'); },
    onError: () => toast.error('Erro ao registrar sinistro'),
  });

  // === Colaboradores Vinculados ===
  const [openVinc, setOpenVinc] = useState(false);
  const [vincForm, setVincForm] = useState({ seguro_vida_id: '', colaborador_id: '' });

  const { data: vinculados = [], isLoading: loadVinc } = useQuery({
    queryKey: ['seguros-colaboradores', empresaAtual?.id],
    queryFn: () => segurosColaboradoresService.listar(),
    enabled: !!empresaAtual?.id,
  });

  const vincular = useMutation({
    mutationFn: () => segurosColaboradoresService.vincular({ seguro_vida_id: vincForm.seguro_vida_id, colaborador_id: vincForm.colaborador_id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seguros-colaboradores'] }); setOpenVinc(false); setVincForm({ seguro_vida_id: '', colaborador_id: '' }); toast.success('Colaborador vinculado!'); },
    onError: () => toast.error('Erro ao vincular'),
  });

  const desvincular = useMutation({
    mutationFn: ({ id, seguroVidaId }: { id: string; seguroVidaId: string }) => segurosColaboradoresService.desvincular(seguroVidaId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seguros-colaboradores'] }); toast.success('Desvinculado'); },
  });

  const fmt = (v: number | null) => v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-';

  return (
    <PageLayout title="Seguros de Vida" description="Apólices, coberturas, beneficiários e sinistros" icon={<ShieldCheck className="h-5 w-5 text-primary-foreground" />}>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="seguros">Apólices</TabsTrigger>
          <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
          <TabsTrigger value="sinistros">Sinistros</TabsTrigger>
        </TabsList>

        {/* ========= ABA APÓLICES ========= */}
        <TabsContent value="seguros">
          <div className="flex justify-end mb-4">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Novo Seguro</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Seguro de Vida</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Seguradora</Label><Input value={form.seguradora} onChange={e => setForm(p => ({ ...p, seguradora: e.target.value }))} /></div>
                  <div><Label>Nº Apólice</Label><Input value={form.numero_apolice} onChange={e => setForm(p => ({ ...p, numero_apolice: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Capital Segurado</Label><Input type="number" value={form.capital_segurado} onChange={e => setForm(p => ({ ...p, capital_segurado: e.target.value }))} /></div>
                    <div><Label>Prêmio Mensal</Label><Input type="number" value={form.premio_mensal} onChange={e => setForm(p => ({ ...p, premio_mensal: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Início</Label><Input type="date" value={form.data_inicio} onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))} /></div>
                    <div><Label>Fim</Label><Input type="date" value={form.data_fim} onChange={e => setForm(p => ({ ...p, data_fim: e.target.value }))} /></div>
                  </div>
                  <Button onClick={() => criar.mutate(form)} disabled={!form.seguradora} className="w-full">Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="p-0">
            {isLoading ? <div className="p-8 flex justify-center"><Spinner /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Seguradora</TableHead><TableHead>Apólice</TableHead><TableHead>Capital</TableHead><TableHead>Prêmio</TableHead><TableHead>Vigência</TableHead><TableHead>Beneficiários</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {data?.map(r => (
                    <>
                      <TableRow key={r.id} className="cursor-pointer" onClick={() => setExpandedSeguro(expandedSeguro === r.id ? null : r.id)}>
                        <TableCell className="font-medium">{r.seguradora}</TableCell>
                        <TableCell>{r.numero_apolice || '-'}</TableCell>
                        <TableCell>{fmt(r.capital_segurado)}</TableCell>
                        <TableCell>{fmt(r.premio_mensal)}</TableCell>
                        <TableCell>{r.data_inicio && r.data_fim ? `${new Date(r.data_inicio).toLocaleDateString('pt-BR')} - ${new Date(r.data_fim).toLocaleDateString('pt-BR')}` : '-'}</TableCell>
                        <TableCell><Button variant="ghost" size="sm"><Users className="h-4 w-4 mr-1" /> Ver</Button></TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); excluir.mutate(r.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                      {expandedSeguro === r.id && (
                        <TableRow key={`${r.id}-ben`}>
                          <TableCell colSpan={7} className="p-4">
                            <BeneficiariosSeguroSection seguroId={r.id} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                  {!data?.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum seguro cadastrado</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* ========= ABA COLABORADORES ========= */}
        <TabsContent value="colaboradores">
          <div className="flex justify-end mb-4">
            <Dialog open={openVinc} onOpenChange={setOpenVinc}>
              <DialogTrigger asChild><Button><UserPlus className="mr-2 h-4 w-4" />Vincular Colaborador</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Vincular ao Seguro</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Seguro</Label>
                    <Select value={vincForm.seguro_vida_id} onValueChange={v => setVincForm(p => ({ ...p, seguro_vida_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{data?.map(s => <SelectItem key={s.id} value={s.id}>{s.seguradora} - {s.numero_apolice || 'S/N'}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Colaborador</Label>
                    <Select value={vincForm.colaborador_id} onValueChange={v => setVincForm(p => ({ ...p, colaborador_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button onClick={() => vincular.mutate()} disabled={!vincForm.seguro_vida_id || !vincForm.colaborador_id} className="w-full">Vincular</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="p-0">
            {loadVinc ? <div className="p-8 flex justify-center"><Spinner /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>Seguro</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {vinculados.map((v: any) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.colaborador?.nome_completo || '-'}</TableCell>
                      <TableCell>{v.seguro_vida_id}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => desvincular.mutate({ id: v.id, seguroVidaId: v.seguro_vida_id })}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                  {vinculados.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhum colaborador vinculado</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* ========= ABA SINISTROS ========= */}
        <TabsContent value="sinistros">
          <div className="flex justify-end mb-4">
            <Dialog open={openSin} onOpenChange={setOpenSin}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Registrar Sinistro</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Registrar Sinistro</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Seguro</Label>
                    <Select value={sinForm.seguro_vida_id} onValueChange={v => setSinForm(p => ({ ...p, seguro_vida_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione a apólice" /></SelectTrigger>
                      <SelectContent>{data?.map(s => <SelectItem key={s.id} value={s.id}>{s.seguradora} - {s.numero_apolice || 'S/N'}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Colaborador</Label>
                    <Select value={sinForm.colaborador_id} onValueChange={v => setSinForm(p => ({ ...p, colaborador_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Tipo</Label>
                      <Select value={sinForm.tipo} onValueChange={v => setSinForm(p => ({ ...p, tipo: v }))}>
                        <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morte">Morte</SelectItem>
                          <SelectItem value="invalidez">Invalidez</SelectItem>
                          <SelectItem value="doenca_grave">Doença Grave</SelectItem>
                          <SelectItem value="acidente">Acidente</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Data</Label><Input type="date" value={sinForm.data_sinistro} onChange={e => setSinForm(p => ({ ...p, data_sinistro: e.target.value }))} /></div>
                  </div>
                  <div><Label>Descrição</Label><Textarea value={sinForm.descricao} onChange={e => setSinForm(p => ({ ...p, descricao: e.target.value }))} /></div>
                  <Button onClick={() => criarSinistro.mutate(sinForm)} disabled={criarSinistro.isPending} className="w-full">{criarSinistro.isPending ? 'Salvando...' : 'Registrar'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card><CardContent className="p-0">
            {loadSin ? <div className="p-8 flex justify-center"><Spinner /></div> : (
              <Table>
                <TableHeader><TableRow><TableHead>Seguro</TableHead><TableHead>Colaborador</TableHead><TableHead>Tipo</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sinistros.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.seguro?.seguradora || '-'}</TableCell>
                      <TableCell className="font-medium">{s.colaborador?.nome_completo || '-'}</TableCell>
                      <TableCell className="capitalize">{s.tipo || '-'}</TableCell>
                      <TableCell>{s.data_sinistro ? new Date(s.data_sinistro).toLocaleDateString('pt-BR') : '-'}</TableCell>
                      <TableCell><Badge variant={s.status === 'aberto' ? 'destructive' : s.status === 'em_analise' ? 'secondary' : 'default'}>{s.status || 'aberto'}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {sinistros.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum sinistro</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
