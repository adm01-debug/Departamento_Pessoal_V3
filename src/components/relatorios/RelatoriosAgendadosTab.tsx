import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Plus, Trash2, Calendar, Mail, FileText, CheckCircle2, History, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { motion } from 'framer-motion';

export function RelatoriosAgendadosTab({ empresaId }: { empresaId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nome: '',
    tipo_relatorio: 'lista_colaboradores',
    frequencia: 'diario',
    email_destinatario: '',
    formato: 'pdf',
    hora_envio: '08:00'
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
    enabled: !!empresaId
  });

  const criar = useMutation({
    mutationFn: async (d: any) => {
      const { data, error } = await supabase
        .from('relatorios_agendados')
        .insert([{ ...d, empresa_id: empresaId, ativo: true }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['relatorios_agendados'] });
      setOpen(false);
      toast.success('Relatório agendado com sucesso!');
    },
    onError: (e: any) => toast.error(safeErrorMessage(e, 'Erro ao agendar relatório.'))
  });

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('relatorios_agendados').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['relatorios_agendados'] });
      toast.success('Agendamento removido');
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-display font-bold">Relatórios Agendados</h2>
          <p className="text-sm text-muted-foreground font-body">Configure envios automáticos para sua caixa de entrada</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-gradient-to-r from-primary to-primary-glow font-body">
              <Plus className="mr-2 h-4 w-4" />Agendar Novo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display">Novo Agendamento</DialogTitle>
              <CardDescription>O sistema enviará o relatório automaticamente conforme a frequência</CardDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome do Agendamento</Label>
                <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Headcount Semanal" className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Relatório</Label>
                  <Select value={form.tipo_relatorio} onValueChange={v => setForm(p => ({ ...p, tipo_relatorio: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lista_colaboradores">Colaboradores</SelectItem>
                      <SelectItem value="folha_resumo">Resumo da Folha</SelectItem>
                      <SelectItem value="ferias_proximas">Férias Próximas</SelectItem>
                      <SelectItem value="indicadores_dp">Indicadores DP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select value={form.frequencia} onValueChange={v => setForm(p => ({ ...p, frequencia: v }))}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diario">Diário</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>E-mail de Destino</Label>
                  <Input value={form.email_destinatario} onChange={e => setForm(p => ({ ...p, email_destinatario: e.target.value }))} placeholder="rh@empresa.com" className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Hora de Envio</Label>
                  <Input type="time" value={form.hora_envio} onChange={e => setForm(p => ({ ...p, hora_envio: e.target.value }))} className="rounded-xl" />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancelar</Button>
                <Button onClick={() => criar.mutate(form)} disabled={!form.nome || !form.email_destinatario} className="rounded-xl bg-primary shadow-glow">Agendar</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex justify-center py-12"><Clock className="animate-spin h-8 w-8 text-muted-foreground" /></div>
        ) : agendamentos.length === 0 ? (
          <Card className="border-dashed border-2 py-12 text-center text-muted-foreground rounded-2xl">
            <Calendar className="mx-auto h-12 w-12 mb-4 opacity-20" />
            <p className="font-body">Nenhum relatório agendado</p>
          </Card>
        ) : (
          agendamentos.map((a: any, i: number) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
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
                    <Button variant="ghost" size="icon" aria-label="Excluir" className="text-destructive hover:bg-destructive/10 rounded-xl" onClick={() => excluir.mutate(a.id)}>
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
          <Badge variant="outline" className="text-[10px] bg-success/5 text-success border-success/20">Monitoramento Ativo</Badge>
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
              <TableRow>
                <TableCell className="px-6 font-medium text-xs">Exemplo: Headcount Semanal</TableCell>
                <TableCell className="text-xs text-muted-foreground">09/05/2026 08:00</TableCell>
                <TableCell className="text-xs text-muted-foreground">rh@empresa.com</TableCell>
                <TableCell>
                  <Badge className="bg-success/10 text-success border-0 text-[10px] gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Sucesso
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
