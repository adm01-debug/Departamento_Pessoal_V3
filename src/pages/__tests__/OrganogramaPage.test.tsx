import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import OrganogramaPage from '@/pages/OrganogramaPage';

const TREE = [
  {
    id: 'diretoria',
    nome: 'Diretoria Executiva',
    colaboradores: [],
    sub_departamentos: [
      {
        id: 'rh',
        nome: 'Recursos Humanos',
        colaboradores: [
          {
            id: 'ana',
            nome_completo: 'Ana Beatriz Souza',
            cargo: 'Analista de RH',
            email: 'ana.souza@promobrindes.com.br',
            foto_url: null,
          },
        ],
        sub_departamentos: [],
      },
      {
        id: 'tech',
        nome: 'Tecnologia',
        colaboradores: [
          {
            id: 'carlos',
            nome_completo: 'Carlos Eduardo Lima',
            cargo: 'Desenvolvedor Frontend',
            email: 'carlos.lima@promobrindes.com.br',
            foto_url: null,
          },
        ],
        sub_departamentos: [
          {
            id: 'produto',
            nome: 'Produto',
            colaboradores: [
              {
                id: 'mariana',
                nome_completo: 'Mariana Oliveira Santos',
                cargo: 'Gerente de Produto',
                email: 'mariana.santos@promobrindes.com.br',
                foto_url: null,
              },
            ],
            sub_departamentos: [],
          },
        ],
      },
    ],
  },
  {
    id: 'marketing',
    nome: 'Marketing',
    colaboradores: [
      {
        id: 'lucas',
        nome_completo: 'Lucas Gabriel Fernandes',
        cargo: 'Designer Gráfico',
        email: 'lucas.fernandes@promobrindes.com.br',
        foto_url: null,
      },
    ],
    sub_departamentos: [],
  },
];

const { mockUseOrganograma } = vi.hoisted(() => ({ mockUseOrganograma: vi.fn() }));
vi.mock('@/hooks/useOrganograma', () => ({ useOrganograma: mockUseOrganograma }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/organograma']}>
      <OrganogramaPage />
    </MemoryRouter>
  );
}

/**
 * Os seis itens do cabeçalho, na ordem da cascata (esquerda → direita): os três
 * cards de indicador (`motion.div` com `h-11` + `border-border/60`), o wrapper do
 * campo de busca e o wrapper de cada botão. Ver `organogramaHeaderReveal.ts`.
 */
function headerRevealNodes(container: HTMLElement): HTMLElement[] {
  return [
    ...Array.from(container.querySelectorAll<HTMLElement>('.h-11.border-border\\/60')),
    screen.getByPlaceholderText('Buscar na estrutura...').parentElement as HTMLElement,
    screen.getByRole('button', { name: /expandir tudo/i }).parentElement as HTMLElement,
    screen.getByRole('button', { name: /recolher tudo/i }).parentElement as HTMLElement,
  ];
}

/** Keyframe `hidden` do `cardVariants` dos KPIs do Dashboard (MetricCard.tsx). */
const HIDDEN_STYLE = 'opacity: 0; transform: translateY(20px);';

