import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { AnimatedCascadeDialog } from '@/components/ui/animated-cascade-dialog';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { Plus, Trash2, Pencil, Phone } from 'lucide-react';
import { toast } from 'sonner';
import {
  useContatosEmergencia, useCriarContatoEmergencia,
  useAtualizarContatoEmergencia, useExcluirContatoEmergencia,
} from '@/hooks/useColaboradorDetalhes';

const MotionCard = motion.create(Card);

const PARENTESCOS = ['Pai/Mãe', 'Cônjuge', 'Irmão/Irmã', 'Filho(a)', 'Amigo(a)', 'Outro'];
const initialForm = { nome: '', parentesco: '', telefone: '', celular: '', email: '' };

export function EmergenciaTab({ colaboradorId, index = 0 }: { colaboradorId: string; index?: number }) {
  const { data, isLoading } = useContatosEmergencia(colaboradorId);
  const criar = useCriarContatoEmergencia();
  const atualizar = useAtualizarContatoEmergencia(colaboradorId);
  const excluir = useExcluirContatoEmergencia(colaboradorId);
  const [open, setOpen] = useState(false);
  const [verTodosOpen, setVerTodosOpen] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);

  const abrirNovo = () => { setEditandoId(null); setForm(initialForm); setOpen(true); };
  const abrirEdicao = (c: typeof initialForm & { id: string }) => {
    setEditandoId(c.id);
    setForm({ nome: c.nome, parentesco: c.parentesco || '', telefone: c.telefone || '', celular: c.celular || '', email: c.email || '' });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!form.telefone.trim() && !form.celular.trim()) { toast.error('Informe pelo menos um telefone'); return; }
    try {
      if (editandoId) {
        await atualizar.mutateAsync({ id: editandoId, dados: form });
        toast.success('Contato atualizado');
      } else {
        await criar.mutateAsync({ ...form, colaborador_id: colaboradorId });
        toast.success('Contato adicionado');
      }
      setOpen(false);
      setForm(initialForm);
      setEditandoId(null);
    } catch { toast.error(editandoId ? 'Erro ao atualizar contato' : 'Erro ao adicionar contato'); }
  };

  return (
    <>
    <MotionCard variant="elevated" custom={index} initial="hidden" animate="visible" variants={cardVariants} className="w-full h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pt-4 px-5 pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Phone className="h-4.5 w-4.5 text-primary" /> Contatos de Emergência
        </CardTitle>
        <div className="flex items-center gap-3">
          {!!data?.length && (
            <button type="button" onClick={() => setVerTodosOpen(true)} className="text-xs font-medium text-primary hover:underline">
              Ver todas
            </button>
          )}
          <Button size="sm" className="h-7 px-3 text-[11px]" onClick={abrirNovo}><Plus className="mr-1 h-3 w-3" />Adicionar</Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col justify-start px-5 pb-5">
        {isLoading ? <Spinner /> : !data?.length ? <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p> : (
          <div className="max-h-14 overflow-y-auto overflow-x-auto">
            <Table className="w-full text-[10px]">
              <TableHeader><TableRow>
                <TableHead className="h-6 px-1.5 text-[10px] text-left whitespace-nowrap">Nome</TableHead>
                <TableHead className="h-6 px-1.5 text-[10px] text-left whitespace-nowrap">Parentesco</TableHead>
                <TableHead className="h-6 px-1.5 text-[10px] text-left whitespace-nowrap">Telefone</TableHead>
                <TableHead className="h-6 px-1.5 text-[10px] text-left whitespace-nowrap">Celular</TableHead>
                <TableHead className="h-6 px-1.5 text-[10px] text-left whitespace-nowrap">Email</TableHead>
                <TableHead className="h-6 px-1.5 text-[10px] text-right whitespace-nowrap">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="h-6 px-1.5 whitespace-nowrap">{c.nome}</TableCell>
                    <TableCell className="h-6 px-1.5 whitespace-nowrap">{c.parentesco || '-'}</TableCell>
                    <TableCell className="h-6 px-1.5 whitespace-nowrap">{c.telefone || '-'}</TableCell>
                    <TableCell className="h-6 px-1.5 whitespace-nowrap">{c.celular || '-'}</TableCell>
                    <TableCell className="h-6 px-1.5 whitespace-nowrap">{c.email || '-'}</TableCell>
                    <TableCell className="h-6 px-1.5">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" aria-label="Editar contato" onClick={() => abrirEdicao(c)}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm" className="h-5 w-5 p-0" aria-label="Excluir contato" onClick={() => { if (confirm('Excluir contato?')) excluir.mutate(c.id); }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
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
      title="Contatos de Emergência"
      titleIcon={Phone}
      emptyMessage="Nenhum contato cadastrado."
      items={(data ?? []).map((c: any) => (
        <div key={c.id} className="rounded-xl border border-border/30 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold min-w-0 break-words">{c.nome}</span>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" aria-label="Editar contato" onClick={() => { setVerTodosOpen(false); abrirEdicao(c); }}><Pencil className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" aria-label="Excluir contato" onClick={() => { if (confirm('Excluir contato?')) excluir.mutate(c.id); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div><span className="text-muted-foreground">Parentesco: </span>{c.parentesco || '-'}</div>
            <div><span className="text-muted-foreground">Telefone: </span>{c.telefone || '-'}</div>
            <div><span className="text-muted-foreground">Celular: </span>{c.celular || '-'}</div>
            <div><span className="text-muted-foreground">Email: </span>{c.email || '-'}</div>
          </div>
        </div>
      ))}
    />

    <AnimatedCascadeDialog
      open={open}
      onOpenChange={setOpen}
      title={editandoId ? 'Editar Contato de Emergência' : 'Novo Contato de Emergência'}
      titleIcon={Phone}
      emptyMessage=""
      items={[
        <div key="form" className="grid gap-3">
          <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
          <div><Label>Parentesco</Label>
            <Select value={form.parentesco} onValueChange={v => setForm(f => ({ ...f, parentesco: v }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{PARENTESCOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
          <div><Label>Celular</Label><Input value={form.celular} onChange={e => setForm(f => ({ ...f, celular: e.target.value }))} /></div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <Button onClick={handleSubmit} disabled={criar.isPending || atualizar.isPending}>Salvar</Button>
        </div>,
      ]}
    />
    </>
  );
}
