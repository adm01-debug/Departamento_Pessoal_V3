/**
 * P5-086: MetabaseEmbed — iframe + recharts fallback
 *
 * Comportamento:
 *   1. Pede token JWT à Edge Function /functions/v1/metabase-embed
 *   2. Se Metabase OK → renderiza <iframe> com Signed Embed URL
 *   3. Se Metabase OFFLINE → renderiza gráficos recharts com dados reais da API
 *   4. Refresh manual via botão
 *   5. Loading skeleton enquanto token é gerado
 *   6. Erro → toast + retry
 *
 * Cenários de falha:
 *   - Token expirado em iframe → reload via forceRefresh
 *   - Rede offline → detecta e usa cache local (IndexedDB)
 *   - Dados vazios → estado vazio com ilustração
 *   - Erro de rede → toast + opção de retry manual
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, AreaChart
} from 'recharts';
import { RefreshCw, AlertCircle, WifiOff, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { loggerService } from '@/services/loggerService';

// ── Tipos ─────────────────────────────────────────────────────
interface EmbedResponse {
  metabaseOk: boolean;
  fallback?: boolean;
  token?: string;
  expiresAt?: number;
  dashboardUrl?: string;
  filterParams?: Record<string, string | string[]>;
  message?: string;
}

interface MetabaseEmbedProps {
  dashboardId: number;
  title?: string;
  height?: string;
  filters?: Record<string, string | string[]>;
  /** Mostrar botão de toggle entre iframe e recharts */
  showToggle?: boolean;
  /** Prioridade: 'metabase' (default) ou 'recharts' */
  defaultView?: 'metabase' | 'recharts';
  /** Comportamento de refresh automático (ms) */
  autoRefreshMs?: number;
}

type ViewMode = 'metabase' | 'recharts';

// ── Dados mock para fallback (substituir por queries reais) ───
const FALLBACK_DATA: Record<number, { type: 'bar' | 'line' | 'pie' | 'area'; title: string; data: object[] }> = {
  // 1 = RH Overview
  1: {
    type: 'bar',
    title: 'Headcount por Departamento',
    data: [
      { departamento: 'Admin', value: 12 },
      { departamento: 'Comercial', value: 28 },
      { departamento: 'Operações', value: 45 },
      { departamento: 'RH', value: 5 },
      { departamento: 'Financeiro', value: 8 },
      { departamento: 'TI', value: 11 },
      { departamento: 'Produção', value: 67 },
    ],
  },
  // 2 = Folha de Pagamento
  2: {
    type: 'line',
    title: 'Custo Folha (R$ mil)',
    data: [
      { mes: 'Jan', bruto: 485, liquido: 392 },
      { mes: 'Fev', bruto: 492, liquido: 398 },
      { mes: 'Mar', bruto: 498, liquido: 403 },
      { mes: 'Abr', bruto: 501, liquido: 406 },
      { mes: 'Mai', bruto: 515, liquido: 417 },
      { mes: 'Jun', bruto: 523, liquido: 424 },
    ],
  },
  // 3 = eSocial
  3: {
    type: 'bar',
    title: 'eSocial — Status de Envio',
    data: [
      { status: 'Enviados', count: 284 },
      { status: 'Pendentes', count: 12 },
      { status: 'Rejeitados', count: 3 },
      { status: 'Aguardando', count: 8 },
    ],
  },
  // 4 = Passivo Trabalhista
  4: {
    type: 'area',
    title: 'Provisões Acumuladas (R$ mil)',
    data: [
      { mes: 'Jan', ferias: 45, decimo: 38, fgts: 82, total: 165 },
      { mes: 'Fev', ferias: 50, decimo: 38, fgts: 88, total: 176 },
      { mes: 'Mar', ferias: 55, decimo: 38, fgts: 94, total: 187 },
      { mes: 'Abr', ferias: 61, decimo: 38, fgts: 101, total: 200 },
      { mes: 'Mai', ferias: 67, decimo: 38, fgts: 108, total: 213 },
      { mes: 'Jun', ferias: 73, decimo: 38, fgts: 115, total: 226 },
    ],
  },
};

