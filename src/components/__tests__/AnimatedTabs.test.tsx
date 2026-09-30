import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AnimatedTabsList, AnimatedTabsTrigger } from '@/components/ui/animated-tabs';
import { AnimatedDossieTabsList, AnimatedDossieTabsTrigger } from '@/components/colaboradores/AnimatedDossieTabs';

/**
 * Testes do módulo compartilhado de tablist animada
 * (`src/components/ui/animated-tabs.tsx`) — usado tanto pelo Dossiê de
 * Colaboradores (`AnimatedDossieTabs`) quanto por Admissões
 * (`AdmissoesPage`). Guardam as três propriedades que fazem a animação ser
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

/** Mesma composição de `AdmissoesPage`: Radix `Tabs` + tablist animada. */
function AdmissoesLikeTabs({ initialValue = 'dashboard' }: { initialValue?: string }) {
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
    const { container } = render(<AdmissoesLikeTabs />);

    // Sem nenhum clique: se o "assentamento" de first-mount do pacote falhar,
    // `boundsState` fica null e este nó nunca existe.
    const indicator = await waitFor(() => getIndicator(container));
    await expectLeft(indicator, 0); // 'dashboard' = índice 0
  });

  it('reusa o MESMO nó e remede o indicador ao trocar de aba', async () => {
    stubTabRects();
    const { container } = render(<AdmissoesLikeTabs />);
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
    const { container } = render(<AdmissoesLikeTabs />);
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
    const { container } = render(<AdmissoesLikeTabs />);
    expect(container.textContent).toContain('CONTEUDO_DASHBOARD');
    expect(container.textContent).not.toContain('CONTEUDO_AUDITORIA');

    fireEvent.click(screen.getByRole('tab', { name: 'auditoria' }));

    await waitFor(() => expect(container.textContent).toContain('CONTEUDO_AUDITORIA'));
    expect(container.textContent).not.toContain('CONTEUDO_DASHBOARD');
  });
});

describe('AnimatedDossieTabs (skin do Dossiê sobre o módulo compartilhado)', () => {
  afterEach(() => vi.restoreAllMocks());

  function DossieLikeTabs() {
    const [value, setValue] = React.useState('dashboard');
    return (
      <AnimatedDossieTabsList value={value} onValueChange={setValue}>
        <AnimatedDossieTabsTrigger value="dashboard">Painel</AnimatedDossieTabsTrigger>
        <AnimatedDossieTabsTrigger value="auditoria">Auditoria</AnimatedDossieTabsTrigger>
      </AnimatedDossieTabsList>
    );
  }

  /**
   * Admissões de verdade: skin do Dossiê + layout próprio (`listClassName`
   * full-width e `flex-1` em cada uma das 5 abas).
   */
  function AdmissoesOnDossieSkin() {
    const [value, setValue] = React.useState<string>('dashboard');
    return (
      <AnimatedDossieTabsList value={value} onValueChange={setValue} listClassName="flex w-full items-stretch">
        {TAB_VALUES.map((tabValue) => (
          <AnimatedDossieTabsTrigger key={tabValue} value={tabValue} className="flex-1">
            {tabValue}
          </AnimatedDossieTabsTrigger>
        ))}
      </AnimatedDossieTabsList>
    );
  }

  /** Lê um valor px de um style inline (`width`/`height`) do indicador. */
  function pxOf(value: string): number {
    return Number.parseFloat(value || '0');
  }

  it('renderiza o mesmo indicador com a skin do Dossiê', async () => {
    stubTabRects();
    const { container } = render(<DossieLikeTabs />);

    const indicator = await waitFor(() => getIndicator(container));

    expect(indicator).toHaveClass('rounded-lg', 'bg-background');
    expect(container.querySelector('[data-slot="motion-highlight-container"]')).toHaveClass('bg-muted/50');
    await expectLeft(indicator, 0);
  });

  it('move o indicador para a faixa da aba clicada', async () => {
    stubTabRects();
    const { container } = render(<DossieLikeTabs />);
    const indicator = await waitFor(() => getIndicator(container));

    fireEvent.click(screen.getByRole('tab', { name: 'Auditoria' }));

    expect(getIndicator(container)).toBe(indicator);
    await expectLeft(indicator, TAB_VALUES.indexOf('auditoria') * TAB_WIDTH); // 1200
  });

  it('sem classes extras, preserva o layout do Dossiê (largura do conteúdo)', () => {
    stubTabRects();
    render(<DossieLikeTabs />);

    const tablist = screen.getByRole('tablist');
    const trigger = screen.getByRole('tab', { name: 'Painel' });

    // O Dossiê não passa `listClassName`: segue exatamente `flex items-center`.
    expect(tablist).toHaveClass('flex', 'items-center');
    expect(tablist).not.toHaveClass('w-full');
    expect(tablist).not.toHaveClass('items-stretch');
    // …e nenhuma classe de layout de Admissões vaza para o trigger dele.
    expect(trigger).not.toHaveClass('flex-1');
    expect(trigger).toHaveClass('px-4', 'py-2', 'text-sm', 'relative', 'z-10');
  });

  it('Admissões: tablist full-width com as 5 abas em células iguais, skin intacta', async () => {
    stubTabRects();
    const { container } = render(<AdmissoesOnDossieSkin />);
    await waitFor(() => getIndicator(container));

    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveClass('flex', 'w-full', 'items-stretch');
    // `items-center` (padrão do Dossiê) NÃO pode sobrar junto: seriam dois
    // utilitários conflitantes de `align-items`, com vitória indefinida.
    expect(tablist).not.toHaveClass('items-center');

    const triggers = screen.getAllByRole('tab');
    expect(triggers).toHaveLength(TAB_VALUES.length); // 5
    for (const trigger of triggers) {
      expect(trigger).toHaveClass('flex-1'); // `flex: 1 1 0%` = 1/5 da tablist
      // Mesma skin de antes: nada de fonte/padding/altura/ícone mudou.
      expect(trigger).toHaveClass('px-4', 'py-2', 'text-sm', 'justify-center', 'whitespace-nowrap', 'relative', 'z-10');
      // E nada dimensionado pelo texto (era o que amontoava as abas à esquerda).
      expect(trigger.className).not.toMatch(/\bw-(fit|max|auto)\b/);
    }

    // Skin visual (container + indicador) continua a do Dossiê.
    const skinContainer = container.querySelector('[data-slot="motion-highlight-container"]');
    expect(skinContainer).toHaveClass('bg-muted/50', 'rounded-xl');
    expect(getIndicator(container)).toHaveClass('rounded-lg', 'bg-background');
  });

  it('Admissões: indicador remede e para na célula da aba clicada (largura nova)', async () => {
    stubTabRects();
    const { container } = render(<AdmissoesOnDossieSkin />);
    const indicator = await waitFor(() => getIndicator(container));
    await expectLeft(indicator, 0);

    fireEvent.click(screen.getByRole('tab', { name: 'auditoria' }));

    expect(getIndicator(container)).toBe(indicator);
    await expectLeft(indicator, TAB_VALUES.indexOf('auditoria') * TAB_WIDTH); // 1200
    // Geometria vem do `getBoundingClientRect()` do trigger ativo: com a aba
    // ocupando a célula inteira, o indicador acompanha a célula (não o texto).
    await waitFor(() => {
      expect(Math.abs(pxOf(indicator.style.width) - TAB_WIDTH)).toBeLessThan(1.5);
      expect(Math.abs(pxOf(indicator.style.height) - TAB_HEIGHT)).toBeLessThan(1.5);
    });
  });
});
