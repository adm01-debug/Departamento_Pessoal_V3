import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { FileCheck, Clock, ShieldCheck, XCircle, Inbox, Archive, Stethoscope } from 'lucide-react';

type StatusAso = 'rascunho' | 'emitido_clinica' | 'recebido_rh' | 'validado' | 'arquivado' | 'cancelado';

interface AsoRow {
  id: string;
  colaborador_id: string;
  tipo: string;
  status: StatusAso;
  resultado: string | null;
  data_exame: string;
  data_validade: string | null;
  restricoes_descricao: string | null;
  restricao_data_fim: string | null;
  medico_nome: string | null;
  medico_crm: string | null;
  clinica_partner_id: string | null;
  agendamento_id: string | null;
  observacoes: string | null;
  colaboradores?: { nome_completo: string } | null;
  clinicas_partners?: { razao_social: string } | null;
}

const STATUS_META: Record<StatusAso, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof FileCheck }> = {
  rascunho: { label: 'Rascunho', variant: 'outline', icon: FileCheck },
  emitido_clinica: { label: 'Emitido pela Clínica', variant: 'secondary', icon: Stethoscope },
  recebido_rh: { label: 'Recebido pelo RH', variant: 'secondary', icon: Inbox },
  validado: { label: 'Validado', variant: 'default', icon: ShieldCheck },
  arquivado: { label: 'Arquivado', variant: 'outline', icon: Archive },
  cancelado: { label: 'Cancelado', variant: 'destructive', icon: XCircle },
};

const NEXT_STATUS: Record<StatusAso, StatusAso[]> = {
  rascunho: ['emitido_clinica', 'cancelado'],
  emitido_clinica: ['recebido_rh', 'cancelado'],
  recebido_rh: ['validado', 'cancelado'],
  validado: ['arquivado'],
  arquivado: [],
  cancelado: [],
};

