type PropsAnimadas = {
  tag: string;
  initial: Record<string, unknown>;
  animate: Record<string, unknown>;
  transition: { duration: number; delay: number; ease?: string; [k: string]: unknown };
};

import type { ComponentProps, ElementType } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';

/**
 * CICLO DE VIDA dos cards da aba "Estrutura" do Dashboard Executivo —
 * RENDERIZAÇÃO CONDICIONAL ESTRITA em DUAS ETAPAS.
 *
 * O que este teste trava:
 *   1. ENQUANTO A ENTRADA DO CARD NÃO TERMINA, nenhum elemento animado existe no
 *      DOM: os `motion.div` das estatísticas, o `motion.circle` da rosca e as
 *      `motion.li` da legenda não são montados — só a casca e os placeholders.
 *      (Era este o furo: com dados na mão o conteúdo montava junto com o card e
 *      a animação interna rodava escondida atrás do fade de entrada.)
 *   2. a entrada é concluída pelo callback REAL do Framer Motion
 *      (`onAnimationComplete` do `MotionCard` da casca): no render seguinte ao
 *      evento, o conteúdo é MONTADO do zero (montagem = gatilho), partindo do
 *      `initial` de cada elemento;
 *   3. as duas condições são independentes e ambas obrigatórias: entrada
 *      concluída sem dados → continua skeleton; dados sem entrada concluída →
 *      continua skeleton;
 *   4. rede de segurança: se o callback NUNCA chegar, o conteúdo destrava no fim
 *      exato da régua (`atrasoDoSlot` + `duracaoMs` + margem) — nunca some;
 *   5. a régua não muda: 500 ms + 140 ms de cascata nos cards internos (16px de
 *      subida), arco de 1,8 s/0,2 s/0,15 s e legendas de 0,4 s com atrasos
 *      100/300/500/700/900 ms.
 */

/** Props capturadas de cada elemento animado (na ordem de montagem). */
const capturas = vi.hoisted(() => [] as PropsAnimadas[]);

/** `onAnimationComplete` das cascas — o teste decide QUANDO a entrada terminou. */
const entradasPendentes = vi.hoisted(() => [] as (() => void)[]);

vi.mock('framer-motion', async () => {
  const { useEffect } = await import('react');

  const criar = (tag: 'div' | 'li' | 'circle') => {
    const Comp = ({
      initial,
      animate,
      transition,
      children,
      ...rest
    }: ComponentProps<'div'> & { initial?: unknown; animate?: unknown; transition?: unknown }) => {
      capturas.push({
        tag,
        initial: (initial ?? {}) as Record<string, unknown>,
        animate: (animate ?? {}) as Record<string, unknown>,
        transition: transition as PropsAnimadas['transition'],
      });
      const Tag = tag as ElementType;
      return <Tag {...rest}>{children}</Tag>;
    };
    Comp.displayName = `motion.${tag}`;
    return Comp;
  };

  return {
    motion: {
      div: criar('div'),
      li: criar('li'),
      circle: criar('circle'),
      // Os componentes fazem `motion.create(Card)` para a casca do card. As
      // Motion props ficam com o nó de animação (não são repassadas ao
      // componente embrulhado) e o `onAnimationComplete` é registrado aqui —
      // é por ele que o teste "conclui" a entrada.
      create: (Comp: ElementType) => {
        const Casca = ({
          onAnimationComplete,
          initial,
          animate,
          variants,
          custom,
          transition,
          children,
          ...rest
        }: ComponentProps<'div'> & {
          onAnimationComplete?: () => void;
          initial?: unknown;
          animate?: unknown;
          variants?: unknown;
          custom?: unknown;
          transition?: unknown;
        }) => {
          useEffect(() => {
            if (onAnimationComplete) entradasPendentes.push(onAnimationComplete);
          }, [onAnimationComplete]);
          return <Comp {...rest}>{children}</Comp>;
        };
        const nomeDoComp = Comp as unknown as { displayName?: string; name?: string };
        Casca.displayName = `motion.create(${nomeDoComp.displayName ?? nomeDoComp.name ?? ''})`;
        return Casca;
      },
    },
    // O gráfico desenha quando está na viewport; aqui ele sempre "está".
    useInView: () => true,
    useReducedMotion: () => false,
  };
});

import { CONFIG_ENTRADA_CARD_GLOBAL, atrasoDoSlot, slotConteudoIntercalado } from '@/components/ui/entradaGlobal';
import { MapaEstruturaCard } from '../dashboard/MapaEstruturaCard';
import { TipoVinculoCard } from '../dashboard/TipoVinculoCard';

const MAPA = { departamentos: 6, times: 18, cargos: 37, liderancas: 9, niveis: 4 };
const VINCULOS = [
  { nome: 'CLT', value: 111 },
  { nome: 'PJ', value: 17 },
  { nome: 'Estágio', value: 7 },
  { nome: 'Aprendiz', value: 4 },
  { nome: 'Temporário', value: 3 },
];

