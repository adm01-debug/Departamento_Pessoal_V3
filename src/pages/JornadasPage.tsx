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
import { useEmpresas } from '@/hooks';
import { jornadaService } from '@/services';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { AlertTriangle, Pencil, Plus, Trash2 } from 'lucide-react';

export default function JornadasPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', tipo: 'padrao', carga_horaria_semanal: '44', horario_entrada: '08:00', horario_saida: '17:00', intervalo_minutos: '60' });
  const [editando, setEditando] = useState<any | null>(null);
  const [formEdicao, setFormEdicao] = useState({ nome: '', tipo: 'padrao', carga_horaria_semanal: '44', horario_entrada: '08:00', horario_saida: '17:00', intervalo_minutos: '60' });

  const { data: jornadas = [], isLoading } = useQuery({
    queryKey: ['jornadas', empresaAtual?.id],
    queryFn: async () => {
      let q = supabase.from('jornadas').select('*').order('nome');
      if (empresaAtual?.id) q = q.eq('empresa_id', empresaAtual.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id});

  const criar = useMutation({
    mutationFn: async (d: any) => {
      const { data, error } = await supabase.from('jornadas').insert({
        ...d, empresa_id: empresaAtual?.id,
        carga_horaria_semanal: Number(d.carga_horaria_semanal),
        intervalo_minutos: Number(d.intervalo_minutos)}).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jornadas'] }); setOpen(false); toast.success('Jornada criada!'); },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao salvar jornada.'))});

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('jornadas').delete().eq('id', id).eq('empresa_id', empresaAtual!.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['jornadas'] }); toast.success('Jornada excluída!'); }});

  const atualizar = useMutation({
    mutationFn: async (d: typeof formEdicao) => {
      if (!editando) throw new Error('Nenhuma jornada selecionada.');
      return jornadaService.atualizarJornada(editando.id, {
        ...d,
        carga_horaria_semanal: Number(d.carga_horaria_semanal),
        intervalo_minutos: Number(d.intervalo_minutos),
      }, empresaAtual!.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jornadas'] });
      qc.invalidateQueries({ queryKey: ['jornada-colaborador'] });
      setEditando(null);
      toast.success('Jornada atualizada!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao atualizar jornada.'))});

  function abrirEdicao(j: any) {
    setFormEdicao({
      nome: j.nome || '',
      tipo: j.tipo || 'padrao',
      carga_horaria_semanal: String(j.carga_horaria_semanal ?? ''),
      horario_entrada: (j.horario_entrada || '').slice(0, 5),
      horario_saida: (j.horario_saida || '').slice(0, 5),
      intervalo_minutos: String(j.intervalo_minutos ?? ''),
    });
    setEditando(j);
  }

  if (isLoading) return <PageLayout title="Jornadas"><Spinner /></PageLayout>;

  return (
    <>
    <PageTitle title="Jornadas" description="Gestão de jornadas de trabalho" />
    <PageLayout title="Jornadas de Trabalho" description="Configure as jornadas e horários dos colaboradores">
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-semibold">Jornadas ({jornadas.length})</h3>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Jornada</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Jornada</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Comercial 44h" /></div>
                  <div><Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="padrao">Padrão</SelectItem>
                        <SelectItem value="flexivel">Flexível</SelectItem>
                        <SelectItem value="escala">Escala</SelectItem>
                        <SelectItem value="noturno">Noturno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Entrada</Label><Input type="time" value={form.horario_entrada} onChange={e => setForm(p => ({ ...p, horario_entrada: e.target.value }))} /></div>
                    <div><Label>Saída</Label><Input type="time" value={form.horario_saida} onChange={e => setForm(p => ({ ...p, horario_saida: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Carga Semanal (h)</Label><Input type="number" value={form.carga_horaria_semanal} onChange={e => setForm(p => ({ ...p, carga_horaria_semanal: e.target.value }))} /></div>
                    <div><Label>Intervalo (min)</Label><Input type="number" value={form.intervalo_minutos} onChange={e => setForm(p => ({ ...p, intervalo_minutos: e.target.value }))} /></div>
                  </div>
                  <Button className="w-full" onClick={() => criar.mutate(form)} disabled={!form.nome}>Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Horário</TableHead><TableHead>Carga</TableHead><TableHead>Intervalo</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {jornadas.map((j: any) => (
                <TableRow key={j.id}>
                  <TableCell className="font-medium">{j.nome}</TableCell>
                  <TableCell><Badge variant="outline">{j.tipo}</Badge></TableCell>
                  <TableCell>{j.horario_entrada} — {j.horario_saida}</TableCell>
                  <TableCell>{j.carga_horaria_semanal}h/sem</TableCell>
                  <TableCell>{j.intervalo_minutos}min</TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => abrirEdicao(j)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => excluir.mutate(j.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {jornadas.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Nenhuma jornada cadastrada</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Jornada</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nome *</Label><Input value={formEdicao.nome} onChange={e => setFormEdicao(p => ({ ...p, nome: e.target.value }))} /></div>
            <div><Label>Tipo</Label>
              <Select value={formEdicao.tipo} onValueChange={v => setFormEdicao(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="padrao">Padrão</SelectItem>
                  <SelectItem value="flexivel">Flexível</SelectItem>
                  <SelectItem value="escala">Escala</SelectItem>
                  <SelectItem value="noturno">Noturno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Entrada</Label><Input type="time" value={formEdicao.horario_entrada} onChange={e => setFormEdicao(p => ({ ...p, horario_entrada: e.target.value }))} /></div>
              <div><Label>Saída</Label><Input type="time" value={formEdicao.horario_saida} onChange={e => setFormEdicao(p => ({ ...p, horario_saida: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Carga Semanal (h)</Label><Input type="number" value={formEdicao.carga_horaria_semanal} onChange={e => setFormEdicao(p => ({ ...p, carga_horaria_semanal: e.target.value }))} /></div>
              <div><Label>Intervalo (min)</Label><Input type="number" value={formEdicao.intervalo_minutos} onChange={e => setFormEdicao(p => ({ ...p, intervalo_minutos: e.target.value }))} /></div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20 text-xs text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>Atenção: esta jornada pode ser utilizada por outros colaboradores. Alterações neste horário podem refletir em outros vínculos que utilizam esta jornada.</span>
            </div>
            <Button className="w-full" onClick={() => atualizar.mutate(formEdicao)} disabled={!formEdicao.nome || atualizar.isPending}>Salvar alterações</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
    </>
  );
}
