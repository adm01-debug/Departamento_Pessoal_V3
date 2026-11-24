import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

/**
 * ============================================================================
 * A CASCATA DO "HISTÓRICO DE SOLICITAÇÕES" É A MESMA DA TABELA DE CANDIDATOS.
 *
 * A referência aprovada é a tabela da aba "Candidatos" (Recrutamento & Seleção):
 * `TabelaCandidatos` monta as linhas com `CascadeTableBody`/`CascadeTableRow`
 * sobre os variants de `ui/table-row-reveal.ts`. Este teste lê o que o
 * componente do histórico REALMENTE entregou à Motion (não uma cópia dos números
 * em outro lugar do projeto) e compara com esse módulo compartilhado:
 *
 *   • cada linha recebe o variant compartilhado e o `custom` = índice (stagger);
 *   • o atraso de cada linha é `INICIO_LINHAS + índice × PASSO_LINHAS`;
 *   • digitar na BUSCA não reinicia a cascata (a chave da lista ignora o texto,
 *     como no `chaveCascata` de `CandidatosPainel`);
 *   • trocar de PÁGINA troca a identidade da lista e a cascata toca de novo;
 *   • com `prefers-reduced-motion`, as linhas nascem prontas e sem atraso.
 * ============================================================================
 */

/** Estado controlável do modo de movimento (lido pelo mock de `motionMode`). */
const estado = vi.hoisted(() => ({ reduzido: false }));

vi.mock('framer-motion', () => {
  /** Atributos de animação, medidos a partir das variants recebidas. */
  const medir = (props: any) => {
    const variantes = props.variants;
    if (!variantes) return {};
    const visivel = typeof variantes.visible === 'function' ? variantes.visible(props.custom) : variantes.visible;
    return {
      'data-custom': String(props.custom),
      'data-initial': props.initial,
      'data-animate': props.animate,
      'data-hidden': JSON.stringify(variantes.hidden),
      'data-delay': String(visivel?.transition?.delay ?? ''),
      'data-duration': String(visivel?.transition?.duration ?? ''),
    };
  };

  /** Componente Motion comum (linhas, blocos internos, cards). */
  const bloco =
    (Tag: any) =>
    ({ children, custom, variants, initial, animate, ...rest }: any) => (
      <Tag {...medir({ custom, variants, initial, animate, ...rest })} {...rest}>
        {children}
      </Tag>
    );

  /** `motion.create(Component)` — o próprio componente é o nó animado. */
  const create =
    (Component: any) =>
    ({ children, ...rest }: any) => <Component {...rest}>{children}</Component>;

  const alvos: Record<string, any> = { create };
  // Qualquer tag (`motion.div`, `motion.tr`, …) é atendida pelo mesmo bloco.
  const motion = new Proxy(alvos, {
    get: (alvo, prop: string) => (prop in alvo ? alvo[prop] : (alvo[prop] = bloco(prop))),
  });

  return {
    motion,
    AnimatePresence: ({ children }: any) => children,
    useReducedMotion: () => estado.reduzido,
    useInView: () => true,
  };
});

// O modo de movimento é decidido em `lib/motionMode`; aqui só se controla o hook
// (o restante do módulo continua real).
vi.mock('@/lib/motionMode', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/motionMode')>();
  return { ...real, useMovimentoReduzido: () => estado.reduzido };
});

import {
  INICIO_LINHAS,
  PASSO_LINHAS,
  linhaTabelaVariants,
  linhaTabelaVariantsReduzido,
} from '@/components/ui/table-row-reveal';
import { HistoricoSolicitacoes } from '../HistoricoSolicitacoes';
import type { SolicitacaoHoraExtra } from '../horasExtrasComum';

/** O Radix chama `scrollIntoView` ao abrir o select, e o jsdom não tem a API. */
Element.prototype.scrollIntoView = () => {};

function aprovada(i: number): SolicitacaoHoraExtra {
  return {
    id: `sol-${i}`,
    data: `2026-10-${String(20 - (i % 9)).padStart(2, '0')}`,
    horas_solicitadas: 2,
    motivo: 'Inventário de estoque',
    status: 'aprovada',
    created_at: `2026-10-${String(18 - (i % 9)).padStart(2, '0')}T12:00:00.000Z`,
    colaborador: { nome_completo: `Colaborador ${i}`, departamento: 'Financeiro' },
  };
}

const props = (solicitacoes: readonly SolicitacaoHoraExtra[]) => ({
  solicitacoes,
  isLoading: false,
  onVerDetalhes: vi.fn(),
  onExcluir: vi.fn(),
  onNova: vi.fn(),
});

