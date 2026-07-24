import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { despesaService, type DespesaStatus, type DespesaTipo } from '@/services/despesaService';
import { colaboradorService } from '@/services';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { safeHref } from '@/utils/safeUrl';
import { Plus, Receipt, DollarSign, CheckCircle, Clock, XCircle, Trash2, Upload, Eye, DollarSign as DollarIcon } from 'lucide-react';
import { formatCurrency } from '@/utils/format';

const statusColors: Record<DespesaStatus, string> = {
  rascunho: 'outline',
  pendente: 'secondary',
  aprovado: 'default',
  rejeitado: 'destructive',
  integrado_folha: 'default',
  pago: 'default',
  cancelado: 'outline',
};

const statusLabels: Record<DespesaStatus, string> = {
  rascunho: 'Rascunho',
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  integrado_folha: 'Na folha',
  pago: 'Pago',
  cancelado: 'Cancelado',
};

const tipoLabels: Record<DespesaTipo, string> = {
  reembolso: 'Reembolso',
  adiantamento: 'Adiantamento',
  despesa_viagem: 'Viagem',
  material: 'Material',
  alimentacao: 'Alimentação',
  transporte: 'Transporte',
  outro: 'Outro',
};

const emptyForm = { colaborador_id: '', tipo: 'reembolso' as DespesaTipo, categoria: 'transporte', descricao: '', valor: '', data_despesa: '' };

