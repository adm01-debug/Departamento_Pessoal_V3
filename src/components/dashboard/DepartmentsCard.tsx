import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CardSkeleton } from '@/components/ui/module-skeleton';
import { motion } from 'framer-motion';
import { PieChart } from 'lucide-react';
import { DonutChart } from './DonutChart';
import { donutColors } from './analytics/widgets';

interface DepartmentsCardProps {
  departamentos: { nome: string; count: number }[] | undefined;
  isLoading?: boolean;
}

/** "Departamentos": rosca à esquerda e distribuição percentual à direita. */
export function DepartmentsCard({ departamentos, isLoading }: DepartmentsCardProps) {
  const lista = departamentos ?? [];
  const total = lista.reduce((acc, d) => acc + d.count, 0);

  // min-h reduzido (400→300), acompanhando HeadcountOverviewCard (mesma linha).
  return (
    <Card className="flex h-[250px] flex-col overflow-hidden border border-border/60 rounded-xl">
      <CardHeader className="p-3 pb-1.5 space-y-0">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <PieChart className="h-4 w-4" />
          </div>
          Departamentos
        </CardTitle>
        <p className="text-overline text-muted-foreground mt-1 normal-case tracking-normal">
          Distribuição da equipe
        </p>
      </CardHeader>

      {/* `items-center`: rosca+lista centralizadas verticalmente no espaço
          restante do card (abaixo do header), em vez de coladas no topo,
          logo depois do subtítulo "Distribuição da equipe". */}
      <CardContent className="flex min-h-0 flex-1 items-center gap-3 p-3 pt-0">
        {isLoading ? (
          <CardSkeleton className="h-full w-full border-0 p-0" />
        ) : total === 0 ? (
          <div className="flex h-full w-full flex-col items-center justify-center text-center">
            <div className="p-3 rounded-2xl bg-muted/50 mb-2"><PieChart className="h-5 w-5 text-muted-foreground" /></div>
            <p className="text-caption text-muted-foreground font-body">Nenhum departamento cadastrado</p>
          </div>
        ) : (
          <>
            <DonutChart
              segments={lista.map((d, i) => ({ label: d.nome, value: d.count, color: donutColors[i % donutColors.length] }))}
              size={128}
              strokeWidth={14}
              showLegend={false}
              className="shrink-0"
            />
            <ul className="grid min-w-0 flex-1 gap-1.5">
              {lista.map((d, i) => (
                <motion.li
                  key={d.nome}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-overline normal-case tracking-normal"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.15, ease: 'easeOut' }}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <i
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: donutColors[i % donutColors.length] }}
                      aria-hidden
                    />
                    <span className="truncate text-muted-foreground font-body">{d.nome}</span>
                  </span>
                  <span className="text-muted-foreground tabular-nums">{Math.round((d.count / total) * 100)}%</span>
                  <span className="font-display font-medium tabular-nums w-4 text-right">{d.count}</span>
                </motion.li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
