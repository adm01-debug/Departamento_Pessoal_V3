import type { ReactNode, Ref } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MotionCard, entradaCard } from '@/components/ui/entrada-cards';
import { CARD_INTERACAO_ESTATICO } from '@/components/ui/interacao-cards';
import { cn } from '@/lib/utils';

/**
 * ============================================================================
 * CASCO DOS PAINÉIS DA ANALYTICS — um só desenho para todos os blocos
 *
 * CAMADAS (ver `analyticsVisual.ts`): este casco é a camada 2 (superfície
 * `--card`, opaca). Tudo que entra no corpo — etapas do funil, taxa de
 * conversão, cards de tempo, alertas, origens — usa `SUPERFICIE_INTERNA`
 * (camada 3, mais clara que o painel) para a hierarquia ficar legível: página
 * quase preta → painel → sub-elemento. O casco não pinta sub-elemento nenhum:
 * quem conhece o conteúdo escolhe a camada.
 *
 * Cabeçalho compacto: ícone em chip (cor semântica do painel), título em
 * `font-display`, subtítulo de uma linha e ação opcional à direita. O corpo é
 * `flex-col` com `min-h-0` para listas/gráficos esticarem sem estourar o card.
 * A entrada é a MESMA cascata do módulo (`entradaCard`), com o índice da tela.
 *
 * INTERAÇÃO: **nenhuma** — o painel é visualmente estático ao mouse. A aba
 * inteira usa o perfil `CARD_INTERACAO_ESTATICO` de `ui/interacao-cards.ts`
 * (revisão de UI/UX: o hover decorativo de quinze cards competia com os
 * tooltips e com as linhas que de fato respondem ao cursor). Saíram a elevação
 * de 2px e o contorno que acendia em `primary/40` — o verde-lime do tema; a
 * borda de repouso (`border-border/55`) e a superfície (`bg-card`) continuam
 * exatamente as mesmas. Botões, `Select` e `InfoTooltip` do cabeçalho mantêm o
 * hover/focus deles, e a ENTRADA (`entradaCard`) segue intacta: o que fica em
 * repouso é só o container do card.
 * ============================================================================
 */
export type TomAnalytics = 'primary' | 'info' | 'chart4' | 'success' | 'warning' | 'destructive';

const TONS: Record<TomAnalytics, { chip: string; halo: string; texto: string }> = {
  primary: { chip: 'border-primary/25 bg-primary/10 text-primary', halo: 'bg-primary/10', texto: 'text-primary' },
  info: { chip: 'border-info/25 bg-info/10 text-info', halo: 'bg-info/10', texto: 'text-info' },
  chart4: {
    chip: 'border-[hsl(var(--chart-4)/0.28)] bg-[hsl(var(--chart-4)/0.12)] text-[hsl(var(--chart-4))]',
    halo: 'bg-[hsl(var(--chart-4)/0.10)]',
    texto: 'text-[hsl(var(--chart-4))]',
  },
  success: { chip: 'border-success/25 bg-success/10 text-success', halo: 'bg-success/10', texto: 'text-success' },
  warning: { chip: 'border-warning/25 bg-warning/10 text-warning', halo: 'bg-warning/10', texto: 'text-warning' },
  destructive: {
    chip: 'border-destructive-vivid/25 bg-destructive-vivid/10 text-destructive-vivid',
    halo: 'bg-destructive-vivid/10',
    texto: 'text-destructive-vivid',
  },
};

interface AnalyticsPainelProps {
  /** Ícone opcional: o Funil usa o cabeçalho sem chip, como na referência. */
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  /** Posição na cascata de entrada da tela. */
  index: number;
  tom?: TomAnalytics;
  className?: string;
  contentClassName?: string;
  /**
   * Exceção ao título de UMA linha (`truncate`).
   *
   * O painel da Evolução é o único que carrega um seletor no canto superior
   * direito: nos ~306px dele em 1440 sobram ~110px para o título de 193px, e
   * `truncate` cortava "Evolução de candidaturas" em "Evolução de …". Quem
   * passa `line-clamp-2 whitespace-normal` aceita o título em duas linhas (o
   * gráfico absorve a altura extra) em vez de perder o nome do painel.
   */
  titleClassName?: string;
  /**
   * Exceção ao subtítulo de UMA linha.
   *
   * Mesma ideia do `titleClassName`: o padrão do casco (`text-[10px] leading-snug`)
   * é o degrau dos sete painéis da aba. Os dois painéis da faixa de operação
   * (atenção e vagas) pedem um subtítulo de 12px com `leading-[1.4]` para
   * acompanhar o título de 15px — quem quiser esse degrau pede explicitamente,
   * e os demais painéis continuam exatamente como estavam.
   */
  subtitleClassName?: string;
  /**
   * Ref do CARD animado (o `div` que carrega a entrada da cascata).
   *
   * Existe para quem precisa observar o painel inteiro — caso do Funil, que só
   * dispara a coreografia interna quando 20% do card está na viewport
   * (`useInView`). Nenhum estilo passa por aqui: o casco, as classes e a
   * animação de entrada continuam exatamente os mesmos.
   */
  cardRef?: Ref<HTMLDivElement>;
  /**
   * Repassa o `onAnimationComplete` do card — o FIM da entrada da cascata.
   *
   * É a fonte primária de `useEntradaCardConcluida()`: a sequência interna
   * (contadores, anéis, funil) espera a entrada externa estabilizar para não
   * correr atrás de um card que ainda está subindo.
   */
  aoConcluirEntrada?: () => void;
}

