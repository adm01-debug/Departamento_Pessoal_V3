import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AnimatedTabsList, AnimatedTabsTrigger } from '@/components/ui/animated-tabs';

/**
 * Testes do módulo compartilhado de tablist animada
 * (`src/components/ui/animated-tabs.tsx`) — usado por `AvaliacaoPage` e
 * `PremiacoesPage`. Guardam as três propriedades que fazem a animação ser
 * um SLIDE de verdade (e não um crossfade):
 *
 * 1. o indicador (`[data-slot="motion-highlight"]`) existe já no primeiro
 *    mount, sem precisar clicar em nada;
 * 2. é o MESMO nó DOM entre trocas de aba (nunca desmonta);
 * 3. é REMEDIDO a cada troca, indo para a faixa do trigger ativo.
 *
 * O jsdom não faz layout: `getBoundingClientRect` devolve zeros para tudo, e
 * o indicador seria sempre "0x0 na origem" (o teste não provaria nada). Por
 * isso a medição é substituída por uma régua previsível — todo elemento com
 * `data-value` (atributo que o `HighlightItem` injeta no trigger) devolve uma
 * faixa fixa de `TAB_WIDTH` x `TAB_HEIGHT` na posição do índice da aba.
 */

const TAB_VALUES = ['dashboard', 'kanban', 'onboarding', 'gestao', 'auditoria'] as const;
const TAB_WIDTH = 300;
const TAB_HEIGHT = 44;

function rectFor(index: number): DOMRect {
  // `index < 0` = elemento que não é trigger (container/lista): retângulo
  // zero na origem, senão o cálculo relativo do `Highlight`
  // (`itemRect.left - containerRect.left`) sairia deslocado do alvo.
  const isTab = index >= 0;
  const left = isTab ? index * TAB_WIDTH : 0;
  const width = isTab ? TAB_WIDTH : 0;
  const height = isTab ? TAB_HEIGHT : 0;

  return {
    x: left,
    y: 0,
    left,
    top: 0,
    width,
    height,
    right: left + width,
    bottom: height,
    toJSON: () => ({}),
  } as DOMRect;
}

function stubTabRects() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const value = this.getAttribute('data-value');
    const index = value ? TAB_VALUES.indexOf(value as (typeof TAB_VALUES)[number]) : -1;
    return rectFor(index);
  });
}

/** Indicador deslizante do `Highlight` em `mode="parent"`. */
function getIndicator(container: HTMLElement): HTMLElement {
  const indicator = container.querySelector<HTMLElement>('[data-slot="motion-highlight"]');
  if (!indicator) throw new Error('indicador deslizante não foi montado');
  return indicator;
}

function leftOf(indicator: HTMLElement): number {
  return Number.parseFloat(indicator.style.left || '0');
}

/** Espera a mola assentar (no fim o alvo é aplicado sem subpixel). */
async function expectLeft(indicator: HTMLElement, expected: number) {
  await waitFor(
    () => {
      expect(Math.abs(leftOf(indicator) - expected)).toBeLessThan(1.5);
    },
    { timeout: 4000 }
  );
}

/** Mesma composição de `PremiacoesPage`: Radix `Tabs` + tablist animada. */
function PremiacoesLikeTabs({ initialValue = 'dashboard' }: { initialValue?: string }) {
  const [value, setValue] = React.useState(initialValue);

  return (
    <Tabs value={value} onValueChange={setValue}>
      <AnimatedTabsList
        value={value}
        onValueChange={setValue}
        containerClassName="flex w-full items-stretch gap-0 rounded-2xl border border-border/40"
        listClassName="flex w-full items-stretch"
        highlightClassName="rounded-xl bg-gradient-to-b from-primary/15"
      >
        {TAB_VALUES.map((tabValue) => (
          <AnimatedTabsTrigger key={tabValue} value={tabValue} className="relative z-10 inline-flex items-center">
            {tabValue}
          </AnimatedTabsTrigger>
        ))}
      </AnimatedTabsList>

      <TabsContent value="dashboard">
        <p>CONTEUDO_DASHBOARD</p>
      </TabsContent>
      <TabsContent value="auditoria">
        <p>CONTEUDO_AUDITORIA</p>
      </TabsContent>
    </Tabs>
  );
}

describe('AnimatedTabsList (indicador deslizante)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('monta o indicador já na primeira pintura, na faixa da aba ativa', async () => {
    stubTabRects();
    const { container } = render(<PremiacoesLikeTabs />);

    // Sem nenhum clique: se o "assentamento" de first-mount do pacote falhar,
    // `boundsState` fica null e este nó nunca existe.
    const indicator = await waitFor(() => getIndicator(container));
    await expectLeft(indicator, 0); // 'dashboard' = índice 0
  });

  it('reusa o MESMO nó e remede o indicador ao trocar de aba', async () => {
    stubTabRects();
    const { container } = render(<PremiacoesLikeTabs />);
    const indicator = await waitFor(() => getIndicator(container));
    await expectLeft(indicator, 0);

    fireEvent.click(screen.getByRole('tab', { name: 'auditoria' }));

    // Mesma identidade de nó == nunca desmontou == o Framer interpola a
    // posição (slide); um crossfade desmontaria e criaria outro elemento.
    expect(getIndicator(container)).toBe(indicator);
    await expectLeft(indicator, TAB_VALUES.indexOf('auditoria') * TAB_WIDTH); // 1200
  });

  it('aplica a skin de cada área nos elementos do Animate UI', async () => {
    stubTabRects();
    const { container } = render(<PremiacoesLikeTabs />);
    const indicator = await waitFor(() => getIndicator(container));

    const skinContainer = container.querySelector('[data-slot="motion-highlight-container"]');
    const tablist = screen.getByRole('tablist');
    const activeTrigger = screen.getByRole('tab', { name: 'dashboard' });

    expect(skinContainer).toHaveClass('rounded-2xl');
    expect(tablist).toHaveClass('flex', 'w-full', 'items-stretch');
    expect(indicator).toHaveClass('rounded-xl', 'bg-gradient-to-b');
    expect(activeTrigger).toHaveClass('relative', 'z-10');
    expect(activeTrigger).toHaveAttribute('data-state', 'active');
  });

  it('mantém o conteúdo do Radix Tabs sincronizado com a aba clicada', async () => {
    stubTabRects();
    const { container } = render(<PremiacoesLikeTabs />);
    expect(container.textContent).toContain('CONTEUDO_DASHBOARD');
    expect(container.textContent).not.toContain('CONTEUDO_AUDITORIA');

    fireEvent.click(screen.getByRole('tab', { name: 'auditoria' }));

    await waitFor(() => expect(container.textContent).toContain('CONTEUDO_AUDITORIA'));
    expect(container.textContent).not.toContain('CONTEUDO_DASHBOARD');
  });
});
