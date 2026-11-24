import { PageTitle } from '@/components/PageTitle';
import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabaseBase } from "@/integrations/supabase/client";
import { Activity, RefreshCw, Trash2, Download, FileText } from "lucide-react";
import { TelemetryCharts } from "@/components/admin/telemetry/TelemetryCharts";
import { TelemetryStatsCards } from "@/components/admin/telemetry/TelemetryStatsCards";
import { TelemetryTopOffenders } from "@/components/admin/telemetry/TelemetryTopOffenders";
import { TelemetryTable } from "@/components/admin/telemetry/TelemetryTable";
import { TelemetryFilters } from "@/components/admin/telemetry/TelemetryFilters";
import { toast } from "sonner";

interface TelemetryRow {
  id: string;
  operation: string;
  table_name: string | null;
  rpc_name: string | null;
  duration_ms: number;
  record_count: number | null;
  query_limit: number | null;
  query_offset: number | null;
  count_mode: string | null;
  severity: string;
  error_message: string | null;
  user_id: string | null;
  created_at: string;
}

type SeverityFilter = "all" | "slow" | "very_slow" | "error";
type TimeFilter = "1h" | "6h" | "24h" | "7d" | "custom";

export default function AdminTelemetriaPage() {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("24h");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();

  const getTimeThreshold = (): { from: string; to: string } => {
    const now = new Date();
    const to = now.toISOString();
    if (timeFilter === "custom" && customDateFrom) {
      const fromDate = new Date(customDateFrom);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = customDateTo ? new Date(customDateTo) : new Date();
      toDate.setHours(23, 59, 59, 999);
      return { from: fromDate.toISOString(), to: toDate.toISOString() };
    }
    const ms: Record<string, number> = { "1h": 3600000, "6h": 21600000, "24h": 86400000, "7d": 604800000 };
    return { from: new Date(now.getTime() - (ms[timeFilter] || 86400000)).toISOString(), to };
  };

  const { data: rows = [], isLoading, refetch, isRefetching } = useQuery<TelemetryRow[]>({
    queryKey: ["query-telemetry", severityFilter, timeFilter, customDateFrom?.toISOString(), customDateTo?.toISOString()],
    queryFn: async () => {
      const { from, to } = getTimeThreshold();
      let query = supabaseBase.from("query_telemetry").select("*").gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false }).limit(500);
      if (severityFilter !== "all") query = query.eq("severity", severityFilter);
      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as TelemetryRow[]) || [];
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const getPeriodLabel = () => {
    if (timeFilter === "custom" && customDateFrom) {
      return `${format(customDateFrom, "dd/MM/yyyy")} a ${customDateTo ? format(customDateTo, "dd/MM/yyyy") : "hoje"}`;
    }
    const labels: Record<string, string> = { "1h": "Última hora", "6h": "Últimas 6h", "24h": "Últimas 24h", "7d": "Últimos 7 dias" };
    return labels[timeFilter] || timeFilter;
  };

  const handleCleanup = async () => {
    const threshold = new Date(Date.now() - 604800000).toISOString();
    const { error } = await supabaseBase.from("query_telemetry").delete().lt("created_at", threshold);
    if (error) toast.error("Erro ao limpar dados antigos");
    else { toast.success("Dados com mais de 7 dias removidos"); refetch(); }
  };

  const handleExportCSV = () => {
    if (!rows.length) { toast.error("Nenhum dado para exportar"); return; }
    const headers = ["Data/Hora", "Operação", "Tabela/RPC", "Duração (ms)", "Severidade", "Registros", "Limit", "Offset", "Count Mode", "Erro"];
    const csvRows = rows.map(r => [new Date(r.created_at).toLocaleString("pt-BR"), r.operation, r.table_name || r.rpc_name || "-", r.duration_ms, r.severity, r.record_count ?? "-", r.query_limit ?? "-", r.query_offset ?? "-", r.count_mode ?? "-", `"${(r.error_message || "").replace(/"/g, '""')}"`]);
    const blob = new Blob(["\uFEFF" + [headers.join(";"), ...csvRows.map(r => r.join(";"))].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `telemetria_${format(new Date(), "yyyy-MM-dd")}_${timeFilter}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} registros exportados para CSV`);
  };

  const handleExportPDF = async () => {
    if (!rows.length) { toast.error("Nenhum dado para exportar"); return; }
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      doc.setFontSize(16); doc.text("Telemetria de Queries", 14, 15);
      doc.setFontSize(9); doc.text(`Exportado em ${new Date().toLocaleString("pt-BR")} · Período: ${getPeriodLabel()} · ${rows.length} registros`, 14, 22);
      autoTable(doc, {
        head: [["Data/Hora", "Operação", "Tabela/RPC", "Duração", "Severidade", "Records", "Limit", "Offset", "Count", "Erro"]],
        body: rows.map(r => [new Date(r.created_at).toLocaleString("pt-BR"), r.operation, r.rpc_name || r.table_name || "-", r.duration_ms >= 1000 ? `${(r.duration_ms / 1000).toFixed(1)}s` : `${r.duration_ms}ms`, r.severity === "very_slow" ? "Muito Lenta" : r.severity === "slow" ? "Lenta" : r.severity === "error" ? "Erro" : r.severity, r.record_count ?? "-", r.query_limit ?? "-", r.query_offset ?? "-", r.count_mode ?? "-", (r.error_message || "-").substring(0, 40)]),
        startY: 28, styles: { fontSize: 7, cellPadding: 1.5 }, headStyles: { fillColor: [41, 37, 36], textColor: 255 }, alternateRowStyles: { fillColor: [245, 245, 244] },
      });
      doc.save(`telemetria_${format(new Date(), "yyyy-MM-dd")}_${timeFilter}.pdf`);
      toast.success("PDF exportado com sucesso");
    } catch { toast.error("Erro ao gerar PDF"); }
  };

  // Stats
  const verySlow = rows.filter(r => r.severity === "very_slow").length;
  const slow = rows.filter(r => r.severity === "slow").length;
  const errors = rows.filter(r => r.severity === "error").length;
  const avgDuration = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.duration_ms, 0) / rows.length) : 0;

  // Top offenders
  const tableStats = new Map<string, { count: number; totalMs: number; maxMs: number }>();
  for (const r of rows) {
    const key = r.rpc_name || r.table_name || "unknown";
    const prev = tableStats.get(key) || { count: 0, totalMs: 0, maxMs: 0 };
    tableStats.set(key, { count: prev.count + 1, totalMs: prev.totalMs + r.duration_ms, maxMs: Math.max(prev.maxMs, r.duration_ms) });
  }
  const topOffenders = [...tableStats.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 8);

  return (
    <>
      <PageTitle title="Telemetria" description="Monitoramento de performance e queries" />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-medium">Telemetria de Queries</h1>
              <p className="text-sm text-muted-foreground">Monitoramento de performance do banco externo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="h-3.5 w-3.5 mr-1.5" />CSV</Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}><FileText className="h-3.5 w-3.5 mr-1.5" />PDF</Button>
            <Button variant="outline" size="sm" onClick={handleCleanup}><Trash2 className="h-3.5 w-3.5 mr-1.5" />Limpar +7d</Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? "animate-spin" : ""}`} />Atualizar
            </Button>
          </div>
        </div>

        <TelemetryStatsCards verySlow={verySlow} slow={slow} errors={errors} avgDuration={avgDuration} />
        <TelemetryTopOffenders offenders={topOffenders} />
        <TelemetryCharts rows={rows} timeFilter={timeFilter} />
        <TelemetryFilters
          severityFilter={severityFilter} setSeverityFilter={setSeverityFilter}
          timeFilter={timeFilter} setTimeFilter={setTimeFilter}
          customDateFrom={customDateFrom} setCustomDateFrom={setCustomDateFrom}
          customDateTo={customDateTo} setCustomDateTo={setCustomDateTo}
          rowCount={rows.length}
        />
        <TelemetryTable rows={rows} isLoading={isLoading} />
      </div>
    </>
  );
}
