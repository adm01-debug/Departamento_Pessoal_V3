import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { FileWarning, Ban, Gavel, MessageSquare, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const tipoLabels: Record<string, string> = {
  advertencia_verbal: 'Adv. Verbal',
  advertencia_escrita: 'Adv. Escrita',
  suspensao: 'Suspensão',
  justa_causa: 'Justa Causa',
};

const tipoIcons: Record<string, typeof FileWarning> = {
  advertencia_verbal: MessageSquare,
  advertencia_escrita: FileWarning,
  suspensao: Ban,
  justa_causa: Gavel,
};

const tipoColors: Record<string, string> = {
  advertencia_verbal: 'bg-warning/20 text-warning border-warning/30',
  advertencia_escrita: 'bg-accent text-accent-foreground border-accent',
  suspensao: 'bg-destructive/10 text-destructive border-destructive/30',
  justa_causa: 'bg-destructive/20 text-destructive border-destructive/40',
};

interface MedidasTimelineProps {
  medidas: any[];
  onMarcarCiencia: (id: string) => void;
}

export function MedidasTimeline({ medidas, onMarcarCiencia }: MedidasTimelineProps) {
  const sorted = [...medidas].sort((a, b) =>
    new Date(b.data_ocorrencia).getTime() - new Date(a.data_ocorrencia).getTime()
  ).slice(0, 10);

  if (sorted.length === 0) return null;

  return (
    <Card className="border border-border/30 shadow-elevated rounded-2xl mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Linha do Tempo — Últimas Ocorrências
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-2 bottom-2 w-px bg-border/50" />

            <div className="space-y-4">
              {sorted.map((m, i) => {
                const Icon = tipoIcons[m.tipo] || FileWarning;
                const colorClass = tipoColors[m.tipo] || 'bg-muted text-muted-foreground border-border';
                let formattedDate: string;
                try {
                  formattedDate = format(parseISO(m.data_ocorrencia), "dd MMM yyyy", { locale: ptBR });
                } catch {
                  formattedDate = m.data_ocorrencia;
                }

                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex gap-4 pl-1"
                  >
                    {/* Icon node */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={`relative z-10 flex items-center justify-center h-8 w-8 rounded-full border ${colorClass} shrink-0`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>{tipoLabels[m.tipo] || m.tipo}</TooltipContent>
                    </Tooltip>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium font-body">
                          {m.colaborador?.nome_completo || 'Colaborador'}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {tipoLabels[m.tipo] || m.tipo}
                        </Badge>
                        {m.colaborador_ciente ? (
                          <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Ciente
                          </Badge>
                        ) : m.recusa_assinatura ? (
                          <Badge variant="destructive" className="text-[10px] h-5 gap-1">
                            <XCircle className="h-2.5 w-2.5" /> Recusou
                          </Badge>
                        ) : (
                          <button
                            onClick={() => onMarcarCiencia(m.id)}
                            className="text-[10px] h-5 px-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                          >
                            Registrar ciência
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate font-body">
                        {m.descricao}
                      </p>
                      <span className="text-[10px] text-muted-foreground/70 font-body">
                        {formattedDate}
                        {m.artigo_clt && ` · ${m.artigo_clt.replace('_', ' ').replace('art ', 'Art. ')}`}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
