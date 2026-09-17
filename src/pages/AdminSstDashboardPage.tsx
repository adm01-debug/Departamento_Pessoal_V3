import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks/useEmpresas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle2, Clock, ShieldAlert, Stethoscope, HardHat, CalendarClock, Users, Gauge } from 'lucide-react';

interface DashboardData {
  asos: { vencidos: number; vencendo_30: number; vencendo_60: number; vencendo_90: number; validos: number; total: number };
  colaboradores_sem_aso: number;
  epis: { ca_vencidos: number; ca_vencendo_60: number };
  agendamentos: { pendentes: number; atrasados: number; realizados_mes: number };
  sla_clinicas_dias: number;
}

export default function AdminSstDashboardPage() {
  const { empresaAtual } = useEmpresas();

  const { data, isLoading } = useQuery({
    queryKey: ['sst-dashboard-sla', empresaAtual?.id],
    enabled: !!empresaAtual?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('sst_dashboard_sla', { p_empresa_id: empresaAtual!.id });
      if (error) throw error;
      return data as unknown as DashboardData;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="py-6 space-y-6">
        <h1 className="text-3xl font-medium">Dashboard SST</h1>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const conformidade = data.asos.total > 0
    ? Math.round(((data.asos.total - data.asos.vencidos) / data.asos.total) * 100)
    : 100;

  return (
    <div className="py-6 space-y-6">
      <header>
        <h1 className="text-3xl font-medium tracking-tight">Dashboard SST</h1>
        <p className="text-muted-foreground mt-1">SLA de saúde ocupacional, vencimentos de ASO/EPI e conformidade NR-7/NR-6</p>
      </header>

      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Gauge className="h-4 w-4" />Conformidade ASO
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline gap-3">
            <span className="text-5xl font-medium">{conformidade}%</span>
            <span className="text-sm text-muted-foreground">{data.asos.total - data.asos.vencidos} de {data.asos.total} válidos</span>
          </div>
          <Progress value={conformidade} className="mt-4" />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Stethoscope className="h-5 w-5" />ASOs</h2>
        <div className="grid gap-4 md:grid-cols-5">
          <KpiCard title="Vencidos" value={data.asos.vencidos} icon={AlertTriangle} tone="danger" />
          <KpiCard title="Vencem em 30 dias" value={data.asos.vencendo_30} icon={Clock} tone="warning" />
          <KpiCard title="Vencem em 60 dias" value={data.asos.vencendo_60} icon={Clock} tone="warning" />
          <KpiCard title="Vencem em 90 dias" value={data.asos.vencendo_90} icon={Clock} />
          <KpiCard title="Válidos > 90 dias" value={data.asos.validos} icon={CheckCircle2} tone="success" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2"><HardHat className="h-5 w-5" />EPIs (NR-6)</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <KpiCard title="CA vencidos" value={data.epis.ca_vencidos} icon={ShieldAlert} tone="danger" />
          <KpiCard title="CA vencendo em 60 dias" value={data.epis.ca_vencendo_60} icon={Clock} tone="warning" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2"><CalendarClock className="h-5 w-5" />Agendamentos & SLA de Clínicas</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard title="Pendentes" value={data.agendamentos.pendentes} icon={Clock} />
          <KpiCard title="Atrasados" value={data.agendamentos.atrasados} icon={AlertTriangle} tone="danger" />
          <KpiCard title="Realizados no mês" value={data.agendamentos.realizados_mes} icon={CheckCircle2} tone="success" />
          <KpiCard title="SLA médio (dias)" value={data.sla_clinicas_dias} icon={Gauge} suffix="d" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5" />Cobertura</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <KpiCard title="Colaboradores ativos sem ASO" value={data.colaboradores_sem_aso} icon={AlertTriangle} tone={data.colaboradores_sem_aso > 0 ? 'danger' : 'success'} />
        </div>
      </section>
    </div>
  );
}

interface KpiCardProps {
  title: string;
  value: number;
  icon: typeof AlertTriangle;
  tone?: 'danger' | 'warning' | 'success' | 'default';
  suffix?: string;
}

function KpiCard({ title, value, icon: Icon, tone = 'default', suffix }: KpiCardProps) {
  const toneClass =
    tone === 'danger' ? 'text-destructive' :
    tone === 'warning' ? 'text-orange-500' :
    tone === 'success' ? 'text-emerald-500' : 'text-foreground';
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Icon className={`h-4 w-4 ${toneClass}`} />{title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-medium ${toneClass}`}>{value}{suffix ?? ''}</div>
      </CardContent>
    </Card>
  );
}
