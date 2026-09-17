import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CardSkeleton } from '@/components/ui/module-skeleton';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserPlus, UserMinus, TrendingUp } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export interface EvolucaoPonto {
  mes: string;
  admissoes: number;
  demissoes: number;
  saldo: number;
}

interface HeadcountOverviewCardProps {
  evolucao: EvolucaoPonto[] | undefined;
  totalAtivos: number;
  isLoading?: boolean;
  isEmpty?: boolean;
}

/** Variação percentual do último mês contra o anterior. `null` quando não há base. */
function variacao(serie: number[]): number | null {
  if (serie.length < 2) return null;
  const atual = serie[serie.length - 1];
  const anterior = serie[serie.length - 2];
  if (!anterior) return null;
  return ((atual - anterior) / anterior) * 100;
}

function StatLine({ icon: Icon, label, value, delta, tone }: {
  icon: React.ElementType;
  label: string;
  value: number;
  delta: number | null;
  tone: 'primary' | 'info' | 'muted';
}) {
  const toneStyles = {
    primary: 'bg-primary/10 text-primary',
    info: 'bg-info/10 text-info',
    muted: 'bg-muted text-muted-foreground',
  } as const;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
      <div className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', toneStyles[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-overline text-muted-foreground normal-case tracking-normal truncate">{label}</p>
        <p className="text-data flex items-baseline gap-1.5">
          {value}
          {delta !== null && (
            // Sem `cn()`: mesmo conflito do tailwind-merge entre `text-overline`
            // e a classe de cor (corrigido em todo o dashboard nesta rodada).
            <span className={`text-overline font-medium ${delta >= 0 ? 'text-success' : 'text-muted-foreground'}`}>
              {delta >= 0 ? '+' : ''}{delta.toFixed(1)}%
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * "Visão Geral da Empresa": evolução de headcount, admissões e demissões nos
 * últimos 6 meses, com o resumo do período à direita.
 *
 * Os dados vêm de `useExecutiveKPIs` (hook já existente, usado pelo Dashboard
 * Executivo) — nenhuma série é inventada. O headcount por mês é reconstruído a
 * partir do total de ativos descontando o saldo dos meses posteriores.
 */
export function HeadcountOverviewCard({ evolucao, totalAtivos, isLoading, isEmpty }: HeadcountOverviewCardProps) {
  const serie = (evolucao ?? []).map((ponto, i, arr) => {
    const saldoPosterior = arr.slice(i + 1).reduce((acc, p) => acc + p.saldo, 0);
    return {
      mes: ponto.mes,
      colaboradores: Math.max(totalAtivos - saldoPosterior, 0),
      admissoes: ponto.admissoes,
      demissoes: ponto.demissoes,
    };
  });

  const totalAdmissoes = serie.reduce((acc, p) => acc + p.admissoes, 0);
  const totalDemissoes = serie.reduce((acc, p) => acc + p.demissoes, 0);

  // min-h reduzido (400→300): a referência tem essa linha proporcionalmente
  // mais baixa que as demais (maior fração do grid, mas dentro de uma
  // página que cabe quase inteira num viewport) — 400px deixava o
  // gráfico com muito espaço morto acima/abaixo da linha de dados.
  return (
    <Card className="flex h-[250px] flex-col overflow-hidden border border-border/60 rounded-xl">
      <CardHeader className="flex flex-row items-start justify-between gap-3 p-3 pb-1.5 space-y-0">
        <div className="min-w-0">
          {/* `text-base` (não `.text-heading`): `CardTitle` já injeta `text-2xl`
              na própria base (`cn()`), e uma classe customizada nossa perde
              essa disputa de camada CSS mesmo vindo depois — só a escala
              nativa do Tailwind (`text-sm`/`text-base`/`text-2xl`...) é
              reconhecida pelo `tailwind-merge` e substitui corretamente
              (mesmo mecanismo já documentado em outros pontos do arquivo). */}
          <CardTitle className="flex items-center gap-2.5 text-base">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
            Visão Geral da Empresa
          </CardTitle>
          <p className="text-overline text-muted-foreground mt-1 normal-case tracking-normal">
            Evolução de colaboradores, admissões e demissões.
          </p>
        </div>
        {/* `text-[10px]` além de `text-overline`: o Badge injeta `text-xs`
            internamente, que vence a cascata sobre o token customizado — a
            sintaxe nativa do Tailwind corrige o tamanho sem perder o restante
            do estilo overline (uppercase, tracking, peso). */}
        <Badge variant="outline" className="shrink-0 text-overline text-[10px] font-medium rounded-lg">Últimos 6 meses</Badge>
      </CardHeader>

      <CardContent className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 pt-0 xl:grid-cols-[minmax(0,1fr)_150px]">
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-overline text-muted-foreground normal-case tracking-normal">
            <span className="flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />Colaboradores
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full bg-info" aria-hidden />Admissões
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-1.5 w-1.5 rounded-full bg-muted-foreground" aria-hidden />Demissões
            </span>
          </div>

          <div className="min-h-0 flex-1">
            {isLoading ? (
              <CardSkeleton className="h-full border-0 p-0" />
            ) : isEmpty || serie.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="p-3 rounded-2xl bg-muted/50 mb-2"><TrendingUp className="h-5 w-5 text-muted-foreground" /></div>
                <p className="text-caption text-muted-foreground font-body">Cadastre colaboradores para visualizar</p>
              </div>
            ) : (
              /* Estética inspirada na referência: números no eixo Y, linhas
                 pontilhadas (cada uma na cor do ícone/legenda que representa)
                 e um degradê suave preenchendo a área abaixo de cada linha —
                 `AreaChart`/`Area` no lugar de `LineChart`/`Line`, mesmos
                 dados e mesmas cores de antes, só o traçado visual muda. */
              /* `AnimatePresence` local (própria, sem props): toda rota da app já
                 vive dentro de <AnimatePresence initial={false}> (PageTransition.tsx),
                 pra evitar o app inteiro re-animando visivelmente na primeira carga.
                 Esse `initial={false}` se propaga por contexto pra QUALQUER motion.*
                 descendente — incluindo o `motion.rect` do clip-path abaixo —, então
                 a entrada ficava bloqueada sempre que /dashboard fosse a primeira
                 rota da sessão (login novo, F5, restart). Um `AnimatePresence`
                 aninhado sem props aqui cria um novo contexto de presença
                 (initial=true por padrão), blindando este trecho contra o bloqueio
                 do pai. */
              <AnimatePresence>
              <ResponsiveContainer width="100%" height="100%" minHeight={130}>
                <AreaChart data={serie} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="hoc-grad-colaboradores" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="hoc-grad-admissoes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--info))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--info))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="hoc-grad-demissoes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                    </linearGradient>
                    {/* Clip-path animado (Framer Motion, não a animação nativa do
                        Recharts): a linha e a área de cada <Area> ficam escondidas
                        além do limite direito deste retângulo, que cresce de 0 a
                        100% da largura — revelando o desenho da esquerda pra
                        direita de forma independente de qualquer bug do Recharts. */}
                    <clipPath id="hoc-chart-reveal-clip">
                      <motion.rect
                        key={serie.length}
                        x="0"
                        y="0"
                        height="100%"
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 2.5, ease: 'easeInOut' }}
                      />
                    </clipPath>
                  </defs>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeOpacity={0.8} horizontalPoints={[0, 45, 90, 135, 180]} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    tickLine={false}
                    width={26}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone" dataKey="colaboradores" name="Colaboradores"
                    stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#hoc-grad-colaboradores)"
                    dot={{ r: 3 }} activeDot={{ r: 4 }}
                    isAnimationActive={false}
                    clipPath="url(#hoc-chart-reveal-clip)"
                  />
                  <Area
                    type="monotone" dataKey="admissoes" name="Admissões"
                    stroke="hsl(var(--info))" strokeWidth={2} fill="url(#hoc-grad-admissoes)"
                    dot={{ r: 3 }} activeDot={{ r: 4 }}
                    isAnimationActive={false}
                    clipPath="url(#hoc-chart-reveal-clip)"
                  />
                  <Area
                    type="monotone" dataKey="demissoes" name="Demissões"
                    stroke="hsl(var(--muted-foreground))" strokeWidth={2} fill="url(#hoc-grad-demissoes)"
                    dot={{ r: 3 }} activeDot={{ r: 4 }}
                    isAnimationActive={false}
                    clipPath="url(#hoc-chart-reveal-clip)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              </AnimatePresence>
            )}
          </div>
        </div>

        <div className="hidden min-w-0 flex-col justify-center border-l border-border/30 pl-3 xl:flex">
          <StatLine icon={Users} label="Colaboradores" value={totalAtivos} delta={variacao(serie.map(p => p.colaboradores))} tone="primary" />
          <StatLine icon={UserPlus} label="Admissões" value={totalAdmissoes} delta={variacao(serie.map(p => p.admissoes))} tone="info" />
          <StatLine icon={UserMinus} label="Desligamentos" value={totalDemissoes} delta={variacao(serie.map(p => p.demissoes))} tone="muted" />
        </div>
      </CardContent>
    </Card>
  );
}
