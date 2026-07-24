import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PageTitle } from '@/components/PageTitle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical' | string;
  user_id: string | null;
  ip_address: string | null;
  details: Record<string, unknown> | null;
  resolved: boolean | null;
  resolved_at: string | null;
  created_at: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-black',
  low: 'bg-muted text-muted-foreground',
};

function SeverityBadge({ severity }: { severity: string }) {
  const cls = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.low;
  return <Badge className={cls}>{severity.toUpperCase()}</Badge>;
}

function ResolveDialog({ alertId, onDone }: { alertId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('resolve_security_alert', {
        _alert_id: alertId,
        _note: note || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Alerta resolvido');
      qc.invalidateQueries({ queryKey: ['security-alerts'] });
      setOpen(false);
      setNote('');
      onDone();
    },
    onError: (err: Error) => toast.error(safeErrorMessage(err, 'Falha ao resolver alerta.')),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CheckCircle2 className="mr-1 h-4 w-4" /> Resolver
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolver alerta de segurança</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor="note" className="text-sm text-muted-foreground">
            Nota de resolução (opcional — será registrada na trilha de auditoria)
          </label>
          <Input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex: Falso positivo — usuário fez bulk aprovar legítimo"
            maxLength={500}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Resolvendo...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminSecurityPage() {
  const [showResolved, setShowResolved] = useState(false);

  const { data: alerts = [], isLoading, refetch, isRefetching } = useQuery<SecurityAlert[]>({
    queryKey: ['security-alerts', showResolved],
    queryFn: async () => {
      let q = supabase
        .from('security_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (!showResolved) q = q.eq('resolved', false);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as SecurityAlert[];
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const openCount = alerts.filter((a) => !a.resolved).length;
  const criticalCount = alerts.filter((a) => !a.resolved && a.severity === 'critical').length;

  return (
    <div className="container mx-auto space-y-6 p-6">
      <PageTitle
        title="Central de Segurança"
        description="Alertas de anomalias detectadas automaticamente pelo sistema"
      />
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-6 w-6 text-primary" aria-hidden />
        <h1 className="text-2xl font-bold">Central de Segurança</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Alertas abertos</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{openCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Críticos</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-destructive">{criticalCount}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total (últimos 200)</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{alerts.length}</CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant={showResolved ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowResolved((v) => !v)}
        >
          {showResolved ? 'Ocultar resolvidos' : 'Mostrar resolvidos'}
        </Button>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`mr-1 h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando alertas...</p>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-primary" />
            <p className="text-lg font-medium">Nenhum alerta {showResolved ? '' : 'aberto'}</p>
            <p className="text-sm text-muted-foreground">
              O detector de anomalias está monitorando mudanças de status a cada 10 minutos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => (
            <Card key={a.id} className={a.resolved ? 'opacity-60' : ''}>
              <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-1 h-5 w-5 text-orange-500" aria-hidden />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={a.severity} />
                      <span className="font-mono text-sm">{a.type}</span>
                      {a.resolved && <Badge variant="secondary">Resolvido</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: ptBR })}
                      {a.user_id ? ` · usuário ${a.user_id.slice(0, 8)}...` : ''}
                    </p>
                    {a.details && (
                      <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
                        {JSON.stringify(a.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
                {!a.resolved && <ResolveDialog alertId={a.id} onDone={() => refetch()} />}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
