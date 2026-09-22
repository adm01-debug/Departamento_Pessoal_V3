import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useDependentes, useCriarDependente, useExcluirDependente } from '@/hooks/useColaboradorDetalhes';
import { maskCpfDisplay } from '@/utils/piiMask';

const MotionCard = motion.create(Card);

const PARENTESCOS = ['Cônjuge', 'Filho(a)', 'Enteado(a)', 'Pai/Mãe', 'Irmão/Irmã', 'Avô/Avó', 'Neto(a)', 'Tutelado(a)', 'Outro'];

const initialForm = { nome: '', parentesco: '', cpf: '', data_nascimento: '', ir: false, salario_familia: false, incapacidade_fisica_mental: false };

export function DependentesTab({ colaboradorId, index = 0 }: { colaboradorId: string; index?: number }) {
  const { data, isLoading } = useDependentes(colaboradorId);
  const criar = useCriarDependente();
  const excluir = useExcluirDependente(colaboradorId);
  const [open, setOpen] = useState(false);
  const [verTodosOpen, setVerTodosOpen] = useState(false);
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
    <>
    <MotionCard variant="elevated" custom={index} initial="hidden" animate="visible" variants={cardVariants} className="w-full h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pt-4 px-5 pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-4.5 w-4.5 text-primary" /> Dependentes
        </CardTitle>
        <div className="flex items-center gap-3">
          {!!data?.length && (
            <button type="button" onClick={() => setVerTodosOpen(true)} className="text-xs font-medium text-primary hover:underline">
              Ver todas
            </button>
          )}
          <Button size="sm" className="h-7 px-3 text-[11px]" onClick={() => setOpen(true)}><Plus className="mr-1 h-3 w-3" />Adicionar</Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col justify-start px-5 pb-5">
        {isLoading ? <Spinner /> : !data?.length ? <p className="text-sm text-muted-foreground">Nenhum dependente cadastrado.</p> : (
          <div className="max-h-16 overflow-y-auto overflow-x-auto">
            <Table className="w-full text-[11px]">
              <TableHeader><TableRow>
                <TableHead className="h-7 px-2 text-[11px] text-left whitespace-nowrap">Nome</TableHead>
                <TableHead className="h-7 px-2 text-[11px] text-left whitespace-nowrap">Parentesco</TableHead>
                <TableHead className="h-7 px-2 text-[11px] text-left whitespace-nowrap">CPF</TableHead>
                <TableHead className="h-7 px-2 text-[11px] text-left whitespace-nowrap">IRRF</TableHead>
                <TableHead className="h-7 px-2 text-[11px] text-left whitespace-nowrap">Sal. Família</TableHead>
                <TableHead className="h-7 px-2 text-[11px] text-right whitespace-nowrap">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="h-7 px-2 whitespace-nowrap">{d.nome}</TableCell>
                    <TableCell className="h-7 px-2 whitespace-nowrap">{d.parentesco}</TableCell>
                    <TableCell className="h-7 px-2 whitespace-nowrap">{d.cpf ? maskCpfDisplay(d.cpf) : '-'}</TableCell>
                    <TableCell className="h-7 px-2 whitespace-nowrap">{d.ir ? <Badge size="sm">Sim</Badge> : 'Não'}</TableCell>
                    <TableCell className="h-7 px-2 whitespace-nowrap">{d.salario_familia ? <Badge size="sm">Sim</Badge> : 'Não'}</TableCell>
                    <TableCell className="h-7 px-2 text-right">
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { if (confirm('Excluir dependente?')) excluir.mutate(d.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </MotionCard>

    <AnimatedCascadeDialog
        open={verTodosOpen}
        onOpenChange={setVerTodosOpen}
        title="Dependentes"
        titleIcon={Users}
        emptyMessage="Nenhum dependente cadastrado."
        items={(data ?? []).map((d: any) => (
          <div key={d.id} className="rounded-xl border border-border/30 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold min-w-0 break-words">{d.nome}</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => { if (confirm('Excluir dependente?')) excluir.mutate(d.id); }}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <div><span className="text-muted-foreground">Parentesco: </span>{d.parentesco}</div>
              <div><span className="text-muted-foreground">CPF: </span>{d.cpf ? maskCpfDisplay(d.cpf) : '-'}</div>
              <div><span className="text-muted-foreground">IRRF: </span>{d.ir ? 'Sim' : 'Não'}</div>
              <div><span className="text-muted-foreground">Sal. Família: </span>{d.salario_familia ? 'Sim' : 'Não'}</div>
            </div>
          </div>
        ))}
      />

    <AnimatedCascadeDialog
      open={open}
      onOpenChange={setOpen}
      title="Novo Dependente"
      titleIcon={Users}
      emptyMessage=""
      items={[
        <div key="form" className="grid gap-3">
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
        </div>,
      ]}
    />
    </>
  );
}
