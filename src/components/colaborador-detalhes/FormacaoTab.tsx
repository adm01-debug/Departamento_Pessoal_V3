import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useFormacoes, useCriarFormacao, useExcluirFormacao } from '@/hooks/useColaboradorDetalhes';

const ESCOLARIDADES = ['Fundamental incompleto', 'Fundamental completo', 'Médio incompleto', 'Médio completo', 'Superior incompleto', 'Superior completo', 'Pós-graduação', 'Mestrado', 'Doutorado'];

export function FormacaoTab({ colaboradorId }: { colaboradorId: string }) {
  const { data, isLoading } = useFormacoes(colaboradorId);
  const criar = useCriarFormacao();
  const excluir = useExcluirFormacao(colaboradorId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ tipo_escolaridade: '', curso: '', instituicao: '', ano_conclusao: '' });

  const handleSubmit = async () => {
    if (!form.tipo_escolaridade) { toast.error('Escolaridade é obrigatória'); return; }
    try {
      await criar.mutateAsync({ ...form, ano_conclusao: form.ano_conclusao ? Number(form.ano_conclusao) : null, colaborador_id: colaboradorId });
      toast.success('Formação adicionada');
      setOpen(false);
      setForm({ tipo_escolaridade: '', curso: '', instituicao: '', ano_conclusao: '' });
    } catch { toast.error('Erro ao adicionar formação'); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Formação Acadêmica</CardTitle>
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
      </CardHeader>
      <CardContent>
        {isLoading ? <Spinner /> : !data?.length ? <p className="text-sm text-muted-foreground">Nenhuma formação cadastrada.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Escolaridade</TableHead><TableHead>Curso</TableHead><TableHead>Instituição</TableHead><TableHead>Ano</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>
              {data.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell>{f.tipo_escolaridade || '-'}</TableCell>
                  <TableCell>{f.curso || '-'}</TableCell>
                  <TableCell>{f.instituicao || '-'}</TableCell>
                  <TableCell>{f.ano_conclusao || '-'}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => { if (confirm('Excluir formação?')) excluir.mutate(f.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
