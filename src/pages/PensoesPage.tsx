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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { colaboradorService } from '@/services';
import { useEmpresas } from '@/hooks';
import { useAuth } from '@/contexts';
import { usePiiMask } from '@/hooks/usePiiMask';
import { toast } from 'sonner';
import { Pencil, Plus, Scale, Trash2 } from 'lucide-react';
import { validateTablePayload } from '@/schemas/validate';
import { safeErrorMessage } from '@/utils/safeError';

const FORM_VAZIO = {
  colaborador_id: '',
  beneficiario: '',
  cpf_beneficiario: '',
  tipo: 'alimenticia',
  percentual: '',
  valor_fixo: '',
  banco: '',
  agencia: '',
  conta: '',
};

function toPayload(d: typeof FORM_VAZIO) {
  return validateTablePayload(
    'pensoes',
    {
      colaborador_id: d.colaborador_id,
      beneficiario: d.beneficiario,
      cpf_beneficiario: d.cpf_beneficiario || null,
      tipo: d.tipo,
      percentual: d.percentual ? Number(d.percentual) : null,
      valor_fixo: d.valor_fixo ? Number(d.valor_fixo) : null,
      banco: d.banco || null,
      agencia: d.agencia || null,
      conta: d.conta || null,
    },
    'PensoesPage:pensoes'
  );
}

export default function PensoesPage() {
  const { empresaAtual } = useEmpresas();
  const pii = usePiiMask();
  // Editar/excluir só para RH/admin (mesmo critério do usePiiMask): o form de
  // edição traz CPF e dados bancários sem máscara.
  const { isAdmin, hasRole } = useAuth();
  const podeGerir = isAdmin || hasRole('rh');
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);

  const empresaId = empresaAtual?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['pensoes', empresaId],
    queryFn: async () => {
      // O banco ao vivo não tem `pensoes.empresa_id` (drift da migration
      // 20260728172359): filtra pela empresa do colaborador via inner join.
      const { data, error } = await supabase
        .from('pensoes')
        .select('*, colaboradores!pensoes_colaborador_id_fkey!inner(id, nome_completo, empresa_id)')
        .eq('colaboradores.empresa_id', empresaId!)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },

    enabled: !!empresaId,
  });

  const { data: colaboradores } = useQuery({
    queryKey: ['colaboradores', empresaId],
    queryFn: () => colaboradorService.list(empresaId!),
    enabled: !!empresaId,
  });

  const criar = useMutation({
    mutationFn: async (d: typeof form) => {
      const { error } = await supabase.from('pensoes').insert(toPayload(d));
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pensoes', empresaId] });
      setOpen(false);
      toast.success('Pensão cadastrada');
    },
    onError: (err) => toast.error(safeErrorMessage(err, 'Erro ao cadastrar pensão.')),
  });

  const atualizar = useMutation({
    mutationFn: async ({ id, d }: { id: string; d: typeof form }) => {
      // Escopo de empresa garantido pela RLS tenant_pensoes (via colaborador).
      const { data, error } = await supabase.from('pensoes').update(toPayload(d)).eq('id', id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Pensão não encontrada ou sem permissão para alterar.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pensoes', empresaId] });
      setOpen(false);
      setEditId(null);
      toast.success('Pensão atualizada');
    },
    onError: (err) => toast.error(safeErrorMessage(err, 'Erro ao atualizar pensão.')),
  });

  type PensaoRow = NonNullable<typeof data>[number];
  const abrirNova = () => {
    setEditId(null);
    setForm(FORM_VAZIO);
  };
  const abrirEdicao = (r: PensaoRow) => {
    setEditId(r.id);
    setForm({
      colaborador_id: r.colaborador_id ?? '',
      beneficiario: r.beneficiario ?? '',
      cpf_beneficiario: r.cpf_beneficiario ?? '',
      tipo: r.tipo ?? 'alimenticia',
      percentual: r.percentual != null ? String(r.percentual) : '',
      valor_fixo: r.valor_fixo != null ? String(r.valor_fixo) : '',
      banco: r.banco ?? '',
      agencia: r.agencia ?? '',
      conta: r.conta ?? '',
    });
    setOpen(true);
  };

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('pensoes').delete().eq('id', id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('Pensão não encontrada ou sem permissão para excluir.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pensoes', empresaId] });
      toast.success('Excluída');
    },
    onError: (err) => toast.error(safeErrorMessage(err, 'Erro ao excluir pensão.')),
  });

  return (
    <>
      <PageTitle title="Pensões" description="Gestão de pensões alimentícias" />
      <PageLayout
        title="Pensões"
        description="Pensões alimentícias e judiciais"
        icon={<Scale className="h-5 w-5 text-primary-foreground" />}
      >
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            {podeGerir && (
              <DialogTrigger asChild>
                <Button onClick={abrirNova}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Pensão
                </Button>
              </DialogTrigger>
            )}
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editId ? 'Editar Pensão' : 'Nova Pensão'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Colaborador</Label>
                  <Select
                    value={form.colaborador_id}
                    onValueChange={(v) => setForm((p) => ({ ...p, colaborador_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {colaboradores?.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Beneficiário</Label>
                  <Input
                    value={form.beneficiario}
                    onChange={(e) => setForm((p) => ({ ...p, beneficiario: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>CPF Beneficiário</Label>
                  <Input
                    value={form.cpf_beneficiario}
                    onChange={(e) => setForm((p) => ({ ...p, cpf_beneficiario: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm((p) => ({ ...p, tipo: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alimenticia">Alimentícia</SelectItem>
                      <SelectItem value="judicial">Judicial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Percentual (%)</Label>
                    <Input
                      type="number"
                      value={form.percentual}
                      onChange={(e) => setForm((p) => ({ ...p, percentual: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Valor Fixo (R$)</Label>
                    <Input
                      type="number"
                      value={form.valor_fixo}
                      onChange={(e) => setForm((p) => ({ ...p, valor_fixo: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Banco</Label>
                    <Input value={form.banco} onChange={(e) => setForm((p) => ({ ...p, banco: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Agência</Label>
                    <Input value={form.agencia} onChange={(e) => setForm((p) => ({ ...p, agencia: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Conta</Label>
                    <Input value={form.conta} onChange={(e) => setForm((p) => ({ ...p, conta: e.target.value }))} />
                  </div>
                </div>
                <Button
                  onClick={() => (editId ? atualizar.mutate({ id: editId, d: form }) : criar.mutate(form))}
                  disabled={!form.colaborador_id || !form.beneficiario || criar.isPending || atualizar.isPending}
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
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Beneficiário</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>% / Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.colaboradores?.nome_completo || '-'}</TableCell>
                      <TableCell>{r.beneficiario}</TableCell>
                      <TableCell>{r.cpf_beneficiario ? pii.cpf(r.cpf_beneficiario) : '-'}</TableCell>
                      <TableCell className="capitalize">{r.tipo || '-'}</TableCell>
                      <TableCell>
                        {r.percentual
                          ? `${r.percentual}%`
                          : r.valor_fixo
                            ? `R$ ${Number(r.valor_fixo).toLocaleString('pt-BR')}`
                            : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.ativo ? 'default' : 'secondary'}>{r.ativo ? 'Ativa' : 'Inativa'}</Badge>
                      </TableCell>
                      <TableCell>
                        {podeGerir && (
                          <>
                            <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => abrirEdicao(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Excluir"
                              onClick={() => excluir.mutate(r.id)}
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
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma pensão cadastrada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </PageLayout>
    </>
  );
}
