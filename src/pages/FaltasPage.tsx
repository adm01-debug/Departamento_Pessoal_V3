import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { faltasService } from '@/services';
import { colaboradorService } from '@/services';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Plus, UserX, Trash2, Check, X, FileText, Stethoscope } from 'lucide-react';
import { motion } from 'framer-motion';

const tipoLabels: Record<string, string> = {
  justificada: 'Justificada', injustificada: 'Injustificada', abonada: 'Abonada', parcial: 'Parcial',
  atestado_medico: 'Atestado Médico', licenca_maternidade: 'Lic. Maternidade', licenca_paternidade: 'Lic. Paternidade',
  licenca_casamento: 'Lic. Casamento', licenca_obito: 'Lic. Óbito', acidente_trabalho: 'Acidente Trabalho',
  doacao_sangue: 'Doação Sangue', servico_militar: 'Serviço Militar', comparecimento_juizo: 'Comp. Juízo',
  alistamento_eleitoral: 'Alistamento Eleitoral', vestibular: 'Vestibular', consulta_prenatal: 'Consulta Pré-natal',
  acompanhamento_filho: 'Acomp. Filho Médico',
};

const statusLabels: Record<string, string> = {
  registrada: 'Registrada', justificada: 'Justificada', abonada: 'Abonada', descontada: 'Descontada', aprovada: 'Aprovada', rejeitada: 'Rejeitada',
};

const statusVariant: Record<string, 'secondary' | 'default' | 'destructive' | 'outline'> = {
  registrada: 'outline', justificada: 'secondary', abonada: 'secondary', descontada: 'destructive', aprovada: 'default', rejeitada: 'destructive',
};

const initialForm = {
  colaborador_id: '', data: '', data_fim: '', tipo: 'injustificada', motivo: '', horas_falta: '',
  cid: '', medico_nome: '', medico_crm: '', documento_anexo: '',
};

