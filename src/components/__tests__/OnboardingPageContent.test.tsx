import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock completo (mesma convenção de `OnboardingDashboard.test.tsx`): o
// componente reaproveita `cardVariants` de `MetricCard`
// (src/components/dashboard), e esse módulo avalia `motion.create(Card)` já na
// CARGA — sem `create` aqui, o import quebra com "motion.create is not a
// function". O `AnimatePresence` é o escudo de entrada que envolve a lista.
vi.mock('framer-motion', () => ({
  motion: {
    create:
      (Component: any) =>
      ({ children, ...rest }: any) => <Component {...rest}>{children}</Component>,
    div: ({ children }: any) => <div>{children}</div>,
    span: ({ children }: any) => <span>{children}</span>,
    li: ({ children }: any) => <li>{children}</li>,
    circle: () => <circle />,
    polygon: () => <polygon />,
    polyline: () => <polyline />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useInView: () => true,
  useReducedMotion: () => false,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ order: vi.fn(() => Promise.resolve({ data: [], error: null })) })),
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
    })),
  },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  ),
}));

// Dropdown fechado por padrão: só o TRIGGER aparece (o `Content` do Radix só
// existe aberto). Assim "Ver onboarding" do menu não duplica o botão do card.
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <>{children}</>,
  DropdownMenuTrigger: ({ children }: any) => <>{children}</>,
  DropdownMenuContent: () => null,
  DropdownMenuItem: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => null,
}));

// O detalhe tem tela própria; aqui só provamos a FIACAO (abre com o colaborador
// clicado). A lista completa de tarefas é responsabilidade do detalhe.
vi.mock('@/components/admissoes/OnboardingDetalheDialog', () => ({
  OnboardingDetalheDialog: ({ colaborador, open }: any) =>
    open && colaborador ? <div>Detalhe de {colaborador.nome}</div> : null,
}));

vi.mock('@/lib/utils', () => ({ cn: (...args: any[]) => args.filter(Boolean).join(' ') }));

import { useQuery } from '@tanstack/react-query';
import OnboardingPageContent from '../admissoes/OnboardingPageContent';

const MOCK_ONBOARDING = [
  {
    id: 'onb-1',
    nome: 'Lucas Mendes',
    cargo: 'Desenvolvedor',
    departamento: 'TI',
    data_prevista: '2026-08-01',
    created_at: '2026-07-20T12:00:00.000Z',
    tarefas: [
      {
        id: 't1',
        titulo: 'Criar conta de e-mail',
        descricao: 'Criação das contas corporativas e liberação de perfis no sistema.',
        concluida: false,
        prazo_dias: 3,
        created_at: '2026-07-20T12:00:00.000Z',
        responsavel_nome: 'Bruno Alves',
      },
      { id: 't2', titulo: 'Configurar acesso', concluida: true, concluida_em: '2026-07-22T16:00:00.000Z' },
    ],
  },
];

