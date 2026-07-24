import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle2, UserPlus, Clock, Ban, Loader2, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { formatDateTime } from '@/utils/format';
import { maskPisDisplay } from '@/utils/piiMask';

type TipoDiv = 'ok' | 'sem_colaborador' | 'sem_batida' | 'duplicado';

interface Divergencia {
  id: string;
  importacao_id: string;
  empresa_id: string;
  colaborador_id: string | null;
  batida_id: string | null;
  pis: string | null;
  data_hora_afdt: string | null;
  tipo: TipoDiv;
  delta_segundos: number | null;
  resolvido: boolean;
  observacao: string | null;
  created_at: string;
}

interface ColaboradorMin {
  id: string;
  nome: string;
  matricula: string | null;
}

const TIPO_LABEL: Record<TipoDiv, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ok: { label: 'OK', variant: 'default' },
  sem_colaborador: { label: 'Sem colaborador', variant: 'destructive' },
  sem_batida: { label: 'Sem batida', variant: 'secondary' },
  duplicado: { label: 'Duplicado', variant: 'outline' },
};

export default function AdminPontoDivergenciasPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | TipoDiv>('sem_batida');
  const [statusFiltro, setStatusFiltro] = useState<'nao_resolvido' | 'resolvido' | 'todos'>('nao_resolvido');
  const [busca, setBusca] = useState('');
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [dialogIgnorar, setDialogIgnorar] = useState<Divergencia | null>(null);
  const [dialogAssociar, setDialogAssociar] = useState<Divergencia | null>(null);
  const [motivoIgnorar, setMotivoIgnorar] = useState('');
  const [colabParaAssociar, setColabParaAssociar] = useState('');

  const empresaId = empresaAtual?.id;

  const {
    data: divergencias = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['afdt-divergencias', empresaId, tipoFiltro, statusFiltro],
    enabled: !!empresaId,
    queryFn: async () => {
      let q = supabase
        .from('afdt_divergencias')
        .select('*')
        .eq('empresa_id', empresaId!)
        .order('created_at', { ascending: false })
        .limit(500);
      if (tipoFiltro !== 'todos') q = q.eq('tipo', tipoFiltro);
      if (statusFiltro === 'nao_resolvido') q = q.eq('resolvido', false);
      else if (statusFiltro === 'resolvido') q = q.eq('resolvido', true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Divergencia[];
    },
    staleTime: 30_000,
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores-min', empresaId],
    enabled: !!empresaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id,nome:nome_completo,matricula')
        .eq('empresa_id', empresaId!)
        .eq('status', 'ativo')
        .order('nome')
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ColaboradorMin[];
    },
    staleTime: 5 * 60_000,
  });

  // Realtime: refetch em INSERT/UPDATE/DELETE de divergências da empresa atual
  useEffect(() => {
    if (!empresaId) return;
    const channel = supabase
      .channel(`afdt-div-${empresaId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'afdt_divergencias', filter: `empresa_id=eq.${empresaId}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: ['afdt-divergencias'] });
          if (payload.eventType === 'INSERT') {
            const row = payload.new as Divergencia;
            if (row.tipo === 'sem_colaborador') {
              toast.warning('Nova divergência crítica AFDT (PIS não cadastrado)');
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [empresaId, qc]);

  const divergenciasFiltradas = useMemo(() => {
    if (!busca.trim()) return divergencias;
    const b = busca.toLowerCase().trim();
    return divergencias.filter(
      (d) => d.pis?.toLowerCase().includes(b) || d.observacao?.toLowerCase().includes(b) || d.id.includes(b)
    );
  }, [divergencias, busca]);

  const stats = useMemo(() => {
    const pending = divergencias.filter((d) => !d.resolvido);
    return {
      total: divergencias.length,
      naoResolvidas: pending.length,
      semColaborador: pending.filter((d) => d.tipo === 'sem_colaborador').length,
      semBatida: pending.filter((d) => d.tipo === 'sem_batida').length,
    };
  }, [divergencias]);

  const mIgnorar = useMutation({
    mutationFn: async ({ id, obs }: { id: string; obs: string }) => {
      const { error } = await (supabase as any).rpc('resolver_divergencia_afdt', {
        _divergencia_id: id, _observacao: obs || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Divergência resolvida');
      setDialogIgnorar(null);
      setMotivoIgnorar('');
      qc.invalidateQueries({ queryKey: ['afdt-divergencias'] });
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar divergência.')),
  });

  const mCriarBatida = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).rpc('criar_batida_da_divergencia_afdt', {
        _divergencia_id: id, _tipo: 'entrada',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Batida criada e divergência resolvida');
      qc.invalidateQueries({ queryKey: ['afdt-divergencias'] });
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar divergência.')),
  });

  const mAssociar = useMutation({
    mutationFn: async ({ id, colaboradorId }: { id: string; colaboradorId: string }) => {
      const { error } = await (supabase as any).rpc('associar_pis_colaborador_afdt', {
        _divergencia_id: id, _colaborador_id: colaboradorId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('PIS associado ao colaborador');
      setDialogAssociar(null);
      setColabParaAssociar('');
      qc.invalidateQueries({ queryKey: ['afdt-divergencias'] });
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Erro ao processar divergência.')),
  });

  const bulkIgnorar = async () => {
    const ids = Array.from(selecionadas);
    if (!ids.length) return;
    toast.info(`Resolvendo ${ids.length} divergências...`);
    const results = await Promise.allSettled(
      ids.map(id => (supabase as any).rpc('resolver_divergencia_afdt', {
        _divergencia_id: id, _observacao: 'Ignorada em massa',
      }))
    );
    const ok = results.filter((r) => r.status === 'fulfilled').length;
    toast.success(`${ok}/${ids.length} divergências resolvidas`);
    setSelecionadas(new Set());
    qc.invalidateQueries({ queryKey: ['afdt-divergencias'] });
  };

  const toggleSel = (id: string) => {
    const n = new Set(selecionadas);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelecionadas(n);
  };

  if (!empresaId) {
    return <div className="p-8 text-muted-foreground">Selecione uma empresa.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Divergências AFDT</h1>
          <p className="text-sm text-muted-foreground">
            Conciliação entre arquivo legal de ponto e batidas registradas no sistema.
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: AlertTriangle, color: 'text-muted-foreground' },
          { label: 'Não resolvidas', value: stats.naoResolvidas, icon: AlertTriangle, color: 'text-warning' },
          { label: 'Sem colaborador', value: stats.semColaborador, icon: UserPlus, color: 'text-destructive' },
          { label: 'Sem batida', value: stats.semBatida, icon: Clock, color: 'text-primary' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6 flex items-center gap-4">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Select value={tipoFiltro} onValueChange={(v) => setTipoFiltro(v as typeof tipoFiltro)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="sem_batida">Sem batida</SelectItem>
              <SelectItem value="sem_colaborador">Sem colaborador</SelectItem>
              <SelectItem value="duplicado">Duplicado</SelectItem>
              <SelectItem value="ok">OK</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as typeof statusFiltro)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nao_resolvido">Não resolvidas</SelectItem>
              <SelectItem value="resolvido">Resolvidas</SelectItem>
              <SelectItem value="todos">Todas</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por PIS ou observação..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          {selecionadas.size > 0 && (
            <Button variant="destructive" onClick={bulkIgnorar} className="gap-2">
              <Ban className="h-4 w-4" /> Ignorar {selecionadas.size}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : divergenciasFiltradas.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-success" />
              <p>Nenhuma divergência com os filtros atuais.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>PIS</TableHead>
                  <TableHead>Data/Hora AFDT</TableHead>
                  <TableHead>Δ (seg)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {divergenciasFiltradas.map((d) => (
                  <TableRow key={d.id} className={d.resolvido ? 'opacity-60' : ''}>
                    <TableCell>
                      {!d.resolvido && (
                        <input
                          type="checkbox"
                          checked={selecionadas.has(d.id)}
                          onChange={() => toggleSel(d.id)}
                          className="rounded border-border"
                          aria-label="Selecionar"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={TIPO_LABEL[d.tipo].variant}>{TIPO_LABEL[d.tipo].label}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{d.pis ? maskPisDisplay(d.pis) : '—'}</TableCell>
                    <TableCell className="tabular-nums text-xs">
                      {d.data_hora_afdt ? formatDateTime(d.data_hora_afdt) : '—'}
                    </TableCell>
                    <TableCell className="tabular-nums text-xs">{d.delta_segundos ?? '—'}</TableCell>
                    <TableCell>
                      {d.resolvido ? (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Resolvida
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!d.resolvido && (
                        <div className="flex justify-end gap-1">
                          {d.tipo === 'sem_batida' && d.colaborador_id && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => mCriarBatida.mutate(d.id)}
                              disabled={mCriarBatida.isPending}
                              className="gap-1"
                            >
                              <Clock className="h-3 w-3" /> Criar batida
                            </Button>
                          )}
                          {d.tipo === 'sem_colaborador' && d.pis && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setDialogAssociar(d)}
                              className="gap-1"
                            >
                              <UserPlus className="h-3 w-3" /> Associar
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setDialogIgnorar(d)} className="gap-1">
                            <Ban className="h-3 w-3" /> Ignorar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Ignorar */}
      <Dialog open={!!dialogIgnorar} onOpenChange={(v) => !v && setDialogIgnorar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ignorar divergência</DialogTitle>
            <DialogDescription>Registre um motivo para auditoria.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo (ex.: colaborador em férias no período)"
            value={motivoIgnorar}
            onChange={(e) => setMotivoIgnorar(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogIgnorar(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => dialogIgnorar && mIgnorar.mutate({ id: dialogIgnorar.id, obs: motivoIgnorar })}
              disabled={mIgnorar.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Associar */}
      <Dialog open={!!dialogAssociar} onOpenChange={(v) => !v && setDialogAssociar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Associar PIS ao colaborador</DialogTitle>
            <DialogDescription>
              PIS: <span className="font-mono">{maskPisDisplay(dialogAssociar?.pis)}</span>
            </DialogDescription>
          </DialogHeader>
          <Select value={colabParaAssociar} onValueChange={setColabParaAssociar}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um colaborador" />
            </SelectTrigger>
            <SelectContent>
              {colaboradores.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome} {c.matricula ? `(${c.matricula})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogAssociar(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                dialogAssociar &&
                colabParaAssociar &&
                mAssociar.mutate({ id: dialogAssociar.id, colaboradorId: colabParaAssociar })
              }
              disabled={!colabParaAssociar || mAssociar.isPending}
            >
              Associar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
