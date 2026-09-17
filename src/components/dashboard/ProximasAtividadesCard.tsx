import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, UserPlus, AlertTriangle, FileText, CheckCircle2, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { BriefingData } from './MorningBriefing';

interface Atividade {
  icon: React.ElementType;
  title: string;
  date: string;
  tone: 'primary' | 'warning' | 'destructive';
}

/**
 * "Próximas Atividades" — lista item a item (não contador com badge), no
 * padrão `.activity-list` da referência. Mesma fonte de `briefing` que já
 * alimenta "Próximos Eventos" (linha 1); aqui cada evento vira uma linha
 * própria em vez de virar uma contagem agregada — apresentação diferente do
 * mesmo dado, como a própria referência faz com "Próximos Eventos" e
 * "Próximas Atividades" sendo dois cards distintos.
 */
export function ProximasAtividadesCard({ briefing, bare = false, maxItems }: { briefing: BriefingData | undefined; bare?: boolean; maxItems?: number }) {
  const hoje = new Date();
  const hojeFmt = format(hoje, "dd/MM/yyyy", { locale: ptBR });

  const allAtividades: Atividade[] = briefing ? [
    ...briefing.admissoesHoje.map(a => ({ icon: UserPlus, title: `Admissão — ${a.nome}`, date: `${hojeFmt} · hoje`, tone: 'primary' as const })),
    ...briefing.feriasPeriodo.map(f => ({
      icon: Calendar,
      title: `Férias — ${f.nome}`,
      date: `${format(parseISO(f.inicio), 'dd/MM')} a ${format(parseISO(f.fim), 'dd/MM')}`,
      tone: 'primary' as const,
    })),
    ...briefing.afastadosHoje.map(a => ({ icon: AlertTriangle, title: `Afastamento — ${a.nome}`, date: a.tipo, tone: 'destructive' as const })),
    ...briefing.vencimentosHoje.map(v => ({ icon: FileText, title: v.descricao, date: 'Vence em breve', tone: 'warning' as const })),
  ] : [];
  const atividades = maxItems ? allAtividades.slice(0, maxItems) : allAtividades;

  const toneStyles = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  } as const;

  const list = atividades.length === 0 ? (
    <div className={cn('flex flex-col items-center justify-center text-center', bare ? 'py-3' : 'py-6')}>
      <CheckCircle2 className="h-5 w-5 text-success mb-2" />
      <p className="text-caption text-muted-foreground font-body">Nada agendado para hoje</p>
    </div>
  ) : (
    <ul className={bare ? "space-y-1.5" : "flex flex-1 flex-col justify-between gap-3"}>
      {atividades.map((a, i) => (
        // `px-2 py-2` (só fora do modo `bare`, que é embutido em outro card
        // sem esse hover): dá respiro entre o ícone/texto e o contorno do
        // hover, e junto do `p-4` do `CardContent` abaixo evita que o glow
        // fique cortado pela borda do card/scroll.
        <li key={i} className={cn('flex items-center gap-2.5 rounded-lg transition-shadow hover:shadow-glow', !bare && 'px-2 py-2')}>
          <div className={cn('grid shrink-0 place-items-center rounded-full', toneStyles[a.tone], bare ? 'h-6 w-6' : 'h-7 w-7')}>
            <a.icon className={bare ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
          </div>
          <div className="min-w-0">
            {/* `font-normal` (era `font-medium`): no mesmo tamanho do título
                do card (ambos 14px), os dois pesos ficavam quase iguais e
                competiam pela mesma atenção — mais leve aqui deixa claro que
                o título do card é o elemento de maior hierarquia. */}
            <p className="text-body font-body font-normal truncate">{a.title}</p>
            <p className="text-overline text-muted-foreground normal-case tracking-normal truncate">{a.date}</p>
          </div>
        </li>
      ))}
    </ul>
  );

  if (bare) {
    return (
      <div>
        <p className="text-overline text-muted-foreground normal-case tracking-normal mb-3">Próximas Atividades</p>
        {list}
      </div>
    );
  }

  return (
    // Mesma altura fixa de "Resumo Operacional"/"Atividade Recente" — os 3
    // cards desta linha não podem mais variar de tamanho conforme a largura
    // da tela; o que não couber aqui dentro rola, não estica o card.
    <Card className="flex h-[280px] flex-col overflow-hidden border border-border/60 rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between p-3 pb-1.5 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Clock className="h-4 w-4" />
          </div>
          Próximas Atividades
        </CardTitle>
        <span className="shrink-0 text-overline text-info normal-case tracking-normal">Ver todas</span>
      </CardHeader>
      {/* Padding por lado (não o atalho `p-4`, que colidiria com essas
          exceções por lado dependendo da ordem de geração do Tailwind):
          `pt-2` — a 1ª linha ficava com ZERO respiro acima (`pt-0`), cortando
          o topo do glow logo abaixo do header; `pr-5` — o scroll vertical
          (`overflow-y-auto`) soma sua própria largura ao corte pela direita,
          por isso essa margem precisa ser maior que as outras. */}
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-y-auto custom-scrollbar pb-4 pl-4 pr-5 pt-2">
        {list}
      </CardContent>
    </Card>
  );
}
