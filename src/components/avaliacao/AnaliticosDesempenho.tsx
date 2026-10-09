import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowRight, BarChart3, Star, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { corProgresso, iniciais, limitarPercentual, normalizarStatus, progressoMeta, tintaProgresso } from './desempenhoComum';

/**
 * ============================================================================
 * ÁREA ANALÍTICA — três cards horizontais da Gestão de Desempenho.
 *
 * A. Feedbacks por Status  → donut + legenda (métrica REAL equivalente ao
 *    "Progresso das Avaliações" do mockup: a área não possui tabela de
 *    avaliações com estados próprios, então o donut usa o `status` real de
 *    `feedbacks_360` — concluído × pendente).
 * B. Distribuição das Notas → barras horizontais sobre `feedbacks_360.nota_geral`.
 * C. Metas do Ciclo (Top 5) → 5 maiores progressos dentre as metas do ciclo.
 * ============================================================================
 */

/** Botão discreto de ação no cabeçalho de cada card. */
function AcaoCard({ rotulo, onClick }: { rotulo: string; onClick?: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
      onClick={onClick}
    >
      {rotulo}
      <ArrowRight className="h-3 w-3" />
    </Button>
  );
}

/** Cabeçalho padrão dos três cards (mesma hierarquia visual). */
function CabecalhoCard({
  icone,
  corIcone,
  titulo,
  acao,
  onAcao,
}: {
  icone: React.ReactNode;
  corIcone: string;
  titulo: string;
  acao?: string;
  onAcao?: () => void;
}) {
  return (
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
      <CardTitle className="flex items-center gap-2 text-sm font-display font-medium">
        <span className={cn('flex h-6 w-6 items-center justify-center rounded-lg', corIcone)}>{icone}</span>
        {titulo}
      </CardTitle>
      {acao && <AcaoCard rotulo={acao} onClick={onAcao} />}
    </CardHeader>
  );
}

/** Linha de legenda do donut (ponto + rótulo + valor + percentual). */
function LinhaLegenda({ cor, rotulo, valor, percentual }: { cor: string; rotulo: string; valor: number; percentual?: number }) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="flex min-w-0 items-center gap-2">
        <span className={cn('h-2 w-2 shrink-0 rounded-full', cor)} />
        <span className="truncate text-muted-foreground">{rotulo}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 tabular-nums">
        <span className="font-medium">{valor}</span>
        {percentual !== undefined && <span className="w-9 text-right text-muted-foreground">{percentual}%</span>}
      </span>
    </div>
  );
}

