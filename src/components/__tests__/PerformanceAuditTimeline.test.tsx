import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

/**
 * ============================================================================
 * AUDITORIA — prova da GRADE FIXA da trilha de desempenho.
 *
 * O que precisa ficar travado: cada evento é uma linha de grid com as MESMAS
 * colunas (trilho · horário · ícone · bloco · nota · módulo · ação · responsável
 * · "Ver detalhes" · menu), então nada "flutua" de uma linha para outra; o
 * cabeçalho do dia mostra rótulo + data e a contagem real de eventos.
 *
 * O mock da Motion expõe só o necessário (os filhos rendem `children`); o
 * `useReducedMotion`/`useInView` são consumidos por `ui/select` e pelos cards.
 * ============================================================================
 */
vi.mock('framer-motion', () => {
  const Fake = ({
    children,
    custom,
    variants,
    initial,
    animate,
    whileHover,
    whileTap,
    exit,
    layout,
    transition,
    ...rest
  }: any) => <div {...rest}>{children}</div>;
  return {
    motion: new Proxy({} as Record<string, unknown>, {
      get: (_alvo, prop) => (prop === 'create' ? () => Fake : Fake),
    }),
    AnimatePresence: ({ children }: any) => children,
    MotionConfig: ({ children }: any) => children,
    useReducedMotion: () => false,
    useInView: () => true,
  };
});

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

const MOCK_LOGS = [
  {
    id: 'log-001',
    acao: 'UPDATE',
    tabela: 'metas_okrs',
    user_email: 'gestor@empresa.com',
    created_at: '2026-07-01T10:00:00',
    dados_novos: { progresso: 75 },
  },
  {
    id: 'log-002',
    acao: 'INSERT',
    tabela: 'ciclos_avaliacao',
    user_email: null,
    created_at: '2026-06-01T09:00:00',
    dados_novos: null,
  },
];

/** As linhas de evento: o `div.grid` que contém cada botão "Ver detalhes". */
function linhasDeEvento(): HTMLElement[] {
  return screen
    .getAllByRole('button', { name: /Ver detalhes/i })
    .map((botao) => botao.closest('div.grid') as HTMLElement);
}

describe('PerformanceAuditTimeline — grade fixa da trilha', () => {
  it('mostra o estado vazio quando não há registros', () => {
    estado.logs = [];
    render(<PerformanceAuditTimeline />);
    expect(screen.getByText(/Nenhum registro de auditoria/i)).toBeInTheDocument();
  });

  it('abre o cabeçalho de cada dia com a contagem real de eventos', () => {
    estado.logs = MOCK_LOGS;
    render(<PerformanceAuditTimeline />);
    // Dois dias distintos, um evento em cada.
    expect(screen.getAllByText('1 evento')).toHaveLength(2);
  });

  it('usa a MESMA grade de colunas em todas as linhas (alinhamento fixo)', () => {
    estado.logs = MOCK_LOGS;
    render(<PerformanceAuditTimeline />);

    const linhas = linhasDeEvento();
    expect(linhas).toHaveLength(MOCK_LOGS.length);
    expect(linhas.every(Boolean)).toBe(true);

    for (const linha of linhas) {
      // Template da linha: as nove colunas do desktop + a versão compacta.
      expect(linha.className).toContain('xl:grid-cols-[20px_40px_32px_minmax(0,2.9fr)');
      expect(linha.className).toContain('grid-cols-[20px_32px_minmax(0,1fr)');
      // Uma célula por coluna (mesmo as ocultas no mobile continuam no DOM).
      expect(linha.children.length).toBe(9);
    }

    // Todas as linhas carregam EXATAMENTE as mesmas classes de grade.
    const primeiro = linhas[0].className;
    for (const linha of linhas) expect(linha.className).toBe(primeiro);
  });

  it('mostra módulo, ação, responsável e "Ver detalhes" em cada evento', () => {
    estado.logs = MOCK_LOGS;
    render(<PerformanceAuditTimeline />);

    const linhas = linhasDeEvento();
    // Ordem cronológica decrescente: metas (01/07) antes de ciclos (01/06).
    const metas = within(linhas[0]);
    expect(metas.getByText('Metas & OKRs')).toBeInTheDocument();
    expect(metas.getByText('Atualizar')).toBeInTheDocument();
    expect(metas.getByText('gestor@empresa.com')).toBeInTheDocument();

    const ciclos = within(linhas[1]);
    expect(ciclos.getByText('Ciclos')).toBeInTheDocument();
    expect(ciclos.getByText('Criar')).toBeInTheDocument();
    expect(ciclos.getByText('Sistema')).toBeInTheDocument();

    expect(screen.getAllByRole('button', { name: /Ver detalhes/i })).toHaveLength(2);
  });

  it('dá destaque ao CTA "Ver detalhes" (superfície e borda próprias)', () => {
    estado.logs = MOCK_LOGS;
    render(<PerformanceAuditTimeline />);

    const cta = screen.getAllByRole('button', { name: /Ver detalhes/i })[0];
    const classes = cta.className.split(/\s+/);
    expect(classes).toContain('h-8');
    expect(classes).toContain('bg-muted/60');
    expect(classes).toContain('border-border/70');
    expect(classes).toContain('text-foreground');
  });

  it('não renderiza o menu de 3 pontos e deixa o CTA como único botão da linha', () => {
    estado.logs = MOCK_LOGS;
    render(<PerformanceAuditTimeline />);

    expect(screen.queryByRole('button', { name: /Ações adicionais/i })).toBeNull();

    for (const linha of linhasDeEvento()) {
      const botoes = within(linha).getAllByRole('button');
      expect(botoes).toHaveLength(1);
      expect(botoes[0]).toHaveAccessibleName(/Ver detalhes/i);
    }
  });
});