export default function FaltasPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [statusFilter, setStatusFilter] = useState('todos');

  const { data: faltas = [], isLoading } = useQuery({
    queryKey: ['faltas', empresaAtual?.id],
    queryFn: () => faltasService.listar(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', empresaAtual?.id],
    queryFn: () => colaboradorService.list(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const criar = useMutation({
    mutationFn: (d: any) => {
      const payload: any = {
        ...d,
        empresa_id: empresaAtual?.id,
        horas_falta: d.horas_falta ? `${d.horas_falta} hours` : null,
        data_fim: d.data_fim || null,
        cid: d.cid || null,
        medico_nome: d.medico_nome || null,
        medico_crm: d.medico_crm || null,
        documento_anexo: d.documento_anexo || null,
      };
      if (d.data_fim && d.data) {
        const start = new Date(d.data);
        const end = new Date(d.data_fim);
        payload.dias_total = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
      }
      delete payload.horas_falta_raw;
      return faltasService.criar(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['faltas'] });
      setOpen(false);
      setForm(initialForm);
      toast.success('Falta registrada!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao registrar falta.')),
  });

  const aprovar = useMutation({
    mutationFn: (id: string) => faltasService.atualizar(id, { status: 'aprovada', aprovado_em: new Date().toISOString() }, empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faltas'] }); toast.success('Falta aprovada!'); },
  });

  const rejeitar = useMutation({
    mutationFn: (id: string) => faltasService.atualizar(id, { status: 'rejeitada' }, empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faltas'] }); toast.success('Falta rejeitada!'); },
  });

  const marcarDesconto = useMutation({
    mutationFn: (id: string) => faltasService.atualizar(id, { desconto_aplicado: true, status: 'descontada' }, empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faltas'] }); toast.success('Desconto aplicado!'); },
  });

  const excluir = useMutation({
    mutationFn: (id: string) => faltasService.excluir(id, empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['faltas'] }); toast.success('Falta excluída!'); },
  });

  if (isLoading) return <PageLayout title="Faltas"><Spinner /></PageLayout>;

  const filtered = statusFilter === 'todos' ? faltas : faltas.filter((f: any) => f.status === statusFilter);

  const stats = {
    total: faltas.length,
    justificadas: faltas.filter((f: any) => f.tipo === 'justificada' || f.tipo === 'atestado_medico').length,
    injustificadas: faltas.filter((f: any) => f.tipo === 'injustificada').length,
    pendentes: faltas.filter((f: any) => f.status === 'registrada').length,
    descontadas: faltas.filter((f: any) => f.desconto_aplicado).length,
  };

  const needsMedicalInfo = ['atestado_medico', 'acidente_trabalho', 'consulta_prenatal', 'acompanhamento_filho'].includes(form.tipo);

  return (
    <>
    <PageTitle title="Faltas" description="Controle de faltas e ausências" />
    <PageLayout
      title="Gestão de Faltas"
      description="Controle completo de ausências com workflow de aprovação"
      icon={<UserX className="h-5 w-5 text-primary-foreground" />}
      gradient="from-destructive to-destructive/70/70"
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border border-border/30 shadow-elevated rounded-2xl">
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-display font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground font-body">Total</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border border-border/30 shadow-elevated rounded-2xl">
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-display font-bold text-success">{stats.justificadas}</p>
              <p className="text-sm text-muted-foreground font-body">Justificadas</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border border-border/30 shadow-elevated rounded-2xl">
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-display font-bold text-destructive">{stats.injustificadas}</p>
              <p className="text-sm text-muted-foreground font-body">Injustificadas</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border border-border/30 shadow-elevated rounded-2xl">
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-display font-bold text-warning">{stats.pendentes}</p>
              <p className="text-sm text-muted-foreground font-body">Pendentes</p>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border border-border/30 shadow-elevated rounded-2xl">
            <CardContent className="pt-4 text-center">
              <p className="text-2xl font-display font-bold text-info">{stats.descontadas}</p>
              <p className="text-sm text-muted-foreground font-body">Descontadas</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
        <div className="h-[2px] bg-gradient-to-r from-destructive to-destructive/70/70" />
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-display font-semibold">Faltas Registradas</h3>
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList className="h-8">
                  <TabsTrigger value="todos" className="text-xs px-2 h-6">Todos</TabsTrigger>
                  <TabsTrigger value="registrada" className="text-xs px-2 h-6">Pendentes</TabsTrigger>
                  <TabsTrigger value="aprovada" className="text-xs px-2 h-6">Aprovadas</TabsTrigger>
                  <TabsTrigger value="descontada" className="text-xs px-2 h-6">Descontadas</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm" className="rounded-xl"><Plus className="h-4 w-4 mr-1" />Registrar Falta</Button></DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader><DialogTitle className="font-display">Registrar Falta</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Colaborador *</Label>
                    <Select value={form.colaborador_id} onValueChange={v => setForm(p => ({ ...p, colaborador_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Data Início *</Label><Input type="date" value={form.data} onChange={e => setForm(p => ({ ...p, data: e.target.value }))} /></div>
                    <div><Label>Data Fim</Label><Input type="date" value={form.data_fim} onChange={e => setForm(p => ({ ...p, data_fim: e.target.value }))} /></div>
                  </div>
                  <div>
                    <Label>Tipo *</Label>
                    <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(tipoLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Horas Falta (parcial)</Label><Input type="number" value={form.horas_falta} onChange={e => setForm(p => ({ ...p, horas_falta: e.target.value }))} placeholder="Ex: 4" /></div>

                  {needsMedicalInfo && (
                    <div className="space-y-3 p-3 rounded-xl bg-muted/50 border border-border/30">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Stethoscope className="h-4 w-4" /> Dados Médicos
                      </div>
                      <div><Label>CID</Label><Input value={form.cid} onChange={e => setForm(p => ({ ...p, cid: e.target.value }))} placeholder="Ex: J06.9" /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>Médico</Label><Input value={form.medico_nome} onChange={e => setForm(p => ({ ...p, medico_nome: e.target.value }))} /></div>
                        <div><Label>CRM</Label><Input value={form.medico_crm} onChange={e => setForm(p => ({ ...p, medico_crm: e.target.value }))} /></div>
                      </div>
                    </div>
                  )}

                  <div><Label>URL Documento/Atestado</Label><Input value={form.documento_anexo} onChange={e => setForm(p => ({ ...p, documento_anexo: e.target.value }))} placeholder="https://..." /></div>
                  <div><Label>Motivo</Label><Textarea value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))} /></div>
                  <Button className="w-full rounded-xl" onClick={() => criar.mutate(form)} disabled={!form.colaborador_id || !form.data}>Salvar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-display font-semibold">Colaborador</TableHead>
                <TableHead className="font-display font-semibold">Período</TableHead>
                <TableHead className="font-display font-semibold">Dias</TableHead>
                <TableHead className="font-display font-semibold">Tipo</TableHead>
                <TableHead className="font-display font-semibold">Status</TableHead>
                <TableHead className="font-display font-semibold">CID</TableHead>
                <TableHead className="font-display font-semibold">Motivo</TableHead>
                <TableHead className="font-display font-semibold w-[140px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f: any) => (
                <TableRow key={f.id} className="hover:bg-accent/30 transition-colors">
                  <TableCell className="font-body font-medium">{f.colaborador?.nome_completo || '—'}</TableCell>
                  <TableCell className="font-body text-sm">
                    {f.data}{f.data_fim ? ` → ${f.data_fim}` : ''}
                  </TableCell>
                  <TableCell className="font-body">{f.dias_total || 1}</TableCell>
                  <TableCell>
                    <Badge variant={f.tipo === 'injustificada' ? 'destructive' : 'secondary'} className="text-xs">
                      {tipoLabels[f.tipo] || f.tipo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[f.status] || 'outline'} className="text-xs">
                      {statusLabels[f.status] || f.status || 'Registrada'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-body text-sm">{f.cid || '—'}</TableCell>
                  <TableCell className="max-w-[150px] truncate font-body text-sm">{f.motivo || '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(!f.status || f.status === 'registrada') && (
                        <>
                          <Button size="icon" variant="ghost" aria-label="Aprovar" className="h-7 w-7 rounded-lg hover:bg-success/10 text-success" onClick={() => aprovar.mutate(f.id)} title="Aprovar">
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" aria-label="Rejeitar" className="h-7 w-7 rounded-lg hover:bg-destructive/10 text-destructive" onClick={() => rejeitar.mutate(f.id)} title="Rejeitar">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {f.tipo === 'injustificada' && !f.desconto_aplicado && f.status !== 'rejeitada' && (
                        <Button size="icon" variant="ghost" aria-label="Aplicar desconto" className="h-7 w-7 rounded-lg hover:bg-warning/10 text-warning" onClick={() => marcarDesconto.mutate(f.id)} title="Aplicar desconto">
                          <FileText className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" aria-label="Excluir" className="h-7 w-7 rounded-lg" onClick={() => excluir.mutate(f.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8 font-body">Nenhuma falta registrada</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </PageLayout>
    </>
  );
}
