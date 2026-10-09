import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

/**
 * A coluna de AÇÕES da Trilha de Auditoria tem de ser a MESMA em todo evento:
 * `[selo] [Ver detalhes →]` num único container horizontal. Este teste trava a
 * regressão que motivou o ajuste — com `flex-wrap`, o selo "Concluído" (mais
 * largo) caía para uma linha ACIMA do botão, enquanto o "Sistema" permanecia ao
 * lado. Os mocks abaixo espelham `PontoAuditTimeline.test.tsx`.
 */
vi.mock('framer-motion', () => {
  const IGNORADAS = new Set([
    'custom',
    'variants',
    'initial',
    'animate',
    'exit',
    'transition',
    'whileHover',
    'whileTap',
    'layout',
    'layoutId',
  ]);
  // Identidade ESTÁVEL por tag: sem memoizar, `motion.div` devolveria um novo
  // componente a cada render e o React remontaria a subárvore (invalidando refs
  // e atributos já capturados). Com o cache, o mock se comporta como o Framer.
  const cache = new Map<string, (props: any) => JSX.Element>();
  const make = (Tag: string) => {
    if (!cache.has(Tag)) {
      cache.set(Tag, ({ children, ...props }: any) => {
        const limpos: Record<string, unknown> = {};
        Object.keys(props).forEach((chave) => {
          if (!IGNORADAS.has(chave)) limpos[chave] = props[chave];
        });
        return <Tag {...limpos}>{children}</Tag>;
      });
    }
    return cache.get(Tag)!;
  };
  // Proxy: qualquer `motion.<tag>` vira o elemento HTML equivalente, então
  // componentes de UI reutilizados (EmptyState, AnimatedCascadeDialog…) também
  // renderizam sem eu enumerar cada tag.
  const motion: any = new Proxy(
    { create: (Componente: any) => Componente },
    {
      get: (alvo, tag) => (tag in alvo ? (alvo as any)[tag] : make(String(tag))),
    }
  );
  return {
    motion,
    AnimatePresence: ({ children }: any) => <>{children}</>,
    MotionConfig: ({ children }: any) => <>{children}</>,
    useReducedMotion: () => false,
  };
});

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn(() => ({ data: MOCK_LOGS, isLoading: false })),
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/services/exportService', () => ({ exportPontoCSV: vi.fn() }));