export default function DespesasPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectMotivo, setRejectMotivo] = useState('');

  const { data: despesas = [], isLoading } = useQuery({
    queryKey: ['despesas', empresaAtual?.id],
    queryFn: () => despesaService.listar(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', empresaAtual?.id],
    queryFn: () => colaboradorService.list(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  const criar = useMutation({
    mutationFn: async () => {
      const created = await despesaService.criar({ ...form, valor: Number(form.valor), empresa_id: empresaAtual!.id });
      if (file && created?.id && empresaAtual?.id) {
        await despesaService.uploadComprovante(empresaAtual.id, created.id, file);
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['despesas'] });
      setOpen(false);
      setForm(emptyForm);
      setFile(null);
      toast.success('Despesa registrada com sucesso!');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar despesa.')),
  });

  const aprovar = useMutation({
    mutationFn: (id: string) => despesaService.aprovar(id, empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['despesas'] }); toast.success('Despesa aprovada'); },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar despesa.')),
  });

  const rejeitar = useMutation({
    mutationFn: () => despesaService.rejeitar(rejectTarget!, empresaAtual!.id, rejectMotivo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['despesas'] });
      toast.success('Despesa rejeitada');
      setRejectTarget(null); setRejectMotivo('');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar despesa.')),
  });

  const marcarPago = useMutation({
    mutationFn: (id: string) => despesaService.marcarPago(id, empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['despesas'] }); toast.success('Marcada como paga'); },
  });

  const excluir = useMutation({
    mutationFn: (id: string) => despesaService.excluir(id, empresaAtual!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['despesas'] }); toast.success('Excluída'); },
  });

  const abrirComprovante = async (path: string) => {
    const url = await despesaService.getComprovanteUrl(path);
    if (url) window.open(safeHref(url), '_blank', 'noopener');
    else toast.error('Não foi possível gerar link do comprovante');
  };

  const totalPendente = despesas.filter((d: any) => d.status === 'pendente').reduce((s: number, d: any) => s + Number(d.valor), 0);
  const totalAprovado = despesas.filter((d: any) => ['aprovado', 'integrado_folha', 'pago'].includes(d.status)).reduce((s: number, d: any) => s + Number(d.valor), 0);

  return (
    <>
      <PageTitle title="Despesas e Reembolsos" description="Controle de despesas e reembolsos" />
      <PageLayout title="Reembolsos & Despesas">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="pt-4 flex items-center gap-3"><Receipt className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{despesas.length}</p><p className="text-xs text-muted-foreground">Total</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3"><Clock className="h-8 w-8 text-warning" /><div><p className="text-2xl font-bold">{despesas.filter((d: any) => d.status === 'pendente').length}</p><p className="text-xs text-muted-foreground">Pendentes</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3"><DollarSign className="h-8 w-8 text-destructive" /><div><p className="text-2xl font-bold">{formatCurrency(totalPendente)}</p><p className="text-xs text-muted-foreground">Valor pendente</p></div></CardContent></Card>
          <Card><CardContent className="pt-4 flex items-center gap-3"><CheckCircle className="h-8 w-8 text-success" /><div><p className="text-2xl font-bold">{formatCurrency(totalAprovado)}</p><p className="text-xs text-muted-foreground">Aprovado + folha + pago</p></div></CardContent></Card>
        </div>

        <div className="flex justify-end mb-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nova Despesa</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Registrar despesa</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Colaborador</Label>
                  <Select value={form.colaborador_id} onValueChange={v => setForm(p => ({ ...p, colaborador_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v as DespesaTipo }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(tipoLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select value={form.categoria} onValueChange={v => setForm(p => ({ ...p, categoria: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transporte">Transporte</SelectItem>
                        <SelectItem value="alimentacao">Alimentação</SelectItem>
                        <SelectItem value="hospedagem">Hospedagem</SelectItem>
                        <SelectItem value="material">Material</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Descrição</Label><Textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Valor (R$)</Label><Input type="number" step="0.01" min="0.01" value={form.valor} onChange={e => setForm(p => ({ ...p, valor: e.target.value }))} /></div>
                  <div><Label>Data</Label><Input type="date" value={form.data_despesa} onChange={e => setForm(p => ({ ...p, data_despesa: e.target.value }))} /></div>
                </div>
                <div>
                  <Label>Comprovante (opcional)</Label>
                  <Input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                  {file && <p className="text-xs text-muted-foreground mt-1">{file.name} ({(file.size / 1024).toFixed(0)} KB)</p>}
                </div>
                <Button className="w-full" onClick={() => criar.mutate()} disabled={!form.colaborador_id || !form.valor || !form.descricao || !form.data_despesa || criar.isPending}>
                  {criar.isPending ? 'Registrando…' : 'Registrar despesa'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? <Spinner /> : (
          <Card>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {despesas.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma despesa registrada</TableCell></TableRow>
                ) : despesas.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.colaborador?.nome_completo || '—'}</TableCell>
                    <TableCell><Badge variant="outline">{tipoLabels[d.tipo as DespesaTipo] || d.tipo}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{d.categoria}</Badge></TableCell>
                    <TableCell className="max-w-[220px] truncate" title={d.descricao}>{d.descricao}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(Number(d.valor))}</TableCell>
                    <TableCell className="text-xs">{d.data_despesa}</TableCell>
                    <TableCell><Badge variant={statusColors[d.status as DespesaStatus] as any}>{statusLabels[d.status as DespesaStatus] || d.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1 justify-end">
                        {d.comprovante_url && (
                          <Button size="sm" variant="ghost" title="Ver comprovante" onClick={() => abrirComprovante(d.comprovante_url)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {d.status === 'pendente' && (
                          <>
                            <Button size="sm" variant="ghost" className="text-success" title="Aprovar" onClick={() => aprovar.mutate(d.id)}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" title="Rejeitar" onClick={() => setRejectTarget(d.id)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {d.status === 'aprovado' && (
                          <Button size="sm" variant="ghost" className="text-primary" title="Marcar como pago" onClick={() => marcarPago.mutate(d.id)}>
                            <DollarIcon className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-destructive" title="Excluir" onClick={() => excluir.mutate(d.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        <Dialog open={!!rejectTarget} onOpenChange={o => { if (!o) { setRejectTarget(null); setRejectMotivo(''); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Rejeitar despesa</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label>Motivo da rejeição *</Label>
              <Textarea rows={4} placeholder="Descreva o motivo (mínimo 3 caracteres)" value={rejectMotivo} onChange={e => setRejectMotivo(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectMotivo(''); }}>Cancelar</Button>
              <Button variant="destructive" onClick={() => rejeitar.mutate()} disabled={rejectMotivo.trim().length < 3 || rejeitar.isPending}>
                {rejeitar.isPending ? 'Rejeitando…' : 'Confirmar rejeição'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageLayout>
    </>
  );
}
