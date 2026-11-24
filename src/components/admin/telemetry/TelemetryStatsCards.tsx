import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Clock, Zap, Database } from "lucide-react";

interface TelemetryStatsCardsProps {
  verySlow: number;
  slow: number;
  errors: number;
  avgDuration: number;
}

function formatDuration(ms: number) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

export function TelemetryStatsCards({ verySlow, slow, errors, avgDuration }: TelemetryStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-medium">{verySlow}</p>
            <p className="text-[11px] text-muted-foreground">Muito Lentas (&gt;8s)</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-medium">{slow}</p>
            <p className="text-[11px] text-muted-foreground">Lentas (&gt;3s)</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <Zap className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-medium">{errors}</p>
            <p className="text-[11px] text-muted-foreground">Erros</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-medium">{formatDuration(avgDuration)}</p>
            <p className="text-[11px] text-muted-foreground">Média de duração</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
