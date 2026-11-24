import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    // `entrada-cards.tsx` faz `motion.create(Card)`; nos testes o wrapper é o
    // próprio componente, como em `DesligamentoKPIs.test.tsx`.
    create: (Componente: any) => Componente,
  },
}));

import { HeartPulse } from 'lucide-react';

import { IndicadorPesquisa } from '../pesquisas/IndicadorPesquisa';

/**
 * Guarda-corpo do INDICADOR DA FAIXA DE MÉTRICAS de "Pesquisas de Clima & eNPS".
 *
 * O ajuste aprovado tirou a variação de baixo do número e a levou para o EXTREMO
 * DIREITO do card, na MESMA linha do número (é isso que a centraliza
 * verticalmente com ele) e um pouco maior (`text-[10px]` + `px-1.5 py-0.5`).
 * O jsdom não calcula layout, então o que se testa aqui é o CONTRATO que produz
 * aquele alinhamento — o grid de 2 linhas × 3 colunas, `row-span-2` no ícone e
 * `justify-self-end` na pílula. A medição em Chromium (0,00px de desvio no
 * centro do número e na borda direita, em 1440/900/380px) foi feita à parte.
 */

const CLASSES = (el: Element) => el.className.split(/\s+/).filter(Boolean);
const temClasse = (el: Element, classe: string) => CLASSES(el).includes(classe);

function renderIndicador(props: Partial<Parameters<typeof IndicadorPesquisa>[0]> = {}) {
  return render(
    <IndicadorPesquisa
      titulo="Participação média"
      valor="70%"
      icone={HeartPulse}
      caixa="bg-success/15 text-success"
      variacao="+12 p.p."
      {...props}
    />
  );
}

/** O card é o filho direto do container (o `motion.div` da entrada). */
const card = (container: HTMLElement) => container.firstElementChild as HTMLElement;
/** Quadrado do ícone: o `<span>` que embrulha o `<svg>`. */
const caixaIcone = (container: HTMLElement) => container.querySelector('svg')!.parentElement as HTMLElement;
/**
 * Pílula da variação: o `<span>` de primeiro nível da COLUNA 3. Não dá para
 * reconhecê-la por "não ter `<svg>`" — o ícone `TrendingUp` mora dentro dela.
 */
const pilula = (container: HTMLElement) =>
  Array.from(card(container).children).find((filho) => CLASSES(filho).includes('col-start-3')) as
    HTMLElement | undefined;

describe('IndicadorPesquisa — variação à direita, centralizada no número', () => {
  it('mostra título, valor e variação', () => {
    renderIndicador();

    expect(screen.getByText('Participação média')).toBeInTheDocument();
    expect(screen.getByText('70%')).toBeInTheDocument();
    expect(screen.getByText('+12 p.p.')).toBeInTheDocument();
  });

  it('transforma o card em grid de 2 linhas × 3 colunas (ícone · texto · pílula)', () => {
    const { container } = renderIndicador();
    const el = card(container);

    expect(temClasse(el, 'grid')).toBe(true);
    expect(temClasse(el, 'flex')).toBe(false);
    // Coluna 2 com `minmax(0,1fr)` é o que permite o título truncar em vez de
    // empurrar a pílula para fora do card nas larguras menores.
    expect(CLASSES(el)).toContain('grid-cols-[auto_minmax(0,1fr)_auto]');
    expect(temClasse(el, 'items-center')).toBe(true);
    // O respiro título→número virou gap do grid (mesmo 0,375rem): a linha 2
    // passa a medir só a altura do número, e é isso que alinha a pílula.
    expect(temClasse(el, 'gap-y-1.5')).toBe(true);
    expect(temClasse(el, 'gap-x-2.5')).toBe(true);
  });

  it('mantém o ícone atravessando as duas linhas (centro do card)', () => {
    const { container } = renderIndicador();
    const caixa = caixaIcone(container);

    expect(temClasse(caixa, 'row-span-2')).toBe(true);
    expect(temClasse(caixa, 'h-9')).toBe(true);
    expect(temClasse(caixa, 'w-9')).toBe(true);
    expect(temClasse(caixa, 'rounded-full')).toBe(true);
    // Tinta semântica da métrica continua vindo da página, intacta.
    expect(temClasse(caixa, 'bg-success/15')).toBe(true);
    expect(temClasse(caixa, 'text-success')).toBe(true);
  });

  it('coloca o título na linha 1 e o valor na linha 2 da coluna de texto', () => {
    const { container } = renderIndicador();
    const textos = Array.from(card(container).querySelectorAll('p'));

    expect(textos).toHaveLength(2);
    expect(temClasse(textos[0], 'col-start-2')).toBe(true);
    expect(temClasse(textos[0], 'row-start-1')).toBe(true);
    expect(temClasse(textos[1], 'col-start-2')).toBe(true);
    expect(temClasse(textos[1], 'row-start-2')).toBe(true);
    // O `mt-1.5` saiu: com ele, a linha 2 ficaria 7,5px mais alta que o número
    // e a pílula desceria junto.
    expect(temClasse(textos[1], 'mt-1.5')).toBe(false);
  });

  it('envia a pílula para a coluna 3 / linha 2, encostada à direita', () => {
    const { container } = renderIndicador();
    const el = pilula(container);

    expect(el).toBeInstanceOf(HTMLSpanElement);
    expect(temClasse(el!, 'col-start-3')).toBe(true);
    expect(temClasse(el!, 'row-start-2')).toBe(true);
    expect(temClasse(el!, 'justify-self-end')).toBe(true);
    // A variação não é mais a terceira linha de texto do bloco.
    expect(temClasse(el!, 'mt-1')).toBe(false);
    expect(temClasse(el!, 'mt-1.5')).toBe(false);
  });

  it('aumenta a escala da pílula sem mexer nas cores', () => {
    const { container } = renderIndicador();
    const el = pilula(container)!;

    // Escala: 9px → 10px (a régua px→rem do PostCSS renderiza 12,5px) e
    // respiro interno próprio, para a pílula não parecer espremida.
    expect(temClasse(el, 'text-[10px]')).toBe(true);
    expect(temClasse(el, 'px-1.5')).toBe(true);
    expect(temClasse(el, 'py-0.5')).toBe(true);
    expect(temClasse(el, 'gap-1')).toBe(true);
    // Tinta verde de sempre — nada de `text-success/80` nem de token novo.
    expect(temClasse(el, 'text-success')).toBe(true);
    // Regra do ajuste: NENHUMA cor de fundo foi acrescentada à pílula.
    expect(CLASSES(el).some((classe) => /^bg-/.test(classe))).toBe(false);
    // O glifo continua o mesmo (`TrendingUp`), só proporcional ao texto novo.
    expect(el.querySelector('svg')).toHaveClass('h-3', 'w-3');
  });

  it('sem variação a coluna 3 não existe e o card não muda de grade', () => {
    const { container } = renderIndicador({ variacao: undefined });

    expect(pilula(container)).toBeUndefined();
    expect(temClasse(card(container), 'grid-cols-[auto_minmax(0,1fr)_auto]')).toBe(true);
    expect(screen.getByText('70%')).toBeInTheDocument();
  });

  it('não voltou a usar a linha de apoio antiga (9px sob o número)', () => {
    const { container } = renderIndicador();

    expect(container.querySelector('.text-\\[9px\\]')).toBeNull();
    expect(temClasse(pilula(container)!, 'text-[9px]')).toBe(false);
  });
});
