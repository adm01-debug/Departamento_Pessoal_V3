import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollText, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface AuditRow {
  id: string;
  source_table: string;
  source_id: string | null;
  empresa_id: string | null;
  user_id: string | null;
  action: string | null;
  entity: string | null;
  entity_id: string | null;
  payload: any;
  ip_address: string | null;
  occurred_at: string;
}

// Limite máximo de eventos por chamada (espelha o teto da RPC search_audit_unified).
export const AUDIT_UNIFIED_LIMIT = 100;

export function UnifiedAuditSection() {
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [enabled, setEnabled] = useState(false);

  const audit = useQuery({
    queryKey: ['admin-op', 'audit-unified', sourceFilter],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('search_audit_unified', {
        _source_table: sourceFilter || null,
        _limit: AUDIT_UNIFIED_LIMIT,
      });
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
    staleTime: 30_000,
  });

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <ScrollText className="h-4 w-4 text-primary" />
          Log de Auditoria Unificado (30d)
        </CardTitle>
        <Badge variant="outline">{`${audit.data?.length ?? 0} eventos`}</Badge>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
          <Input
            aria-label="Filtro por tabela de origem"
            placeholder="Filtrar por tabela (ex: folha_auditoria) — vazio = todas"
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value.trim())}
            className="max-w-sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEnabled(true);
              audit.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Buscar
          </Button>
        </div>
        {!enabled ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Clique em Buscar para carregar os últimos {AUDIT_UNIFIED_LIMIT} eventos consolidados.
          </p>
        ) : audit.isLoading ? (
          <Skeleton className="h-24" />
        ) : audit.isError ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Falha ao carregar log unificado (requer admin).
          </p>
        ) : !audit.data?.length ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhum evento no período.</p>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto" data-testid="audit-list">
            {audit.data.map((r) => (
              <div key={r.id} className="p-3 rounded-md border border-border/50 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {r.source_table}
                  </Badge>
                  {r.action && (
                    <Badge variant="secondary" className="text-[10px]">
                      {r.action}
                    </Badge>
                  )}
                  {r.entity && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {r.entity}
                      {r.entity_id ? `#${r.entity_id}` : ''}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {formatDistanceToNow(new Date(r.occurred_at), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
                {(r.user_id || r.ip_address) && (
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {r.user_id && <>user: {r.user_id.slice(0, 8)}… </>}
                    {r.ip_address && <>· ip: {r.ip_address}</>}
                  </p>
                )}
                {r.payload && Object.keys(r.payload).length > 0 && (
                  <pre className="text-[11px] text-muted-foreground mt-1 font-mono truncate overflow-hidden">
                    {JSON.stringify(r.payload).slice(0, 240)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
