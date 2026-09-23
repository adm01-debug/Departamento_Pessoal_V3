import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, AlertTriangle, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { cardVariants } from '@/components/dashboard/MetricCard';

interface PontoOcorrenciasCardProps {
  faltas: any[];
  registrosSemana: any[];
}

/** Une atrasos da semana e faltas do colaborador numa única lista, mais recente primeiro. */
export function PontoOcorrenciasCard({ faltas, registrosSemana }: PontoOcorrenciasCardProps) {
  const ocorrencias = useMemo(() => {
    const atrasos = (registrosSemana || [])
      .filter((r: any) => Number(r.atraso_minutos) > 0)
      .map((r: any) => ({
        id: `atraso-${r.id}`,
        data: r.data,
        label: `Atraso · ${r.atraso_minutos} min`,
        tipo: 'atraso' as const,
      }));
    const faltasList = (faltas || []).map((f: any) => ({
      id: `falta-${f.id}`,
      data: f.data,
      label: f.justificada ? 'Falta justificada' : 'Falta',
      tipo: 'falta' as const,
    }));
    return [...atrasos, ...faltasList]
      .sort((a, b) => (a.data < b.data ? 1 : -1))
      .slice(0, 8);
  }, [faltas, registrosSemana]);

  return (
    <motion.div custom={6} variants={cardVariants} initial="hidden" animate="visible">
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="font-display flex items-center gap-2 text-sm">
            <Bell className="h-4 w-4 text-warning" /> Ocorrências Recentes
          </CardTitle>
          <Button asChild size="sm" className="rounded-full"><Link to="/ponto">Ver histórico</Link></Button>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-1">
          {ocorrencias.length > 0 ? ocorrencias.map((o) => (
            <div key={o.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-background/70 transition-colors">
              <span className={o.tipo === 'atraso' ? 'text-warning shrink-0' : 'text-muted-foreground shrink-0'}>
                {o.tipo === 'atraso' ? <AlertTriangle className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
              </span>
              <span className="text-xs font-body text-muted-foreground tabular-nums w-12 shrink-0">
                {new Date(o.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </span>
              <span className="text-xs font-body truncate">{o.label}</span>
            </div>
          )) : (
            <p className="text-sm text-muted-foreground font-body py-2">Nenhuma ocorrência recente.</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
