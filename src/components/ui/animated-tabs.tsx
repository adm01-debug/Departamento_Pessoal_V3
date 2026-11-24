import * as React from 'react';
import {
  Tabs as AnimateTabsPrimitive,
  TabsList as AnimateTabsListPrimitive,
  TabsTrigger as AnimateTabsTriggerPrimitive,
  TabsHighlight,
  TabsHighlightItem,
} from '@/components/animate-ui/primitives/animate/tabs';

/**
 * Tablist com indicador deslizante — extraída do wrapper do Dossiê de
 * Colaboradores (`src/components/colaboradores/AnimatedDossieTabs.tsx`) para
 * ser o ÚNICO ponto de verdade do padrão de animação de troca de abas do app.
 *
 * Mecanismo (o do Animate UI, `@animate-ui/components-animate-tabs`) em
 * `mode="parent"`: um único `motion.div` persistente na raiz do
 * `TabsHighlight` — medido via `getBoundingClientRect()` do trigger ativo e
 * animado por `animate={{ top, left, width, height, opacity }}`. Como ele
 * nunca desmonta entre trocas, a interpolação da mola é sempre real.
 *
 * Por quê `mode="parent"` e não `mode="children"` (o padrão do componente
 * pré-estilizado do pacote): em `mode="children"` cada item ativo renderiza o
 * próprio `motion.div` com `layoutId` compartilhado dentro de um
 * `AnimatePresence mode="wait"` — o `wait` faz o item antigo desmontar ANTES do
 * novo montar, então nunca existem dois nós com o mesmo `layoutId` ao mesmo
 * tempo e o Framer não tem posição compartilhada para interpolar: na prática
 * vira um crossfade (some num lugar, aparece no outro), não um slide.
 *
 * As classes NÃO vivem aqui: cada área passa a própria skin por
 * `containerClassName` / `highlightClassName` / `listClassName` e por
 * `className` nos triggers, preservando 100% do layout de quem consome.
 * O `<Tabs>`/`<TabsContent>` do Radix (`@/components/ui/tabs`) continua por
 * fora, controlado pelo mesmo `value`/`onValueChange`, cuidando do conteúdo.
 */

/**
 * Mola oficial da troca de abas (a mesma do Dossiê de Colaboradores).
 * Exportada para que qualquer área que monte o `TabsHighlight` direto consiga
 * reaproveitar exatamente os mesmos parâmetros.
 */
export type AnimatedTabsTransition = React.ComponentProps<typeof TabsHighlight>['transition'];

// eslint-disable-next-line react-refresh/only-export-components
export const ANIMATED_TABS_SPRING: AnimatedTabsTransition = {
  type: 'spring',
  stiffness: 220,
  damping: 24,
  mass: 0.7,
};

export interface AnimatedTabsListProps {
  /** Aba ativa (sincronize com o mesmo valor do `<Tabs>` do Radix). */
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  /**
   * Skin do container (o `div` com `position: relative` que serve de
   * referência para o indicador). Aqui vão borda, fundo, padding e sombra da
   * barra de abas.
   */
  containerClassName?: string;
  /** Skin do indicador deslizante (o `motion.div` absoluto de z-index 0). */
  highlightClassName?: string;
  /** Classes da `<div role="tablist">` interna (padrão do Dossiê). */
  listClassName?: string;
  /** Sobrescreve a mola. Padrão: `ANIMATED_TABS_SPRING`. */
  transition?: AnimatedTabsTransition;
}

export function AnimatedTabsList({
  value,
  onValueChange,
  children,
  containerClassName,
  highlightClassName,
  listClassName = 'flex items-center',
  transition = ANIMATED_TABS_SPRING,
}: AnimatedTabsListProps) {
  // Bug de first-mount do pacote instalado (`Highlight`, mode="parent", em
  // primitives/effects/highlight.tsx): no primeiro commit, o efeito de
  // `HighlightItem` que reporta os bounds do trigger ativo roda ANTES do
  // efeito de `Highlight` que inicializa a ref pra onde esse report escreve
  // (`safeSetBoundsRef`) — ordem normal de effects React (filho antes do
  // pai), então a primeira chamada é descartada em silêncio e nenhum
  // highlight aparece até a primeira troca de aba (confirmado: funciona a
  // partir do primeiro clique, nunca no mount). Qualquer re-render seguinte
  // já resolve sozinho, porque a closure de `setBounds` muda de identidade
  // a cada render de `Highlight` e isso reexecuta o efeito de
  // `HighlightItem`. Fix: forçar UM re-render inofensivo logo após o mount
  // — não é lógica de animação/posição nova, só garante que o "assentamento"
  // que o próprio pacote já faz sozinho aconteça também na primeira pintura.
  const [, forceSettle] = React.useState(0);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-render único e intencional (não deriva estado de props/effects): é o mecanismo do fix descrito acima.
    forceSettle((n) => n + 1);
  }, []);

  const highlightProps = {
    mode: 'parent' as const,
    className: highlightClassName,
    containerClassName,
    transition,
  };

  return (
    <AnimateTabsPrimitive value={value} onValueChange={onValueChange}>
      <TabsHighlight {...(highlightProps as unknown as React.ComponentProps<typeof TabsHighlight>)}>
        <AnimateTabsListPrimitive className={listClassName}>{children}</AnimateTabsListPrimitive>
      </TabsHighlight>
    </AnimateTabsPrimitive>
  );
}

/**
 * Trigger da tablist animada. O `className` é a skin do botão — lembre-se de
 * incluir `relative z-10` (o indicador é absoluto com z-index 0 e, no caminho
 * `asChild` do `HighlightItem`, o pacote não injeta esse `style` sozinho).
 */
export function AnimatedTabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TabsHighlightItem value={value} asChild>
      <AnimateTabsTriggerPrimitive value={value} className={className}>
        {children}
      </AnimateTabsTriggerPrimitive>
    </TabsHighlightItem>
  );
}
