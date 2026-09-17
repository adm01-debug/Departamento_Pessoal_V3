import { PageTitle } from '@/components/PageTitle';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, ShieldCheck, AlertTriangle, Activity, Hourglass } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface IdempotencyRow {
  endpoint: string;
  total_24h: number;
  completed_24h: number;
  pending_24h: number;
  failed_24h: number;
  conflict_24h: number;
  failure_rate_pct: number | null;
  last_seen_at: string | null;
}

export default function AdminIdempotenciaPage() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['idempotency-health'],
    queryFn: async (): Promise<IdempotencyRow[]> => {
      const { data, error } = await supabase.rpc('get_idempotency_health');
      if (error) throw error;
      return (data ?? []) as IdempotencyRow[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const totals = (data ?? []).reduce(
    (acc, r) => ({
      total: acc.total + Number(r.total_24h || 0),
      completed: acc.completed + Number(r.completed_24h || 0),
      pending: acc.pending + Number(r.pending_24h || 0),
      failed: acc.failed + Number(r.failed_24h || 0),
      conflict: acc.conflict + Number(r.conflict_24h || 0),
    }),
    { total: 0, completed: 0, pending: 0, failed: 0, conflict: 0 },
  );

  const failureRate =
    totals.total > 0 ? ((totals.failed / totals.total) * 100).toFixed(2) : '0.00';

  return (
    <div className="space-y-6 py-4 md:py-6">
      <div className="flex items-center justify-between">
        <PageTitle title="Idempotência — Saúde Operacional" />
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Activity className="h-5 w-5 text-primary" />}
          label="Chamadas 24h"
          value={totals.total.toLocaleString('pt-BR')}
          loading={isLoading}
        />
        <StatCard
          icon={<ShieldCheck className="h-5 w-5 text-emerald-500" />}
          label="Completadas"
          value={totals.completed.toLocaleString('pt-BR')}
          loading={isLoading}
        />
        <StatCard
          icon={<Hourglass className="h-5 w-5 text-amber-500" />}
          label="Pendentes / Conflitos"
          value={`${totals.pending} / ${totals.conflict}`}
          loading={isLoading}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
          label="Taxa de Falha"
          value={`${failureRate}%`}
          loading={isLoading}
          highlight={Number(failureRate) > 1}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Métricas por Endpoint</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !data || data.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhuma chamada idempotente registrada nas últimas 24h.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead className="text-right">Total 24h</TableHead>
                    <TableHead className="text-right">✅ Completed</TableHead>
                    <TableHead className="text-right">⏳ Pending</TableHead>
                    <TableHead className="text-right">❌ Failed</TableHead>
                    <TableHead className="text-right">⚠️ Conflict 409</TableHead>
                    <TableHead className="text-right">Falha %</TableHead>
                    <TableHead>Última chamada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => {
                    const rate = Number(row.failure_rate_pct ?? 0);
                    return (
                      <TableRow key={row.endpoint}>
                        <TableCell className="font-mono text-sm">{row.endpoint}</TableCell>
                        <TableCell className="text-right">{row.total_24h}</TableCell>
                        <TableCell className="text-right text-emerald-600">
                          {row.completed_24h}
                        </TableCell>
                        <TableCell className="text-right text-amber-600">
                          {row.pending_24h}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {row.failed_24h}
                        </TableCell>
                        <TableCell className="text-right">{row.conflict_24h}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={rate > 5 ? 'destructive' : rate > 1 ? 'secondary' : 'outline'}
                          >
                            {rate.toFixed(2)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {row.last_seen_at
                            ? formatDistanceToNow(new Date(row.last_seen_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })
                            : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading?: boolean;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? 'border-destructive/50' : ''}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-muted p-2">{icon}</div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-6 w-20" />
          ) : (
            <p className="text-xl font-semibold">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
