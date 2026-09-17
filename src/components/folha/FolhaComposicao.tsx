import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Download, FileText, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value);
}

interface FolhaComposicaoProps {
  totalProventos: number;
  inss: number;
  irrf: number;
  fgts: number;
  totalDescontos: number;
  horasExtras?: number;
  dsr?: number;
  decimoTerceiro?: number;
  horasFalta?: number;
  faixaInss: string;
  faixaIrrf: string;
}

export function FolhaComposicao({ 
  totalProventos, inss, irrf, fgts, totalDescontos,
  horasExtras = 0, dsr = 0, decimoTerceiro = 0, horasFalta = 0,
  faixaInss, faixaIrrf
}: FolhaComposicaoProps) {
  const valorFaltas = (totalProventos / 220) * (horasFalta || 0);
  
  const items = [
    { label: 'Salário Base + Adicionais', value: totalProventos - horasExtras - dsr - decimoTerceiro, color: 'bg-success', pct: totalProventos > 0 ? ((totalProventos - horasExtras - dsr - decimoTerceiro) / totalProventos) * 100 : 0 },
    { label: 'Faltas/Atrasos (Ponto)', value: valorFaltas, color: 'bg-destructive/60', pct: totalProventos > 0 ? (valorFaltas / totalProventos) * 100 : 0 },
    { label: 'Horas Extras (50% e 100%)', value: horasExtras, color: 'bg-emerald-400', pct: totalProventos > 0 ? (horasExtras / totalProventos) * 100 : 0 },
    { label: 'DSR (Descanso Remunerado)', value: dsr, color: 'bg-teal-400', pct: totalProventos > 0 ? (dsr / totalProventos) * 100 : 0 },
    { label: '13º Salário', value: decimoTerceiro, color: 'bg-blue-400', pct: totalProventos > 0 ? (decimoTerceiro / totalProventos) * 100 : 0 },
    { label: `INSS (Faixa: ${faixaInss})`, value: inss, color: 'bg-info', pct: totalProventos > 0 ? (inss / totalProventos) * 100 : 0 },
    { label: `IRRF (Faixa: ${faixaIrrf})`, value: irrf, color: 'bg-warning', pct: totalProventos > 0 ? (irrf / totalProventos) * 100 : 0 },
    { label: 'FGTS (Patronal)', value: fgts, color: 'bg-primary', pct: totalProventos > 0 ? (fgts / totalProventos) * 100 : 0 },
    { label: 'Vale Transporte / Benefícios', value: Math.max(0, totalDescontos - inss - irrf - valorFaltas), color: 'bg-destructive', pct: totalProventos > 0 ? (Math.max(0, totalDescontos - inss - irrf - valorFaltas) / totalProventos) * 100 : 0 },
  ].filter(item => item.value > 0 || ['Salário Base + Adicionais', 'FGTS (Patronal)'].includes(item.label));

  return (
    <Card className="border border-border/30 rounded-2xl overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-h3 font-display">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-info to-info/70">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          Composição da Folha
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground/50 ml-1" /></TooltipTrigger>
              <TooltipContent className="max-w-[250px] text-xs">
                Detalhamento dos componentes que formam o total da folha de pagamento
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className="space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-body font-body">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-caption text-muted-foreground">{item.pct.toFixed(1)}%</span>
                  <span className="text-body font-display font-medium">{formatCurrency(item.value)}</span>
                </div>
              </div>
              <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(item.pct, 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.08 }}
                  className={cn("h-full rounded-full", item.color)}
                />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex gap-2 mt-6 pt-4 border-t border-border/30">
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5 font-body">
            <Download className="h-4 w-4" />Exportar PDF
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5 font-body">
            <Download className="h-4 w-4" />Exportar XLSX
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl gap-1.5 font-body">
            <FileText className="h-4 w-4" />Contabilidade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