describe('OnboardingPageContent', () => {
  it('shows loading spinner while fetching', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: true } as any);
    const { container } = render(<OnboardingPageContent />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no onboarding data', () => {
    vi.mocked(useQuery).mockReturnValue({ data: [], isLoading: false } as any);
    render(<OnboardingPageContent />);
    expect(screen.getByText('Nenhum onboarding ativo')).toBeInTheDocument();
    expect(screen.getByText('Inicie uma nova admissão para ver a jornada aqui.')).toBeInTheDocument();
  });

  it('renders the collaborator header (name + cargo • departamento + % progress)', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ONBOARDING, isLoading: false } as any);
    render(<OnboardingPageContent />);
    expect(screen.getByText('Lucas Mendes')).toBeInTheDocument();
    expect(screen.getByText('Desenvolvedor • TI')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders the milestone ruler labels', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ONBOARDING, isLoading: false } as any);
    render(<OnboardingPageContent />);
    ['Pré-onboarding', '1º dia', '1ª semana', '30 dias'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('renders the next action from the first pending task', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ONBOARDING, isLoading: false } as any);
    render(<OnboardingPageContent />);
    expect(screen.getByText('Próxima ação')).toBeInTheDocument();
    expect(screen.getByText('Criar conta de e-mail')).toBeInTheDocument();
  });

  it('mostra a DESCRIÇÃO (texto auxiliar) da próxima ação, além do título', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ONBOARDING, isLoading: false } as any);
    render(<OnboardingPageContent />);
    expect(screen.getByTestId('onboarding-proxima-titulo')).toHaveTextContent('Criar conta de e-mail');
    expect(screen.getByTestId('onboarding-proxima-descricao')).toHaveTextContent(
      'Criação das contas corporativas e liberação de perfis no sistema.'
    );
  });

  it('NÃO corta a próxima ação: título e descrição longos aparecem por INTEIRO', () => {
    const TITULO =
      'Configuração completa dos acessos corporativos (e-mail, VPN, ERP e pastas de rede) com validação de perfis';
    const DESCRICAO =
      'Criação das contas, liberação de perfis por área e validação final dos acessos junto ao time de infraestrutura antes do primeiro dia.';
    vi.mocked(useQuery).mockReturnValue({
      data: [
        {
          ...MOCK_ONBOARDING[0],
          tarefas: [
            {
              id: 't-longa',
              titulo: TITULO,
              descricao: DESCRICAO,
              concluida: false,
              prazo_dias: 3,
              created_at: '2026-07-20T12:00:00.000Z',
              responsavel_nome: 'Bruno Alves',
            },
          ],
        },
      ],
      isLoading: false,
    } as any);
    render(<OnboardingPageContent />);

    const titulo = screen.getByTestId('onboarding-proxima-titulo');
    const descricao = screen.getByTestId('onboarding-proxima-descricao');

    // textContent IDÊNTICO ao dado: nada de reticências, nada de prefixo cortado.
    expect(titulo.textContent).toBe(TITULO);
    expect(descricao.textContent).toBe(DESCRICAO);
    expect(titulo.textContent).not.toContain('…');
    expect(descricao.textContent).not.toContain('…');

    // Nenhuma regra de corte nos textos do bloco + quebra de linha liberada.
    [titulo, descricao].forEach((el) => {
      expect(el.className).toContain('whitespace-normal');
      ['truncate', 'line-clamp', 'overflow-hidden', 'text-ellipsis', 'max-h-', 'whitespace-nowrap'].forEach((regra) => {
        expect(el.className).not.toContain(regra);
      });
    });

    // Metadados (prazo + responsável) não espremem o texto: linha própria com wrap.
    const meta = screen.getByTestId('onboarding-proxima-meta');
    expect(meta.className).toContain('flex-wrap');
    expect(meta.className).not.toContain('justify-between');
    expect(meta.textContent).toContain('Bruno Alves');
  });

  it('renders the compact status counters', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ONBOARDING, isLoading: false } as any);
    render(<OnboardingPageContent />);
    expect(screen.getByText('1 concluída')).toBeInTheDocument();
    expect(screen.getByText('1 pendente')).toBeInTheDocument();
  });

  it('does NOT render the always-open checklist on the card', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ONBOARDING, isLoading: false } as any);
    render(<OnboardingPageContent />);
    expect(screen.queryByText('Tarefas Críticas')).not.toBeInTheDocument();
    expect(screen.queryByText('Configurar acesso')).not.toBeInTheDocument();
  });

  it('opens the detail when "Ver onboarding" is clicked', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ONBOARDING, isLoading: false } as any);
    render(<OnboardingPageContent />);
    fireEvent.click(screen.getByText('Ver onboarding'));
    expect(screen.getByText('Detalhe de Lucas Mendes')).toBeInTheDocument();
  });

  it('mantém a timeline contida: trilho entre o 1º e o último ponto e preenchimento sem vazar', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ONBOARDING, isLoading: false } as any);
    render(<OnboardingPageContent />);

    // 4 marcos em grid de 4 colunas → centro das colunas em 12.5% e 87.5%.
    const trilho = screen.getByTestId('onboarding-timeline-track');
    expect(trilho.style.left).toBe('12.5%');
    expect(trilho.style.right).toBe('12.5%');

    // 50% de progresso → 2 marcos concluídos de 3 passos possíveis → 50% do trilho.
    const preenchido = screen.getByTestId('onboarding-timeline-fill');
    expect(preenchido.style.left).toBe('12.5%');
    expect(parseFloat(preenchido.style.width)).toBeCloseTo(50, 5);

    // Nunca ultrapassa o centro do ÚLTIMO ponto (87.5%): 12.5 + 75 = 87.5.
    expect(12.5 + parseFloat(preenchido.style.width)).toBeLessThanOrEqual(87.5);
  });

  it('empilha a linha ATRÁS dos pontos (pontos sempre acima do traço)', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ONBOARDING, isLoading: false } as any);
    render(<OnboardingPageContent />);

    // Os dois trilhos são absolutos e ficam na camada de trás (`z-0`)...
    expect(screen.getByTestId('onboarding-timeline-track').className).toContain('z-0');
    expect(screen.getByTestId('onboarding-timeline-fill').className).toContain('z-0');

    // ...e TODO ponto é posicionado (`relative`) numa camada à frente (`z-10`),
    // então a bolinha opaca encobre a linha no seu centro.
    const pontos = screen.getAllByTestId('onboarding-timeline-dot');
    expect(pontos).toHaveLength(4);
    pontos.forEach((ponto) => {
      expect(ponto.className).toContain('relative');
      expect(ponto.className).toContain('z-10');
    });
  });

  it('mantém a micro barra de progresso no canto (largura curta, ao lado da porcentagem)', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_ONBOARDING, isLoading: false } as any);
    render(<OnboardingPageContent />);

    const barra = screen.getByRole('progressbar');
    expect(barra).toHaveAttribute('aria-valuenow', '50');
    // Largura fixa e curta — não atravessa o card.
    expect(barra.className).toContain('w-16');
    expect(barra.className).not.toContain('w-full');
  });
});
