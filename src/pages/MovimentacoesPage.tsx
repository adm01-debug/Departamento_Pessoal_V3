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
import type { Tables, Insertable } from '@/integrations/supabase/database.types';
import { validateTablePayload } from '@/schemas/validate';

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

  const criarTransf = useMutation({
    mutationFn: async (d: typeof initialFormTransf) => {
      const payload: Insertable<'transferencias'> = {
        colaborador_id: d.colaborador_id,
        departamento_anterior_id: d.departamento_anterior_id || null,
        departamento_novo_id: d.departamento_novo_id || null,
        data_vigencia: d.data_vigencia,
        motivo: d.motivo || null,
      };
      const { data, error } = await supabase
        .from('transferencias')
        .insert(validateTablePayload('transferencias', payload, 'MovimentacoesPage:transferencias'))
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transferencias'] });
      setOpenTransf(false);
      toast.success('Transferência registrada!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar movimentação.')),
  });

  const criarPromo = useMutation({
    mutationFn: async (d: typeof initialFormPromo) => {
      const payload: Insertable<'promocoes'> = {
        colaborador_id: d.colaborador_id || null,
        cargo_anterior_id: d.cargo_anterior_id || null,
        cargo_novo_id: d.cargo_novo_id || null,
        salario_anterior: d.salario_anterior ? Number(d.salario_anterior) : null,
        salario_novo: d.salario_novo ? Number(d.salario_novo) : null,
        data_vigencia: d.data_vigencia,
        motivo: d.motivo || null,
      };
      const { data, error } = await supabase
        .from('promocoes')
        .insert(validateTablePayload('promocoes', payload, 'MovimentacoesPage:promocoes'))
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['promocoes'] });
      setOpenPromo(false);
      toast.success('Promoção registrada!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar movimentação.')),
  });

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
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Nova Transferência
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Registrar Transferência</DialogTitle>
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
                          onClick={() => criarTransf.mutate(formTransf)}
                          disabled={!formTransf.colaborador_id || !formTransf.data_vigencia}
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transferencias.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.colaborador?.nome_completo || '—'}</TableCell>
                        <TableCell>{t.departamento_anterior?.nome || '—'}</TableCell>
                        <TableCell>{t.departamento_novo?.nome || '—'}</TableCell>
                        <TableCell>{t.data_vigencia}</TableCell>
                      </TableRow>
                    ))}
                    {transferencias.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
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
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Nova Promoção
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Registrar Promoção</DialogTitle>
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
                          onClick={() => criarPromo.mutate(formPromo)}
                          disabled={!formPromo.colaborador_id || !formPromo.data_vigencia}
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
                      </TableRow>
                    ))}
                    {promocoes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
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
      </PageLayout>
    </>
  );
}
