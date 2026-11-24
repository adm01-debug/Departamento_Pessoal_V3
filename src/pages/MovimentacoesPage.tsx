import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Plus, ArrowRightLeft, TrendingUp } from 'lucide-react';

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
    enabled: !!empresaAtual?.id});

  const { data: promocoes = [], isLoading: loadPromo } = useQuery({
    queryKey: ['promocoes', empresaAtual?.id],
    queryFn: async () => {
      let q = supabase.from('promocoes').select('*, colaborador:colaboradores(nome_completo)').order('data_promocao', { ascending: false });
      if (empresaAtual?.id) q = (q as any).eq('empresa_id', empresaAtual.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id});

  // Aplica a movimentação no cadastro do colaborador (cargo/salário/departamento).
  // Sem linha afetada = RLS bloqueou (perfil sem gestão de RH): falha explícita, nunca sucesso falso.
  const aplicarNoColaborador = async (colaboradorId: string, patch: Updatable<'colaboradores'>) => {
    const { data, error } = await supabase
      .from('colaboradores')
      .update(patch)
      .eq('id', colaboradorId)
      .eq('empresa_id', empresaAtual!.id)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('Sem permissão para atualizar o cadastro do colaborador.');
  };

  // A movimentação só vale para o cadastro se for a vigente mais recente do colaborador naquela tabela;
  // senão uma edição/lançamento retroativo sobrescreveria cargo/salário/departamento atuais.
  const ehMaisRecente = async (tabela: 'transferencias' | 'promocoes', colaboradorId: string, id: string) => {
    const hoje = todayLocalISO();
    const { data, error } =
      tabela === 'promocoes'
        ? await supabase
            .from('promocoes')
            .select('id')
            .eq('colaborador_id', colaboradorId)
            .lte('data_vigencia', hoje)
            .order('data_vigencia', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : await supabase
            .from('transferencias')
            .select('id')
            .eq('colaborador_id', colaboradorId)
            .lte('data_vigencia', hoje)
            .order('data_vigencia', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
    if (error) throw error;
    return data?.id === id;
  };

  const ERRO_DESFAZER =
    'O cadastro do colaborador não foi atualizado e não foi possível desfazer a alteração no histórico. Revise o registro.';

  const criarTransf = useMutation({
    mutationFn: async (d: any) => {
      const { data, error } = await supabase.from('transferencias').insert({ ...d, empresa_id: empresaAtual?.id }).select().maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Transferência não encontrada ou sem permissão para salvar.');
      const deptoNovo = departamentos.find((x) => x.id === d.departamento_novo_id);
      const vigente = d.data_vigencia <= todayLocalISO();
      const mudou =
        !original ||
        original.colaborador_id !== data.colaborador_id ||
        original.departamento_novo_id !== data.departamento_novo_id ||
        original.data_vigencia !== data.data_vigencia;
      const maisRecente =
        vigente && !!deptoNovo && mudou && (await ehMaisRecente('transferencias', d.colaborador_id, data.id));
      if (maisRecente && deptoNovo) {
        try {
          await aplicarNoColaborador(d.colaborador_id, { departamento: deptoNovo.nome });
        } catch (e) {
          const desfeito = original
            ? await supabase
                .from('transferencias')
                .update({
                  colaborador_id: original.colaborador_id,
                  departamento_anterior_id: original.departamento_anterior_id,
                  departamento_novo_id: original.departamento_novo_id,
                  data_vigencia: original.data_vigencia,
                  motivo: original.motivo,
                })
                .eq('id', data.id)
                .select('id')
            : await supabase.from('transferencias').delete().eq('id', data.id).select('id');
          if (desfeito.error || !desfeito.data?.length) throw new Error(ERRO_DESFAZER, { cause: e });
          throw e;
        }
      }
      return {
        aplicado: maisRecente,
        futura: !vigente,
        temMaisRecente: vigente && !!deptoNovo && mudou && !maisRecente,
      };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['transferencias'] }); setOpenTransf(false); toast.success('Transferência registrada!'); },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar movimentação.'))});

  const criarPromo = useMutation({
    mutationFn: async (d: any) => {
      const { data, error } = await supabase.from('promocoes').insert({ ...d, empresa_id: empresaAtual?.id, novo_salario: d.novo_salario ? Number(d.novo_salario) : null }).select().maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Promoção não encontrada ou sem permissão para salvar.');
      const patch: Updatable<'colaboradores'> = {};
      const cargoNovo = cargos.find((c) => c.id === d.cargo_novo_id);
      if (cargoNovo) {
        patch.cargo_id = cargoNovo.id;
        patch.cargo = cargoNovo.nome;
      }
      if (d.salario_novo) patch.salario_base = Number(d.salario_novo);
      const temAlteracao = Object.keys(patch).length > 0;
      const vigente = d.data_vigencia <= todayLocalISO();
      const mudou =
        !original ||
        original.colaborador_id !== data.colaborador_id ||
        original.cargo_novo_id !== data.cargo_novo_id ||
        original.salario_novo !== data.salario_novo ||
        original.data_vigencia !== data.data_vigencia;
      const maisRecente =
        vigente && temAlteracao && mudou && (await ehMaisRecente('promocoes', d.colaborador_id, data.id));
      if (maisRecente) {
        // Mudança salarial aplicada entra no histórico salarial do colaborador (não há trigger que faça isso).
        const registrarSalario =
          !!d.salario_novo &&
          (!original || original.salario_novo !== data.salario_novo || original.colaborador_id !== data.colaborador_id);
        let historicoId: string | null = null;
        try {
          if (registrarSalario) {
            const hist = await criarRegistroSalarial({
              colaborador_id: d.colaborador_id,
              empresa_id: empresaAtual!.id,
              data_vigencia: d.data_vigencia,
              motivo: (d.motivo || 'Promoção').slice(0, 300),
              salario_anterior: d.salario_anterior ? Number(d.salario_anterior) : null,
              salario_novo: Number(d.salario_novo),
              cargo_anterior: cargos.find((c) => c.id === d.cargo_anterior_id)?.nome ?? null,
              cargo_novo: cargoNovo?.nome ?? null,
            });
            historicoId = hist?.id ?? null;
          }
          await aplicarNoColaborador(d.colaborador_id, patch);
        } catch (e) {
          if (historicoId) await supabase.from('historico_salarial').delete().eq('id', historicoId);
          const desfeito = original
            ? await supabase
                .from('promocoes')
                .update({
                  colaborador_id: original.colaborador_id,
                  cargo_anterior_id: original.cargo_anterior_id,
                  cargo_novo_id: original.cargo_novo_id,
                  salario_anterior: original.salario_anterior,
                  salario_novo: original.salario_novo,
                  data_vigencia: original.data_vigencia,
                  motivo: original.motivo,
                })
                .eq('id', data.id)
                .select('id')
            : await supabase.from('promocoes').delete().eq('id', data.id).select('id');
          if (desfeito.error || !desfeito.data?.length) throw new Error(ERRO_DESFAZER, { cause: e });
          throw e;
        }
      }
      return {
        aplicado: maisRecente,
        futura: !vigente,
        temMaisRecente: vigente && temAlteracao && mudou && !maisRecente,
      };
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promocoes'] }); setOpenPromo(false); toast.success('Promoção registrada!'); },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar movimentação.'))});

  const excluir = useMutation({
    mutationFn: async (alvo: { tabela: 'transferencias' | 'promocoes'; id: string }) => {
      // Tabelas sem empresa_id: confirma pela empresa do colaborador antes de excluir.
      const daEmpresa = alvo.tabela === 'promocoes' ? promocoes : transferencias;
      if (!daEmpresa.some((m) => m.id === alvo.id && m.colaborador?.empresa_id === empresaAtual?.id))
        throw new Error('Registro não encontrado nesta empresa.');
      const { data, error } =
        alvo.tabela === 'promocoes'
          ? await supabase.from('promocoes').delete().eq('id', alvo.id).select('id')
          : await supabase.from('transferencias').delete().eq('id', alvo.id).select('id');
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Registro não encontrado ou sem permissão para excluir.');
      return alvo.tabela;
    },
    onSuccess: (tabela) => {
      qc.invalidateQueries({ queryKey: [tabela] });
      setExcluirAlvo(null);
      toast.success('Registro excluído do histórico.');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao excluir movimentação.')),
  });

  const editarTransf = (t: TransferenciaComJoins) => {
    setFormTransf({
      colaborador_id: t.colaborador_id ?? '',
      departamento_anterior_id: t.departamento_anterior_id ?? '',
      departamento_novo_id: t.departamento_novo_id ?? '',
      data_vigencia: t.data_vigencia ?? '',
      motivo: t.motivo ?? '',
    });
    setEditTransfId(t.id);
    setOpenTransf(true);
  };

  const editarPromo = (p: PromocaoComJoins) => {
    setFormPromo({
      colaborador_id: p.colaborador_id ?? '',
      cargo_anterior_id: p.cargo_anterior_id ?? '',
      cargo_novo_id: p.cargo_novo_id ?? '',
      salario_anterior: p.salario_anterior != null ? String(p.salario_anterior) : '',
      salario_novo: p.salario_novo != null ? String(p.salario_novo) : '',
      data_vigencia: p.data_vigencia ?? '',
      motivo: p.motivo ?? '',
    });
    setEditPromoId(p.id);
    setOpenPromo(true);
  };

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
                    <div className="flex justify-end pt-1">
                      <Button size="sm" className="rounded-lg px-4" onClick={() => criarTransf.mutate(formTransf)} disabled={!formTransf.colaborador_id || !formTransf.data_efetivacao}>Salvar</Button>
                    </div>
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
                    <div className="flex justify-end pt-1">
                      <Button size="sm" className="rounded-lg px-4" onClick={() => criarPromo.mutate(formPromo)} disabled={!formPromo.colaborador_id || !formPromo.data_promocao}>Salvar</Button>
                    </div>
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