/** As linhas da tabela, na ordem do DOM (só elas recebem `custom`). */
const linhas = (): HTMLElement[] => Array.from(document.querySelectorAll('tbody tr[data-custom]'));

describe('Histórico de solicitações — cascata das linhas (referência: Candidatos)', () => {
  it('cada linha recebe o variant compartilhado e o atraso escalonado da referência', () => {
    render(<HistoricoSolicitacoes {...props([aprovada(0), aprovada(1), aprovada(2)])} />);

    const rows = linhas();
    expect(rows).toHaveLength(3);

    // Índice → `custom` do variant: é ele que produz a onda.
    expect(rows.map((r) => r.getAttribute('data-custom'))).toEqual(['0', '1', '2']);

    // 0,52 s de espera + 40 ms por linha — os MESMOS números da referência.
    const atrasos = rows.map((r) => Number(r.getAttribute('data-delay')));
    expect(atrasos[0]).toBeCloseTo(INICIO_LINHAS, 5);
    expect(atrasos[1]).toBeCloseTo(INICIO_LINHAS + PASSO_LINHAS, 5);
    expect(atrasos[2]).toBeCloseTo(INICIO_LINHAS + 2 * PASSO_LINHAS, 5);

    rows.forEach((row) => {
      // O keyframe inicial e a duração vêm de `linhaTabelaVariants`, não daqui.
      expect(row.getAttribute('data-hidden')).toBe(JSON.stringify(linhaTabelaVariants.hidden));
      expect(Number(row.getAttribute('data-duration'))).toBeCloseTo(0.8, 5);
      expect(row.getAttribute('data-initial')).toBe('hidden');
      expect(row.getAttribute('data-animate')).toBe('visible');
      // `origin-center` no `<tr>`: o `scaleX` abre a linha a partir do centro.
      expect(row.className).toContain('origin-center');
    });

    // O cabeçalho NÃO anima (na referência também é estático).
    const cabecalho = screen.getByRole('columnheader', { name: /colaborador/i }).closest('tr')!;
    expect(cabecalho.hasAttribute('data-custom')).toBe(false);
  });

  it('o movimento é o mesmo das linhas de Candidatos (variant única no sistema)', () => {
    expect(linhaTabelaVariants.hidden).toEqual({ opacity: 0, y: 10, scaleX: 0.94 });
    expect(linhaTabelaVariantsReduzido.hidden).toEqual({ opacity: 1, y: 0, scaleX: 1 });
  });

  it('digitar na busca NÃO reinicia a sequência (a chave ignora o texto)', () => {
    render(<HistoricoSolicitacoes {...props([aprovada(0), aprovada(1)])} />);

    const corpoAntes = document.querySelector('tbody');
    fireEvent.change(screen.getByLabelText('Buscar solicitações'), { target: { value: 'colaborador 0' } });

    // Mesmo `<tbody>`: nada foi remontado, então a cascata não volta a tocar.
    expect(document.querySelector('tbody')).toBe(corpoAntes);
    expect(linhas()).toHaveLength(1);
  });

  it('trocar de página troca a identidade da lista e a cascata toca de novo', () => {
    // 12 aprovadas com 10 por página → existe a página 2.
    const muitas = Array.from({ length: 12 }, (_, i) => aprovada(i));
    render(<HistoricoSolicitacoes {...props(muitas)} />);

    const corpoAntes = document.querySelector('tbody');
    expect(linhas()).toHaveLength(10);

    fireEvent.click(screen.getByRole('button', { name: 'Próxima página' }));

    // `<tbody>` novo (key nova) → as linhas da página 2 entram em cascata do zero.
    expect(document.querySelector('tbody')).not.toBe(corpoAntes);
    expect(linhas()).toHaveLength(2);
    expect(linhas().map((r) => r.getAttribute('data-custom'))).toEqual(['0', '1']);
  });

  it('com movimento reduzido as linhas nascem prontas, sem deslocamento nem atraso', () => {
    estado.reduzido = true;
    try {
      render(<HistoricoSolicitacoes {...props([aprovada(0), aprovada(1)])} />);

      linhas().forEach((row) => {
        expect(row.getAttribute('data-hidden')).toBe(JSON.stringify(linhaTabelaVariantsReduzido.hidden));
        expect(row.getAttribute('data-delay')).toBe('');
        expect(Number(row.getAttribute('data-duration'))).toBe(0);
      });
    } finally {
      estado.reduzido = false;
    }
  });
});
