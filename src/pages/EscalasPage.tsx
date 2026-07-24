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
import { toast } from 'sonner';
import { Plus, CalendarRange, Trash2 } from 'lucide-react';

export default function EscalasPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', tipo: '', dias_trabalho: '', dias_folga: '', horario_entrada: '', horario_saida: '', intervalo_minutos: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['escalas', empresaAtual?.id],
    queryFn: async () => {
      let q = supabase.from('escalas').select('*').order('nome');
      if (empresaAtual?.id) q = q.eq('empresa_id', empresaAtual.id);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaAtual?.id,
  });

  const criar = useMutation({
    mutationFn: async (d: typeof form) => {
      const { error } = await supabase.from('escalas').insert({
        nome: d.nome, tipo: d.tipo || null, dias_trabalho: d.dias_trabalho ? Number(d.dias_trabalho) : null,
        dias_folga: d.dias_folga ? Number(d.dias_folga) : null, horario_entrada: d.horario_entrada || null,
        horario_saida: d.horario_saida || null, intervalo_minutos: d.intervalo_minutos ? Number(d.intervalo_minutos) : null,
        empresa_id: empresaAtual?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['escalas'] }); setOpen(false); toast.success('Escala criada'); },
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('escalas').delete().eq('id', id).eq('empresa_id', empresaAtual!.id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['escalas'] }); toast.success('Excluída'); },
  });

  return (
    <>
    <PageTitle title="Escalas" description="Gestão de escalas de trabalho" />
    <PageLayout title="Escalas de Trabalho" description="Configuração de escalas e turnos rotativos" icon={<CalendarRange className="h-5 w-5 text-primary-foreground" />}>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nova Escala</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Escala</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
              <div><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5x2">5x2</SelectItem><SelectItem value="6x1">6x1</SelectItem>
                    <SelectItem value="12x36">12x36</SelectItem><SelectItem value="4x2">4x2</SelectItem>
                    <SelectItem value="personalizada">Personalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Dias Trabalho</Label><Input type="number" value={form.dias_trabalho} onChange={e => setForm(p => ({ ...p, dias_trabalho: e.target.value }))} /></div>
                <div><Label>Dias Folga</Label><Input type="number" value={form.dias_folga} onChange={e => setForm(p => ({ ...p, dias_folga: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Entrada</Label><Input type="time" value={form.horario_entrada} onChange={e => setForm(p => ({ ...p, horario_entrada: e.target.value }))} /></div>
                <div><Label>Saída</Label><Input type="time" value={form.horario_saida} onChange={e => setForm(p => ({ ...p, horario_saida: e.target.value }))} /></div>
              </div>
              <div><Label>Intervalo (min)</Label><Input type="number" value={form.intervalo_minutos} onChange={e => setForm(p => ({ ...p, intervalo_minutos: e.target.value }))} /></div>
              <Button onClick={() => criar.mutate(form)} disabled={!form.nome} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card><CardContent className="p-0">
        {isLoading ? <div className="p-8 flex justify-center"><Spinner /></div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Dias Trab.</TableHead><TableHead>Dias Folga</TableHead><TableHead>Horário</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {data?.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell>{r.tipo || '-'}</TableCell>
                  <TableCell>{r.dias_trabalho ?? '-'}</TableCell>
                  <TableCell>{r.dias_folga ?? '-'}</TableCell>
                  <TableCell>{r.horario_entrada && r.horario_saida ? `${r.horario_entrada} - ${r.horario_saida}` : '-'}</TableCell>
                  <TableCell><Badge variant={r.ativo ? 'default' : 'secondary'}>{r.ativo ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => excluir.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}
              {!data?.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma escala cadastrada</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </PageLayout>
    </>
  );
}
