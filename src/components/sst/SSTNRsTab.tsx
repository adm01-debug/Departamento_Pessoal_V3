import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const RISCOS_NR = [
  { nr: 'NR-6', titulo: 'EPI', descricao: 'Equipamento de Proteção Individual', nivel: 'obrigatória' },
  { nr: 'NR-7', titulo: 'PCMSO', descricao: 'Programa de Controle Médico de Saúde Ocupacional', nivel: 'obrigatória' },
  { nr: 'NR-9', titulo: 'PGR', descricao: 'Programa de Gerenciamento de Riscos', nivel: 'obrigatória' },
  { nr: 'NR-15', titulo: 'Insalubridade', descricao: 'Atividades e Operações Insalubres', nivel: 'condicional' },
  { nr: 'NR-16', titulo: 'Periculosidade', descricao: 'Atividades e Operações Perigosas', nivel: 'condicional' },
  { nr: 'NR-17', titulo: 'Ergonomia', descricao: 'Condições ergonômicas no ambiente de trabalho', nivel: 'obrigatória' },
  { nr: 'NR-35', titulo: 'Trabalho em Altura', descricao: 'Trabalho acima de 2 metros', nivel: 'condicional' },
];

export function SSTNRsTab() {
  return (
    <div className="space-y-3">
      {RISCOS_NR.map((nr, i) => (
        <motion.div key={nr.nr} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className="border-border/30 rounded-2xl hover:shadow-elevated transition-all">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary-glow">
                <FileText className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-display font-medium text-sm">{nr.nr}</p>
                  <p className="font-display font-semibold text-sm">— {nr.titulo}</p>
                </div>
                <p className="text-xs text-muted-foreground font-body">{nr.descricao}</p>
              </div>
              <Badge className={cn("font-body text-[10px]", nr.nivel === 'obrigatória' ? 'bg-destructive/15 text-destructive border-0' : 'bg-warning/15 text-warning border-0')}>
                {nr.nivel === 'obrigatória' ? 'Obrigatória' : 'Condicional'}
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
