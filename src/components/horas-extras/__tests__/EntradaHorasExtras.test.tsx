import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

/**
 * PROVA OBJETIVA de que as três faixas de "Solicitações de Hora Extra" entram
 * com a MESMA fila única do Dashboard Executivo (`ui/entradaGlobal.ts`), sem
 * nenhum número de animação próprio na tela:
 *
 *   tira de KPI Cards ....... `entradaKpiGlobal`       → slots 0, 1, 3, 5
 *   cabeçalho + cartões ..... `entradaConteudoGlobal`  → slots 0, 2, 4, 7
 *   histórico ............... fecha a banda de conteúdo no slot seguinte ao
 *                             último cartão da fila (a página passa o índice)
 *
 * O mock da Motion publica `custom`, `initial`, `animate`, o keyframe `hidden`,
 * a DURAÇÃO/ATRASO que a PRÓPRIA variante calculou e `data-entrada` (o opt-out
 * do `.animate-squash` do `Card`). Assim o teste lê o que o componente realmente
 * entregou à Motion — não uma cópia dos números em outro lugar do projeto.
 */
vi.mock('framer-motion', () => {
  /** Attributes da entrada, medidos a partir das variants recebidas. */
  const medir = (props: any) => {
    const variantes = props.variants;
    if (!variantes) return {};
    const visivel = typeof variantes.visible === 'function' ? variantes.visible(props.custom) : undefined;
    return {
      'data-custom': String(props.custom),
      'data-initial': props.initial,
      'data-animate': props.animate,
      'data-hidden': JSON.stringify(variantes.hidden),
      'data-delay': String(visivel?.transition?.delay ?? ''),
      'data-duration': String(visivel?.transition?.duration ?? ''),
      'data-entrada': props['data-entrada'],
    };
  };

  /** Componente Motion comum (cabeçalhos, faixas, `<motion.div>` internos). */
  const bloco =
    (Tag: any) =>
    ({ children, custom, variants, initial, animate, ...rest }: any) => (
      <Tag {...medir({ custom, variants, initial, animate, ...rest })} {...rest}>
        {children}
      </Tag>
    );

  /** `motion.create(Card)` — o próprio card é o nó animado (sem wrapper). */
  const card =
    (Component: any) =>
    ({ children, custom, variants, initial, animate, ...rest }: any) => (
      <div data-testid="entrada-card" {...medir({ custom, variants, initial, animate, ...rest })}>
        <Component {...rest}>{children}</Component>
      </div>
    );

  return {
    motion: {
      div: bloco('div'),
      header: bloco('header'),
      section: bloco('section'),
      span: bloco('span'),
      p: bloco('p'),
      tr: bloco('tr'),
      td: bloco('td'),
      create: card,
    },
    AnimatePresence: ({ children }: any) => children,
    // `ui/select` consome este hook; o mock parcial precisa expô-lo.
    useReducedMotion: () => false,
    useInView: () => true,
  };
});

import { AprovacoesPendentes, LIMITE_CARTOES } from '../AprovacoesPendentes';
import { HistoricoSolicitacoes } from '../HistoricoSolicitacoes';
import { HorasExtrasKpis } from '../HorasExtrasKpis';
import type { ResumoDecisoes, SolicitacaoHoraExtra } from '../horasExtrasComum';
import {
  CONFIG_ENTRADA_CARD_GLOBAL,
  entradaCardGlobal,
  entradaConteudoGlobal,
  entradaKpiGlobal,
} from '@/components/ui/entradaGlobal';

/** Keyframe inicial da régua global: fade + 14 px de subida. */
const REF_HIDDEN = JSON.stringify(entradaCardGlobal.hidden);

const decisoes: ResumoDecisoes = { aprovadas: 6, rejeitadas: 1, decididas: 7, taxa: 86 };

function linha(i: number): SolicitacaoHoraExtra {
  return {
    id: `sol-${i}`,
    data: `2026-10-${String(20 - i).padStart(2, '0')}`,
    horas_solicitadas: [2.5, 1, 2, 3, 1.5][i % 5],
    motivo: 'Atendimento a pico de demanda',
    status: 'pendente',
    created_at: `2026-10-${String(18 - i).padStart(2, '0')}T12:00:00.000Z`,
    colaborador: { nome_completo: `Colaborador ${i}`, departamento: 'Financeiro' },
  };
}

/** Todo nó que recebeu variants de entrada, na ordem do DOM. */
const animados = (): HTMLElement[] => Array.from(document.querySelectorAll('[data-custom]'));

/** Só os cards (`motion.create(Card)`), na ordem do DOM. */
const cartoes = (): HTMLElement[] => screen.queryAllByTestId('entrada-card');

/** `custom` de entrada de cada nó — a POSIÇÃO na fila. */
const posicoes = (els: HTMLElement[]): string[] => els.map((e) => e.getAttribute('data-custom') ?? '');

/** Atraso real (ms) de cada nó, lido da variante que o componente passou. */
const atrasosMs = (els: HTMLElement[]): number[] =>
  els.map((e) => Math.round(Number(e.getAttribute('data-delay')) * 1000));

const propsFila = (solicitacoes: readonly SolicitacaoHoraExtra[], index = 0) => ({
  solicitacoes,
  periodo: 'todos' as const,
  onPeriodoChange: vi.fn(),
  onVerDetalhes: vi.fn(),
  onAprovar: vi.fn(),
  onRejeitar: vi.fn(),
  index,
});

const propsHistorico = (solicitacoes: readonly SolicitacaoHoraExtra[], index = 0) => ({
  solicitacoes,
  isLoading: false,
  onVerDetalhes: vi.fn(),
  onAprovar: vi.fn(),
  onRejeitar: vi.fn(),
  onExcluir: vi.fn(),
  onNova: vi.fn(),
  index,
});