/** Card A — donut do status real dos feedbacks. */
function CardFeedbacksPorStatus({ feedbacks, onNavigate }: { feedbacks: any[]; onNavigate?: (tab: string) => void }) {
  const total = feedbacks.length;
  const concluidos = feedbacks.filter((f) => normalizarStatus(f?.status) === 'concluido').length;
  const pendentes = total - concluidos;
  const pctConcluido = total ? limitarPercentual((concluidos / total) * 100) : 0;
  const dados = [
    { nome: 'Concluídos', valor: concluidos, cor: 'hsl(var(--success))' },
    { nome: 'Pendentes', valor: pendentes, cor: 'hsl(var(--warning))' },
  ];

  return (
    <Card className="flex h-full flex-col border-border/30">
      <CabecalhoCard
        icone={<BarChart3 className="h-3.5 w-3.5" />}
        corIcone="bg-primary/10 text-primary"
        titulo="Feedbacks por Status"
        acao="Ver feedbacks"
        onAcao={() => onNavigate?.('feedbacks')}
      />
      <CardContent className="flex flex-1 items-center pt-2">
        {total === 0 ? (
          <p className="w-full py-8 text-center text-xs text-muted-foreground">Nenhum feedback registrado.</p>
        ) : (
          <div className="flex w-full items-center gap-4">
            <div className="relative h-[122px] w-[122px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={dados} dataKey="valor" nameKey="nome" innerRadius={38} outerRadius={56} paddingAngle={2} stroke="none">
                    {dados.map((d) => (
                      <Cell key={d.nome} fill={d.cor} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-display font-medium leading-none">{pctConcluido}%</span>
                <span className="mt-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">concluídos</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <LinhaLegenda cor="bg-success" rotulo="Concluídos" valor={concluidos} percentual={pctConcluido} />
              <LinhaLegenda
                cor="bg-warning"
                rotulo="Pendentes"
                valor={pendentes}
                percentual={total ? limitarPercentual((pendentes / total) * 100) : 0}
              />
              <div className="border-t border-border/20 pt-2">
                <LinhaLegenda cor="bg-muted-foreground/50" rotulo="Total" valor={total} />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Faixas semânticas da distribuição de notas (do topo para a base). */
const FAIXAS_NOTA = [
  { nota: 5, rotulo: '5 estrelas', barra: 'bg-success', tinta: 'text-success' },
  { nota: 4, rotulo: '4 estrelas', barra: 'bg-success', tinta: 'text-success' },
  { nota: 3, rotulo: '3 estrelas', barra: 'bg-primary', tinta: 'text-primary' },
  { nota: 2, rotulo: '2 estrelas', barra: 'bg-warning', tinta: 'text-warning' },
  { nota: 1, rotulo: '1 estrela', barra: 'bg-destructive-vivid', tinta: 'text-destructive-vivid' },
];

/** Card B — distribuição das notas dos feedbacks em barras horizontais. */
function CardDistribuicaoNotas({ feedbacks, onNavigate }: { feedbacks: any[]; onNavigate?: (tab: string) => void }) {
  const total = feedbacks.length;
  const contagem = FAIXAS_NOTA.map((faixa) => ({
    ...faixa,
    quantidade: feedbacks.filter((f) => Math.round(Number(f?.nota_geral ?? 0)) === faixa.nota).length,
  }));

  return (
    <Card className="flex h-full flex-col border-border/30">
      <CabecalhoCard
        icone={<Star className="h-3.5 w-3.5 fill-current" />}
        corIcone="bg-warning/10 text-warning"
        titulo="Distribuição das Notas"
        acao="Ver feedbacks"
        onAcao={() => onNavigate?.('feedbacks')}
      />
      <CardContent className="flex flex-1 flex-col justify-center gap-3 pt-3">
        {total === 0 ? (
          <p className="w-full py-8 text-center text-xs text-muted-foreground">Nenhuma nota registrada.</p>
        ) : (
          contagem.map((faixa) => {
            const pct = limitarPercentual((faixa.quantidade / total) * 100);
            return (
              <div key={faixa.nota} className="flex items-center gap-3">
                <span className={cn('flex w-[88px] shrink-0 items-center gap-1.5 text-xs', faixa.tinta)}>
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span className="text-foreground/80">{faixa.rotulo}</span>
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className={cn('h-full rounded-full transition-all', faixa.barra)} style={{ width: `${pct}%` }} />
                </div>
                <span className="w-7 text-right text-xs font-medium tabular-nums">{faixa.quantidade}</span>
                <span className="w-9 text-right text-[11px] text-muted-foreground tabular-nums">{pct}%</span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

/** Card C — cinco metas de maior progresso no ciclo. */
function CardMetasTop5({ metas, onNavigate }: { metas: any[]; onNavigate?: (tab: string) => void }) {
  const top = metas
    .slice()
    .sort((a, b) => progressoMeta(b) - progressoMeta(a))
    .slice(0, 5);

  return (
    <Card className="flex h-full flex-col border-border/30">
      <CabecalhoCard
        icone={<Target className="h-3.5 w-3.5" />}
        corIcone="bg-primary/10 text-primary"
        titulo="Metas do Ciclo (Top 5)"
        acao="Ver todas"
        onAcao={() => onNavigate?.('metas')}
      />
      <CardContent className="flex flex-1 flex-col pt-3">
        {top.length === 0 ? (
          <p className="w-full py-8 text-center text-xs text-muted-foreground">Nenhuma meta vinculada a este ciclo.</p>
        ) : (
          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)_auto] gap-3 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Meta</span>
              <span>Responsável</span>
              <span className="text-right">Progresso</span>
            </div>
            <div className="space-y-2.5">
              {top.map((meta) => {
                const pct = progressoMeta(meta);
                const responsavel = meta?.colaborador?.nome_completo ?? meta?.responsavel ?? '—';
                return (
                  <div key={meta.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.75fr)_auto] items-center gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="truncate text-xs font-medium">{meta.titulo}</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-xs">{meta.titulo}</TooltipContent>
                    </Tooltip>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-medium text-primary">
                        {iniciais(responsavel)}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground" title={responsavel}>
                        {responsavel}
                      </span>
                    </span>
                    <span className="flex w-[104px] items-center gap-2">
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                        <span className={cn('block h-full rounded-full', corProgresso(pct))} style={{ width: `${pct}%` }} />
                      </span>
                      <span className={cn('w-8 text-right text-[11px] font-medium tabular-nums', tintaProgresso(pct))}>
                        {pct}%
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}

interface AnaliticosDesempenhoProps {
  feedbacks: any[];
  metas: any[];
  onNavigate?: (tab: string) => void;
}

export function AnaliticosDesempenho({ feedbacks, metas, onNavigate }: AnaliticosDesempenhoProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <CardFeedbacksPorStatus feedbacks={feedbacks} onNavigate={onNavigate} />
      <CardDistribuicaoNotas feedbacks={feedbacks} onNavigate={onNavigate} />
      <CardMetasTop5 metas={metas} onNavigate={onNavigate} />
    </div>
  );
}
