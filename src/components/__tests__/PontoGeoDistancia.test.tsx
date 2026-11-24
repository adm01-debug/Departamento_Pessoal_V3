import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

/**
 * ============================================================================
 * COLUNAS DO "DISTRIBUIÇÃO POR DISTÂNCIA"
 *
 * O gráfico passou a usar o desenho do card "2. Visualize o impacto"
 * (`Cell fill={contorno} fillOpacity={0.2} stroke={contorno}`): cada coluna é
 * VAZADA — contorno de 1,5 px na cor do token + preenchimento da mesma cor a
 * 20% — e o valor da faixa aparece ACIMA da coluna. Este teste prova as três
 * coisas no DOM: o par de classes por faixa, o número acima da coluna certa e
 * a faixa sem registro (que não pode virar uma linha falsa no eixo).
 * ============================================================================
 */
vi.mock('framer-motion', () => {
  const propsDom = ({ initial: _i, animate: _a, transition: _t, variants: _v, exit: _e, ...props }: any) => props;
  const motion = { div: ({ children, ...props }: any) => <div {...propsDom(props)}>{children}</div> };
  return {
    motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    MotionConfig: ({ children }: any) => <>{children}</>,
    useInView: () => true,
    useReducedMotion: () => false,
  };
});

import { PontoGeoDistancia } from '../ponto/PontoGeoDistancia';
import type { FaixaDistancia } from '@/utils/pontoGeofencing';

/** As cinco faixas da vitrine (48 / 27 / 14 / 7 / 3 em 99 registros). */
const FAIXAS: FaixaDistancia[] = [
  { chave: '0', rotulo: '0 – 50 m', minimo: 0, maximo: 50, quantidade: 48, percentual: 48.5, foraDoRaio: false },
  { chave: '50', rotulo: '50 – 100 m', minimo: 50, maximo: 100, quantidade: 27, percentual: 27.3, foraDoRaio: false },
  {
    chave: '100',
    rotulo: '100 – 150 m',
    minimo: 100,
    maximo: 150,
    quantidade: 14,
    percentual: 14.1,
    foraDoRaio: false,
  },
  { chave: '150', rotulo: '150 – 200 m', minimo: 150, maximo: 200, quantidade: 7, percentual: 7.1, foraDoRaio: false },
  { chave: 'acima', rotulo: '> 200 m', minimo: 200, maximo: null, quantidade: 3, percentual: 3, foraDoRaio: true },
];

const barras = () => Array.from(document.querySelectorAll<HTMLElement>('[data-barra]'));
const colunaDaBarra = (indice: number) => barras()[indice].closest<HTMLElement>('[data-coluna]') as HTMLElement;

describe('PontoGeoDistancia · colunas vazadas', () => {
  it('usa contorno e preenchimento do MESMO token em cada faixa', () => {
    render(<PontoGeoDistancia faixas={FAIXAS} total={99} reduzido={false} />);

    const esperado = [
      ['border-success', 'bg-success/20'],
      ['border-primary', 'bg-primary/20'],
      ['border-info', 'bg-info/20'],
      ['border-xp', 'bg-xp/20'],
      ['border-destructive-vivid', 'bg-destructive-vivid/20'],
    ];

    expect(barras()).toHaveLength(FAIXAS.length);
    esperado.forEach(([borda, fundo], indice) => {
      const barra = barras()[indice];
      expect(barra.className).toContain(borda);
      expect(barra.className).toContain(fundo);
      // Cantos superiores arredondados + contorno fino; base reta no eixo.
      expect(barra.className).toContain('rounded-t-[6px]');
      expect(barra.className).toContain('border-[1.5px]');
    });
  });

  it('escreve a quantidade acima da coluna correspondente', () => {
    render(<PontoGeoDistancia faixas={FAIXAS} total={99} reduzido={false} />);

    FAIXAS.forEach((faixa, indice) => {
      const coluna = colunaDaBarra(indice);
      expect(within(coluna).getByText(String(faixa.quantidade))).toBeInTheDocument();
    });

    // O total do período continua no cabeçalho do card.
    expect(screen.getByText('99 registros')).toBeInTheDocument();
  });

  it('não desenha barra (nem contorno) na faixa sem registro', () => {
    const semRegistro: FaixaDistancia[] = FAIXAS.map((faixa, indice) =>
      indice === 3 ? { ...faixa, quantidade: 0, percentual: 0 } : faixa
    );
    render(<PontoGeoDistancia faixas={semRegistro} total={96} reduzido={false} />);

    const vazia = barras()[3];
    expect(vazia.className).not.toContain('border-xp');
    expect(vazia.className).not.toContain('bg-xp/20');
    // A coluna continua existindo, com o zero acima dela.
    expect(within(colunaDaBarra(3)).getByText('0')).toBeInTheDocument();
  });
});