function propsDe(tag: string) {
  return capturas.filter((c) => c.tag === tag);
}

/** Fim da régua de entrada do card (mesma conta da variante, sem a margem). */
function msDaEntrada(slotCascata: number) {
  return atrasoDoSlot(slotConteudoIntercalado(slotCascata)) * 1000 + CONFIG_ENTRADA_CARD_GLOBAL.duracaoMs;
}

/** Dispara o `onAnimationComplete` das cascas montadas (fim da entrada do card). */
function concluirEntradaDoCard() {
  const pendentes = entradasPendentes.splice(0, entradasPendentes.length);
  act(() => {
    pendentes.forEach((concluir) => concluir());
  });
  return pendentes.length;
}

beforeEach(() => {
  capturas.length = 0;
  entradasPendentes.length = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('MapaEstruturaCard — ciclo de vida (entrada do card → conteúdo)', () => {
  it('registra o fim da entrada (onAnimationComplete) e não monta o conteúdo antes', () => {
    const { container } = render(<MapaEstruturaCard dados={MAPA} isLoading={false} slotCascata={0} />);

    // A entrada do card ainda NÃO terminou: só casca + placeholders.
    expect(entradasPendentes.length).toBeGreaterThan(0);
    expect(propsDe('div')).toHaveLength(0);
    expect(screen.queryByText('Departamentos')).toBeNull();
    expect(screen.getByText('Mapa da Estrutura')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(5);
  });

  it('concluída a entrada, monta as 5 estatísticas do zero (montagem = gatilho)', () => {
    const { container } = render(<MapaEstruturaCard dados={MAPA} isLoading={false} slotCascata={0} />);
    expect(propsDe('div')).toHaveLength(0);

    concluirEntradaDoCard();

    expect(screen.getByText('Departamentos')).toBeInTheDocument();
    expect(screen.getByText('Times')).toBeInTheDocument();
    expect(screen.getByText('Cargos')).toBeInTheDocument();
    expect(screen.getByText('Lideranças')).toBeInTheDocument();
    expect(screen.getByText('Níveis hierárquicos')).toBeInTheDocument();
    // Os 5 cards animados foram montados AGORA, do zero.
    expect(propsDe('div')).toHaveLength(5);
    // Os placeholders saíram de cena.
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
  });

  it('entrada concluída + isLoading: NADA animado (sem animação vazia)', () => {
    const { container } = render(<MapaEstruturaCard dados={MAPA} isLoading slotCascata={0} />);

    concluirEntradaDoCard();

    expect(propsDe('div')).toHaveLength(0);
    expect(screen.queryByText('Departamentos')).toBeNull();
    expect(screen.queryByText('Níveis hierárquicos')).toBeNull();
    expect(screen.getByText('Mapa da Estrutura')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(5);
  });

  it('dados que chegam DEPOIS da entrada animam na chegada', () => {
    const { rerender } = render(<MapaEstruturaCard dados={MAPA} isLoading slotCascata={0} />);
    concluirEntradaDoCard();
    expect(screen.queryByText('Departamentos')).toBeNull();

    rerender(<MapaEstruturaCard dados={MAPA} isLoading={false} slotCascata={0} />);

    expect(screen.getByText('Departamentos')).toBeInTheDocument();
    expect(propsDe('div')).toHaveLength(5);
    expect(propsDe('div')[0].initial).toMatchObject({ opacity: 0, y: 16 });
  });

  it('a cascata parte do initial (opacity 0 + subida de 16px): 500 ms, 140 ms entre cards', () => {
    render(<MapaEstruturaCard dados={MAPA} isLoading={false} slotCascata={0} />);
    concluirEntradaDoCard();

    propsDe('div').forEach((card, i) => {
      expect(card.initial).toMatchObject({ opacity: 0, y: 16 });
      expect(card.animate).toMatchObject({ opacity: 1, y: 0 });
      expect(card.transition.duration).toBe(0.5);
      expect(card.transition.delay).toBeCloseTo(i * 0.14, 5);
    });

    // A cascata tem de ser PERCEPTÍVEL: o passo supera o limiar de percepção
    // (~100 ms) e é bem menor que a duração — há sobreposição, mas há ordem.
    const duracao = propsDe('div')[0].transition.duration;
    const passo = propsDe('div')[1].transition.delay;
    expect(passo).toBeGreaterThanOrEqual(0.12);
    expect(passo).toBeLessThanOrEqual(0.16);
    // Cada card começa enquanto o anterior AINDA está subindo (sem espera).
    expect(passo).toBeLessThan(duracao);
    // E o conjunto inteiro continua curto: 4 passos + 1 duração = 1,06 s.
    const fimDaCascata = propsDe('div')[4].transition.delay + duracao;
    expect(fimDaCascata).toBeCloseTo(1.06, 5);
    expect(fimDaCascata).toBeLessThan(1.2);
  });

  it('fim do loading SEM dados continua no skeleton, mesmo com a entrada concluída', () => {
    const { container } = render(<MapaEstruturaCard dados={null} isLoading={false} slotCascata={0} />);

    concluirEntradaDoCard();

    expect(propsDe('div')).toHaveLength(0);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(5);
  });

  it('rede de segurança: sem callback, destrava no fim da régua (nunca fica invisível)', () => {
    vi.useFakeTimers();
    render(<MapaEstruturaCard dados={MAPA} isLoading={false} slotCascata={0} />);

    // Antes do fim da régua: continua skeleton (nada antecipado).
    act(() => {
      vi.advanceTimersByTime(msDaEntrada(0) + 200);
    });
    expect(propsDe('div')).toHaveLength(0);

    // Depois do fim da régua: o conteúdo aparece mesmo sem o `onAnimationComplete`.
    act(() => {
      vi.advanceTimersByTime(CONFIG_ENTRADA_CARD_GLOBAL.duracaoMs + 300);
    });
    expect(screen.getByText('Departamentos')).toBeInTheDocument();
    expect(propsDe('div')).toHaveLength(5);
  });
});

describe('TipoVinculoCard — ciclo de vida (entrada do card → conteúdo)', () => {
  it('com a entrada em andamento NÃO instancia o gráfico nem as legendas', () => {
    const { container } = render(<TipoVinculoCard dados={VINCULOS} isLoading={false} slotCascata={3} />);

    // Nem o `<circle>` do arco, nem as `motion.li` da legenda existem.
    expect(container.querySelector('circle')).toBeNull();
    expect(propsDe('circle')).toHaveLength(0);
    expect(propsDe('li')).toHaveLength(0);
    expect(screen.queryByText('CLT')).toBeNull();
    // Casca estática continua visível.
    expect(screen.getByText('Tipo de Vínculo')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(5);
  });

  it('entrada concluída sem dados continua no skeleton; com dados, monta rosca e legendas', () => {
    const { container, rerender } = render(<TipoVinculoCard dados={VINCULOS} isLoading slotCascata={3} />);
    concluirEntradaDoCard();
    // Entrada concluída, mas ainda carregando: nada de gráfico.
    expect(container.querySelector('circle')).toBeNull();

    rerender(<TipoVinculoCard dados={VINCULOS} isLoading={false} slotCascata={3} />);

    expect(container.querySelector('svg[width="104"]')).toBeInTheDocument();
    expect(propsDe('circle')).toHaveLength(VINCULOS.length);
    expect(propsDe('li')).toHaveLength(VINCULOS.length);
    expect(screen.getByText('CLT')).toBeInTheDocument();
    expect(screen.getByText('Temporário')).toBeInTheDocument();
  });

  it('o arco nasce "nada desenhado" e desenha em 1,8 s (preset compartilhado)', () => {
    render(<TipoVinculoCard dados={VINCULOS} isLoading={false} slotCascata={3} />);
    concluirEntradaDoCard();

    propsDe('circle').forEach((arco, i) => {
      expect(String(arco.initial.strokeDasharray).startsWith('0 ')).toBe(true);
      expect(arco.transition.duration).toBe(1.8);
      expect(arco.transition.delay).toBeCloseTo(0.2 + i * 0.15, 5);
      expect(arco.transition.ease).toBe('easeOut');
    });
  });

  it('as legendas entram em cascata com atraso explícito (100/300/500/700/900 ms)', () => {
    render(<TipoVinculoCard dados={VINCULOS} isLoading={false} slotCascata={3} />);
    concluirEntradaDoCard();

    const atrasos = [0.1, 0.3, 0.5, 0.7, 0.9];
    propsDe('li').forEach((linha, i) => {
      expect(linha.initial).toMatchObject({ opacity: 0, x: -20 });
      expect(linha.animate).toMatchObject({ opacity: 1, x: 0 });
      expect(linha.transition.duration).toBe(0.4);
      expect(linha.transition.delay).toBeCloseTo(atrasos[i], 5);
    });
  });

  it('total zero mantém o skeleton, sem gráfico — mesmo com a entrada concluída', () => {
    const { container } = render(
      <TipoVinculoCard dados={[{ nome: 'CLT', value: 0 }]} isLoading={false} slotCascata={3} />
    );

    concluirEntradaDoCard();

    expect(container.querySelector('circle')).toBeNull();
    expect(propsDe('li')).toHaveLength(0);
  });

  it('rede de segurança: o card do slot 3 destrava no fim da PRÓPRIA régua', () => {
    vi.useFakeTimers();
    render(<TipoVinculoCard dados={VINCULOS} isLoading={false} slotCascata={3} />);

    // O fim da régua do slot 0 não vale para o slot 3 (que entra ~840 ms depois):
    // nada destrava cedo.
    act(() => {
      vi.advanceTimersByTime(msDaEntrada(0) + CONFIG_ENTRADA_CARD_GLOBAL.duracaoMs + 100);
    });
    expect(propsDe('circle')).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(msDaEntrada(3) - msDaEntrada(0));
    });
    expect(propsDe('circle')).toHaveLength(VINCULOS.length);
  });
});
