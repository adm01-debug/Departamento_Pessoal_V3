import * as React from 'react';
import { AnimatedTabsList, AnimatedTabsTrigger } from '@/components/ui/animated-tabs';
import { cn } from '@/lib/utils';

/**
 * Tablist master do Dossiê de Colaboradores com highlight deslizante — usa
 * o mecanismo OFICIAL do Animate UI (`@animate-ui/components-animate-tabs`:
 * `TabsHighlight`/`TabsHighlightItem`), em `mode="parent"`.
 *
 * A mecânica da animação (indicador persistente + mola) foi extraída para
 * `src/components/ui/animated-tabs.tsx` — fonte única do padrão de troca de
 * abas do app — e este arquivo passou a ser só a skin do Dossiê: os mesmos
 * classNames de antes, nenhuma regra de posicionamento/animação própria.
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

const HIGHLIGHT_CLASSNAME = 'rounded-lg bg-background shadow-xs';

/**
 * Skin do container/indicador + layout da `<div role="tablist">`.
 *
 * `listClassName` é opcional e serve SÓ para áreas que precisam distribuir as
 * abas por toda a largura (Admissões: `flex w-full items-stretch` com
 * `flex-1` em cada trigger). Omitido — como no Dossiê de Colaboradores — vale
 * o padrão de `AnimatedTabsList` (`flex items-center`, largura do conteúdo),
 * ou seja: nenhuma classe efetiva muda para quem não passa a prop.
 */
export function AnimatedDossieTabsList({
  value,
  onValueChange,
  children,
  listClassName,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  /** Layout da tablist. Padrão: `flex items-center` (skin do Dossiê). */
  listClassName?: string;
}) {
  return (
    <AnimatedTabsList
      value={value}
      onValueChange={onValueChange}
      containerClassName={LIST_CONTAINER_CLASSNAME}
      highlightClassName={HIGHLIGHT_CLASSNAME}
      listClassName={listClassName}
    >
      {children}
    </AnimatedTabsList>
  );
}

/**
 * Trigger da skin do Dossiê. `className` é opcional e vai SOMADO à skin
 * (via `cn`, que resolve conflito de utilitários): Admissões passa `flex-1`
 * para cada aba ocupar exatamente 1/5 da tablist. Sem a prop, a string de
 * classe do trigger é literalmente `TRIGGER_CLASSNAME` — o Dossiê continua
 * renderizando exatamente o mesmo DOM.
 */
export function AnimatedDossieTabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  /** Classes extras somadas à skin do trigger (ex.: `flex-1` em Admissões). */
  className?: string;
}) {
  return (
    <AnimatedTabsTrigger value={value} className={className ? cn(TRIGGER_CLASSNAME, className) : TRIGGER_CLASSNAME}>
      {children}
    </AnimatedTabsTrigger>
  );
}

