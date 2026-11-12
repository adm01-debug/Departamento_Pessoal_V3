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
import { Plus, ArrowRightLeft, TrendingUp, Pencil, Trash2 } from 'lucide-react';
import type { Tables, Insertable, Updatable } from '@/integrations/supabase/database.types';
import { validateTablePayload } from '@/schemas/validate';
import { todayLocalISO } from '@/utils/dateLocal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type TransferenciaComJoins = Tables<'transferencias'> & {
  colaborador: { nome_completo: string; empresa_id: string | null } | null;
  departamento_anterior: { nome: string } | null;
  departamento_novo: { nome: string } | null;
};

type PromocaoComJoins = Tables<'promocoes'> & {
  colaborador: { nome_completo: string; empresa_id: string | null } | null;
  cargo_anterior: { nome: string } | null;
  cargo_novo: { nome: string } | null;
};

const initialFormTransf = {
  colaborador_id: '',
  departamento_anterior_id: '',
  departamento_novo_id: '',
  data_vigencia: '',
  motivo: '',
};
const initialFormPromo = {
  colaborador_id: '',
  cargo_anterior_id: '',
  cargo_novo_id: '',
  salario_anterior: '',
  salario_novo: '',
  data_vigencia: '',
  motivo: '',
};

export default function MovimentacoesPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [openTransf, setOpenTransf] = useState(false);
  const [openPromo, setOpenPromo] = useState(false);
  const [formTransf, setFormTransf] = useState(initialFormTransf);
  const [formPromo, setFormPromo] = useState(initialFormPromo);
  const [editTransfId, setEditTransfId] = useState<string | null>(null);
  const [editPromoId, setEditPromoId] = useState<string | null>(null);
  const [excluirAlvo, setExcluirAlvo] = useState<{ tabela: 'transferencias' | 'promocoes'; id: string } | null>(null);

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', empresaAtual?.id],
    queryFn: () => colaboradorService.list(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const { data: departamentos = [] } = useQuery({
    queryKey: ['departamentos', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departamentos')
        .select('id, nome')
        .eq('empresa_id', empresaAtual!.id)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const { data: cargos = [] } = useQuery({
    queryKey: ['cargos', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cargos')
        .select('id, nome')
        .eq('empresa_id', empresaAtual!.id)
        .order('nome');
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const { data: transferencias = [], isLoading: loadTransf } = useQuery<TransferenciaComJoins[]>({
    queryKey: ['transferencias', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transferencias')
        .select(
          '*, colaborador:colaboradores!inner(nome_completo, empresa_id), departamento_anterior:departamentos!transferencias_departamento_anterior_id_fkey(nome), departamento_novo:departamentos!transferencias_departamento_novo_id_fkey(nome)'
        )
        .eq('colaborador.empresa_id', empresaAtual!.id)
        .order('data_vigencia', { ascending: false });
      if (error) throw error;
      return (data as TransferenciaComJoins[] | null) || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const { data: promocoes = [], isLoading: loadPromo } = useQuery<PromocaoComJoins[]>({
    queryKey: ['promocoes', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promocoes')
        .select(
          '*, colaborador:colaboradores!inner(nome_completo, empresa_id), cargo_anterior:cargos!promocoes_cargo_anterior_id_fkey(nome), cargo_novo:cargos!promocoes_cargo_novo_id_fkey(nome)'
        )
        .eq('colaborador.empresa_id', empresaAtual!.id)
        .order('data_vigencia', { ascending: false });
      if (error) throw error;
      return (data as PromocaoComJoins[] | null) || [];
    },
    enabled: !!empresaAtual?.id,
  });

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
    mutationFn: async ({ d, id }: { d: typeof initialFormTransf; id: string | null }) => {
      const payload: Insertable<'transferencias'> = {
        colaborador_id: d.colaborador_id,
        departamento_anterior_id: d.departamento_anterior_id || null,
        departamento_novo_id: d.departamento_novo_id || null,
        data_vigencia: d.data_vigencia,
        motivo: d.motivo || null,
      };
      const validado = validateTablePayload('transferencias', payload, 'MovimentacoesPage:transferencias');
      if (!colaboradores.some((c) => c.id === d.colaborador_id))
        throw new Error('Colaborador não pertence à empresa selecionada.');
      let original: Tables<'transferencias'> | null = null;
      if (id) {
        const { data: atual, error: errAtual } = await supabase
          .from('transferencias')
          .select('*, colaborador:colaboradores!inner(empresa_id)')
          .eq('id', id)
          .eq('colaborador.empresa_id', empresaAtual!.id)
          .maybeSingle();
        if (errAtual) throw errAtual;
        if (!atual) throw new Error('Transferência não encontrada nesta empresa.');
        const { colaborador: _c, ...linha } = atual;
        original = linha;
      }
      const { data, error } = id
        ? await supabase.from('transferencias').update(validado).eq('id', id).select().maybeSingle()
        : await supabase.from('transferencias').insert(validado).select().maybeSingle();
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
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['transferencias'] });
      qc.invalidateQueries({ queryKey: ['colaboradores'] });
      setOpenTransf(false);
      setEditTransfId(null);
      toast.success(
        r.aplicado
          ? 'Transferência salva e aplicada ao cadastro do colaborador.'
          : r.futura
            ? 'Transferência salva. Vigência futura: o cadastro do colaborador não foi alterado.'
            : r.temMaisRecente
              ? 'Transferência salva. Há transferência mais recente: o cadastro do colaborador não foi alterado.'
              : 'Transferência salva.'
      );
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar movimentação.')),
  });

  const criarPromo = useMutation({
    mutationFn: async ({ d, id }: { d: typeof initialFormPromo; id: string | null }) => {
      const payload: Insertable<'promocoes'> = {
        colaborador_id: d.colaborador_id || null,
        cargo_anterior_id: d.cargo_anterior_id || null,
        cargo_novo_id: d.cargo_novo_id || null,
        salario_anterior: d.salario_anterior ? Number(d.salario_anterior) : null,
        salario_novo: d.salario_novo ? Number(d.salario_novo) : null,
        data_vigencia: d.data_vigencia,
        motivo: d.motivo || null,
      };
      const validado = validateTablePayload('promocoes', payload, 'MovimentacoesPage:promocoes');
      if (!colaboradores.some((c) => c.id === d.colaborador_id))
        throw new Error('Colaborador não pertence à empresa selecionada.');
      let original: Tables<'promocoes'> | null = null;
      if (id) {
        const { data: atual, error: errAtual } = await supabase
          .from('promocoes')
          .select('*, colaborador:colaboradores!inner(empresa_id)')
          .eq('id', id)
          .eq('colaborador.empresa_id', empresaAtual!.id)
          .maybeSingle();
        if (errAtual) throw errAtual;
        if (!atual) throw new Error('Promoção não encontrada nesta empresa.');
        const { colaborador: _c, ...linha } = atual;
        original = linha;
      }
      const { data, error } = id
        ? await supabase.from('promocoes').update(validado).eq('id', id).select().maybeSingle()
        : await supabase.from('promocoes').insert(validado).select().maybeSingle();
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
        try {
          await aplicarNoColaborador(d.colaborador_id, patch);
        } catch (e) {
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
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['promocoes'] });
      qc.invalidateQueries({ queryKey: ['colaboradores'] });
      setOpenPromo(false);
      setEditPromoId(null);
      toast.success(
        r.aplicado
          ? 'Promoção salva e aplicada ao cadastro do colaborador.'
          : r.futura
            ? 'Promoção salva. Vigência futura: o cadastro do colaborador não foi alterado.'
            : r.temMaisRecente
              ? 'Promoção salva. Há promoção mais recente: o cadastro do colaborador não foi alterado.'
              : 'Promoção salva.'
      );
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar movimentação.')),
  });

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
  if (isLoading)
    return (
      <PageLayout title="Movimentações">
        <Spinner />
      </PageLayout>
    );

  return (
    <>
      <PageTitle title="Movimentações" description="Histórico de movimentações" />
      <PageLayout title="Movimentações de Pessoal" description="Transferências, promoções e lotações">
        <Tabs defaultValue="transferencias">
          <TabsList>
            <TabsTrigger value="transferencias">
              <ArrowRightLeft className="h-4 w-4 mr-1" />
              Transferências ({transferencias.length})
            </TabsTrigger>
            <TabsTrigger value="promocoes">
              <TrendingUp className="h-4 w-4 mr-1" />
              Promoções ({promocoes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transferencias">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between mb-4">
                  <h3 className="text-lg font-semibold">Transferências</h3>
                  <Dialog open={openTransf} onOpenChange={setOpenTransf}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditTransfId(null);
                          setFormTransf(initialFormTransf);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Nova Transferência
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editTransfId ? 'Editar Transferência' : 'Registrar Transferência'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <Label>Colaborador *</Label>
                          <Select
                            value={formTransf.colaborador_id}
                            onValueChange={(v) => setFormTransf((p) => ({ ...p, colaborador_id: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {colaboradores.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.nome_completo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Departamento Anterior</Label>
                            <Select
                              value={formTransf.departamento_anterior_id}
                              onValueChange={(v) => setFormTransf((p) => ({ ...p, departamento_anterior_id: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {departamentos.map((d) => (
                                  <SelectItem key={d.id} value={d.id}>
                                    {d.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Departamento Novo</Label>
                            <Select
                              value={formTransf.departamento_novo_id}
                              onValueChange={(v) => setFormTransf((p) => ({ ...p, departamento_novo_id: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {departamentos.map((d) => (
                                  <SelectItem key={d.id} value={d.id}>
                                    {d.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label>Data de Vigência *</Label>
                          <Input
                            type="date"
                            value={formTransf.data_vigencia}
                            onChange={(e) => setFormTransf((p) => ({ ...p, data_vigencia: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Motivo</Label>
                          <Textarea
                            value={formTransf.motivo}
                            onChange={(e) => setFormTransf((p) => ({ ...p, motivo: e.target.value }))}
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => criarTransf.mutate({ d: formTransf, id: editTransfId })}
                          disabled={!formTransf.colaborador_id || !formTransf.data_vigencia || criarTransf.isPending}
                        >
                          Salvar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>De</TableHead>
                      <TableHead>Para</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-24 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transferencias.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.colaborador?.nome_completo || '—'}</TableCell>
                        <TableCell>{t.departamento_anterior?.nome || '—'}</TableCell>
                        <TableCell>{t.departamento_novo?.nome || '—'}</TableCell>
                        <TableCell>{t.data_vigencia}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar transferência"
                            onClick={() => editarTransf(t)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Excluir transferência"
                            onClick={() => setExcluirAlvo({ tabela: 'transferencias', id: t.id })}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {transferencias.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Nenhuma transferência
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="promocoes">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between mb-4">
                  <h3 className="text-lg font-semibold">Promoções</h3>
                  <Dialog open={openPromo} onOpenChange={setOpenPromo}>
                    <DialogTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditPromoId(null);
                          setFormPromo(initialFormPromo);
                        }}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Nova Promoção
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editPromoId ? 'Editar Promoção' : 'Registrar Promoção'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div>
                          <Label>Colaborador *</Label>
                          <Select
                            value={formPromo.colaborador_id}
                            onValueChange={(v) => setFormPromo((p) => ({ ...p, colaborador_id: v }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {colaboradores.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.nome_completo}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Cargo Anterior</Label>
                            <Select
                              value={formPromo.cargo_anterior_id}
                              onValueChange={(v) => setFormPromo((p) => ({ ...p, cargo_anterior_id: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {cargos.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Cargo Novo</Label>
                            <Select
                              value={formPromo.cargo_novo_id}
                              onValueChange={(v) => setFormPromo((p) => ({ ...p, cargo_novo_id: v }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {cargos.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.nome}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Salário Anterior</Label>
                            <Input
                              type="number"
                              value={formPromo.salario_anterior}
                              onChange={(e) => setFormPromo((p) => ({ ...p, salario_anterior: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label>Novo Salário</Label>
                            <Input
                              type="number"
                              value={formPromo.salario_novo}
                              onChange={(e) => setFormPromo((p) => ({ ...p, salario_novo: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Data de Vigência *</Label>
                          <Input
                            type="date"
                            value={formPromo.data_vigencia}
                            onChange={(e) => setFormPromo((p) => ({ ...p, data_vigencia: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Motivo</Label>
                          <Textarea
                            value={formPromo.motivo}
                            onChange={(e) => setFormPromo((p) => ({ ...p, motivo: e.target.value }))}
                          />
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => criarPromo.mutate({ d: formPromo, id: editPromoId })}
                          disabled={!formPromo.colaborador_id || !formPromo.data_vigencia || criarPromo.isPending}
                        >
                          Salvar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead>De</TableHead>
                      <TableHead>Para</TableHead>
                      <TableHead>Salário</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="w-24 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promocoes.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.colaborador?.nome_completo || '—'}</TableCell>
                        <TableCell>{p.cargo_anterior?.nome || '—'}</TableCell>
                        <TableCell className="font-medium">{p.cargo_novo?.nome || '—'}</TableCell>
                        <TableCell>
                          {p.salario_novo ? `R$ ${Number(p.salario_novo).toLocaleString('pt-BR')}` : '—'}
                        </TableCell>
                        <TableCell>{p.data_vigencia}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Editar promoção"
                            onClick={() => editarPromo(p)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Excluir promoção"
                            onClick={() => setExcluirAlvo({ tabela: 'promocoes', id: p.id })}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {promocoes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Nenhuma promoção
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog open={!!excluirAlvo} onOpenChange={(o) => !o && setExcluirAlvo(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir movimentação do histórico?</AlertDialogTitle>
              <AlertDialogDescription>
                O registro será removido do histórico. O cadastro atual do colaborador (cargo, salário e departamento)
                não é revertido automaticamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={excluir.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  if (excluirAlvo) excluir.mutate(excluirAlvo);
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageLayout>
    </>
  );
}
