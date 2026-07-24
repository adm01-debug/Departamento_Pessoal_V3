import { todayLocalISO } from '@/utils/dateLocal';
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
import { beneficiariosPlanoService } from '@/services/tabelasComplementaresService';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Plus, Heart, Shield, Trash2, Users } from 'lucide-react';

// ========== Beneficiários de um Plano ==========
function BeneficiariosPlanoSection({ planoId }: { planoId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', cpf: '', parentesco: '', tipo: 'dependente' });

  const { data: beneficiarios = [], isLoading } = useQuery({
    queryKey: ['beneficiarios-plano', planoId],
    queryFn: () => beneficiariosPlanoService.listar(planoId),
    enabled: !!planoId,
  });

  const criar = useMutation({
    mutationFn: () => beneficiariosPlanoService.criar({ ...form, plano_saude_id: planoId, status: 'ativo', data_inclusao: todayLocalISO() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['beneficiarios-plano', planoId] }); setOpen(false); setForm({ nome: '', cpf: '', parentesco: '', tipo: 'dependente' }); toast.success('Beneficiário incluído!'); },
    onError: () => toast.error('Erro ao incluir beneficiário'),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => beneficiariosPlanoService.excluir(planoId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['beneficiarios-plano', planoId] }); toast.success('Beneficiário excluído do plano'); },
  });

  const ativos = beneficiarios.filter((b: any) => b.status !== 'excluido');

  return (
    <>
    <PageTitle title="Planos de Saúde" description="Gestão de planos de saúde" />
    <div className="border rounded-lg p-3 bg-muted/20 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex items-center gap-1"><Users className="h-3 w-3" /> Beneficiários ({ativos.length})</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3 w-3 mr-1" /> Beneficiário</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Incluir Beneficiário</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
              <div><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} /></div>
              <div><Label>Parentesco</Label><Input value={form.parentesco} onChange={e => setForm(p => ({ ...p, parentesco: e.target.value }))} placeholder="Ex: Cônjuge, Filho(a)" /></div>
              <div><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="titular">Titular</SelectItem>
                    <SelectItem value="dependente">Dependente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
              <Badge variant="outline" className="text-xs">{b.tipo || b.parentesco || '—'}</Badge>
              <Button variant="ghost" size="icon" aria-label="Excluir" className="h-6 w-6" onClick={() => excluir.mutate(b.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}

export default function PlanosSaudePage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [openPlano, setOpenPlano] = useState(false);
  const [openSeguro, setOpenSeguro] = useState(false);
  const [expandedPlano, setExpandedPlano] = useState<string | null>(null);
  const [formPlano, setFormPlano] = useState({ nome: '', operadora: '', tipo: 'saude', valor_mensal: '', coparticipacao: '', ans_registro: '' });
  const [formSeguro, setFormSeguro] = useState({ nome: '', seguradora: '', tipo_cobertura: 'vida', valor_mensal: '', capital_segurado: '', apolice_numero: '', data_vencimento_apolice: '' });

  const { data: planos = [], isLoading: l1 } = useQuery({
    queryKey: ['planos-saude', empresaAtual?.id],
    queryFn: async () => {
      let q = supabase.from('planos_saude').select('*').order('nome');
      if (empresaAtual?.id) q = q.eq('empresa_id', empresaAtual.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const { data: seguros = [], isLoading: l2 } = useQuery({
    queryKey: ['seguros-vida', empresaAtual?.id],
    queryFn: async () => {
      let q = supabase.from('seguros_vida').select('*').order('nome');
      if (empresaAtual?.id) q = q.eq('empresa_id', empresaAtual.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const criarPlano = useMutation({
    mutationFn: async (d: any) => {
      const { data, error } = await supabase.from('planos_saude').insert({ ...d, empresa_id: empresaAtual?.id, valor_mensal: d.valor_mensal ? Number(d.valor_mensal) : null, coparticipacao: d.coparticipacao ? Number(d.coparticipacao) : null }).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['planos-saude'] }); setOpenPlano(false); toast.success('Plano cadastrado!'); },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar plano de saúde.')),
  });

  const criarSeguro = useMutation({
    mutationFn: async (d: any) => {
      const { data, error } = await supabase.from('seguros_vida').insert({ ...d, empresa_id: empresaAtual?.id, valor_mensal: d.valor_mensal ? Number(d.valor_mensal) : null, capital_segurado: d.capital_segurado ? Number(d.capital_segurado) : null }).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['seguros-vida'] }); setOpenSeguro(false); toast.success('Seguro cadastrado!'); },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar plano de saúde.')),
  });

  const isLoading = l1 || l2;
  if (isLoading) return <PageLayout title="Planos e Seguros"><Spinner /></PageLayout>;

  return (
    <PageLayout title="Planos de Saúde e Seguros" description="Gerencie planos de saúde e seguros de vida">
      <Tabs defaultValue="planos">
        <TabsList>
          <TabsTrigger value="planos"><Heart className="h-4 w-4 mr-1" />Planos de Saúde ({planos.length})</TabsTrigger>
          <TabsTrigger value="seguros"><Shield className="h-4 w-4 mr-1" />Seguros de Vida ({seguros.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="planos">
          <Card><CardContent className="pt-6">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">Planos</h3>
              <Dialog open={openPlano} onOpenChange={setOpenPlano}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo Plano</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Cadastrar Plano</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Nome *</Label><Input value={formPlano.nome} onChange={e => setFormPlano(p => ({ ...p, nome: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Operadora</Label><Input value={formPlano.operadora} onChange={e => setFormPlano(p => ({ ...p, operadora: e.target.value }))} /></div>
                      <div><Label>Registro ANS</Label><Input value={formPlano.ans_registro} onChange={e => setFormPlano(p => ({ ...p, ans_registro: e.target.value }))} /></div>
                    </div>
                    <div><Label>Tipo</Label>
                      <Select value={formPlano.tipo} onValueChange={v => setFormPlano(p => ({ ...p, tipo: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="saude">Saúde</SelectItem><SelectItem value="odontologico">Odontológico</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Valor Mensal</Label><Input type="number" value={formPlano.valor_mensal} onChange={e => setFormPlano(p => ({ ...p, valor_mensal: e.target.value }))} /></div>
                      <div><Label>Coparticipação %</Label><Input type="number" value={formPlano.coparticipacao} onChange={e => setFormPlano(p => ({ ...p, coparticipacao: e.target.value }))} /></div>
                    </div>
                    <Button className="w-full" onClick={() => criarPlano.mutate(formPlano)} disabled={!formPlano.nome}>Salvar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Operadora</TableHead><TableHead>Tipo</TableHead><TableHead>Valor</TableHead><TableHead>Beneficiários</TableHead></TableRow></TableHeader>
              <TableBody>
                {planos.map((p: any) => (
                  <>
                    <TableRow key={p.id} className="cursor-pointer hover:bg-accent/30" onClick={() => setExpandedPlano(expandedPlano === p.id ? null : p.id)}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>{p.operadora || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{p.tipo}</Badge></TableCell>
                      <TableCell>{p.valor_mensal ? `R$ ${Number(p.valor_mensal).toLocaleString('pt-BR')}` : '—'}</TableCell>
                      <TableCell><Button variant="ghost" size="sm"><Users className="h-4 w-4 mr-1" /> Ver</Button></TableCell>
                    </TableRow>
                    {expandedPlano === p.id && (
                      <TableRow key={`${p.id}-ben`}>
                        <TableCell colSpan={5} className="p-4">
                          <BeneficiariosPlanoSection planoId={p.id} />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
                {planos.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Nenhum plano</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="seguros">
          <Card><CardContent className="pt-6">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">Seguros</h3>
              <Dialog open={openSeguro} onOpenChange={setOpenSeguro}>
                <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Novo Seguro</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Cadastrar Seguro</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Nome *</Label><Input value={formSeguro.nome} onChange={e => setFormSeguro(p => ({ ...p, nome: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Seguradora</Label><Input value={formSeguro.seguradora} onChange={e => setFormSeguro(p => ({ ...p, seguradora: e.target.value }))} /></div>
                      <div><Label>Nº Apólice</Label><Input value={formSeguro.apolice_numero} onChange={e => setFormSeguro(p => ({ ...p, apolice_numero: e.target.value }))} /></div>
                    </div>
                    <div><Label>Vencimento Apólice</Label><Input type="date" value={formSeguro.data_vencimento_apolice} onChange={e => setFormSeguro(p => ({ ...p, data_vencimento_apolice: e.target.value }))} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Valor Mensal</Label><Input type="number" value={formSeguro.valor_mensal} onChange={e => setFormSeguro(p => ({ ...p, valor_mensal: e.target.value }))} /></div>
                      <div><Label>Capital Segurado</Label><Input type="number" value={formSeguro.capital_segurado} onChange={e => setFormSeguro(p => ({ ...p, capital_segurado: e.target.value }))} /></div>
                    </div>
                    <Button className="w-full" onClick={() => criarSeguro.mutate(formSeguro)} disabled={!formSeguro.nome}>Salvar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Seguradora</TableHead><TableHead>Valor</TableHead><TableHead>Capital</TableHead></TableRow></TableHeader>
              <TableBody>
                {seguros.map((s: any) => (
                  <TableRow key={s.id}><TableCell className="font-medium">{s.nome}</TableCell><TableCell>{s.seguradora || '—'}</TableCell><TableCell>{s.valor_mensal ? `R$ ${Number(s.valor_mensal).toLocaleString('pt-BR')}` : '—'}</TableCell><TableCell>{s.capital_segurado ? `R$ ${Number(s.capital_segurado).toLocaleString('pt-BR')}` : '—'}</TableCell></TableRow>
                ))}
                {seguros.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum seguro</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
