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
import { UtensilsCrossed, Bus, CreditCard, Plus, RefreshCw, Pencil, Ban } from 'lucide-react';
import { safeErrorMessage } from '@/utils/safeError';
import { validateTablePayload } from '@/schemas/validate';

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

  // vales_transporte não tem empresa_id: o escopo de tenant vem do colaborador (join !inner).
  const { data: vt, isLoading: loadVT } = useQuery({
    queryKey: ['vales-transporte', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vales_transporte')
        .select('*, colaborador:colaboradores!inner(nome_completo, empresa_id)')
        .eq('colaborador.empresa_id', empresaAtual!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  // === Recargas ===
  const [openRec, setOpenRec] = useState(false);
  const [recForm, setRecForm] = useState({
    colaborador_id: '',
    vale_id: '',
    valor: '',
    data_recarga: '',
    mes_referencia: currentCompetenciaLocal(),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-vale', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome_completo')
        .eq('empresa_id', empresaAtual!.id)
        .eq('status', 'ativo');
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const { data: recargas = [], isLoading: loadRec } = useQuery({
    queryKey: ['recargas-vale', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recargas_vale')
        .select('*, colaborador:colaboradores(nome_completo)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const criarRecarga = useMutation({
    mutationFn: async (d: typeof recForm) => {
      const { error } = await supabase.from('recargas_vale').insert(
        validateTablePayload(
          'recargas_vale',
          {
            colaborador_id: d.colaborador_id || null,
            vale_id: d.vale_id || null,
            valor: Number(d.valor),
            data_recarga: d.data_recarga || todayLocalISO(),
            status: 'processado',
          },
          'ValesPage:recargas_vale'
        )
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recargas-vale'] });
      setOpenRec(false);
      setRecForm({
        colaborador_id: '',
        vale_id: '',
        valor: '',
        data_recarga: '',
        mes_referencia: currentCompetenciaLocal(),
      });
      toast.success('Recarga registrada');
    },
    onError: () => toast.error('Erro ao registrar recarga'),
  });

  // === Adesões VA/VR ===
  const vaVazio = { colaborador_id: '', tipo: 'VA', valor_por_dia: '', dias_uteis: '22' };
  const [openVA, setOpenVA] = useState(false);
  const [editVAId, setEditVAId] = useState<string | null>(null);
  const [vaForm, setVaForm] = useState(vaVazio);

  const salvarVA = useMutation({
    mutationFn: async (d: typeof vaForm) => {
      const valorDia = Number(d.valor_por_dia);
      const dias = Number(d.dias_uteis);
      const payload = {
        colaborador_id: d.colaborador_id,
        tipo: d.tipo,
        valor_por_dia: valorDia,
        dias_uteis: dias,
        valor_mensal: valorDia * dias,
      };
      if (editVAId) {
        const { error } = await supabase
          .from('vales_alimentacao')
          .update(validateTablePayload('vales_alimentacao', payload, 'ValesPage:vales_alimentacao:update'))
          .eq('id', editVAId)
          .eq('empresa_id', empresaAtual!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('vales_alimentacao')
          .insert(
            validateTablePayload(
              'vales_alimentacao',
              { ...payload, empresa_id: empresaAtual!.id, ativo: true },
              'ValesPage:vales_alimentacao'
            )
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vales-alimentacao'] });
      toast.success(editVAId ? 'VA/VR atualizado' : 'VA/VR cadastrado');
      setOpenVA(false);
      setEditVAId(null);
      setVaForm(vaVazio);
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar VA/VR.')),
  });

  const inativarVA = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vales_alimentacao')
        .update({ ativo: false })
        .eq('id', id)
        .eq('empresa_id', empresaAtual!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vales-alimentacao'] });
      toast.success('VA/VR inativado');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao inativar VA/VR.')),
  });

  // === Adesões VT ===
  const vtVazio = { colaborador_id: '', optante: 'sim', valor_diario: '', dias_uteis: '22' };
  const [openVT, setOpenVT] = useState(false);
  const [editVTId, setEditVTId] = useState<string | null>(null);
  const [vtForm, setVtForm] = useState(vtVazio);

  const salvarVT = useMutation({
    mutationFn: async (d: typeof vtForm) => {
      const valorDia = Number(d.valor_diario);
      const dias = Number(d.dias_uteis);
      const payload = validateTablePayload(
        'vales_transporte',
        {
          colaborador_id: d.colaborador_id,
          optante: d.optante === 'sim',
          valor_diario: valorDia,
          dias_uteis: dias,
          valor_mensal: valorDia * dias,
        },
        'ValesPage:vales_transporte'
      );
      // RLS de vales_transporte valida que o colaborador pertence às empresas do usuário.
      const { error } = editVTId
        ? await supabase.from('vales_transporte').update(payload).eq('id', editVTId)
        : await supabase.from('vales_transporte').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vales-transporte'] });
      toast.success(editVTId ? 'VT atualizado' : 'VT cadastrado');
      setOpenVT(false);
      setEditVTId(null);
      setVtForm(vtVazio);
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar VT.')),
  });

  const inativarVT = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vales_transporte').update({ optante: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vales-transporte'] });
      toast.success('VT desativado (não optante)');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao desativar VT.')),
  });

  const colaboradorSelect = (value: string, onChange: (v: string) => void) => (
    <Select value={value} onValueChange={onChange}>
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
  );

  const fmt = (v: number | null) => (v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-');

  return (
    <>
      <PageTitle title="Vales" description="Gestão de vales" />
      <PageLayout
        title="Vales"
        description="Vale Alimentação, Vale Refeição e Vale Transporte"
        icon={<CreditCard className="h-5 w-5 text-primary-foreground" />}
      >
        <Tabs defaultValue="alimentacao" className="space-y-4">
          <TabsList>
            <TabsTrigger value="alimentacao">
              <UtensilsCrossed className="mr-1 h-4 w-4" />
              VA / VR
            </TabsTrigger>
            <TabsTrigger value="transporte">
              <Bus className="mr-1 h-4 w-4" />
              VT
            </TabsTrigger>
            <TabsTrigger value="recargas">
              <RefreshCw className="mr-1 h-4 w-4" />
              Recargas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alimentacao">
            <div className="flex justify-end mb-4">
              <Dialog
                open={openVA}
                onOpenChange={(o) => {
                  setOpenVA(o);
                  if (!o) {
                    setEditVAId(null);
                    setVaForm(vaVazio);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo VA/VR
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editVAId ? 'Editar VA/VR' : 'Cadastrar VA/VR'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Colaborador</Label>
                      {colaboradorSelect(vaForm.colaborador_id, (v) => setVaForm((p) => ({ ...p, colaborador_id: v })))}
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select value={vaForm.tipo} onValueChange={(v) => setVaForm((p) => ({ ...p, tipo: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VA">Vale Alimentação</SelectItem>
                          <SelectItem value="VR">Vale Refeição</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Valor por Dia (R$)</Label>
                        <Input
                          type="number"
                          value={vaForm.valor_por_dia}
                          onChange={(e) => setVaForm((p) => ({ ...p, valor_por_dia: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Dias Úteis</Label>
                        <Input
                          type="number"
                          value={vaForm.dias_uteis}
                          onChange={(e) => setVaForm((p) => ({ ...p, dias_uteis: e.target.value }))}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Valor mensal: {fmt(Number(vaForm.valor_por_dia) * Number(vaForm.dias_uteis) || null)}
                    </p>
                    <Button
                      onClick={() => salvarVA.mutate(vaForm)}
                      disabled={
                        !vaForm.colaborador_id || !vaForm.valor_por_dia || !vaForm.dias_uteis || salvarVA.isPending
                      }
                      className="w-full"
                    >
                      {salvarVA.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardContent className="p-0">
                {loadVA ? (
                  <div className="p-8 flex justify-center">
                    <Spinner />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Valor/Dia</TableHead>
                        <TableHead>Valor Mensal</TableHead>
                        <TableHead>Dias Úteis</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {va?.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.colaborador?.nome_completo || '-'}</TableCell>
                          <TableCell className="capitalize">{r.tipo || 'VA'}</TableCell>
                          <TableCell>{fmt(r.valor_por_dia)}</TableCell>
                          <TableCell>{fmt(r.valor_mensal)}</TableCell>
                          <TableCell>{r.dias_uteis ?? '-'}</TableCell>
                          <TableCell>
                            <Badge variant={r.ativo ? 'default' : 'secondary'}>{r.ativo ? 'Ativo' : 'Inativo'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Editar VA/VR"
                              title="Editar"
                              onClick={() => {
                                setEditVAId(r.id);
                                setVaForm({
                                  colaborador_id: r.colaborador_id ?? '',
                                  tipo: r.tipo || 'VA',
                                  valor_por_dia: r.valor_por_dia != null ? String(r.valor_por_dia) : '',
                                  dias_uteis: r.dias_uteis != null ? String(r.dias_uteis) : '',
                                });
                                setOpenVA(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {r.ativo && (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Inativar VA/VR"
                                title="Inativar"
                                disabled={inativarVA.isPending}
                                onClick={() => inativarVA.mutate(r.id)}
                              >
                                <Ban className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!va?.length && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            Nenhum VA/VR cadastrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transporte">
            <div className="flex justify-end mb-4">
              <Dialog
                open={openVT}
                onOpenChange={(o) => {
                  setOpenVT(o);
                  if (!o) {
                    setEditVTId(null);
                    setVtForm(vtVazio);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo VT
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editVTId ? 'Editar VT' : 'Cadastrar VT'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Colaborador</Label>
                      {colaboradorSelect(vtForm.colaborador_id, (v) => setVtForm((p) => ({ ...p, colaborador_id: v })))}
                    </div>
                    <div>
                      <Label>Optante</Label>
                      <Select value={vtForm.optante} onValueChange={(v) => setVtForm((p) => ({ ...p, optante: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sim">Sim</SelectItem>
                          <SelectItem value="nao">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Valor Diário (R$)</Label>
                        <Input
                          type="number"
                          value={vtForm.valor_diario}
                          onChange={(e) => setVtForm((p) => ({ ...p, valor_diario: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Dias Úteis</Label>
                        <Input
                          type="number"
                          value={vtForm.dias_uteis}
                          onChange={(e) => setVtForm((p) => ({ ...p, dias_uteis: e.target.value }))}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Valor mensal: {fmt(Number(vtForm.valor_diario) * Number(vtForm.dias_uteis) || null)}
                    </p>
                    <Button
                      onClick={() => salvarVT.mutate(vtForm)}
                      disabled={
                        !vtForm.colaborador_id || !vtForm.valor_diario || !vtForm.dias_uteis || salvarVT.isPending
                      }
                      className="w-full"
                    >
                      {salvarVT.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardContent className="p-0">
                {loadVT ? (
                  <div className="p-8 flex justify-center">
                    <Spinner />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Optante</TableHead>
                        <TableHead>Valor Diário</TableHead>
                        <TableHead>Valor Mensal</TableHead>
                        <TableHead>Desconto</TableHead>
                        <TableHead>Líquido</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vt?.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.colaborador?.nome_completo || '-'}</TableCell>
                          <TableCell>{r.optante ? 'Sim' : 'Não'}</TableCell>
                          <TableCell>{fmt(r.valor_diario)}</TableCell>
                          <TableCell>{fmt(r.valor_mensal)}</TableCell>
                          <TableCell>{fmt(r.desconto)}</TableCell>
                          <TableCell>{fmt(r.valor_liquido)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Editar VT"
                              title="Editar"
                              onClick={() => {
                                setEditVTId(r.id);
                                setVtForm({
                                  colaborador_id: r.colaborador_id ?? '',
                                  optante: r.optante ? 'sim' : 'nao',
                                  valor_diario: r.valor_diario != null ? String(r.valor_diario) : '',
                                  dias_uteis: r.dias_uteis != null ? String(r.dias_uteis) : '',
                                });
                                setOpenVT(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {r.optante && (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Desativar VT"
                                title="Desativar"
                                disabled={inativarVT.isPending}
                                onClick={() => inativarVT.mutate(r.id)}
                              >
                                <Ban className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!vt?.length && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                            Nenhum VT cadastrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recargas">
            <div className="flex justify-end mb-4">
              <Dialog open={openRec} onOpenChange={setOpenRec}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Recarga
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Registrar Recarga</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Colaborador</Label>
                      <Select
                        value={recForm.colaborador_id}
                        onValueChange={(v) => setRecForm((p) => ({ ...p, colaborador_id: v }))}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Mês de Referência</Label>
                        <Input
                          type="month"
                          value={recForm.mes_referencia}
                          onChange={(e) => setRecForm((p) => ({ ...p, mes_referencia: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>Valor (R$)</Label>
                        <Input
                          type="number"
                          value={recForm.valor}
                          onChange={(e) => setRecForm((p) => ({ ...p, valor: e.target.value }))}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => criarRecarga.mutate(recForm)}
                      disabled={!recForm.valor || criarRecarga.isPending}
                      className="w-full"
                    >
                      {criarRecarga.isPending ? 'Salvando...' : 'Registrar'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardContent className="p-0">
                {loadRec ? (
                  <div className="p-8 flex justify-center">
                    <Spinner />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Mês Ref.</TableHead>
                        <TableHead>Data Recarga</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recargas.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.colaborador?.nome_completo || '-'}</TableCell>
                          <TableCell>{fmt(r.valor)}</TableCell>
                          <TableCell>{r.mes_referencia || '-'}</TableCell>
                          <TableCell>
                            {r.data_recarga ? new Date(r.data_recarga).toLocaleDateString('pt-BR') : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={r.status === 'processado' ? 'default' : 'secondary'}>
                              {r.status || 'pendente'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                      {recargas.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Nenhuma recarga registrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageLayout>
    </>
  );
}
