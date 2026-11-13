import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { validateTablePayload } from '@/schemas/validate';
import { atualizarCentroCusto } from '@/services/tabelasReferenciaService';

export default function CentrosCustoPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', codigo: '', descricao: '' });
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const { data: centros = [], isLoading } = useQuery({
    queryKey: ['centros-custo', empresaAtual?.id],
    queryFn: async () => {
      let q = supabase.from('centros_custo').select('*').order('nome');
      if (empresaAtual?.id) q = q.eq('empresa_id', empresaAtual.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const criar = useMutation({
    mutationFn: async (d: { nome: string; codigo: string; descricao: string }) => {
      const { data, error } = await supabase
        .from('centros_custo')
        .insert(
          validateTablePayload(
            'centros_custo',
            { ...d, empresa_id: empresaAtual?.id },
            'CentrosCustoPage:centros_custo'
          )
        )
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['centros-custo'] });
      setOpen(false);
      toast.success('Centro de custo criado!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar centro de custo.')),
  });

  const atualizar = useMutation({
    mutationFn: (d: { id: string; nome: string; codigo: string; descricao: string }) =>
      atualizarCentroCusto(d.id, { nome: d.nome, codigo: d.codigo, descricao: d.descricao }, empresaAtual!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['centros-custo'] });
      setOpen(false);
      setEditandoId(null);
      setForm({ nome: '', codigo: '', descricao: '' });
      toast.success('Centro de custo atualizado!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao atualizar centro de custo.')),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('centros_custo').delete().eq('id', id).eq('empresa_id', empresaAtual!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['centros-custo'] });
      toast.success('Centro excluído!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao excluir centro de custo.')),
  });

  const handleOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o && editandoId) {
      setEditandoId(null);
      setForm({ nome: '', codigo: '', descricao: '' });
    }
  };

  if (isLoading)
    return (
      <PageLayout title="Centros de Custo">
        <Spinner />
      </PageLayout>
    );

  return (
    <>
      <PageTitle title="Centros de Custo" description="Gestão de centros de custo" />
      <PageLayout title="Centros de Custo" description="Gerencie os centros de custo da empresa">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between mb-4">
              <h3 className="text-lg font-semibold">Centros de Custo ({centros.length})</h3>
              <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Novo Centro
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editandoId ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Nome *</Label>
                      <Input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} />
                    </div>
                    <div>
                      <Label>Código</Label>
                      <Input
                        value={form.codigo}
                        onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))}
                        placeholder="E: CC-001"
                      />
                    </div>
                    <div>
                      <Label>Descrição</Label>
                      <Textarea
                        value={form.descricao}
                        onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => (editandoId ? atualizar.mutate({ id: editandoId, ...form }) : criar.mutate(form))}
                      disabled={!form.nome || atualizar.isPending}
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centros.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.codigo || '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{c.descricao || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={c.ativo !== false ? 'default' : 'secondary'}>
                        {c.ativo !== false ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Editar"
                          onClick={() => {
                            setEditandoId(c.id);
                            setForm({ nome: c.nome, codigo: c.codigo ?? '', descricao: c.descricao ?? '' });
                            setOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => excluir.mutate(c.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {centros.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum centro cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </PageLayout>
    </>
  );
}