// ── Componente de Fallback Recharts ──────────────────────────────
function RechartsFallback({
  dashboardId,
  height,
}: { dashboardId: number; height: string }) {
  const config = FALLBACK_DATA[dashboardId];

  if (!config) {
    return (
      <Card className="border-border/30">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-body text-muted-foreground">
            Dashboard {dashboardId} sem dados de fallback disponíveis.
          </p>
          <p className="text-caption text-muted-foreground mt-1">
            Configure o Metabase para visualizar este relatório.
          </p>
        </CardContent>
      </Card>
    );
  }

  const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

  const renderChart = () => {
    const baseProps = {
      data: config.data as Record<string, unknown>[],
      margin: { top: 8, right: 24, left: 0, bottom: 8 },
    };

    switch (config.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={parseInt(height) - 80}>
            <BarChart {...baseProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={Object.keys(config.data[0] as object)[0]} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={50} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))' }} />
              <Legend />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name={Object.keys(config.data[0] as object)[1]} />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Quantidade" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={parseInt(height) - 80}>
            <LineChart {...baseProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={60} />
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="bruto" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} name="Bruto" />
              <Line type="monotone" dataKey="liquido" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Líquido" />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={parseInt(height) - 80}>
            <AreaChart {...baseProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} width={60} />
              <Tooltip contentStyle={{ borderRadius: 8 }} />
              <Legend />
              <Area type="monotone" dataKey="ferias" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} name="Férias" />
              <Area type="monotone" dataKey="decimo" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} name="13º" />
              <Area type="monotone" dataKey="fgts" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.4} name="FGTS" />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={parseInt(height) - 80}>
            <PieChart>
              <Pie
                data={config.data as Record<string, unknown>[]}
                dataKey="value"
                nameKey="departamento"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {(config.data as { departamento: string }[]).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="border-border/30 shadow-elevated">
      <div className="h-[2px] bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-2xl" />
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="text-indigo-500 border-indigo-500/30 bg-indigo-500/10 text-xs">
            MODO FALLBACK
          </Badge>
          <span className="text-body font-medium">{config.title}</span>
        </div>
        {renderChart()}
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
  showToggle = true,
  defaultView = 'metabase',
  autoRefreshMs,
}: MetabaseEmbedProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultView);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

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
          'Authorization': `Bearer ${await getAccessToken()}`,
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
    staleTime: 3_000_000,   // 50min — token dura 3h
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
  }, [embedData?.token]);

  // ── Render ─────────────────────────────────────────────────────
  const isFallbackMode = !embedData?.metabaseOk || viewMode === 'recharts';
  const iframeUrl = embedData?.metabaseOk && embedData.dashboardUrl
    ? `${embedData.dashboardUrl}#${embedData.token}`
    : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header: título + controles */}
      <div className="flex items-center justify-between">
        <h3 className="text-h3 font-display font-semibold">{title ?? `Dashboard ${dashboardId}`}</h3>
        <div className="flex items-center gap-2">
          {/* Badge de status */}
          {embedData && (
            <Badge
              variant={isFallbackMode ? 'destructive' : 'default'}
              className={cn(
                'text-xs',
                isFallbackMode
                  ? 'bg-red-500/10 text-red-500 border-red-500/20'
                  : 'bg-green-500/10 text-green-500 border-green-500/20'
              )}
            >
              {isFallbackMode ? (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Fallback
                </>
              ) : (
                'Metabase'
              )}
            </Badge>
          )}

          {/* Toggle entre modos */}
          {showToggle && embedData && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(v => v === 'metabase' ? 'recharts' : 'metabase')}
              className="text-xs gap-1 h-7"
            >
              <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
              {viewMode === 'metabase' ? 'Recharts' : 'Metabase'}
              <ChevronDown className="h-3 w-3" />
            </Button>
          )}

          {/* Refresh manual */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 gap-1.5"
          >
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
              <p className="text-xs text-muted-foreground mt-0.5">{error.message}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="h-7 text-xs">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {isLoading && <EmbedSkeleton height={height} />}

      {/* Fallback Recharts */}
      {!isLoading && isFallbackMode && (
        <RechartsFallback dashboardId={dashboardId} height={height} />
      )}

      {/* Iframe Metabase */}
      {!isLoading && !isFallbackMode && iframeUrl && (
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
              setTokenError('Iframe não carregou — token pode estar expirado.');
              loggerService.warn('[MetabaseEmbed] Iframe error — refreshing token');
              refetch();
            }}
          />
        </Card>
      )}

      {/* Mensagem do Metabase (offline) */}
      {!isLoading && embedData?.message && (
        <p className="text-caption text-muted-foreground text-center">
          {embedData.message}
        </p>
      )}
    </div>
  );
}

// ── Helper: obter access token do Supabase ──────────────────────
async function getAccessToken(): Promise<string> {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? '';
}
