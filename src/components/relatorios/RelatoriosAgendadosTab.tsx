import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Plus, Trash2, Calendar, Mail, CheckCircle2, History, CircleX } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { motion } from 'framer-motion';
import { buildReportScheduleInsert, isReportScheduleType, type ReportScheduleForm } from './reportScheduleContract';

const DIAS_SEMANA = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
] as const;

const DIAS_MES = Array.from({ length: 31 }, (_, index) => index + 1);

export function RelatoriosAgendadosTab({ empresaId }: { empresaId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ReportScheduleForm>({
    nome: '',
    tipo_relatorio: 'lista_colaboradores',
    frequencia: 'diario',
    email_destinatario: '',
    hora_envio: '08:00',
    dia_semana: new Date().getDay(),
    dia_mes: new Date().getDate(),
  });

  const { data: agendamentos = [], isLoading } = useQuery({
    queryKey: ['relatorios_agendados', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relatorios_agendados')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId,
  });

  const criar = useMutation({
    mutationFn: async (d: ReportScheduleForm) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const userId = authData.user?.id;
      const payload = buildReportScheduleInsert(d, empresaId, userId ?? '');
      const { data, error } = await supabase.from('relatorios_agendados').insert([payload]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['relatorios_agendados'] });
      setOpen(false);
      toast.success('Relatório agendado com sucesso!');
    },
    onError: (e: any) => toast.error(safeErrorMessage(e, 'Erro ao agendar relatório.')),
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('relatorios_agendados').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['relatorios_agendados'] });
      toast.success('Agendamento removido');
    },
  });

  const agendamentosPorId = new Map(agendamentos.map((agendamento) => [agendamento.id, agendamento]));
  const agendamentoIds = agendamentos.map((agendamento) => agendamento.id);

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['log_envio_relatorios', empresaId, agendamentoIds],
    queryFn: async () => {
      if (agendamentoIds.length === 0) return [];
      const { data, error } = await supabase
        .from('log_envio_relatorios')
        .select('*')
        .in('agendamento_id', agendamentoIds)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!empresaId && agendamentoIds.length > 0,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-display font-bold">Relatórios Agendados</h2>
          <p className="text-sm text-muted-foreground font-body">
            Configure envios automáticos para sua caixa de entrada
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-gradient-to-r from-primary to-primary-glow font-body">
              <Plus className="mr-2 h-4 w-4" />
              Agendar Novo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display">Novo Agendamento</DialogTitle>
              <CardDescription>O sistema enviará um CSV automaticamente conforme a frequência.</CardDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome do Agendamento</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Headcount Semanal"
                  className="rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Relatório</Label>
                  <Select
                    value={form.tipo_relatorio}
                    onValueChange={(value) => {
                      if (isReportScheduleType(value)) {
                        setForm((previous) => ({ ...previous, tipo_relatorio: value }));
                      }
                    }}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lista_colaboradores">Colaboradores</SelectItem>
                      <SelectItem value="folha_resumo">Resumo da Folha</SelectItem>
                      <SelectItem value="ferias_proximas">Férias Próximas</SelectItem>
                      <SelectItem value="afastamentos_ativos">Afastamentos Ativos</SelectItem>
                      <SelectItem value="indicadores_dp">Indicadores DP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select
                    value={form.frequencia}
                    onValueChange={(value: ReportScheduleForm['frequencia']) =>
                      setForm((p) => ({ ...p, frequencia: value }))
                    }
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">Diário</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.frequencia === 'semanal' && (
                <div className="space-y-2">
                  <Label>Dia da Semana</Label>
                  <Select
                    value={String(form.dia_semana)}
                    onValueChange={(value) => setForm((p) => ({ ...p, dia_semana: Number(value) }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIAS_SEMANA.map((dia) => (
                        <SelectItem key={dia.value} value={String(dia.value)}>
                          {dia.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {form.frequencia === 'mensal' && (
                <div className="space-y-2">
                  <Label>Dia do Mês</Label>
                  <Select
                    value={String(form.dia_mes)}
                    onValueChange={(value) => setForm((p) => ({ ...p, dia_mes: Number(value) }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIAS_MES.map((dia) => (
                        <SelectItem key={dia} value={String(dia)}>
                          {dia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>E-mail de Destino</Label>
                  <Input
                    value={form.email_destinatario}
                    onChange={(e) => setForm((p) => ({ ...p, email_destinatario: e.target.value }))}
                    placeholder="rh@empresa.com"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora de Envio</Label>
                  <Input
                    type="time"
                    value={form.hora_envio}
                    onChange={(e) => setForm((p) => ({ ...p, hora_envio: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
                  Cancelar
                </Button>
                <Button
                  onClick={() => criar.mutate(form)}
                  disabled={!form.nome || !form.email_destinatario}
                  className="rounded-xl bg-primary shadow-glow"
                >
                  Agendar
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Clock className="animate-spin h-8 w-8 text-muted-foreground" />
          </div>
        ) : agendamentos.length === 0 ? (
          <Card className="border-dashed border-2 py-12 text-center text-muted-foreground rounded-2xl">
            <Calendar className="mx-auto h-12 w-12 mb-4 opacity-20" />
            <p className="font-body">Nenhum relatório agendado</p>
          </Card>
        ) : (
          agendamentos.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-border/30 hover:border-primary/20 transition-all rounded-2xl overflow-hidden group">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm">{a.nome}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {a.frequencia} às {a.hora_envio}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {a.email_destinatario}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-muted-foreground font-body uppercase">Próximo Envio</p>
                      <p className="text-xs font-mono font-medium">
                        {a.proximo_envio ? new Date(a.proximo_envio).toLocaleString('pt-BR') : 'Aguardando...'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir"
                      className="text-destructive hover:bg-destructive/10 rounded-xl"
                      onClick={() => excluir.mutate(a.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      {/* Logs Card */}
      <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-xs">
        <CardHeader className="bg-muted/20 border-b border-border/20 py-4 px-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-display flex items-center gap-2">
              <History className="h-4 w-4 text-primary" /> Histórico de Entregas Automáticas
            </CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px]">
            Histórico confirmado
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/10 hover:bg-muted/10">
                <TableHead className="text-xs px-6">Agendamento</TableHead>
                <TableHead className="text-xs">Data/Hora</TableHead>
                <TableHead className="text-xs">Destinatário</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="px-6 py-8 text-center text-xs text-muted-foreground">
                    Carregando histórico...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="px-6 py-8 text-center text-xs text-muted-foreground">
                    Nenhuma entrega confirmada.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const agendamento = agendamentosPorId.get(log.agendamento_id ?? '');
                  const sucesso = log.status === 'sucesso';
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="px-6 font-medium text-xs">
                        {agendamento?.nome ?? 'Agendamento removido'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {agendamento?.email_destinatario ?? 'Não disponível'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            sucesso
                              ? 'bg-success/10 text-success border-0 text-[10px] gap-1'
                              : 'bg-destructive/10 text-destructive border-0 text-[10px] gap-1'
                          }
                        >
                          {sucesso ? <CheckCircle2 className="h-3 w-3" /> : <CircleX className="h-3 w-3" />}
                          {sucesso ? 'Sucesso' : 'Erro'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
