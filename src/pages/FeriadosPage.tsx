import { PageTitle } from '@/components/PageTitle';
import type { TablesInsert } from '@/integrations/supabase/types';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyList } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEmpresa } from '@/contexts';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { validateTablePayload } from '@/schemas/validate';

export default function FeriadosPage() {
  const { empresaAtual } = useEmpresa();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [data, setData] = useState('');
  const [tipo, setTipo] = useState('nacional');
  const [editandoId, setEditandoId] = useState<string | null>(null);

  const { data: feriados, isLoading } = useQuery({
    queryKey: ['feriados', empresaAtual?.id],
    queryFn: async () => {
      let query = supabase.from('feriados').select('*').order('data');
      if (empresaAtual?.id) query = query.or(`empresa_id.eq.${empresaAtual.id},empresa_id.is.null`);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const criarFeriado = useMutation({
    mutationFn: async () => {
      const insertData: TablesInsert<'feriados'> = {
        descricao: nome,
        data,
        tipo,
        empresa_id: empresaAtual?.id ?? null,
      };
      const payload = validateTablePayload('feriados', insertData, 'FeriadosPage:feriados');
      const { error } = editandoId
        ? await supabase
            .from('feriados')
            .update(payload)
            .eq('id', editandoId)
            .eq('empresa_id', empresaAtual?.id ?? '')
        : await supabase.from('feriados').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feriados'] });
      toast.success(editandoId ? 'Feriado atualizado!' : 'Feriado cadastrado!');
      setOpen(false);
      setEditandoId(null);
      setNome('');
      setData('');
      setTipo('nacional');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar feriado.')),
  });

  const excluirFeriado = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('feriados')
        .delete()
        .eq('id', id)
        .eq('empresa_id', empresaAtual?.id ?? '');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feriados'] });
      toast.success('Feriado excluído');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao excluir feriado.')),
  });

  const abrirEdicao = (f: { id: string; descricao: string; data: string; tipo: string | null }) => {
    setEditandoId(f.id);
    setNome(f.descricao);
    setData(f.data);
    setTipo(f.tipo ?? 'nacional');
    setOpen(true);
  };

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v && editandoId) {
      setEditandoId(null);
      setNome('');
      setData('');
      setTipo('nacional');
    }
  };

  const tipoColor: Record<string, string> = {
    nacional: 'bg-primary/10 text-primary',
    estadual: 'bg-info/10 text-info',
    municipal: 'bg-warning/10 text-warning',
    facultativo: 'bg-success/10 text-success',
  };

  return (
    <>
      <PageTitle title="Feriados" description="Calendário de feriados" />
      <PageLayout
        title="Feriados"
        description="Calendário de feriados"
        icon={<CalendarDays className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary-glow to-primary"
        actions={
          <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-gradient-to-r from-primary-glow to-primary hover:opacity-90 shadow-lg font-body">
                <Plus className="h-4 w-4 mr-2" />
                Novo Feriado
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-display">
                  {editandoId ? 'Editar Feriado' : 'Cadastrar Feriado'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="font-body">Nome</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} className="rounded-xl" />
                </div>
                <div>
                  <Label className="font-body">Data</Label>
                  <Input type="date" value={data} onChange={(e) => setData(e.target.value)} className="rounded-xl" />
                </div>
                <div>
                  <Label className="font-body">Tipo</Label>
                  <Select value={tipo} onValueChange={setTipo}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nacional">Nacional</SelectItem>
                      <SelectItem value="estadual">Estadual</SelectItem>
                      <SelectItem value="municipal">Municipal</SelectItem>
                      <SelectItem value="facultativo">Facultativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => criarFeriado.mutate()}
                  disabled={!nome || !data || criarFeriado.isPending}
                  className="w-full rounded-xl font-body"
                >
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      >
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Spinner size="lg" />
          </div>
        ) : !feriados?.length ? (
          <EmptyList entityName="feriado" onCreate={() => setOpen(true)} />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-border/30 overflow-hidden shadow-elevated"
          >
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-display font-semibold">Data</TableHead>
                  <TableHead className="font-display font-semibold">Nome</TableHead>
                  <TableHead className="font-display font-semibold">Tipo</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {feriados.map((f) => (
                  <TableRow key={f.id} className="hover:bg-accent/30 transition-colors">
                    <TableCell className="font-body">
                      {new Date(f.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="font-body font-medium">{f.descricao}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={tipoColor[f.tipo ?? ''] || ''}>
                        {f.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {f.empresa_id && f.empresa_id === empresaAtual?.id && (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => abrirEdicao(f)} aria-label="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={excluirFeriado.isPending}
                            onClick={() =>
                              confirm(`Excluir o feriado "${f.descricao}"?`) && excluirFeriado.mutate(f.id)
                            }
                            aria-label="Excluir"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        )}
      </PageLayout>
    </>
  );
}
