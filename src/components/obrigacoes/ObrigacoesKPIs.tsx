import { Card, CardContent } from '@/components/ui/card';
import { FileText, Receipt, DollarSign, Building2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ObrigacoesKPIsProps {
  dctfCount: number;
  sefipCount: number;
  totalFgts: string;
  totalInss: string;
  guiasVencidas: number;
}

export function ObrigacoesKPIs({ dctfCount, sefipCount, totalFgts, totalInss, guiasVencidas }: ObrigacoesKPIsProps) {
  const items = [
    { label: 'DCTFWeb', value: dctfCount, icon: FileText, gradient: 'from-primary to-primary-glow' },
    { label: 'SEFIP', value: sefipCount, icon: Receipt, gradient: 'from-info to-info/70' },
    { label: 'Total FGTS', value: totalFgts, icon: DollarSign, gradient: 'from-success to-success/70' },
    { label: 'Total INSS', value: totalInss, icon: Building2, gradient: 'from-warning to-warning/70' },
    { label: 'Vencidas', value: guiasVencidas, icon: AlertTriangle, gradient: 'from-destructive to-destructive/70' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {items.map(({ label, value, icon: Icon, gradient }, i) => (
        <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="border-border/30 rounded-2xl overflow-hidden">
            <div className={cn("h-[2px] bg-gradient-to-r", gradient)} />
            <CardContent className="p-3 flex items-center gap-3">
              <div className={cn("p-2 rounded-xl bg-gradient-to-br", gradient)}><Icon className="h-4 w-4 text-primary-foreground" /></div>
              <div><p className="text-lg font-semibold font-display">{value}</p><p className="text-[10px] text-muted-foreground font-body">{label}</p></div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
