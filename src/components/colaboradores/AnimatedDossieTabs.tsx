import * as React from 'react';
import {
  Tabs as AnimateTabsPrimitive,
  TabsList as AnimateTabsListPrimitive,
  TabsTrigger as AnimateTabsTriggerPrimitive,
  TabsHighlight,
  TabsHighlightItem,
} from '@/components/animate-ui/primitives/animate/tabs';

/**
 * Tablist master do Dossiê de Colaboradores com highlight deslizante — usa
 * o mecanismo OFICIAL do Animate UI (`@animate-ui/components-animate-tabs`:
 * `TabsHighlight`/`TabsHighlightItem`), em `mode="parent"`.
 *
 * Por quê `mode="parent"` e não o `mode="children"` (padrão do componente
 * pré-estilizado do Animate UI, `components/animate/tabs.tsx`): em
 * `mode="children"`, cada `TabsHighlightItem` ativo renderiza seu próprio
 * `motion.div` com `layoutId` compartilhado dentro de um
 * `AnimatePresence mode="wait"` — esse `mode="wait"` faz o item antigo
 * terminar de sair (desmontar) ANTES do novo montar, então nunca existem
 * dois nós com o mesmo `layoutId` presentes ao mesmo tempo pro Framer
 * Motion interpolar uma posição compartilhada: na prática vira um
 * crossfade (some num lugar, aparece no outro), não um slide perceptível
 * — foi essa a limitação (idêntica à tentativa manual anterior, que usava
 * o mesmo layoutId+AnimatePresence) que motivou trocar de modo.
 * `mode="parent"` usa um único elemento persistente na raiz do
 * `TabsHighlight`, medido via `getBoundingClientRect()` do trigger ativo e
 * animado via `animate={{top,left,width,height}}` — nunca desmonta entre
 * trocas de aba, então sempre há uma interpolação física real.
 *
 * Wrapper isolado — NÃO mexe em `src/components/ui/tabs.tsx` (usado em
 * centenas de outros lugares do app). Só a tablist master do Dossiê usa
 * isto. O `<Tabs>`/`<TabsContent>` do Radix (`@/components/ui/tabs`) em
 * `ColaboradorDetalhesPage` continuam exatamente como estão por fora,
 * controlando o conteúdo das páginas (sem nenhuma animação) — isto aqui
 * só troca a `<TabsList>`/`<TabsTrigger>` visualmente, recebendo o mesmo
 * `value`/`onValueChange` pra ficar em sincronia com o Radix Tabs.
 */

// Classes efetivas computadas via twMerge a partir do que a tablist já
// renderizava antes desta migração (base do TabsList/TabsTrigger do
// shadcn + overrides da página) — reproduzidas aqui literalmente porque o
// TabsList/TabsTrigger "crus" do Animate UI não têm nenhuma classe própria
// (são só um `div role=tablist` e um `motion.button` em branco).
const LIST_CONTAINER_CLASSNAME =
  'inline-flex items-center text-muted-foreground bg-muted/50 rounded-xl p-1 border border-border/30 w-full justify-start flex-nowrap overflow-x-auto h-auto';

const TRIGGER_CLASSNAME =
  'inline-flex items-center justify-center whitespace-nowrap font-medium ring-offset-background transition-all focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative z-10 rounded-lg font-body px-4 py-2 text-sm gap-1.5 data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none';

export function AnimatedDossieTabsList({
  value,
  onValueChange,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
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
    forceSettle((n) => n + 1);
  }, []);

  const parentModeProps = {
    mode: 'parent' as const,
    className: 'rounded-lg bg-background shadow-xs',
    containerClassName: LIST_CONTAINER_CLASSNAME,
    transition: { type: 'spring' as const, stiffness: 220, damping: 24, mass: 0.7 },
  };

  return (
    <AnimateTabsPrimitive value={value} onValueChange={onValueChange}>
      <TabsHighlight {...(parentModeProps as unknown as React.ComponentProps<typeof TabsHighlight>)}>
        <AnimateTabsListPrimitive className="flex items-center">
          {children}
        </AnimateTabsListPrimitive>
      </TabsHighlight>
    </AnimateTabsPrimitive>
  );
}

export function AnimatedDossieTabsTrigger({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  return (
    <TabsHighlightItem value={value} asChild>
      <AnimateTabsTriggerPrimitive value={value} className={TRIGGER_CLASSNAME}>
        {children}
      </AnimateTabsTriggerPrimitive>
    </TabsHighlightItem>
  );
}