export function AnalyticsPainel({
  icon: Icon,
  title,
  subtitle,
  action,
  children,
  index,
  tom = 'primary',
  className,
  contentClassName,
  titleClassName,
  subtitleClassName,
  cardRef,
  aoConcluirEntrada,
}: AnalyticsPainelProps) {
  const tons = TONS[tom];
  return (
    // `data-entrada="cascata"` — OPT-OUT da entrada por CSS, como nos cards do
    // Dashboard Executivo. Este painel JÁ entra por Framer Motion
    // (`entradaCard(index)`, a mesma régua global: 14px, 520ms, 120ms), mas o
    // `Card` do design system carrega `.animate-squash` e a aba monta dentro de
    // um `EntradaPresenca` (`initial` verdadeiro), então as DUAS entradas
    // rodavam no mesmo nó. A CSS chega ao fim primeiro e, com
    // `animation-fill-mode: backwards`, devolve `transform`/`opacity` para a
    // Motion — que aqui ainda está no começo do seu slot (0,48 s a 0,96 s):
    // o painel subia, DESCIA os 14px de volta e subia outra vez. Com o atributo
    // a entrada por CSS é desligada (`index.css`) e sobra um movimento só.
    <MotionCard
      ref={cardRef}
      {...entradaCard(index)}
      onAnimationComplete={aoConcluirEntrada}
      data-entrada="cascata"
      data-analytics-painel={title}
      className={cn(
        'relative flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border/55 bg-card',
        CARD_INTERACAO_ESTATICO,
        className
      )}
    >
      {/* Padding horizontal de 16px de projeto (20px reais na escala de 125%):
          com `px-5` a caixa útil dos painéis estreitos da terceira faixa caía
          para ~110px e três títulos de painel ("Evolução de candidaturas",
          "Desempenho por vaga") não cabiam. 16px é o degrau do Design System
          para o interior de um card e devolve ~10px por lado aos três painéis. */}
      {/* Cabeçalho: 12px em cima e 8px embaixo (eram 10/6). O respiro aqui vale
          para TODOS os painéis da aba e é o que dá ao cabeçalho a mesma escala
          dos blocos internos: chip de 40px reais + duas linhas de texto cabem em
          ~65px reais, e o conteúdo (gráfico, listas, ladrilhos) fica com a
          altura que sobra — sem apertar as faixas da página. */}
      <CardHeader className="relative flex flex-row items-start justify-between gap-1.5 space-y-0 px-4 pb-2 pt-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border', tons.chip)}>
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <CardTitle
              className={cn(
                'truncate font-display text-[13px] font-semibold leading-tight tracking-tight',
                titleClassName
              )}
              title={title}
            >
              {title}
            </CardTitle>
            {subtitle && (
              <CardDescription className={cn('mt-0.5 line-clamp-2 text-[10px] leading-snug', subtitleClassName)}>
                {subtitle}
              </CardDescription>
            )}
          </div>
        </div>
        {action && <div className="shrink-0 self-start">{action}</div>}
      </CardHeader>
      <CardContent className={cn('relative flex flex-1 flex-col px-4 pb-3 pt-1', contentClassName)}>
        {children}
      </CardContent>
    </MotionCard>
  );
}

/** Selo compacto de contagem usado no cabeçalho dos painéis. `px-1.5` (e não
 * `px-2`): são 5px que faltavam para o título "Pontos de atenção" (140px) caber
 * na caixa de ~137px que sobra no painel de ~309px em 1440, ao lado do selo
 * "3 alertas" e do ícone. O selo é um apoio, não um botão: a folga extra ia
 * toda para o texto truncado. */
export function ChipContagem({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/50 bg-[hsl(var(--foreground)/0.045)] px-1 py-0.5 text-[9.5px] font-medium leading-none tabular-nums text-muted-foreground">
      {children}
    </span>
  );
}
