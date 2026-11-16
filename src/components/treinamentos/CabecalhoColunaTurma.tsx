import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * ============================================================================
 * CABEÇALHO DE COLUNA — “Próximas turmas”, “Em andamento” e “Turmas concluídas”
 * do painel de Turmas / Instâncias.
 *
 * COMPOSIÇÃO (uma faixa por coluna, as três com a MESMA grade):
 *
 *   ┌──────────────────────────────────────────┐
 *   │ [ícone] Título                     [2]   │
 *   │         Subtítulo                        │
 *   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  ← acento de 2 px
 *   └──────────────────────────────────────────┘
 *
 * MEDIDAS COMPARTILHADAS (as três colunas usam as mesmas classes):
 *   • faixa com padding 12 px (x) / 10 px (y), raio 12 px e largura da coluna;
 *   • ícone solto (sem tile) de 18 px, na mesma linha do título;
 *   • título 13 px (tamanho já usado no módulo) e subtítulo 11 px;
 *   • contador de 20 px de altura e 22 px de largura mínima, à direita;
 *   • acento inferior de 2 px na cor do status;
 *   • cabeçalho → cards 8 px (`mb-2`), sem margem individual por coluna.
 *
 * GRADE: ícone (18 px) · textos (1fr) · contador (auto). O título e o contador
 * dividem a primeira linha; o subtítulo ocupa a segunda, começando no mesmo x
 * do título. Como as três colunas usam a mesma grade, alturas e alinhamentos
 * coincidem mesmo que o título seja truncado.
 *
 * RESPONSIVIDADE: título e subtítulo truncam com reticências (texto completo
 * em `title`), o contador é `shrink-0` e a coluna de texto usa `min-w-0` — em
 * larguras menores nada se sobrepõe e não há overflow horizontal.
 * ============================================================================
 */
export interface TomCabecalhoTurma {
  /** Cor do ícone solto. */
  icone: string;
  /** Borda + fundo translúcido da faixa. */
  superficie: string;
  /** Borda, fundo e texto do contador. */
  contador: string;
  /** Acento cromático inferior de 2 px. */
  acento: string;
}

export interface CabecalhoColunaTurmaProps {
  /** id do `<h2>` — o `<section>` da coluna aponta para ele via `aria-labelledby`. */
  id: string;
  titulo: string;
  descricao: string;
  contagem: number;
  icone: LucideIcon;
  /** Família cromática da coluna (azul / ciano / verde) — vem do painel. */
  tom: TomCabecalhoTurma;
}

export function CabecalhoColunaTurma({
  id,
  titulo,
  descricao,
  contagem,
  icone: Icone,
  tom,
}: CabecalhoColunaTurmaProps) {
  return (
    <header
      data-turmas-cabecalho
      className={cn(
        'relative mb-2 grid w-full min-w-0 grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-0.5 overflow-hidden rounded-xl border px-3 py-2.5',
        tom.superficie
      )}
    >
      <Icone className={cn('col-start-1 row-start-1 h-[18px] w-[18px] shrink-0', tom.icone)} aria-hidden />

      <h2
        id={id}
        title={titulo}
        className="col-start-2 row-start-1 min-w-0 truncate text-[13px] font-semibold leading-tight text-foreground"
      >
        {titulo}
      </h2>

      <span
        data-turmas-contador
        className={cn(
          'col-start-3 row-start-1 inline-flex h-5 min-w-[22px] shrink-0 items-center justify-center justify-self-end rounded-full border px-1.5 text-[10px] font-semibold leading-none tabular-nums',
          tom.contador
        )}
        title={`${contagem} turma(s)`}
      >
        {contagem}
      </span>

      <p
        className="col-span-2 col-start-2 row-start-2 truncate text-[11px] leading-tight text-muted-foreground"
        title={descricao}
      >
        {descricao}
      </p>

      <span
        data-turmas-acento
        aria-hidden
        className={cn('pointer-events-none absolute inset-x-0 bottom-0 h-0.5', tom.acento)}
      />
    </header>
  );
}
