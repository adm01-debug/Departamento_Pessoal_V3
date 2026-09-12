/**
 * P5-086: MetabaseEmbed — iframe autenticado com indisponibilidade explícita
 *
 * Comportamento:
 *   1. Pede token JWT à Edge Function /functions/v1/metabase-embed
 *   2. Se Metabase OK → renderiza <iframe> com Signed Embed URL
 *   3. Se Metabase OFFLINE → não exibe números de demonstração como dados reais
 *   4. Refresh manual via botão
 *   5. Loading skeleton enquanto token é gerado
 *   6. Erro → toast + retry
 *
 * Cenários de falha:
 *   - Token expirado em iframe → reload via forceRefresh
 *   - Rede offline ou dados vazios → estado explícito de indisponibilidade
 *   - Erro de rede → retry manual, sem expor detalhes técnicos ao usuário
 */

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, AlertCircle, WifiOff } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { loggerService } from '@/services/loggerService';

// ── Tipos ─────────────────────────────────────────────────────
interface EmbedResponse {
  metabaseOk: boolean;
  token?: string;
  expiresAt?: number;
  dashboardUrl?: string;
  message?: string;
}

interface MetabaseEmbedProps {
  dashboardId: number;
  title?: string;
  height?: string;
  filters?: Record<string, string | string[]>;
  /** Comportamento de refresh automático (ms) */
  autoRefreshMs?: number;
}

function MetabaseUnavailable({ message }: { message?: string }) {
  return (
    <Card className="border-red-500/20 bg-red-500/5">
      <CardContent className="p-8 text-center">
        <WifiOff className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <p className="text-body font-medium">Dashboard indisponível</p>
        <p className="text-caption text-muted-foreground mt-1">
          {message ?? 'Não foi possível obter os dados do Metabase.'}
        </p>
        <p className="text-caption text-muted-foreground mt-1">
          Nenhum valor estimado ou de demonstração é exibido neste estado.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Skeleton de loading ────────────────────────────────────────
function EmbedSkeleton({ height }: { height: string }) {
  return (
    <Card className="border-border/30">
      <CardContent className="p-4">
        <Skeleton className="h-4 w-48 mb-4" />
        <Skeleton className="h-full" style={{ height: `calc(${height} - 80px)` }} />
      </CardContent>
    </Card>
  );
}

// ── MetabaseEmbed — componente principal ─────────────────────────
export function MetabaseEmbed({
  dashboardId,
  title,
  height = '700px',
  filters = {},
  autoRefreshMs,
}: MetabaseEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // ── Query: buscar token de embed ──────────────────────────────
  const {
    data: embedData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<EmbedResponse, Error>({
    queryKey: ['metabase-embed', dashboardId, filters],
    queryFn: async () => {
      const res = await fetch('/functions/v1/metabase-embed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getAccessToken()}`,
        },
        body: JSON.stringify({ dashboardId, params: filters }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${body}`);
      }

      const json: EmbedResponse = await res.json();
      return json;
    },
    staleTime: 3_000_000, // 50min — token dura 3h
    gcTime: 10_000_000,
    retry: (count, err) => {
      // Retry apenas 2x, apenas se for erro de rede
      if (count >= 2) return false;
      return err?.message?.includes('fetch') ?? false;
    },
  });

  // ── Auto-refresh ──────────────────────────────────────────────
  useEffect(() => {
    if (!autoRefreshMs || autoRefreshMs <= 0) return;
    const interval = setInterval(() => refetch(), autoRefreshMs);
    return () => clearInterval(interval);
  }, [autoRefreshMs, refetch]);

  // ── Force refresh do iframe quando token muda ──────────────────
  useEffect(() => {
    if (embedData?.token && iframeRef.current) {
      const url = `${embedData.dashboardUrl}#${embedData.token}`;
      iframeRef.current.src = url;
    }
  }, [embedData?.dashboardUrl, embedData?.token]);

  // ── Render ─────────────────────────────────────────────────────
  const isUnavailable = !embedData?.metabaseOk;
  const iframeUrl =
    embedData?.metabaseOk && embedData.dashboardUrl ? `${embedData.dashboardUrl}#${embedData.token}` : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header: título + controles */}
      <div className="flex items-center justify-between">
        <h3 className="text-h3 font-display font-semibold">{title ?? `Dashboard ${dashboardId}`}</h3>
        <div className="flex items-center gap-2">
          {/* Badge de status */}
          {embedData && (
            <Badge
              variant={isUnavailable ? 'destructive' : 'default'}
              className={cn(
                'text-xs',
                isUnavailable
                  ? 'bg-red-500/10 text-red-500 border-red-500/20'
                  : 'bg-green-500/10 text-green-500 border-green-500/20'
              )}
            >
              {isUnavailable ? (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Indisponível
                </>
              ) : (
                'Metabase'
              )}
            </Badge>
          )}

          {/* Refresh manual */}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-8 gap-1.5">
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Erro */}
      {error && (
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-3 flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-500">Erro ao carregar dashboard</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Não foi possível obter dados do Metabase neste momento.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {isLoading && <EmbedSkeleton height={height} />}

      {/* Indisponibilidade: nunca substituir dados reais por valores estáticos. */}
      {!isLoading && isUnavailable && <MetabaseUnavailable message={embedData?.message} />}

      {/* Iframe Metabase */}
      {!isLoading && !isUnavailable && iframeUrl && (
        <Card className="border-border/30 shadow-elevated overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-indigo-500 to-purple-500" />
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            title={title ?? `Dashboard ${dashboardId}`}
            allowFullScreen
            className="w-full border-0"
            style={{ height }}
            onError={() => {
              loggerService.warn('[MetabaseEmbed] Iframe error — refreshing token');
              void refetch();
            }}
          />
        </Card>
      )}
    </div>
  );
}

// ── Helper: obter access token do Supabase ──────────────────────
async function getAccessToken(): Promise<string> {
  const { supabase } = await import('@/integrations/supabase/client');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? '';
}
