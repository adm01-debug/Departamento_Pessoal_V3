import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, DatabaseBackup } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface BackupRunRow {
  id: string;
  status: 'success' | 'partial' | 'error' | 'skipped';
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  records_count: number | null;
  tables_count: number | null;
  error_message: string | null;
}

export interface StaleBackupRow {
  empresa_id: string | null;
  empresa_nome: string | null;
  last_backup_at: string;
  hours_since: number;
  records_backup: number | null;
  tables_backup: number | null;
}

// Espelha o teto do painel: só as execuções mais recentes interessam.
export const BACKUP_RUNS_LIMIT = 5;

const STATUS_LABEL: Record<string, string> = {
  success: 'sucesso',
  partial: 'parcial',
  error: 'erro',
  skipped: 'ignorado',
};

export function BackupHealthSection() {
  const runs = useQuery({
    queryKey: ['admin-op', 'backup-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_logs')
        .select('id,status,started_at,finished_at,duration_ms,records_count,tables_count,error_message')
        .order('started_at', { ascending: false })
        .limit(BACKUP_RUNS_LIMIT);
      if (error) throw error;
      return (data ?? []) as BackupRunRow[];
    },
    staleTime: 60_000,
  });

  const stale = useQuery({
    queryKey: ['admin-op', 'backup-stale'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('alert_stale_backup');
      if (error) throw error;
      return (data ?? []) as StaleBackupRow[];
    },
    staleTime: 60_000,
  });

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <DatabaseBackup className="h-4 w-4 text-primary" />
          Backups
        </CardTitle>
        <Badge variant="outline">{runs.data?.length ?? 0} execuções</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {stale.data && stale.data.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="space-y-0.5 text-xs">
              <p className="font-medium">Backup atrasado (mais de 24h)</p>
              {stale.data.map((s) => (
                <p key={s.empresa_id ?? 'global'} className="text-muted-foreground">
                  {s.empresa_nome ?? 'Sem empresa vinculada'} — último backup há {s.hours_since}h
                </p>
              ))}
            </div>
          </div>
        )}

        {runs.isLoading ? (
          <Skeleton className="h-24" />
        ) : runs.isError ? (
          <p className="py-6 text-center text-sm text-destructive">Não foi possível carregar o log de backups.</p>
        ) : !runs.data?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma execução de backup registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {runs.data.map((r) => (
              <div key={r.id} className="rounded-md border border-border/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={r.status === 'success' ? 'secondary' : r.status === 'error' ? 'destructive' : 'outline'}
                    className="text-[10px] uppercase"
                  >
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.started_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {Number(r.records_count ?? 0).toLocaleString('pt-BR')} registros · {Number(r.tables_count ?? 0)}{' '}
                  tabelas
                  {r.duration_ms !== null && r.duration_ms !== undefined
                    ? ` · ${(Number(r.duration_ms) / 1000).toFixed(1)}s`
                    : ''}
                </p>
                {r.error_message && <p className="mt-1 truncate text-xs text-destructive">{r.error_message}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
