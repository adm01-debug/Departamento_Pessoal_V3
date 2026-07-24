import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { BarChart3, PieChart as PieChartIcon, TrendingUp, Layers } from "lucide-react";

interface TelemetryRow {
  id: string;
  operation: string;
  table_name: string | null;
  rpc_name: string | null;
  duration_ms: number;
  severity: string;
  created_at: string;
}

interface TelemetryChartsProps {
  rows: TelemetryRow[];
  timeFilter: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  slow: "hsl(45, 93%, 47%)",
  very_slow: "hsl(0, 84%, 60%)",
  error: "hsl(0, 72%, 51%)",
  normal: "hsl(142, 71%, 45%)",
};

function formatBucketTime(ts: number, timeFilter: string): string {
  const d = new Date(ts);
  if (timeFilter === "7d") {
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  }
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function TelemetryCharts({ rows, timeFilter }: TelemetryChartsProps) {
  const bucketMs = timeFilter === "1h" ? 5 * 60 * 1000
    : timeFilter === "6h" ? 30 * 60 * 1000
    : timeFilter === "24h" ? 60 * 60 * 1000
    : 6 * 60 * 60 * 1000;

  // 1. Alertas ao longo do tempo (stacked bar)
  const timeSeriesData = useMemo(() => {
    if (rows.length === 0) return [];
    const buckets = new Map<number, { slow: number; very_slow: number; error: number }>();
    for (const r of rows) {
      const ts = new Date(r.created_at).getTime();
      const bucket = Math.floor(ts / bucketMs) * bucketMs;
      const prev = buckets.get(bucket) || { slow: 0, very_slow: 0, error: 0 };
      if (r.severity === "slow") prev.slow++;
      else if (r.severity === "very_slow") prev.very_slow++;
      else if (r.severity === "error") prev.error++;
      buckets.set(bucket, prev);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([ts, data]) => ({
        time: formatBucketTime(ts, timeFilter),
        ts,
        ...data,
      }));
  }, [rows, timeFilter, bucketMs]);

  // 2. Duração Média / Máxima (area chart)
  const durationData = useMemo(() => {
    if (rows.length === 0) return [];
    const buckets = new Map<number, { total: number; count: number; max: number }>();
    for (const r of rows) {
      const ts = new Date(r.created_at).getTime();
      const bucket = Math.floor(ts / bucketMs) * bucketMs;
      const prev = buckets.get(bucket) || { total: 0, count: 0, max: 0 };
      prev.total += r.duration_ms;
      prev.count++;
      prev.max = Math.max(prev.max, r.duration_ms);
      buckets.set(bucket, prev);
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([ts, d]) => ({
        time: formatBucketTime(ts, timeFilter),
        mediaMs: Math.round(d.total / d.count),
        maxMs: d.max,
      }));
  }, [rows, timeFilter, bucketMs]);

  // 3. Alertas por tabela (horizontal bar)
  const tableAlertData = useMemo(() => {
    if (rows.length === 0) return [];
    const stats = new Map<string, number>();
    for (const r of rows) {
      const key = r.rpc_name || r.table_name || "unknown";
      stats.set(key, (stats.get(key) || 0) + 1);
    }
    return [...stats.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, alertas]) => ({ name, alertas }));
  }, [rows]);

  // 4. Severity distribution (pie)
  const severityDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      counts[r.severity] = (counts[r.severity] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [rows]);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Row 1: Alertas no tempo + Distribuição */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Alertas ao Longo do Tempo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Bar dataKey="slow" stackId="a" fill={SEVERITY_COLORS.slow} name="Lentas" />
                <Bar dataKey="very_slow" stackId="a" fill={SEVERITY_COLORS.very_slow} name="Muito Lentas" />
                <Bar dataKey="error" stackId="a" fill={SEVERITY_COLORS.error} name="Erros" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              Distribuição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={severityDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {severityDistribution.map((entry) => (
                    <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || "hsl(var(--muted))"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Duração Média/Máxima + Alertas por Tabela */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Duração Média / Máxima
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={durationData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}s` : `${v}ms`} />
                <Tooltip
                  formatter={(value: any) => Number(value) >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Area type="monotone" dataKey="maxMs" stroke={SEVERITY_COLORS.very_slow} fill={SEVERITY_COLORS.very_slow} fillOpacity={0.15} name="Máxima" />
                <Area type="monotone" dataKey="mediaMs" stroke={SEVERITY_COLORS.slow} fill={SEVERITY_COLORS.slow} fillOpacity={0.2} name="Média" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Alertas por Tabela
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tableAlertData} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={55} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="alertas" fill={SEVERITY_COLORS.very_slow} name="Alertas" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
