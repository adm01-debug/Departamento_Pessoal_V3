import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, AlertTriangle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export function ESocialComplianceScore({ stats }: { stats: any }) {
  const hasScore = typeof stats.conformidade === 'number';
  const score = hasScore ? stats.conformidade : 0;

  const getScoreColor = (s: number) => {
    if (s >= 95) return 'text-success';
    if (s >= 80) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (s: number) => {
    if (s >= 95) return 'bg-success/10';
    if (s >= 80) return 'bg-warning/10';
    return 'bg-destructive/10';
  };

  return (
    <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-display font-bold text-muted-foreground uppercase tracking-widest flex items-center justify-between">
          <span>Score de Conformidade Fiscal</span>
          <Zap className="h-3 w-3 text-primary animate-pulse" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-4 space-y-4">
          <div className="relative">
            {/* Circular Progress Mockup */}
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-muted/20"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={364}
                initial={{ strokeDashoffset: 364 }}
                animate={{ strokeDashoffset: 364 - (364 * score) / 100 }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className={getScoreColor(score)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`text-3xl font-display font-bold ${hasScore ? getScoreColor(score) : 'text-muted-foreground'}`}
              >
                {hasScore ? `${score}%` : '—'}
              </span>
              <span className="text-[9px] text-muted-foreground font-bold uppercase">Integridade</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 w-full">
            <div className="p-2 rounded-xl bg-background border border-border/40 text-center">
              <p className="text-[9px] text-muted-foreground uppercase font-bold">Eventos S-1200</p>
              <p className="text-sm font-bold">{stats.enviados}</p>
            </div>
            <div className="p-2 rounded-xl bg-background border border-border/40 text-center">
              <p className="text-[9px] text-muted-foreground uppercase font-bold">Erros Retornados</p>
              <p className="text-sm font-bold text-destructive">{stats.erros}</p>
            </div>
          </div>

          <div className={`w-full p-3 rounded-xl border flex items-start gap-3 ${getScoreBg(score)} border-current/10`}>
            {hasScore && score >= 95 ? (
              <ShieldCheck className="h-4 w-4 text-success mt-0.5" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
            )}
            <div>
              <p className={`text-[11px] font-bold ${getScoreColor(score)}`}>
                {!hasScore ? 'Sem eventos avaliados' : score >= 95 ? 'Eventos sem erro' : 'Riscos Detectados'}
              </p>
              <p className="text-[10px] text-muted-foreground leading-tight">
                {!hasScore
                  ? 'Cadastre e valide eventos para calcular este indicador.'
                  : score >= 95
                    ? 'Os eventos cadastrados não apresentam erros registrados; isso não comprova homologação externa.'
                    : 'Existem pendências de cadastro que precisam ser revisadas antes da transmissão.'}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
