import { motion } from 'framer-motion';
import { Clock, Infinity as InfinityIcon, LayoutGrid, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EntradaPresenca, entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import type { SituacaoCertificado } from './certificadosDerivacoes';

/**
 * Badges de segmentação — MESMO estado do filtro “Situação”.
 *
 * Todas permanecem coloridas quando inativas; a ativa ganha fundo/borda mais
 * intensos e glow suave. A altura é fixa (34 px) para a seleção não deslocar o
 * layout. O contador é calculado com dados reais (ver `contarSituacoesCertificado`).
 */
interface EstiloSegmento {
  icone: LucideIcon;
  inativo: string;
  ativo: string;
  capsula: string;
}

const SEGMENTOS: readonly { valor: SituacaoCertificado; rotulo: string }[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'valido', rotulo: 'Válidos' },
  { valor: 'a_vencer', rotulo: 'A vencer' },
  { valor: 'vencido', rotulo: 'Vencidos' },
  { valor: 'vitalicio', rotulo: 'Vitalícios' },
];

const ESTILOS: Record<SituacaoCertificado, EstiloSegmento> = {
  todos: {
    icone: LayoutGrid,
    inativo: 'border-primary/35 bg-primary/[0.07] text-primary hover:bg-primary/10',
    ativo: 'border-primary/70 bg-primary/15 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.18)]',
    capsula: 'border-primary/30 bg-primary/15 text-primary',
  },
  valido: {
    icone: ShieldCheck,
    inativo: 'border-success/30 bg-success/[0.07] text-success hover:bg-success/10',
    ativo: 'border-success/70 bg-success/15 text-success shadow-[0_0_18px_hsl(var(--success)/0.16)]',
    capsula: 'border-success/30 bg-success/15 text-success',
  },
  a_vencer: {
    icone: Clock,
    inativo: 'border-warning/30 bg-warning/[0.07] text-warning hover:bg-warning/10',
    ativo: 'border-warning/70 bg-warning/15 text-warning shadow-[0_0_18px_hsl(var(--warning)/0.16)]',
    capsula: 'border-warning/30 bg-warning/15 text-warning',
  },
  vencido: {
    icone: ShieldAlert,
    inativo:
      'border-[hsl(var(--destructive-vivid)/0.3)] bg-[hsl(var(--destructive-vivid)/0.08)] text-[hsl(var(--destructive-vivid))] hover:bg-[hsl(var(--destructive-vivid)/0.12)]',
    ativo:
      'border-[hsl(var(--destructive-vivid)/0.7)] bg-[hsl(var(--destructive-vivid)/0.15)] text-[hsl(var(--destructive-vivid))] shadow-[0_0_18px_hsl(var(--destructive-vivid)/0.16)]',
    capsula:
      'border-[hsl(var(--destructive-vivid)/0.3)] bg-[hsl(var(--destructive-vivid)/0.15)] text-[hsl(var(--destructive-vivid))]',
  },
  vitalicio: {
    icone: InfinityIcon,
    inativo: 'border-info/30 bg-info/[0.07] text-info hover:bg-info/10',
    ativo: 'border-info/70 bg-info/15 text-info shadow-[0_0_18px_hsl(var(--info)/0.16)]',
    capsula: 'border-info/30 bg-info/15 text-info',
  },
};

export interface CertificadosSegmentosProps {
  ativa: SituacaoCertificado;
  contagens: Record<SituacaoCertificado, number>;
  onChange: (valor: SituacaoCertificado) => void;
}

export function CertificadosSegmentos({ ativa, contagens, onChange }: CertificadosSegmentosProps) {
  return (
    <EntradaPresenca>
      <motion.div
        {...entradaCard(7)}
        role="group"
        aria-label="Filtrar certificados por situação"
        className="flex flex-wrap items-center gap-2"
      >
        {SEGMENTOS.map(({ valor, rotulo }) => {
          const estilo = ESTILOS[valor];
          const Icone = estilo.icone;
          const selecionado = ativa === valor;
          return (
            <button
              key={valor}
              type="button"
              aria-pressed={selecionado}
              data-situacao={valor}
              onClick={() => onChange(valor)}
              className={cn(
                'inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[11.5px] font-semibold leading-none transition-colors duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                estilo.inativo,
                selecionado && estilo.ativo
              )}
            >
              <Icone className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {rotulo}
              <span
                className={cn(
                  'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border px-1 text-[9.5px] font-semibold tabular-nums leading-none',
                  estilo.capsula,
                  selecionado && 'bg-background/30'
                )}
                aria-label={`${contagens[valor]} certificado(s)`}
              >
                {contagens[valor]}
              </span>
            </button>
          );
        })}
      </motion.div>
    </EntradaPresenca>
  );
}
