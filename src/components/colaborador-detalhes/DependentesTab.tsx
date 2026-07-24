import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useDependentes, useCriarDependente, useExcluirDependente } from '@/hooks/useColaboradorDetalhes';
import { maskCpfDisplay } from '@/utils/piiMask';

const PARENTESCOS = ['Cônjuge', 'Filho(a)', 'Enteado(a)', 'Pai/Mãe', 'Irmão/Irmã', 'Avô/Avó', 'Neto(a)', 'Tutelado(a)', 'Outro'];

const initialForm = { nome: '', parentesco: '', cpf: '', data_nascimento: '', ir: false, salario_familia: false, incapacidade_fisica_mental: false };

export function DependentesTab({ colaboradorId }: { colaboradorId: string }) {
  const { data, isLoading } = useDependentes(colaboradorId);
  const criar = useCriarDependente();
  const excluir = useExcluirDependente(colaboradorId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const handleSubmit = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!form.parentesco) { toast.error('Parentesco é obrigatório'); return; }
    try {
      await criar.mutateAsync({ ...form, colaborador_id: colaboradorId } as any);
      toast.success('Dependente adicionado');
      setOpen(false);
      setForm(initialForm);
    } catch { toast.error('Erro ao adicionar dependente'); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Dependentes</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" />Adicionar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Dependente</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
              <div><Label>Parentesco *</Label>
                <Select value={form.parentesco} onValueChange={v => setForm(f => ({ ...f, parentesco: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {PARENTESCOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>CPF</Label><Input value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: e.target.value }))} placeholder="000.000.000-00" /></div>
              <div><Label>Data Nascimento</Label><Input type="date" value={form.data_nascimento} onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))} /></div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.ir} onChange={e => setForm(f => ({ ...f, ir: e.target.checked }))} />IRRF</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.salario_familia} onChange={e => setForm(f => ({ ...f, salario_familia: e.target.checked }))} />Salário Família</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.incapacidade_fisica_mental} onChange={e => setForm(f => ({ ...f, incapacidade_fisica_mental: e.target.checked }))} />Incapacidade F/M</label>
              </div>
              <Button onClick={handleSubmit} disabled={criar.isPending}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? <Spinner /> : !data?.length ? <p className="text-sm text-muted-foreground">Nenhum dependente cadastrado.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead><TableHead>Parentesco</TableHead><TableHead>CPF</TableHead><TableHead>IRRF</TableHead><TableHead>Sal. Família</TableHead><TableHead>Incapacidade</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>
              {data.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell>{d.nome}</TableCell>
                  <TableCell>{d.parentesco}</TableCell>
                  <TableCell>{d.cpf ? maskCpfDisplay(d.cpf) : '-'}</TableCell>
                  <TableCell>{d.ir ? <Badge>Sim</Badge> : 'Não'}</TableCell>
                   <TableCell>{d.salario_familia ? <Badge>Sim</Badge> : 'Não'}</TableCell>
                  <TableCell>{d.incapacidade_fisica_mental ? <Badge variant="destructive">Sim</Badge> : 'Não'}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => { if (confirm('Excluir dependente?')) excluir.mutate(d.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
