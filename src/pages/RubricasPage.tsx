import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Plus, Edit2, Trash2, Hash, TrendingUp, TrendingDown, Info, CheckCircle, XCircle } from 'lucide-react';

type TipoEvento = 'provento' | 'desconto' | 'informativo';

interface Rubrica {
  id: string;
  codigo: string;
  descricao: string;
  tipo: TipoEvento;
  incide_inss: boolean | null;
  incide_irrf: boolean | null;
  incide_fgts: boolean | null;
  automatico: boolean | null;
  ativo: boolean | null;
  formula: string | null;
}

const tipoConfig: Record<TipoEvento, { label: string; color: string; icon: any }> = {
  provento: { label: 'Provento', color: 'bg-success/15 text-success border-0', icon: TrendingUp },
  desconto: { label: 'Desconto', color: 'bg-destructive/15 text-destructive border-0', icon: TrendingDown },
  informativo: { label: 'Informativo', color: 'bg-info/15 text-info border-0', icon: Info },
};

const emptyForm = { codigo: '', descricao: '', tipo: 'provento' as TipoEvento, incide_inss: true, incide_irrf: true, incide_fgts: true, automatico: false, formula: '' };

export default function RubricasPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');

  const { data: rubricas = [], isLoading } = useQuery({
    queryKey: ['rubricas_folha'],
    queryFn: async () => {
      const { data, error } = await supabase.from('rubricas_folha').select('*').order('codigo');
      if (error) throw error;
      return (data || []) as Rubrica[];
    },
  });

  const salvar = useMutation({
    mutationFn: async () => {
      const payload = {
        codigo: form.codigo.trim(),
        descricao: form.descricao.trim(),
        tipo: form.tipo as TipoEvento,
        incide_inss: form.incide_inss,
        incide_irrf: form.incide_irrf,
        incide_fgts: form.incide_fgts,
        automatico: form.automatico,
        formula: form.formula || null,
      };
      if (editId) {
        const { error } = await supabase.from('rubricas_folha').update(payload).eq('id', editId).eq('empresa_id', empresaAtual!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('rubricas_folha').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rubricas_folha'] });
      setOpen(false);
      setEditId(null);
      setForm(emptyForm);
      toast.success(editId ? 'Rubrica atualizada!' : 'Rubrica criada!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar rubrica.')),
  });

  const toggleAtivo = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from('rubricas_folha').update({ ativo }).eq('id', id).eq('empresa_id', empresaAtual!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rubricas_folha'] }),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rubricas_folha').delete().eq('id', id).eq('empresa_id', empresaAtual!.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rubricas_folha'] }); toast.success('Rubrica excluída'); },
    onError: () => toast.error('Erro: rubrica pode estar em uso'),
  });

  const openEdit = (r: Rubrica) => {
    setEditId(r.id);
    setForm({ codigo: r.codigo, descricao: r.descricao, tipo: r.tipo, incide_inss: r.incide_inss ?? true, incide_irrf: r.incide_irrf ?? true, incide_fgts: r.incide_fgts ?? true, automatico: r.automatico ?? false, formula: r.formula || '' });
    setOpen(true);
  };

  const filtered = filtroTipo === 'todos' ? rubricas : rubricas.filter(r => r.tipo === filtroTipo);
  const proventos = rubricas.filter(r => r.tipo === 'provento').length;
  const descontos = rubricas.filter(r => r.tipo === 'desconto').length;
  const informativos = rubricas.filter(r => r.tipo === 'informativo').length;

  return (
    <>
      <PageTitle title="Rubricas" description="Gestão de rubricas da folha de pagamento" />
      <PageLayout
        title="Rubricas da Folha"
        description="Proventos, descontos e eventos informativos"
        icon={<Hash className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-primary-glow"
        actions={
          <div className="flex items-center gap-2">
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger className="w-[140px] rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="provento">Proventos</SelectItem>
                <SelectItem value="desconto">Descontos</SelectItem>
                <SelectItem value="informativo">Informativos</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setForm(emptyForm); } }}>
              <DialogTrigger asChild>
                <Button className="rounded-xl bg-gradient-to-r from-primary to-primary-glow font-body">
                  <Plus className="mr-2 h-4 w-4" />Nova Rubrica
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl max-w-lg">
                <DialogHeader><DialogTitle className="font-display">{editId ? 'Editar Rubrica' : 'Nova Rubrica'}</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label className="font-body">Código</Label><Input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} placeholder="001" className="rounded-xl font-mono" /></div>
                    <div className="col-span-2"><Label className="font-body">Descrição</Label><Input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Salário Base" className="rounded-xl" /></div>
                  </div>
                  <div><Label className="font-body">Tipo</Label>
                    <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v as TipoEvento }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="provento">Provento (+)</SelectItem>
                        <SelectItem value="desconto">Desconto (−)</SelectItem>
                        <SelectItem value="informativo">Informativo (i)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3 p-3 bg-muted/30 rounded-xl">
                    <Label className="font-body text-xs text-muted-foreground">Incidências</Label>
                    <div className="flex items-center justify-between"><Label className="font-body text-sm">Incide INSS</Label><Switch checked={form.incide_inss} onCheckedChange={v => setForm(p => ({ ...p, incide_inss: v }))} /></div>
                    <div className="flex items-center justify-between"><Label className="font-body text-sm">Incide IRRF</Label><Switch checked={form.incide_irrf} onCheckedChange={v => setForm(p => ({ ...p, incide_irrf: v }))} /></div>
                    <div className="flex items-center justify-between"><Label className="font-body text-sm">Incide FGTS</Label><Switch checked={form.incide_fgts} onCheckedChange={v => setForm(p => ({ ...p, incide_fgts: v }))} /></div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <Label className="font-body text-sm">Cálculo Automático</Label>
                    <Switch checked={form.automatico} onCheckedChange={v => setForm(p => ({ ...p, automatico: v }))} />
                  </div>
                  {form.automatico && (
                    <div><Label className="font-body">Fórmula</Label><Input value={form.formula} onChange={e => setForm(p => ({ ...p, formula: e.target.value }))} placeholder="salario_base * 0.08" className="rounded-xl font-mono text-sm" /></div>
                  )}
                  <Button className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow" onClick={() => salvar.mutate()} disabled={!form.codigo || !form.descricao || salvar.isPending}>
                    {salvar.isPending ? 'Salvando...' : editId ? 'Atualizar' : 'Criar Rubrica'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      >
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: rubricas.length, gradient: 'from-primary to-primary-glow', icon: Hash },
            { label: 'Proventos', value: proventos, gradient: 'from-success to-success/70', icon: TrendingUp },
            { label: 'Descontos', value: descontos, gradient: 'from-destructive to-destructive/70', icon: TrendingDown },
            { label: 'Informativos', value: informativos, gradient: 'from-info to-info/70', icon: Info },
          ].map(({ label, value, gradient, icon: Icon }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/30 rounded-2xl overflow-hidden">
                <div className={cn("h-[2px] bg-gradient-to-r", gradient)} />
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn("p-2 rounded-xl bg-gradient-to-br", gradient)}><Icon className="h-4 w-4 text-primary-foreground" /></div>
                  <div><p className="text-lg font-bold font-display">{value}</p><p className="text-[10px] text-muted-foreground font-body">{label}</p></div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {isLoading ? <div className="flex justify-center p-8"><Spinner size="lg" /></div> : filtered.length === 0 ? (
          <Card className="rounded-2xl border-border/30"><CardContent className="py-12 text-center text-muted-foreground font-body"><Hash className="mx-auto h-12 w-12 mb-4 opacity-30" /><p>Nenhuma rubrica cadastrada</p></CardContent></Card>
        ) : (
          <Card className="rounded-2xl border-border/30 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-display w-[80px]">Código</TableHead>
                  <TableHead className="font-display">Descrição</TableHead>
                  <TableHead className="font-display">Tipo</TableHead>
                  <TableHead className="font-display text-center">INSS</TableHead>
                  <TableHead className="font-display text-center">IRRF</TableHead>
                  <TableHead className="font-display text-center">FGTS</TableHead>
                  <TableHead className="font-display text-center">Auto</TableHead>
                  <TableHead className="font-display text-center">Ativo</TableHead>
                  <TableHead className="font-display">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r, i) => {
                  const tc = tipoConfig[r.tipo];
                  const TIcon = tc.icon;
                  return (
                    <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-accent/30 transition-colors border-b border-border/10">
                      <TableCell className="font-mono font-bold text-sm">{r.codigo}</TableCell>
                      <TableCell className="font-body font-medium">{r.descricao}</TableCell>
                      <TableCell><Badge className={cn("font-body text-xs", tc.color)}><TIcon className="h-3 w-3 mr-1" />{tc.label}</Badge></TableCell>
                      <TableCell className="text-center">{r.incide_inss ? <CheckCircle className="h-4 w-4 text-success mx-auto" /> : <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />}</TableCell>
                      <TableCell className="text-center">{r.incide_irrf ? <CheckCircle className="h-4 w-4 text-success mx-auto" /> : <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />}</TableCell>
                      <TableCell className="text-center">{r.incide_fgts ? <CheckCircle className="h-4 w-4 text-success mx-auto" /> : <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />}</TableCell>
                      <TableCell className="text-center">{r.automatico ? <Badge className="bg-info/15 text-info border-0 text-[9px]">Auto</Badge> : '—'}</TableCell>
                      <TableCell className="text-center">
                        <Switch checked={r.ativo ?? true} onCheckedChange={v => toggleAtivo.mutate({ id: r.id, ativo: v })} />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg" onClick={() => openEdit(r)}><Edit2 className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 rounded-lg text-destructive" onClick={() => excluir.mutate(r.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </PageLayout>
    </>
  );
}