export default function AdminAsoWorkflowPage() {
  const { empresaAtual } = useEmpresas();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filtroStatus, setFiltroStatus] = useState<'todos' | StatusAso>('todos');
  const [selected, setSelected] = useState<AsoRow | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [restricoesEdit, setRestricoesEdit] = useState('');
  const [restricaoDataFim, setRestricaoDataFim] = useState('');

  const empresaId = empresaAtual?.id;

  const { data: asos, isLoading } = useQuery({
    queryKey: ['aso-workflow', empresaId, filtroStatus],
    enabled: !!empresaId,
    queryFn: async () => {
      let q = supabase
        .from('asos')
        .select('id,colaborador_id,tipo,status,resultado,data_exame,data_validade,restricoes_descricao,restricao_data_fim,medico_nome,medico_crm,clinica_partner_id,agendamento_id,observacoes,colaboradores(nome_completo),clinicas_partners(razao_social)')
        .eq('empresa_id', empresaId!)
        .order('created_at', { ascending: false })
        .limit(500);
      if (filtroStatus !== 'todos') q = q.eq('status', filtroStatus);
      const { data, error } = await q;
      if (error) throw error;
      return (data as unknown as AsoRow[]) ?? [];
    },
  });

  const kpis = useMemo(() => {
    const list = asos ?? [];
    return {
      total: list.length,
      pendentes_rh: list.filter(a => a.status === 'emitido_clinica').length,
      recebidos: list.filter(a => a.status === 'recebido_rh').length,
      validados: list.filter(a => a.status === 'validado').length,
    };
  }, [asos]);

  const transitionMut = useMutation({
    mutationFn: async ({ aso, next }: { aso: AsoRow; next: StatusAso }) => {
      const patch: Partial<{
        status: StatusAso;
        recebido_rh_em: string;
        recebido_rh_por: string;
        validado_em: string;
        validado_por: string;
        motivo_cancelamento: string;
        restricoes_descricao: string;
        restricao_data_fim: string;
      }> = { status: next };
      if (next === 'recebido_rh') {
        patch.recebido_rh_em = new Date().toISOString();
        patch.recebido_rh_por = user?.id;
      }
      if (next === 'validado') {
        patch.validado_em = new Date().toISOString();
        patch.validado_por = user?.id;
      }
      if (next === 'cancelado') {
        if (!motivoCancelamento.trim()) throw new Error('Informe o motivo do cancelamento');
        patch.motivo_cancelamento = motivoCancelamento;
      }
      if (aso.resultado === 'apto_com_restricoes') {
        if (restricoesEdit.trim().length >= 5) patch.restricoes_descricao = restricoesEdit;
        if (restricaoDataFim) patch.restricao_data_fim = restricaoDataFim;
      }
      const { error } = await supabase.from('asos').update(patch).eq('id', aso.id).eq('empresa_id', empresaAtual!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('ASO atualizado com sucesso');
      qc.invalidateQueries({ queryKey: ['aso-workflow'] });
      setSelected(null);
      setMotivoCancelamento('');
      setRestricoesEdit('');
      setRestricaoDataFim('');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Falha ao atualizar ASO.')),
  });

  const openDetail = (aso: AsoRow) => {
    setSelected(aso);
    setRestricoesEdit(aso.restricoes_descricao ?? '');
    setRestricaoDataFim(aso.restricao_data_fim ?? '');
    setMotivoCancelamento('');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ASO Digital</h1>
          <p className="text-muted-foreground mt-1">Workflow entre clínica parceira e RH — recebimento, validação e arquivamento</p>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{kpis.total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Clock className="h-4 w-4"/>Aguardando RH</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{kpis.pendentes_rh}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Inbox className="h-4 w-4"/>Para validar</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{kpis.recebidos}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><ShieldCheck className="h-4 w-4"/>Validados</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{kpis.validados}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>ASOs</CardTitle>
          <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as typeof filtroStatus)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data exame</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Clínica</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(asos ?? []).map(aso => {
                  const meta = STATUS_META[aso.status];
                  const Icon = meta.icon;
                  return (
                    <TableRow key={aso.id}>
                      <TableCell className="font-medium">{aso.colaboradores?.nome_completo ?? '—'}</TableCell>
                      <TableCell className="capitalize">{aso.tipo}</TableCell>
                      <TableCell>{new Date(aso.data_exame).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell>{aso.data_validade ? new Date(aso.data_validade).toLocaleDateString('pt-BR') : '—'}</TableCell>
                      <TableCell>{aso.clinicas_partners?.razao_social ?? '—'}</TableCell>
                      <TableCell><Badge variant={meta.variant} className="gap-1"><Icon className="h-3 w-3" />{meta.label}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openDetail(aso)}>Abrir</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(asos ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum ASO encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ASO — {selected?.colaboradores?.nome_completo}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><Label className="text-muted-foreground">Tipo</Label><div className="capitalize font-medium">{selected.tipo}</div></div>
                <div><Label className="text-muted-foreground">Resultado</Label><div className="capitalize font-medium">{selected.resultado ?? '—'}</div></div>
                <div><Label className="text-muted-foreground">Médico</Label><div>{selected.medico_nome ?? '—'} {selected.medico_crm ? `(CRM ${selected.medico_crm})` : ''}</div></div>
                <div><Label className="text-muted-foreground">Clínica</Label><div>{selected.clinicas_partners?.razao_social ?? '—'}</div></div>
              </div>

              {selected.resultado === 'apto_com_restricoes' && (
                <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
                  <div>
                    <Label>Descrição das restrições (mín. 5 caracteres)</Label>
                    <Textarea value={restricoesEdit} onChange={(e) => setRestricoesEdit(e.target.value)} rows={3} />
                  </div>
                  <div>
                    <Label>Data-fim da restrição</Label>
                    <Input type="date" value={restricaoDataFim} onChange={(e) => setRestricaoDataFim(e.target.value)} />
                  </div>
                </div>
              )}

              {NEXT_STATUS[selected.status].includes('cancelado') && (
                <div>
                  <Label>Motivo (obrigatório para cancelar)</Label>
                  <Input value={motivoCancelamento} onChange={(e) => setMotivoCancelamento(e.target.value)} placeholder="Descreva o motivo do cancelamento..." />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {NEXT_STATUS[selected.status].map(next => {
                  const meta = STATUS_META[next];
                  const Icon = meta.icon;
                  return (
                    <Button
                      key={next}
                      variant={next === 'cancelado' ? 'destructive' : 'default'}
                      onClick={() => transitionMut.mutate({ aso: selected, next })}
                      disabled={transitionMut.isPending}
                    >
                      <Icon className="h-4 w-4 mr-2" />Mover para {meta.label}
                    </Button>
                  );
                })}
                {NEXT_STATUS[selected.status].length === 0 && (
                  <p className="text-sm text-muted-foreground">Este ASO está em estado final e não permite novas transições.</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
