import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { turnoService } from '@/services/turnoService';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { Plus, CalendarClock, Clock, Users, Trash2 } from 'lucide-react';

export default function TurnosPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', horario_inicio: '08:00', horario_fim: '17:00', intervalo_minutos: 60, cor: '#3b82f6' });

  const { data: turnos = [], isLoading } = useQuery({
    queryKey: ['turnos', empresaAtual?.id],
    queryFn: () => turnoService.listarTurnos(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const { data: escalas = [] } = useQuery({
    queryKey: ['escalas_trabalho', empresaAtual?.id],
    queryFn: () => turnoService.listarEscalas(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const criar = useMutation({
    mutationFn: () => turnoService.criarTurno({ ...form, empresa_id: empresaAtual?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['turnos'] }); setOpen(false); toast.success('Turno criado!'); setForm({ nome: '', horario_inicio: '08:00', horario_fim: '17:00', intervalo_minutos: 60, cor: '#3b82f6' }); },
    onError: () => toast.error('Erro ao criar turno'),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => turnoService.excluirTurno(id, empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['turnos'] }); toast.success('Turno excluído'); },
  });

  return (
    <>
    <PageTitle title="Turnos" description="Gestão de turnos de trabalho" />
    <PageLayout 
      title="Turnos & Escalas" 
      description="Planejamento de jornadas de trabalho"
      icon={<CalendarClock className="h-5 w-5 text-primary-foreground" />}
      gradient="from-primary to-primary-glow"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-4 flex items-center gap-3"><CalendarClock className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{turnos.length}</p><p className="text-xs text-muted-foreground">Turnos cadastrados</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Users className="h-8 w-8 text-info" /><div><p className="text-2xl font-bold">{escalas.length}</p><p className="text-xs text-muted-foreground">Escalas agendadas</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><Clock className="h-8 w-8 text-success" /><div><p className="text-2xl font-bold">{turnos.filter((t: any) => t.ativo).length}</p><p className="text-xs text-muted-foreground">Turnos ativos</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="turnos">
        <div className="flex justify-between items-center mb-4">
          <TabsList><TabsTrigger value="turnos">Turnos</TabsTrigger><TabsTrigger value="escalas">Escalas</TabsTrigger></TabsList>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Novo Turno</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Turno</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Manhã, Tarde, Noturno" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Entrada</Label><Input type="time" value={form.horario_inicio} onChange={e => setForm(p => ({ ...p, horario_inicio: e.target.value }))} /></div>
                  <div><Label>Saída</Label><Input type="time" value={form.horario_fim} onChange={e => setForm(p => ({ ...p, horario_fim: e.target.value }))} /></div>
                </div>
                <div><Label>Intervalo (min)</Label><Input type="number" value={form.intervalo_minutos} onChange={e => setForm(p => ({ ...p, intervalo_minutos: Number(e.target.value) }))} /></div>
                <div><Label>Cor</Label><Input type="color" value={form.cor} onChange={e => setForm(p => ({ ...p, cor: e.target.value }))} className="h-10" /></div>
                <Button className="w-full" onClick={() => criar.mutate()} disabled={!form.nome || criar.isPending}>{criar.isPending ? 'Criando...' : 'Criar Turno'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="turnos">
          {isLoading ? <Spinner /> : (
            <Card>
              <Table>
                <TableHeader><TableRow><TableHead>Cor</TableHead><TableHead>Nome</TableHead><TableHead>Entrada</TableHead><TableHead>Saída</TableHead><TableHead>Intervalo</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {turnos.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum turno cadastrado</TableCell></TableRow> :
                    turnos.map((t: any) => (
                      <TableRow key={t.id}>
                        <TableCell><div className="w-6 h-6 rounded-full" style={{ backgroundColor: t.cor || '#3b82f6' }} /></TableCell>
                        <TableCell className="font-medium">{t.nome}</TableCell>
                        <TableCell>{t.horario_inicio}</TableCell>
                        <TableCell>{t.horario_fim}</TableCell>
                        <TableCell>{t.intervalo_minutos}min</TableCell>
                        <TableCell><Badge variant={t.ativo ? 'default' : 'secondary'}>{t.ativo ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                        <TableCell><Button size="sm" variant="ghost" className="text-destructive" onClick={() => excluir.mutate(t.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="escalas">
          <Card>
            <Table>
              <TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>Turno</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {escalas.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma escala agendada</TableCell></TableRow> :
                  escalas.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{(e as any).colaborador?.nome_completo || '—'}</TableCell>
                      <TableCell><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: (e as any).turno?.cor || '#ccc' }} />{(e as any).turno?.nome || '—'}</div></TableCell>
                      <TableCell>{e.data}</TableCell>
                      <TableCell><Badge variant="outline">{e.status}</Badge></TableCell>
                    </TableRow>
                  ))
                }
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
    </>
  );
}
