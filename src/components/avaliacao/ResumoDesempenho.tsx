import { ClipboardList, Star, Target, TrendingUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ============================================================================
 * RESUMO COMPACTO DO MÓDULO — Gestão de Desempenho.
 *
 * Os cinco totais que antes ocupavam uma faixa de cards grandes (Ciclos,
 * Metas, Feedbacks, PDIs, Competências) agora vivem numa única linha discreta
 * de "chips". Nenhum número inventado: os valores vêm das mesmas consultas já
 * usadas pela área.
 * ============================================================================
 */

interface ResumoDesempenhoProps {
  stats: {
    ciclos: number;
    metas: number;
    feedbacks: number;
    pdis: number;
    competencias: number;
  };
}

const ITENS = [
  { chave: 'ciclos', rotulo: 'Ciclos', Icone: ClipboardList, cor: 'text-primary', fundo: 'bg-primary/10' },
  { chave: 'metas', rotulo: 'Metas', Icone: Target, cor: 'text-success', fundo: 'bg-success/10' },
  { chave: 'feedbacks', rotulo: 'Feedbacks', Icone: Users, cor: 'text-info', fundo: 'bg-info/10' },
  { chave: 'pdis', rotulo: 'PDIs', Icone: TrendingUp, cor: 'text-warning', fundo: 'bg-warning/10' },
  { chave: 'competencias', rotulo: 'Competências', Icone: Star, cor: 'text-destructive-vivid', fundo: 'bg-destructive-vivid/10' },
] as const;

export function ResumoDesempenho({ stats }: ResumoDesempenhoProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {ITENS.map(({ chave, rotulo, Icone, cor, fundo }) => (
        <div
          key={chave}
          className="flex items-center gap-2 rounded-lg border border-border/30 bg-card/60 px-3 py-1.5"
        >
          <span className={cn('flex h-5 w-5 items-center justify-center rounded-md', fundo, cor)}>
            <Icone className="h-3 w-3" />
          </span>
          <span className="text-sm font-medium tabular-nums leading-none">{stats[chave]}</span>
          <span className="text-[11px] text-muted-foreground leading-none">{rotulo}</span>
        </div>
      ))}
    </div>
  );
}
