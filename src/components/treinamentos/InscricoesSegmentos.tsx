import { motion } from 'framer-motion';
import { EntradaPresenca, entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import type { ContagensSegmentoInscricao } from './inscricoesDerivacoes';

/**
 * Badges de segmentação da aba Inscrições.
 *
 * O estado é o MESMO do dropdown “Status”: clicar em uma badge altera o filtro
 * e o dropdown acompanha. Todas permanecem coloridas quando inativas; a ativa
 * recebe fundo/borda mais intensos e glow suave.
 *
 * “Atrasados” fica desabilitada quando o modelo não possui NENHUM status real
 * `atrasado` (`contagens.atrasados === null`). Nenhuma regra de atraso é
 * derivada de datas.
 */
interface EstiloSegmento {
  inativo: string;
  ativo: string;
  capsula: string;
}

const ESTILOS: Record<string, EstiloSegmento> = {
  todos: {
    inativo: 'border-primary/35 bg-primary/[0.07] text-primary hover:bg-primary/10',
    ativo: 'border-primary/70 bg-primary/15 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.18)]',
    capsula: 'border-primary/30 bg-primary/15 text-primary',
  },
  em_andamento: {
    inativo: 'border-info/30 bg-info/[0.07] text-info hover:bg-info/10',
    ativo: 'border-info/70 bg-info/15 text-info shadow-[0_0_18px_hsl(var(--info)/0.16)]',
    capsula: 'border-info/30 bg-info/15 text-info',
  },
  concluido: {
    inativo: 'border-success/30 bg-success/[0.07] text-success hover:bg-success/10',
    ativo: 'border-success/70 bg-success/15 text-success shadow-[0_0_18px_hsl(var(--success)/0.16)]',
    capsula: 'border-success/30 bg-success/15 text-success',
  },
  inscrito: {
    inativo: 'border-info/25 bg-info/[0.05] text-info/85 hover:bg-info/10',
    ativo: 'border-info/60 bg-info/15 text-info shadow-[0_0_18px_hsl(var(--info)/0.14)]',
    capsula: 'border-info/25 bg-info/10 text-info',
  },
  atrasado: {
    inativo:
      'border-[hsl(var(--destructive-vivid)/0.3)] bg-[hsl(var(--destructive-vivid)/0.08)] text-[hsl(var(--destructive-vivid))]',
    ativo:
      'border-[hsl(var(--destructive-vivid)/0.7)] bg-[hsl(var(--destructive-vivid)/0.15)] text-[hsl(var(--destructive-vivid))] shadow-[0_0_18px_hsl(var(--destructive-vivid)/0.16)]',
    capsula:
      'border-[hsl(var(--destructive-vivid)/0.3)] bg-[hsl(var(--destructive-vivid)/0.15)] text-[hsl(var(--destructive-vivid))]',
  },
};

const SEGMENTOS = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'em_andamento', rotulo: 'Em andamento' },
  { valor: 'concluido', rotulo: 'Concluídos' },
  { valor: 'inscrito', rotulo: 'Inscritos' },
  { valor: 'atrasado', rotulo: 'Atrasados' },
] as const;

export interface InscricoesSegmentosProps {
  ativa: string;
  contagens: ContagensSegmentoInscricao;
  onChange: (valor: string) => void;
}

function contagemDe(segmento: (typeof SEGMENTOS)[number]['valor'], contagens: ContagensSegmentoInscricao) {
  if (segmento === 'todos') return contagens.todos;
  if (segmento === 'concluido') return contagens.concluidos;
  if (segmento === 'em_andamento') return contagens.em_andamento;
  if (segmento === 'inscrito') return contagens.inscritos;
  return contagens.atrasados;
}

export function InscricoesSegmentos({ ativa, contagens, onChange }: InscricoesSegmentosProps) {
  return (
    <EntradaPresenca>
      <motion.div
        {...entradaCard(7)}
        role="group"
        aria-label="Filtrar inscrições por status"
        className="grid grid-cols-2 gap-2 min-[700px]:grid-cols-3 min-[980px]:grid-cols-5"
      >
        {SEGMENTOS.map(({ valor, rotulo }) => {
          const contagem = contagemDe(valor, contagens);
          const indisponivel = contagem === null;
          const selecionado = ativa === valor;
          const estilo = ESTILOS[valor];

          return (
            <button
              key={valor}
              type="button"
              aria-pressed={selecionado}
              aria-disabled={indisponivel || undefined}
              disabled={indisponivel}
              data-segmento={valor}
              title={indisponivel ? 'Não há classificação de atraso no modelo atual.' : undefined}
              onClick={() => onChange(valor)}
              className={cn(
                'inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-full border px-3 text-[11.5px] font-semibold leading-none transition-colors duration-150 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring max-[699px]:last:col-span-2',
                estilo.inativo,
                selecionado && estilo.ativo,
                indisponivel && 'cursor-not-allowed opacity-60'
              )}
            >
              <span className="truncate">{rotulo}</span>
              <span
                className={cn(
                  'inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full border px-1 text-[9.5px] font-semibold tabular-nums leading-none',
                  estilo.capsula,
                  selecionado && 'bg-background/30'
                )}
                aria-label={indisponivel ? 'Indisponível' : `${contagem} inscrição(ões)`}
              >
                {indisponivel ? '—' : contagem}
              </span>
            </button>
          );
        })}
      </motion.div>
    </EntradaPresenca>
  );
}