describe('entrada de Horas Extras — a fila única do Dashboard Executivo', () => {
  it('a régua vem do módulo global: 14 px, 520 ms, 120 ms, ease-out', () => {
    expect(REF_HIDDEN).toBe('{"opacity":0,"y":14}');

    // Identidade de objeto: as três faixas são o MESMO módulo, não cópias.
    expect(CONFIG_ENTRADA_CARD_GLOBAL.deslocamentoY).toBe(14);
    expect(CONFIG_ENTRADA_CARD_GLOBAL.duracaoMs).toBe(520);
    expect(CONFIG_ENTRADA_CARD_GLOBAL.intervaloMs).toBe(120);
    expect(entradaKpiGlobal.hidden).toEqual(entradaCardGlobal.hidden);
    expect(entradaConteudoGlobal.hidden).toEqual(entradaCardGlobal.hidden);
  });

  it('a tira de KPI Cards entra na fila intercalada: 0 / 120 / 360 / 600 ms', () => {
    render(
      <HorasExtrasKpis
        pendentes={8}
        horasPendentes={14.5}
        aprovadas={6}
        horasAprovadas={20.5}
        total={20}
        decisoes={decisoes}
        index={0}
      />
    );

    const cards = cartoes();
    expect(cards).toHaveLength(4);
    // Posições 0…3 → slots 0, 1, 3, 5 (os vãos 2 e 4 são do conteúdo).
    expect(posicoes(cards)).toEqual(['0', '1', '2', '3']);
    expect(atrasosMs(cards)).toEqual([0, 120, 360, 600]);

    cards.forEach((el) => {
      expect(el.getAttribute('data-initial')).toBe('hidden');
      expect(el.getAttribute('data-animate')).toBe('visible');
      expect(el.getAttribute('data-hidden')).toBe(REF_HIDDEN);
      expect(Number(el.getAttribute('data-duration'))).toBeCloseTo(0.52, 5);
      // Um card, uma animação: o `.animate-squash` do CSS fica desligado.
      expect(el.getAttribute('data-entrada')).toBe('cascata');
    });
  });

  it('os cartões de aprovação preenchem os vãos dos KPI Cards: 240 / 480 / 840 ms', () => {
    render(<AprovacoesPendentes {...propsFila([linha(0), linha(1), linha(2)])} />);

    const cards = cartoes();
    expect(cards).toHaveLength(LIMITE_CARTOES);
    // Cabeçalho da seção no slot 0 → cartões nas posições 1, 2 e 3 (slots 2, 4, 7).
    expect(posicoes(cards)).toEqual(['1', '2', '3']);
    expect(atrasosMs(cards)).toEqual([240, 480, 840]);

    cards.forEach((el) => {
      expect(el.getAttribute('data-hidden')).toBe(REF_HIDDEN);
      expect(el.getAttribute('data-entrada')).toBe('cascata');
    });
  });

  it('o cabeçalho da fila abre a banda de conteúdo (slot 0, junto do 1º KPI)', () => {
    render(<AprovacoesPendentes {...propsFila([linha(0), linha(1), linha(2)])} />);

    const cabecalho = animados()[0];
    expect(cabecalho.getAttribute('data-custom')).toBe('0');
    expect(atrasosMs([cabecalho])).toEqual([0]);
    expect(cabecalho.getAttribute('data-hidden')).toBe(REF_HIDDEN);
  });

  it('o histórico entra depois do último cartão da fila (slot 8 → 960 ms)', () => {
    // A página reserva `LIMITE_CARTOES + 1` para a faixa de baixo.
    render(<HistoricoSolicitacoes {...propsHistorico([linha(0)], LIMITE_CARTOES + 1)} />);

    const container = cartoes()[0];
    expect(posicoes([container])).toEqual(['4']);
    expect(atrasosMs([container])).toEqual([960]);
    expect(container.getAttribute('data-hidden')).toBe(REF_HIDDEN);
    expect(container.getAttribute('data-entrada')).toBe('cascata');
  });

  it('o slot do histórico é congelado na montagem: novo render não reanima', () => {
    const { rerender } = render(<HistoricoSolicitacoes {...propsHistorico([linha(0)], 2)} />);
    expect(atrasosMs([cartoes()[0]])).toEqual([480]);

    // A decisão de uma solicitação muda a quantidade de cartões da fila e, com
    // ela, o `index` que a página passa. O card já visível não pode se mover.
    rerender(<HistoricoSolicitacoes {...propsHistorico([linha(0)], 5)} />);
    expect(posicoes([cartoes()[0]])).toEqual(['2']);
    expect(atrasosMs([cartoes()[0]])).toEqual([480]);
  });

  it('"Ver todas" abre uma LEVA nova: os três primeiros mantêm o slot', () => {
    render(<AprovacoesPendentes {...propsFila([linha(0), linha(1), linha(2), linha(3), linha(4)])} />);
    expect(atrasosMs(cartoes())).toEqual([240, 480, 840]);

    fireEvent.click(screen.getByRole('button', { name: /Ver todas/ }));

    const depois = cartoes();
    expect(depois).toHaveLength(5);
    // Os visíveis continuam onde estavam; os revelados partem de 0.
    expect(posicoes(depois)).toEqual(['1', '2', '3', '0', '1']);
    expect(atrasosMs(depois)).toEqual([240, 480, 840, 0, 120]);
    depois.forEach((el) => expect(el.getAttribute('data-entrada')).toBe('cascata'));
  });
});