vi.mock('@/mocks/desligamentosMock', () => ({
  isDesligamentosMockEnabled: () => false,
  getMockTrilhaAuditoriaDesligamentos: () => undefined,
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

/** Três eventos do MESMO dia — um por caso de selo: Sistema, Concluído e nenhum. */
const MOCK_LOGS = [
  {
    id: 'log-sistema',
    tabela: 'desligamentos',
    registro_id: 'd1',
    acao: 'GENERATE_DOC',
    user_id: null,
    user_email: null,
    ip_address: null,
    user_agent: null,
    dados_anteriores: null,
    dados_novos: { documento: 'Carta de Rescisão', formato: 'PDF' },
    created_at: '2026-10-09T21:43:00.000Z',
  },
  {
    id: 'log-concluido',
    tabela: 'desligamentos',
    registro_id: 'd2',
    acao: 'UPDATE',
    user_id: 'u1',
    user_email: 'rh@empresa.com',
    ip_address: null,
    user_agent: 'Chrome',
    dados_anteriores: { status: 'em_aviso' },
    dados_novos: { status: 'concluido', data_efetiva: '2026-10-01' },
    created_at: '2026-10-09T15:46:00.000Z',
  },
  {
    id: 'log-sem-selo',
    tabela: 'desligamentos',
    registro_id: 'd3',
    acao: 'INSERT',
    user_id: 'u2',
    user_email: 'gestor@empresa.com',
    ip_address: null,
    user_agent: 'Chrome',
    dados_anteriores: null,
    dados_novos: { colaborador: 'Marcos Antunes', tipo: 'termino_contrato' },
    created_at: '2026-10-09T18:51:00.000Z',
  },
];

import { TrilhaAuditoriaDesligamentos } from '../desligamentos/TrilhaAuditoriaDesligamentos';

/** O container de ações é o PAI direto do botão. */
function botaoContainer(botao: HTMLElement): HTMLElement {
  return botao.parentElement as HTMLElement;
}

describe('TrilhaAuditoriaDesligamentos — coluna de ações uniforme', () => {
  it('renderiza um "Ver detalhes" para cada evento', () => {
    render(<TrilhaAuditoriaDesligamentos />);
    expect(screen.getAllByRole('button', { name: /Ver detalhes/i })).toHaveLength(MOCK_LOGS.length);
  });

  it('usa um único container horizontal (flex-nowrap, items-center, justify-end) em TODOS os eventos', () => {
    render(<TrilhaAuditoriaDesligamentos />);
    const botoes = screen.getAllByRole('button', { name: /Ver detalhes/i });

    botoes.forEach((botao) => {
      const container = botaoContainer(botao);
      expect(container.className).toContain('flex-nowrap');
      expect(container.className).not.toContain('flex-wrap');
      expect(container.className).toContain('items-center');
      expect(container.className).toContain('justify-end');
    });
  });

  it('coloca o selo "Concluído" ao LADO do botão (nunca acima) e com shrink-0', () => {
    render(<TrilhaAuditoriaDesligamentos />);
    const botao = screen
      .getAllByRole('button', { name: /Ver detalhes/i })
      .find((b) => b.parentElement?.textContent?.includes('Concluído'));
    expect(botao).toBeTruthy();

    const container = botaoContainer(botao!);
    const selo = within(container).getByText('Concluído');

    // Irmãos diretos do MESMO container → mesma linha (sem quebra).
    expect(selo.parentElement).toBe(container);
    expect(selo.className).toContain('shrink-0');
    // O selo precede o botão no DOM (selo à esquerda, botão à direita).
    expect(selo.compareDocumentPosition(botao!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('coloca o selo "Sistema" ao LADO do botão, com a MESMA estrutura', () => {
    render(<TrilhaAuditoriaDesligamentos />);
    const botao = screen
      .getAllByRole('button', { name: /Ver detalhes/i })
      .find((b) => b.parentElement?.textContent?.includes('Sistema'));
    expect(botao).toBeTruthy();

    const container = botaoContainer(botao!);
    const selo = within(container).getByText('Sistema');
    expect(selo.parentElement).toBe(container);
    expect(selo.className).toContain('shrink-0');
  });

  it('mantém o botão alinhado à direita mesmo no evento SEM selo (um único filho)', () => {
    render(<TrilhaAuditoriaDesligamentos />);
    const botao = screen
      .getAllByRole('button', { name: /Ver detalhes/i })
      .find((b) => b.parentElement?.children.length === 1);
    expect(botao).toBeTruthy();

    const container = botaoContainer(botao!);
    expect(container.children).toHaveLength(1);
    expect(container.className).toContain('justify-end');
  });
});

describe('TrilhaAuditoriaDesligamentos — expansão "Mais filtros"', () => {
  it('mantém o painel de filtros avançados FECHADO por padrão', () => {
    render(<TrilhaAuditoriaDesligamentos />);
    expect(screen.queryByLabelText('Filtrar por ID do registro')).not.toBeInTheDocument();
  });

  it('revela os filtros adicionais ABAIXO da barra principal (não acima)', () => {
    render(<TrilhaAuditoriaDesligamentos />);
    const chipBarra = screen.getByText('Todos os eventos');
    fireEvent.click(screen.getByRole('button', { name: /Mais filtros/i }));

    const registro = screen.getByLabelText('Filtrar por ID do registro');
    // A barra vem ANTES do painel no fluxo do DOM → o painel abre para BAIXO.
    expect(chipBarra.compareDocumentPosition(registro) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('posiciona o painel ANTES da timeline (a timeline desce ao abrir)', () => {
    render(<TrilhaAuditoriaDesligamentos />);
    fireEvent.click(screen.getByRole('button', { name: /Mais filtros/i }));

    const registro = screen.getByLabelText('Filtrar por ID do registro');
    const primeiroEvento = screen.getAllByRole('button', { name: /Ver detalhes/i })[0];
    // Painel antes do primeiro evento da timeline → a timeline é empurrada para baixo.
    expect(registro.compareDocumentPosition(primeiroEvento) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('alterna (abre/fecha) o painel a cada clique e atualiza o aria-expanded', () => {
    render(<TrilhaAuditoriaDesligamentos />);
    const botao = screen.getByRole('button', { name: /Mais filtros/i });

    expect(botao).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(botao);
    expect(screen.getByLabelText('Filtrar por ID do registro')).toBeInTheDocument();
    expect(botao).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(botao);
    expect(screen.queryByLabelText('Filtrar por ID do registro')).not.toBeInTheDocument();
    expect(botao).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(botao);
    expect(screen.getByLabelText('Filtrar por ID do registro')).toBeInTheDocument();
  });

  it('preserva o valor digitado no filtro ao fechar e reabrir', () => {
    render(<TrilhaAuditoriaDesligamentos />);
    const botao = screen.getByRole('button', { name: /Mais filtros/i });

    fireEvent.click(botao);
    fireEvent.change(screen.getByLabelText('Filtrar por ID do registro'), { target: { value: 'dsl-1' } });
    fireEvent.click(botao); // fecha
    fireEvent.click(botao); // reabre
    expect(screen.getByLabelText('Filtrar por ID do registro')).toHaveValue('dsl-1');
  });
});
