import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StrictMode } from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';

/**
 * ============================================================================
 * AUDITORIA — CASCATA DA TRILHA: TESTES DE REGRESSÃO (P0).
 *
 * Diferente de `PerformanceAuditTimeline.test.tsx` (que mocka a Motion para
 * travar a GRADE fixa das colunas), aqui a `framer-motion` é a REAL: o que se
 * prova é o comportamento da animação — em especial a invariante que faltou
 * antes: **nenhum registro pode ficar invisível**. E isso vale mesmo quando a
 * animação não roda (jsdom), quando o componente monta/desmonta/remonta
 * (StrictMode), quando o dia é recolhido/reaberto ou quando o usuário pede
 * movimento reduzido.
 *
 * A verificação usa o estado FINAL dos estilos (`opacity`/`transform`), que é
 * exatamente o que o usuário vê — não a intenção da animação.
 * ============================================================================
 */

const estado = vi.hoisted(() => ({ logs: [] as unknown[] }));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: estado.logs, isLoading: false }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

import { PerformanceAuditTimeline } from '../avaliacao/PerformanceAuditTimeline';

/** Registro cru de `audit_log` (mesmo formato que a consulta devolve). */
const registro = (id: string, tabela: string, created_at: string) => ({
  id,
  tabela,
  acao: 'UPDATE',
  user_email: 'gestor@empresa.com',
  created_at,
  dados_novos: {},
});

/** Dois dias: hoje com 2 eventos, ontem com 1. */
const DOIS_DIAS = [
  registro('l-1', 'metas_okrs', '2026-07-01T10:00:00'),
  registro('l-2', 'feedbacks_360', '2026-07-01T09:00:00'),
  registro('l-3', 'pdis', '2026-06-30T08:00:00'),
];

const itens = () => [...document.querySelectorAll<HTMLElement>('[data-cascata-item]')];
const cabecalhos = () => [...document.querySelectorAll<HTMLElement>('[data-cascata-cabecalho]')];
const eventos = () => [...document.querySelectorAll<HTMLElement>('[data-cascata-evento]')];

/** Estado FINAL de um item: opacidade cheia e sem deslocamento residual. */
function estaVisivel(el: HTMLElement): boolean {
  const estilo = getComputedStyle(el);
  const opacidade = Number.parseFloat(estilo.opacity);
  const semDeslocamento = estilo.transform === '' || estilo.transform === 'none' || estilo.transform === 'matrix(1, 0, 0, 1, 0, 0)';
  return opacidade >= 1 && semDeslocamento;
}

/**
 * Espera a REDE DE SEGURANÇA agir (fim teórico da cascata + folga). Em jsdom a
 * animação da Motion não avança sozinha, então este é justamente o cenário em
 * que, sem a rede, a lista ficaria vazia PARA SEMPRE.
 */
async function esperarEstadoFinal() {
  await waitFor(() => expect(itens().length).toBeGreaterThan(0), { timeout: 5000 });
  await waitFor(() => expect(itens().every(estaVisivel)).toBe(true), { timeout: 9000 });
}

function comMovimentoReduzido() {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) =>
    ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

describe('PerformanceAuditTimeline — cascata sem risco de tela vazia', () => {
  beforeEach(() => {
    estado.logs = DOIS_DIAS;
  });

  it('renderiza cabeçalho antes dos eventos, cada evento dentro do seu dia', () => {
    render(<PerformanceAuditTimeline />);

    expect(cabecalhos()).toHaveLength(2);
    expect(eventos()).toHaveLength(3);

    // No documento, o 1º item animado é sempre um cabeçalho (nunca um evento).
    expect(itens()[0]).toBe(cabecalhos()[0]);

    // Nenhum evento "vaza" para o dia vizinho: os do dia N pertencem à seção N.
    cabecalhos().forEach((cabecalho, indice) => {
      const secao = cabecalho.closest('section');
      expect(secao).not.toBeNull();
      const doDia = [...secao!.querySelectorAll<HTMLElement>('[data-cascata-evento]')];
      expect(doDia.length).toBeGreaterThan(0);
      expect(doDia.every((el) => el.getAttribute('data-cascata-evento') === String(indice))).toBe(true);
    });
  });

  it('leva TODOS os itens ao estado final mesmo quando a animação não roda', async () => {
    render(<PerformanceAuditTimeline />);
    await esperarEstadoFinal();
  });

  it('StrictMode (monta/desmonta/remonta) não deixa a trilha vazia', async () => {
    render(
      <StrictMode>
        <PerformanceAuditTimeline />
      </StrictMode>
    );
    await esperarEstadoFinal();
  });

  it('com movimento reduzido todos os registros aparecem, sem deslocamento', async () => {
    const restaurar = comMovimentoReduzido();
    try {
      render(<PerformanceAuditTimeline />);
      await esperarEstadoFinal();
    } finally {
      restaurar();
    }
  });

  it('recolher e reabrir o dia mantém os registros (e nada fica invisível)', async () => {
    render(<PerformanceAuditTimeline />);
    await esperarEstadoFinal();

    const primeiroCabecalho = cabecalhos()[0];

    // Recolhe: os eventos do dia saem de cena.
    fireEvent.click(primeiroCabecalho);
    await waitFor(() => expect(eventos()).toHaveLength(1), { timeout: 3000 });

    // Reabre: eles voltam e precisam terminar visíveis de novo.
    fireEvent.click(primeiroCabecalho);
    await waitFor(() => expect(eventos()).toHaveLength(3), { timeout: 3000 });
    await esperarEstadoFinal();
  });
});
