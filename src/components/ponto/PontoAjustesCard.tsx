import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History } from 'lucide-react';
import { motion } from 'framer-motion';
import { cardVariants } from '@/components/dashboard/MetricCard';

interface PontoAjustesCardProps {
  totalPendentes: number;
  isLoading: boolean;
}

export function PontoAjustesCard({ totalPendentes, isLoading }: PontoAjustesCardProps) {
  return (
    <motion.div custom={7} variants={cardVariants} initial="hidden" animate="visible">
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
        <CardContent className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
              <History className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">Ajustes de Ponto</p>
              <p className="text-xs text-muted-foreground truncate">
                {isLoading ? '—' : `${totalPendentes} solicitação(ões) aguardando aprovação`}
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0 rounded-full"><Link to="/ponto">Revisar</Link></Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
