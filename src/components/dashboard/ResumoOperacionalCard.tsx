import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardSkeleton } from '@/components/ui/module-skeleton';
import { ClipboardList, Users, Workflow, FileCheck2, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BriefingData } from './MorningBriefing';
import type { Pendencia } from '@/pages/DashboardPage';

interface ResumoOperacionalCardProps {
  briefing: BriefingData | undefined;
  pendencias: Pendencia[] | undefined;
  isLoading?: boolean;
  bare?: boolean;
}

function Stat({ icon: Icon, label, value, percent, className }: {
  icon: React.ElementType; label: string; value: string;
  /** Barra fina abaixo do valor — só renderiza quando um percentual real (0-100) é passado. */
  percent?: number;
  /** Padding do quadrante — abre espaço para as barras divisórias sobrepostas no grid 2×2. */
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-overline normal-case tracking-normal text-muted-foreground truncate">{label}</p>
        {/* `.text-data` (Nível 2, 24px/700) — era `text-base` (16px). */}
        <p className="text-data leading-tight">{value}</p>
        {percent !== undefined && (
          <div className="mt-1 h-1 max-w-[72px] rounded-full bg-primary/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function ResumoOperacionalCard({ briefing, pendencias, isLoading, bare = false }: ResumoOperacionalCardProps) {
  const presentes = briefing ? `${briefing.pontosRegistradosHoje} / ${briefing.totalAtivos}` : '—';
  // Percentual derivado dos dois números reais já usados acima (mesmo
  // `briefing` do MorningBriefing) — não é um dado novo, só a razão entre
  // dois valores que já existem. Sem dividir por zero quando não há ativos.
  const presentesPct = briefing && briefing.totalAtivos > 0
    ? (briefing.pontosRegistradosHoje / briefing.totalAtivos) * 100
    : undefined;
  const processos = pendencias?.reduce((acc, p) => acc + p.quantidade, 0) ?? 0;
  const documentos = pendencias?.find(p => p.tipo === 'assinaturas')?.quantidade ?? 0;
  const tarefas = briefing
    ? briefing.admissoesHoje.length + briefing.feriasPeriodo.length + briefing.afastadosHoje.length + briefing.vencimentosHoje.length
    : 0;

  const grid = isLoading ? (
    <div className="grid grid-cols-2 gap-3">
      {Array(4).fill(0).map((_, i) => <CardSkeleton key={i} className="h-9 border-0 p-0" />)}
    </div>
  ) : bare ? (
    // `SaudeResumoCard`, que reaproveita esta lista embutida (`bare`) — layout original, intocado.
    <div className="grid grid-cols-2 gap-x-3 gap-y-4 flex-1">
      <Stat icon={Users} label="Colaboradores presentes" value={presentes} percent={presentesPct} />
      <Stat icon={Workflow} label="Processos em andamento" value={String(processos)} />
      <Stat icon={FileCheck2} label="Documentos pendentes" value={String(documentos)} />
      <Stat icon={ListTodo} label="Tarefas do dia" value={String(tarefas)} />
    </div>
  ) : (
    // Trocado de CSS Grid (2 linhas implícitas) para 2 fileiras `flex`
    // reais + um divisor horizontal que é um elemento próprio no meio delas
    // — não mais uma barra em posição absoluta calculada sobre "50% da
    // caixa esticada", que não batia com a fronteira real do conteúdo e
    // deixava toda a folga do card empurrada para um vão só embaixo.
    // `justify-evenly` no container: distribui essa folga em partes iguais
    // entre topo, as duas fileiras, o divisor e a base — nenhum vazio único
    // grande, espaçamento igual em todos os vãos.
    <div className="relative flex flex-1 flex-col justify-evenly">
      <div className="absolute left-1/2 top-1 bottom-1 w-1 -translate-x-1/2 rounded-full bg-border/60" />
      <div className="flex items-center gap-3">
        <Stat icon={Users} label="Colaboradores presentes" value={presentes} percent={presentesPct} className="flex-1 pr-3" />
        <Stat icon={Workflow} label="Processos em andamento" value={String(processos)} className="flex-1 pl-3" />
      </div>
      <div className="mx-2 h-1 rounded-full bg-border/60" />
      <div className="flex items-center gap-3">
        <Stat icon={FileCheck2} label="Documentos pendentes" value={String(documentos)} className="flex-1 pr-3" />
        <Stat icon={ListTodo} label="Tarefas do dia" value={String(tarefas)} className="flex-1 pl-3" />
      </div>
    </div>
  );

  if (bare) {
    return (
      <div>
        <p className="text-overline text-muted-foreground normal-case tracking-normal mb-3">Resumo Operacional</p>
        {grid}
      </div>
    );
  }

  return (
    <Card className="flex h-[280px] flex-col overflow-hidden border border-border/60 rounded-xl">
      <CardHeader className="p-3 pb-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <ClipboardList className="h-4 w-4" />
          </div>
          Resumo Operacional
        </CardTitle>
        <p className="text-overline text-muted-foreground/60 mt-0.5 normal-case tracking-normal">
          Hoje é um bom dia para manter o foco!
        </p>
      </CardHeader>
      {/* Divisória de cabeçalho — mesma barrinha arredondada da cruz abaixo,
          separando o bloco título/subtítulo da área de dados. */}
      <div className="mx-3 mb-2 h-1 shrink-0 rounded-full bg-border/60" />
      <CardContent className="flex min-h-0 flex-1 flex-col p-3 pt-0">
        {grid}
      </CardContent>
    </Card>
  );
}
