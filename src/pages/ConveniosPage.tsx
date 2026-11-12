import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks';
import { useAuth } from '@/contexts';
import { toast } from 'sonner';
import { Plus, Handshake, Trash2, Pencil } from 'lucide-react';
import { validateTablePayload } from '@/schemas/validate';
import { safeErrorMessage } from '@/utils/safeError';

export default function ConveniosPage() {
  const { empresaAtual } = useEmpresas();
  const { isAdmin, hasRole } = useAuth();
  const podeGerir = isAdmin || hasRole('rh');
  const qc = useQueryClient();
  const [tab, setTab] = useState('convenios');

  // === Convênios ===
  const [open, setOpen] = useState(false);
  const formVazio = { nome: '', tipo: '', limite_global: '', ativo: true };
  const [form, setForm] = useState(formVazio);
  const [editId, setEditId] = useState<string | null>(null);
  const [excluirAlvo, setExcluirAlvo] = useState<{ id: string; nome: string } | null>(null);

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setEditId(null);
      setForm(formVazio);
    }
  };

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
      const { error } = await supabase.from('convenios').insert(
        validateTablePayload(
          'convenios',
          {
            nome: d.nome,
            tipo: d.tipo || null,
            limite_global: d.limite_global ? Number(d.limite_global) : null,
            empresa_id: empresaAtual?.id,
          },
          'ConveniosPage:convenios'
        )
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['convenios'] });
      onOpenChange(false);
      toast.success('Convênio criado');
    },
  });

  const editar = useMutation({
    mutationFn: async ({ id, d }: { id: string; d: typeof form }) => {
      const { data, error } = await supabase
        .from('convenios')
        .update(
          validateTablePayload(
            'convenios',
            {
              nome: d.nome,
              tipo: d.tipo || null,
              limite_global: d.limite_global ? Number(d.limite_global) : null,
              ativo: d.ativo,
            },
            'ConveniosPage:convenios:update'
          )
        )
        .eq('id', id)
        .eq('empresa_id', empresaAtual!.id)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Convênio não encontrado ou sem permissão para alterar');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['convenios'] });
      qc.invalidateQueries({ queryKey: ['convenios-colaboradores'] });
      onOpenChange(false);
      toast.success('Convênio atualizado');
    },
    onError: (e) => toast.error(safeErrorMessage(e, 'Erro ao atualizar convênio')),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('convenios')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresaAtual!.id)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Convênio não encontrado ou sem permissão para excluir');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['convenios'] });
      toast.success('Excluído');
    },
    onError: (e) => toast.error(safeErrorMessage(e, 'Erro ao excluir convênio')),
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
      const { data, error } = await supabase
        .from('convenios_colaboradores')
        .select('*, colaborador:colaboradores(nome_completo), convenio:convenios(nome)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const criarVinculo = useMutation({
    mutationFn: async (d: typeof vincForm) => {
      const { error } = await supabase.from('convenios_colaboradores').insert(
        validateTablePayload(
          'convenios_colaboradores',
          {
            convenio_id: d.convenio_id,
            colaborador_id: d.colaborador_id,
            limite_individual: d.limite_individual ? Number(d.limite_individual) : null,
            ativo: true,
          },
          'ConveniosPage:convenios_colaboradores'
        )
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['convenios-colaboradores'] });
      setOpenVinc(false);
      setVincForm({ convenio_id: '', colaborador_id: '', limite_individual: '' });
      toast.success('Colaborador vinculado ao convênio');
    },
    onError: () => toast.error('Erro ao vincular'),
  });

  const excluirVinculo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('convenios_colaboradores').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['convenios-colaboradores'] });
      toast.success('Vínculo removido');
    },
  });

  const fmt = (v: number | null) => (v ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-');

  return (
    <>
      <PageTitle title="Convênios" description="Gestão de convênios" />
      <PageLayout
        title="Convênios"
        description="Gestão de convênios empresariais"
        icon={<Handshake className="h-5 w-5 text-primary-foreground" />}
      >
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="convenios">Convênios</TabsTrigger>
            <TabsTrigger value="colaboradores">Colaboradores Vinculados</TabsTrigger>
          </TabsList>

          <TabsContent value="convenios">
            <div className="flex justify-end mb-4">
              <Dialog open={open} onOpenChange={onOpenChange}>
                {podeGerir && (
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Convênio
                    </Button>
                  </DialogTrigger>
                )}
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editId ? 'Editar Convênio' : 'Novo Convênio'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome</Label>
                      <Input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select value={form.tipo} onValueChange={(v) => setForm((p) => ({ ...p, tipo: v }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="farmacia">Farmácia</SelectItem>
                          <SelectItem value="educacao">Educação</SelectItem>
                          <SelectItem value="saude">Saúde</SelectItem>
                          <SelectItem value="lazer">Lazer</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Limite Global (R$)</Label>
                      <Input
                        type="number"
                        value={form.limite_global}
                        onChange={(e) => setForm((p) => ({ ...p, limite_global: e.target.value }))}
                      />
                    </div>
                    {editId && (
                      <div className="flex items-center gap-2">
                        <Switch
                          id="convenio-ativo"
                          checked={form.ativo}
                          onCheckedChange={(v) => setForm((p) => ({ ...p, ativo: v }))}
                        />
                        <Label htmlFor="convenio-ativo">Ativo</Label>
                      </div>
                    )}
                    <Button
                      onClick={() => (editId ? editar.mutate({ id: editId, d: form }) : criar.mutate(form))}
                      disabled={!form.nome || criar.isPending || editar.isPending}
                      className="w-full"
                    >
                      Salvar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="p-8 flex justify-center">
                    <Spinner />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Limite Global</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.nome}</TableCell>
                          <TableCell className="capitalize">{r.tipo || '-'}</TableCell>
                          <TableCell>{r.limite_global ? fmt(Number(r.limite_global)) : '-'}</TableCell>
                          <TableCell>
                            <Badge variant={r.ativo ? 'default' : 'secondary'}>{r.ativo ? 'Ativo' : 'Inativo'}</Badge>
                          </TableCell>
                          <TableCell>
                            {podeGerir && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Editar"
                                  onClick={() => {
                                    setEditId(r.id);
                                    setForm({
                                      nome: r.nome,
                                      tipo: r.tipo ?? '',
                                      limite_global: r.limite_global != null ? String(r.limite_global) : '',
                                      ativo: r.ativo ?? true,
                                    });
                                    setOpen(true);
                                  }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Excluir"
                                  onClick={() => setExcluirAlvo({ id: r.id, nome: r.nome })}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!data?.length && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                            Nenhum convênio cadastrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="colaboradores">
            <div className="flex justify-end mb-4">
              <Dialog open={openVinc} onOpenChange={setOpenVinc}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Vincular Colaborador
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Vincular Colaborador a Convênio</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Convênio</Label>
                      <Select
                        value={vincForm.convenio_id}
                        onValueChange={(v) => setVincForm((p) => ({ ...p, convenio_id: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {data
                            ?.filter((c) => c.ativo !== false)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Colaborador</Label>
                      <Select
                        value={vincForm.colaborador_id}
                        onValueChange={(v) => setVincForm((p) => ({ ...p, colaborador_id: v }))}
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
                    <div>
                      <Label>Limite Individual (R$)</Label>
                      <Input
                        type="number"
                        value={vincForm.limite_individual}
                        onChange={(e) => setVincForm((p) => ({ ...p, limite_individual: e.target.value }))}
                      />
                    </div>
                    <Button
                      onClick={() => criarVinculo.mutate(vincForm)}
                      disabled={!vincForm.convenio_id || !vincForm.colaborador_id || criarVinculo.isPending}
                      className="w-full"
                    >
                      {criarVinculo.isPending ? 'Salvando...' : 'Vincular'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <CardContent className="p-0">
                {loadVinc ? (
                  <div className="p-8 flex justify-center">
                    <Spinner />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Convênio</TableHead>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Limite Individual</TableHead>
                        <TableHead>Saldo Utilizado</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vinculos.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell>{v.convenio?.nome || '-'}</TableCell>
                          <TableCell className="font-medium">{v.colaborador?.nome_completo || '-'}</TableCell>
                          <TableCell>{v.limite_individual ? fmt(v.limite_individual) : '-'}</TableCell>
                          <TableCell>{v.saldo_utilizado ? fmt(v.saldo_utilizado) : 'R$ 0,00'}</TableCell>
                          <TableCell>
                            <Badge variant={v.ativo ? 'default' : 'secondary'}>{v.ativo ? 'Ativo' : 'Inativo'}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Excluir"
                              onClick={() => excluirVinculo.mutate(v.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {vinculos.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            Nenhum colaborador vinculado a convênios
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
        <AlertDialog open={!!excluirAlvo} onOpenChange={(v) => !v && setExcluirAlvo(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir convênio?</AlertDialogTitle>
              <AlertDialogDescription>
                O convênio "{excluirAlvo?.nome}" será excluído junto com todos os vínculos de colaboradores. Esta ação
                não pode ser desfeita. Para apenas suspender, use Editar e desmarque "Ativo".
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (excluirAlvo) excluir.mutate(excluirAlvo.id);
                  setExcluirAlvo(null);
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
