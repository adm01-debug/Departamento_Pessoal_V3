import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useFormacoes, useCriarFormacao, useExcluirFormacao, useAtualizarFormacao } from '@/hooks/useColaboradorDetalhes';

const ESCOLARIDADES = ['Fundamental incompleto', 'Fundamental completo', 'Médio incompleto', 'Médio completo', 'Superior incompleto', 'Superior completo', 'Pós-graduação', 'Mestrado', 'Doutorado'];

export function FormacaoTab({ colaboradorId, hideHeader = false }: { colaboradorId: string; hideHeader?: boolean }) {
  const { data, isLoading } = useFormacoes(colaboradorId);
  const criar = useCriarFormacao();
  const excluir = useExcluirFormacao(colaboradorId);
  const atualizar = useAtualizarFormacao(colaboradorId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tipo_escolaridade: '', curso: '', instituicao: '', ano_conclusao: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ tipo_escolaridade: '', curso: '', instituicao: '', ano_conclusao: '' });

  const iniciarEdicao = (f: any) => {
    setEditingId(f.id);
    setEditForm({
      tipo_escolaridade: f.tipo_escolaridade || '',
      curso: f.curso || '',
      instituicao: f.instituicao || '',
      ano_conclusao: f.ano_conclusao ? String(f.ano_conclusao) : '',
    });
  };

  const salvarEdicao = async (id: string) => {
    if (!editForm.tipo_escolaridade) { toast.error('Escolaridade é obrigatória'); return; }
    try {
      await atualizar.mutateAsync({ id, dados: { ...editForm, ano_conclusao: editForm.ano_conclusao ? Number(editForm.ano_conclusao) : null } });
      toast.success('Formação atualizada');
      setEditingId(null);
    } catch { toast.error('Erro ao atualizar formação'); }
  };

  const handleSubmit = async () => {
    if (!form.tipo_escolaridade) { toast.error('Escolaridade é obrigatória'); return; }
    try {
      await criar.mutateAsync({ ...form, ano_conclusao: form.ano_conclusao ? Number(form.ano_conclusao) : null, colaborador_id: colaboradorId });
      toast.success('Formação adicionada');
      setOpen(false);
      setForm({ tipo_escolaridade: '', curso: '', instituicao: '', ano_conclusao: '' });
    } catch { toast.error('Erro ao adicionar formação'); }
  };

  const adicionarDialog = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Adicionar</Button></DialogTrigger>
      <DialogContent className="max-w-[440px]">
        <DialogHeader><DialogTitle>Nova Formação</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Escolaridade *</Label>
            <Select value={form.tipo_escolaridade} onValueChange={v => setForm(f => ({ ...f, tipo_escolaridade: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{ESCOLARIDADES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Curso</Label><Input value={form.curso} onChange={e => setForm(f => ({ ...f, curso: e.target.value }))} /></div>
          <div><Label>Instituição</Label><Input value={form.instituicao} onChange={e => setForm(f => ({ ...f, instituicao: e.target.value }))} /></div>
          <div><Label>Ano Conclusão</Label><Input type="number" min="1950" max="2030" value={form.ano_conclusao} onChange={e => setForm(f => ({ ...f, ano_conclusao: e.target.value }))} /></div>
          <div className="flex justify-end pt-1">
            <Button size="sm" className="rounded-lg px-4" onClick={handleSubmit} disabled={criar.isPending}>Salvar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const tabela = isLoading ? <Spinner /> : !data?.length ? <p className="text-sm text-muted-foreground">Nenhuma formação cadastrada.</p> : (
    <Table>
      <TableHeader><TableRow>
        <TableHead>Escolaridade</TableHead><TableHead>Curso</TableHead><TableHead>Instituição</TableHead><TableHead>Ano</TableHead><TableHead />
      </TableRow></TableHeader>
      <TableBody>
        {data.map((f: any) => editingId === f.id ? (
          <TableRow key={f.id}>
            <TableCell>
              <Select value={editForm.tipo_escolaridade} onValueChange={v => setEditForm(ef => ({ ...ef, tipo_escolaridade: v }))}>
                <SelectTrigger className="h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{ESCOLARIDADES.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </TableCell>
            <TableCell><Input className="h-8" value={editForm.curso} onChange={e => setEditForm(ef => ({ ...ef, curso: e.target.value }))} /></TableCell>
            <TableCell><Input className="h-8" value={editForm.instituicao} onChange={e => setEditForm(ef => ({ ...ef, instituicao: e.target.value }))} /></TableCell>
            <TableCell><Input className="h-8" type="number" min="1950" max="2030" value={editForm.ano_conclusao} onChange={e => setEditForm(ef => ({ ...ef, ano_conclusao: e.target.value }))} /></TableCell>
            <TableCell className="whitespace-nowrap">
              <Button variant="ghost" size="sm" onClick={() => salvarEdicao(f.id)} disabled={atualizar.isPending}><Check className="h-4 w-4 text-success" /></Button>
              <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}><X className="h-4 w-4 text-muted-foreground" /></Button>
            </TableCell>
          </TableRow>
        ) : (
          <TableRow key={f.id}>
            <TableCell>{f.tipo_escolaridade || '-'}</TableCell>
            <TableCell>{f.curso || '-'}</TableCell>
            <TableCell>{f.instituicao || '-'}</TableCell>
            <TableCell>{f.ano_conclusao || '-'}</TableCell>
            <TableCell className="whitespace-nowrap">
              <Button variant="ghost" size="sm" onClick={() => iniciarEdicao(f)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" onClick={() => { if (confirm('Excluir formação?')) excluir.mutate(f.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (hideHeader) {
    return (
      <div className="space-y-3">
        <div className="flex justify-end">{adicionarDialog}</div>
        {tabela}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Formação Acadêmica</CardTitle>
        {adicionarDialog}
      </CardHeader>
      <CardContent>{tabela}</CardContent>
    </Card>
  );
}