describe('OrganogramaPage', () => {
  beforeEach(() => {
    mockUseOrganograma.mockReset();
  });

  it('shows a loading spinner while data is loading', () => {
    mockUseOrganograma.mockReturnValue({ dados: [], isLoading: true, error: null, refetch: vi.fn() });
    const { container } = renderPage();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows the sync error state and allows retry', async () => {
    const refetch = vi.fn();
    mockUseOrganograma.mockReturnValue({ dados: [], isLoading: false, error: new Error('falhou'), refetch });
    renderPage();
    const retryButton = screen.getByRole('button', { name: /tentar novamente/i });
    await userEvent.setup().click(retryButton);
    expect(refetch).toHaveBeenCalled();
  });

  it('shows the empty state when there is no structure', () => {
    mockUseOrganograma.mockReturnValue({ dados: [], isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('Nenhuma estrutura definida')).toBeInTheDocument();
  });

  it('renders header title/subtitle without the old version label', () => {
    mockUseOrganograma.mockReturnValue({ dados: TREE, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByRole('heading', { name: 'Organograma' })).toBeInTheDocument();
    expect(screen.getByText('Estrutura de departamentos e colaboradores')).toBeInTheDocument();
    expect(screen.queryByText(/10\/10/)).not.toBeInTheDocument();
  });

  it('entra com a cascata dos KPI Cards do Dashboard, da esquerda para a direita', async () => {
    mockUseOrganograma.mockReturnValue({ dados: TREE, isLoading: false, error: null, refetch: vi.fn() });
    const { container } = renderPage();

    const itens = headerRevealNodes(container);
    expect(itens).toHaveLength(6);

    // Primeiro frame: os seis itens já no keyframe `hidden` dos KPIs (os slots de
    // delay 0..5 são o que faz a leitura em cascata). O `style` inline igual dos
    // seis é o que prova que todos vão animar — sem animação, a Motion deixaria
    // `opacity: 1` no primeiro frame.
    for (const item of itens) {
      expect(item.getAttribute('style')).toBe(HIDDEN_STYLE);
    }

    // Fim: cada um no lugar definitivo (a Motion limpa o transform ao terminar).
    await waitFor(() => {
      for (const item of itens) expect(item.style.transform).toBe('none');
    }, { timeout: 3000 });
    for (const item of itens) {
      expect(item.style.opacity).toBe('1');
    }
  });

  it('a cascata do cabeçalho toca mesmo sob um `AnimatePresence initial={false}` ancestral', async () => {
    mockUseOrganograma.mockReturnValue({ dados: TREE, isLoading: false, error: null, refetch: vi.fn() });
    // Reproduz o contexto de presença do app (PageTransition.tsx): `initial={false}`
    // é lido por QUALQUER `motion.*` descendente e faz a Motion pular o keyframe
    // inicial — sem o `AnimatePresence` local do OrganogramaPage, os seis itens já
    // apareceriam em `opacity: 1` no primeiro frame (que é o defeito que este
    // teste trava). Mesmo contorno de OrganogramaTree.tsx/HistoricoColaborador.tsx.
    const { container } = render(
      <MemoryRouter initialEntries={['/organograma']}>
        <AnimatePresence initial={false}>
          <div>
            <OrganogramaPage />
          </div>
        </AnimatePresence>
      </MemoryRouter>
    );

    for (const item of headerRevealNodes(container)) {
      expect(item.getAttribute('style')).toBe(HIDDEN_STYLE);
    }
  });

  it('computes departamentos, colaboradores and níveis hierárquicos from the tree', () => {
    mockUseOrganograma.mockReturnValue({ dados: TREE, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    // Diretoria, RH, Tecnologia, Produto, Marketing = 5 departamentos
    expect(screen.getByText('5')).toBeInTheDocument();
    // Ana, Carlos, Mariana, Lucas = 4 colaboradores
    expect(screen.getByText('4')).toBeInTheDocument();
    // Diretoria(1) > Tecnologia(2) > Produto(3)
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('starts with roots and first level expanded by default', () => {
    mockUseOrganograma.mockReturnValue({ dados: TREE, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    expect(screen.getByText('Recursos Humanos')).toBeInTheDocument();
    expect(screen.getByText('Ana Beatriz Souza')).toBeInTheDocument();
  });

  it('collapses and expands a department on row click', async () => {
    const user = userEvent.setup();
    mockUseOrganograma.mockReturnValue({ dados: TREE, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();

    expect(screen.getByText('Ana Beatriz Souza')).toBeInTheDocument();
    await user.click(screen.getByText('Recursos Humanos'));
    // O bloco do departamento fecha ANIMANDO (altura + opacidade) e só desmonta
    // no fim da transição — por isso a espera, e não uma checagem síncrona.
    await waitFor(() => expect(screen.queryByText('Ana Beatriz Souza')).not.toBeInTheDocument());

    await user.click(screen.getByText('Recursos Humanos'));
    expect(screen.getByText('Ana Beatriz Souza')).toBeInTheDocument();
  });

  it('expands every level with "Expandir tudo"', async () => {
    const user = userEvent.setup();
    mockUseOrganograma.mockReturnValue({ dados: TREE, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();

    expect(screen.queryByText('Mariana Oliveira Santos')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /expandir tudo/i }));
    // O nível 2 entra montado já no primeiro frame (é o bloco abrindo + a
    // cascata das rows por cima), então o critério aqui é presença — a
    // progressividade em si é travada em OrganogramaNode.test.tsx.
    expect(screen.getByText('Mariana Oliveira Santos')).toBeInTheDocument();
  });

  it('collapses every department with "Recolher tudo" (onda de baixo pra cima, não instantânea)', async () => {
    const user = userEvent.setup();
    mockUseOrganograma.mockReturnValue({ dados: TREE, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();

    expect(screen.getByText('Recursos Humanos')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /recolher tudo/i }));

    // Primeiro frame depois do clique: continua montado — os blocos estão saindo
    // com a animação de altura + opacidade (é isso que acaba com o fechamento
    // seco, em que a árvore inteira recolhia num único frame).
    expect(screen.getByText('Recursos Humanos')).toBeInTheDocument();
    expect(screen.getByText('Ana Beatriz Souza')).toBeInTheDocument();

    // A onda vai de BAIXO pra CIMA: o conteúdo do nível mais fundo (o colaborador
    // de Recursos Humanos) termina de sair primeiro e, quando isso acontece, a row
    // do nível 1 ainda está montada — ela só sai no passo seguinte, depois que o
    // vão dela fechou. Sem os passos (todos os `expandedIds` caindo de uma vez) os
    // dois sumiriam no mesmo instante — que é o defeito que este teste trava.
    await waitFor(() => expect(screen.queryByText('Ana Beatriz Souza')).not.toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText('Recursos Humanos')).toBeInTheDocument();

    // Fim da onda: o nível 1 sai e só as raízes ficam (recolhidas), como antes.
    // O timeout é folgado de propósito: a árvore recolhe em passos, não num frame.
    await waitFor(() => expect(screen.queryByText('Recursos Humanos')).not.toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText('Diretoria Executiva')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
  });

  it('filters by department name', async () => {
    const user = userEvent.setup();
    mockUseOrganograma.mockReturnValue({ dados: TREE, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();

    await user.type(screen.getByPlaceholderText('Buscar na estrutura...'), 'Marketing');
    expect(screen.getByText('Marketing')).toBeInTheDocument();
    expect(screen.queryByText('Diretoria Executiva')).not.toBeInTheDocument();
  });

  it('filters by colaborador name and keeps the ancestor path visible (rule: no orphan results)', async () => {
    const user = userEvent.setup();
    mockUseOrganograma.mockReturnValue({ dados: TREE, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();

    await user.type(screen.getByPlaceholderText('Buscar na estrutura...'), 'Mariana');

    expect(screen.getByText('Mariana Oliveira Santos')).toBeInTheDocument();
    expect(screen.getByText('Produto')).toBeInTheDocument();
    expect(screen.getByText('Tecnologia')).toBeInTheDocument();
    expect(screen.getByText('Diretoria Executiva')).toBeInTheDocument();
    // Non-matching siblings should not appear
    expect(screen.queryByText('Recursos Humanos')).not.toBeInTheDocument();
    expect(screen.queryByText('Marketing')).not.toBeInTheDocument();
  });

  it('finds a colaborador even when their department starts collapsed', async () => {
    const user = userEvent.setup();
    mockUseOrganograma.mockReturnValue({ dados: TREE, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();

    // Produto starts collapsed (it's a level-2 sub-department under Tecnologia)
    expect(screen.queryByText('Mariana Oliveira Santos')).not.toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Buscar na estrutura...'), 'Mariana Oliveira Santos');
    expect(screen.getByText('Mariana Oliveira Santos')).toBeInTheDocument();
  });

  it('filters by cargo', async () => {
    const user = userEvent.setup();
    mockUseOrganograma.mockReturnValue({ dados: TREE, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();

    await user.type(screen.getByPlaceholderText('Buscar na estrutura...'), 'Designer Gráfico');
    expect(screen.getByText('Lucas Gabriel Fernandes')).toBeInTheDocument();
  });

  it('is case and accent insensitive', async () => {
    const user = userEvent.setup();
    mockUseOrganograma.mockReturnValue({ dados: TREE, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();

    await user.type(screen.getByPlaceholderText('Buscar na estrutura...'), 'GERENTE de produto');
    expect(screen.getByText('Mariana Oliveira Santos')).toBeInTheDocument();
  });

  it('shows a "no results" message and restores the tree when the search is cleared', async () => {
    const user = userEvent.setup();
    mockUseOrganograma.mockReturnValue({ dados: TREE, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();

    const input = screen.getByPlaceholderText('Buscar na estrutura...');
    await user.type(input, 'zzzzzz-nao-existe');
    expect(screen.getByText(/Nenhum resultado para/)).toBeInTheDocument();

    await user.clear(input);
    expect(screen.getByText('Diretoria Executiva')).toBeInTheDocument();
    expect(screen.getByText('Marketing')).toBeInTheDocument();
  });

  it('renders a mailto link for each colaborador', () => {
    mockUseOrganograma.mockReturnValue({ dados: TREE, isLoading: false, error: null, refetch: vi.fn() });
    renderPage();
    const link = screen.getByText('ana.souza@promobrindes.com.br').closest('a');
    expect(link).toHaveAttribute('href', 'mailto:ana.souza@promobrindes.com.br');
  });
});
