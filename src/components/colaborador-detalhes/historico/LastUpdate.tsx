import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TimelineEvent } from '@/types/timelineEvent';

interface LastUpdateProps {
  latestEvent?: TimelineEvent;
}

function formatDateTime(iso: string): { data: string; hora?: string } {
  const hasTime = iso.length > 10;
  const date = new Date(hasTime ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { data: iso };
  const data = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  if (!hasTime) return { data };
  const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
  return { data, hora };
}

// Autor só aparece quando o evento realmente carrega essa informação (hoje,
// só auditoria tem — a maioria das origens de negócio não tem "solicitante"
// nem "responsável" no schema atual, então não inventa esse dado).
export function LastUpdate({ latestEvent }: LastUpdateProps) {
  if (!latestEvent) {
    return (
      <Card className="rounded-xl border-border/30">
        <CardHeader className="pt-4 pb-1.5">
          <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
            <Clock className="h-5 w-5 text-primary" /> Última atualização
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">Sem eventos registrados ainda.</p>
        </CardContent>
      </Card>
    );
  }

  const { data, hora } = formatDateTime(latestEvent.date);
  const autor = latestEvent.auditDetail?.userEmail;

  return (
    <Card className="rounded-xl border-border/30">
      <CardHeader className="pt-4 pb-1.5">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          <Clock className="h-5 w-5 text-primary" /> Última atualização
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm font-medium tabular-nums">{data}{hora ? ` · ${hora}` : ''}</p>
        <p className="mt-1 text-xs text-foreground">{latestEvent.title}</p>
        {autor && <p className="text-xs text-muted-foreground">por {autor}</p>}
      </CardContent>
    </Card>
  );
}
