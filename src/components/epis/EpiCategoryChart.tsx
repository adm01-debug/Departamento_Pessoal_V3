import type { Tables } from '@/integrations/supabase/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

interface CategoryChartProps {
  epis: Pick<Tables<'epis'>, 'id' | 'categoria'>[];
}

const categoryLabels: Record<string, string> = {
  cabeca: 'Cabeça',
  olhos: 'Olhos/Face',
  auditiva: 'Auditiva',
  respiratoria: 'Respiratória',
  maos: 'Mãos',
  pes: 'Pés',
  corpo: 'Corpo',
  queda: 'Queda',
  outros: 'Outros',
};

const categoryColors: Record<string, string> = {
  cabeca: 'bg-primary',
  olhos: 'bg-primary/80',
  auditiva: 'bg-accent',
  respiratoria: 'bg-warning/70',
  maos: 'bg-primary/60',
  pes: 'bg-accent/80',
  corpo: 'bg-primary/40',
  queda: 'bg-destructive/60',
  outros: 'bg-muted-foreground/40',
};

export function EpiCategoryChart({ epis }: CategoryChartProps) {
  const total = epis.length || 1;
  const categories = Object.keys(categoryLabels);
  const distribution = categories
    .map((cat) => ({
      key: cat,
      label: categoryLabels[cat],
      count: epis.filter((e) => e.categoria === cat).length,
      color: categoryColors[cat],
    }))
    .filter((c) => c.count > 0);

  return (
    <Card className="border border-border/30 shadow-elevated rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-display">Cobertura por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="space-y-2.5">
            {distribution.map((cat, i) => {
              const pct = Math.round((cat.count / total) * 100);
              return (
                <Tooltip key={cat.key}>
                  <TooltipTrigger asChild>
                    <div className="space-y-1 cursor-default">
                      <div className="flex justify-between text-xs font-body">
                        <span className="text-muted-foreground">{cat.label}</span>
                        <span className="font-medium">
                          {cat.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${cat.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ delay: 0.2 + i * 0.08, duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    {cat.count} EPI{cat.count > 1 ? 's' : ''} na categoria {cat.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
            {distribution.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum EPI cadastrado</p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/20">
            <p className="text-[10px] text-muted-foreground font-body">
              {distribution.length} de {categories.length} categorias com EPIs cadastrados
            </p>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
