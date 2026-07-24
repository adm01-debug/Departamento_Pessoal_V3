import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, GripVertical, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { safeErrorMessage } from '@/utils/safeError';

const TIPOS_CAMPO = [
  { value: 'texto', label: 'Texto' },
  { value: 'numero', label: 'Número' },
  { value: 'data', label: 'Data' },
  { value: 'selecao', label: 'Seleção' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'textarea', label: 'Texto Longo' },
];

const SECOES = [
  { value: 'dados_pessoais', label: 'Dados Pessoais' },
  { value: 'dados_profissionais', label: 'Dados Profissionais' },
  { value: 'documentos', label: 'Documentos' },
  { value: 'beneficios', label: 'Benefícios' },
  { value: 'outros', label: 'Outros' },
];

const emptyForm = { nome: '', tipo: 'texto', secao: 'outros', obrigatorio: false, opcoes: '' };

export function CamposCustomizadosTab() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: campos = [], isLoading } = useQuery({
    queryKey: ['campos-customizados', empresaAtual?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campos_customizados')
        .select('*')
        .eq('empresa_id', empresaAtual!.id)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const salvar = useMutation({
    mutationFn: async () => {
      const nome = form.nome.trim().slice(0, 100);
      if (!nome) throw new Error('Nome do campo é obrigatório.');
      if (!TIPOS_CAMPO.some(t => t.value === form.tipo)) throw new Error('Tipo de campo inválido.');
      if (!SECOES.some(s => s.value === form.secao)) throw new Error('Seção inválida.');

      const opcoes = form.tipo === 'selecao' && form.opcoes
        ? form.opcoes.split(',').map(o => o.trim().slice(0, 100)).filter(Boolean).slice(0, 50)
        : null;

      const payload: any = {
        nome,
        tipo: form.tipo,
        secao: form.secao,
        obrigatorio: form.obrigatorio,
        empresa_id: empresaAtual?.id,
        opcoes,
      };

      if (editId) {
        const { error } = await supabase.from('campos_customizados').update(payload).eq('id', editId);
        if (error) throw error;
      } else {
        payload.ordem = campos.length + 1;
        const { error } = await supabase.from('campos_customizados').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campos-customizados'] });
      toast.success(editId ? 'Campo atualizado!' : 'Campo criado!');
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
    },
    onError: (err: any) => toast.error(safeErrorMessage(err, 'Erro ao salvar campo customizado.')),
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('campos_customizados').update({ ativo }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campos-customizados'] }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campos_customizados').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campos-customizados'] });
      toast.success('Campo removido');
    },
  });

  const handleEdit = (campo: any) => {
    setEditId(campo.id);
    setForm({
      nome: campo.nome,
      tipo: campo.tipo,
      secao: campo.secao || 'outros',
      obrigatorio: campo.obrigatorio || false,
      opcoes: Array.isArray(campo.opcoes) ? campo.opcoes.join(', ') : '',
    });
    setOpen(true);
  };

  if (isLoading) return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-primary to-info" />
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">Campos Customizados</CardTitle>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl bg-gradient-to-r from-primary to-primary-glow font-body">
                <Plus className="h-4 w-4 mr-1" />Novo Campo
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle className="font-display">{editId ? 'Editar Campo' : 'Novo Campo Customizado'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="font-body">Nome do Campo</Label>
                  <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Número do Crachá" className="rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-body">Tipo</Label>
                    <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{TIPOS_CAMPO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="font-body">Seção</Label>
                    <Select value={form.secao} onValueChange={v => setForm(p => ({ ...p, secao: v }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>{SECOES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                {form.tipo === 'selecao' && (
                  <div>
                    <Label className="font-body">Opções (separadas por vírgula)</Label>
                    <Input value={form.opcoes} onChange={e => setForm(p => ({ ...p, opcoes: e.target.value }))} placeholder="Opção 1, Opção 2, Opção 3" className="rounded-xl" />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Label className="font-body">Campo obrigatório?</Label>
                  <Switch checked={form.obrigatorio} onCheckedChange={v => setForm(p => ({ ...p, obrigatorio: v }))} />
                </div>
                <Button
                  className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow"
                  onClick={() => salvar.mutate()}
                  disabled={!form.nome || salvar.isPending}
                >
                  {salvar.isPending ? 'Salvando...' : editId ? 'Atualizar' : 'Criar Campo'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {campos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground font-body">
              <p>Nenhum campo customizado criado</p>
              <p className="text-xs mt-1">Crie campos extras para complementar o cadastro de colaboradores</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-display">Nome</TableHead>
                  <TableHead className="font-display">Tipo</TableHead>
                  <TableHead className="font-display">Seção</TableHead>
                  <TableHead className="font-display">Obrigatório</TableHead>
                  <TableHead className="font-display">Ativo</TableHead>
                  <TableHead className="font-display">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campos.map((c: any) => (
                  <TableRow key={c.id} className="hover:bg-accent/30 transition-colors">
                    <TableCell className="font-body font-medium">{c.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-body text-xs">
                        {TIPOS_CAMPO.find(t => t.value === c.tipo)?.label || c.tipo}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-body text-sm">
                      {SECOES.find(s => s.value === c.secao)?.label || c.secao || '—'}
                    </TableCell>
                    <TableCell>
                      {c.obrigatorio
                        ? <CheckCircle className="h-4 w-4 text-success" />
                        : <XCircle className="h-4 w-4 text-muted-foreground/40" />}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={c.ativo !== false}
                        onCheckedChange={v => toggleAtivo.mutate({ id: c.id, ativo: v })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" aria-label="Editar" className="h-7 w-7" onClick={() => handleEdit(c)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" aria-label="Excluir" className="h-7 w-7 text-destructive" onClick={() => excluir.mutate(c.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
