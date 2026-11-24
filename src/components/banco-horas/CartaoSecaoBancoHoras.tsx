/**
 * ============================================================================
 * CARTAO DE SEÇÃO — a moldura única dos blocos da COLUNA DA DIREITA.
 *
 * A rosca de situação, as barras de totais, o alerta de saldo negativo e o
 * gráfico de evolução são quatro cards irmãos: mesma superfície (`rounded-[11px]`,
 * `border-border/50`, `bg-card`), mesmo cabeçalho (bloco de ícone de 28 px +
 * título de 14 px + subtítulo de 11 px) e mesmo respiro interno. Se cada um
 * repetisse as classes, o primeiro ajuste de espaçamento deixaria um deles
 * diferente — a moldura mora aqui, o conteúdo mora no card.
 *
 * O `acessorio` é o canto direito do cabeçalho: um contador ("8 colaboradores"),
 * o recorte de datas ou um selo. Ele fica na MESMA linha do título (alinhado à
 * base) e o subtítulo ocupa a linha de baixo, com a largura inteira do card —
 * empilhar os três (título, subtítulo, acessório) custava ~83 px de cabeçalho em
 * cada card e a coluna da direita crescia até quase o dobro do extrato.
 *
 * `esticar` faz o card ocupar a sobra de altura da coluna (usado só pelo último
 * card da direita): o conteúdo dele cresce em vez de sobrar espaço vazio embaixo.
 *
 * A entrada segue a fila de CONTEÚDO do Design System (`entradaConteudoGlobal`)
 * e `data-entrada="cascata"` evita o `.animate-squash` do `Card` brigando com a
 * animação do `MotionCard`.
 * ============================================================================
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { EntradaPresenca, MotionCard } from '@/components/ui/entrada-cards';
import { entradaConteudoGlobal, propsEntradaGlobal } from '@/components/ui/entradaGlobal';
import { cn } from '@/lib/utils';

export interface CartaoSecaoBancoHorasProps {
  /** `id` do `<h2>` — alvo do `aria-labelledby` da seção. */
  id: string;
  icone: LucideIcon;
  /** Tom do bloco do ícone, no vocabulário do sistema (`bg-info/15 text-info`). */
  tom: string;
  titulo: string;
  /** Linha de contexto abaixo do título (aceita trecho formatado, ex.: valor + texto). */
  subtitulo?: ReactNode;
  /**
   * Deixa o subtítulo ocupar DUAS linhas em vez de cortar com reticências.
   * Usado pelo card de saldos negativos, cujo subtítulo é uma frase inteira
   * ("5h00 em dívida com 3 colaboradores") — na coluna estreita ela não cabe em
   * uma linha e o corte comeria justamente o número de pessoas.
   */
  subtituloMultilinha?: boolean;
  /** Canto direito do cabeçalho: contador, período, selo. */
  acessorio?: ReactNode;
  /** Posição na BANDA DE CONTEÚDO da fila única de entrada. */
  index?: number;
  /**
   * Avisa que a ENTRADA do card terminou — o `onAnimationComplete` real do
   * `MotionCard`. É o portão para o conteúdo interno animar depois do fade
   * (`useEntradaCardConcluida`), como em `dashboard/TipoVinculoCard.tsx`.
   */
  aoConcluirEntrada?: () => void;
  /** Ocupa a sobra de altura da coluna (último card da pilha da direita). */
  esticar?: boolean;
  className?: string;
  children: ReactNode;
}

export function CartaoSecaoBancoHoras({
  id,
  icone: Icone,
  tom,
  titulo,
  subtitulo,
  subtituloMultilinha = false,
  acessorio,
  index = 0,
  aoConcluirEntrada,
  esticar = false,
  className,
  children,
}: CartaoSecaoBancoHorasProps) {
  return (
    <EntradaPresenca>
      <section aria-labelledby={id} className={cn('min-w-0', esticar && 'flex min-h-0 flex-1 flex-col')}>
        <MotionCard
          {...propsEntradaGlobal(index, entradaConteudoGlobal)}
          onAnimationComplete={aoConcluirEntrada}
          data-entrada="cascata"
          className={cn(
            'rounded-[11px] border-border/50',
            esticar && 'flex min-h-0 flex-1 flex-col',
            className
          )}
        >
          {/*
            CABEÇALHO EM DUAS LINHAS CURTAS — título e acessório dividem a
            primeira linha (o acessório nunca empurra o título: ele é `shrink-0`
            e o título trunca antes); o subtítulo usa a largura inteira na
            segunda. Três linhas (título / subtítulo / acessório) davam 83 px de
            cabeçalho em cada card.
          */}
          <div className="border-b border-border/40 px-[12px] pb-[5px] pt-[7px]">
            <div className="flex min-w-0 items-center gap-[9px]">
              <span className={cn('grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[8px]', tom)}>
                <Icone className="h-[14px] w-[14px]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center justify-between gap-[8px]">
                  <h2
                    id={id}
                    className="truncate text-[13px] font-semibold leading-tight text-foreground"
                  >
                    {titulo}
                  </h2>
                  {acessorio && <div className="shrink-0">{acessorio}</div>}
                </div>
                {subtitulo && (
                  <p
                    className={cn(
                      'text-[10.5px] leading-tight text-muted-foreground',
                      subtituloMultilinha ? 'line-clamp-2' : 'truncate'
                    )}
                  >
                    {subtitulo}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div
            className={cn(
              'min-w-0 px-[12px] pb-[7px] pt-[6px]',
              esticar && 'flex min-h-0 flex-1 flex-col'
            )}
          >
            {children}
          </div>
        </MotionCard>
      </section>
    </EntradaPresenca>
  );
}
