/**
 * REGRESSÃO DA CONSOLIDAÇÃO — Jornada de Onboarding (`/onboarding`).
 *
 * A aba "Onboarding" de Admissões foi REMOVIDA e esta é a única superfície de
 * onboarding. O arquivo ABSORVE os testes que existiam para
 * `OnboardingPageContent.test.tsx` (o card, a régua, o detalhe, o loading e os
 * estados vazios continuam cobertos — nenhuma garantia foi perdida) e acrescenta
 * o que a consolidação trouxe: resumo do topo, filtros, chips rápidos, as duas
 * abas e "Gestão de Kits" como ação do cabeçalho.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock completo (mesma convenção de `OnboardingDashboard.test.tsx`): o
// componente reaproveita `cardVariants` de `MetricCard`
// (src/components/dashboard), e esse módulo avalia `motion.create(Card)` já na
// CARGA — sem `create` aqui, o import quebra com "motion.create is not a
// function". O `AnimatePresence` é o escudo de entrada que envolve a lista.
vi.mock('framer-motion', () => {
  // Só o essencial chega ao DOM nos wrappers de animação; as props de Motion
  // (`custom`/`variants`/`initial`/`animate`) NÃO são repassadas.
  const wrapper =
    (tag: any) =>
    ({ children, onClick, ...rest }: any) =>
      tag === 'button' ? (
        <button onClick={onClick} aria-label={rest['aria-label']} data-testid={rest['data-testid']}>
          {children}
        </button>
      ) : (
        <div>{children}</div>
      );
  return {
    motion: {
      create: (Component: any) => ({ children, ...rest }: any) => <Component {...rest}>{children}</Component>,
      div: wrapper('div'),
      span: wrapper('span'),
      button: wrapper('button'),
      li: wrapper('li'),
      circle: () => <circle />,
      polygon: () => <polygon />,
      polyline: () => <polyline />,
    },
    AnimatePresence: ({ children }: any) => <>{children}</>,
    useInView: () => true,
    useReducedMotion: () => false,
  };
});

const { paramsMock } = vi.hoisted(() => ({ paramsMock: { valor: '' } }));

vi.mock('react-router-dom', () => ({
  useSearchParams: () => [new URLSearchParams(paramsMock.valor), vi.fn()],
  // O CTA "Iniciar Onboarding" navega para `/admissoes`; aqui basta o duble.
  useNavigate: () => vi.fn(),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'empresa-teste' } }),
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

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

// Casca da página: fora de escopo aqui (a rota já a exercita nos testes de
// layout). Mantém os filhos para o teste enxergar só o domínio da jornada.
vi.mock('@/components/PageTitle', () => ({ PageTitle: () => null }));
vi.mock('@/components/layout', () => ({
  PageLayout: ({ children, actions }: any) => (
    <div>
      <div data-testid="page-actions">{actions}</div>
      {children}
    </div>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className, ...rest }: any) => (
    <div className={className} data-testid={rest['data-testid']}>
      {children}
    </div>
  ),
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

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
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

// Selects fechados (só o trigger com o placeholder) — o Radix não monta o
// conteúdo sem interação. As listas de opção não entram no DOM e portanto não
// colidem com os textos dos cards/chips.
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: () => null,
  SelectItem: ({ children }: any) => <div>{children}</div>,
}));

// Tabs com o mínimo do contrato do Radix: só a aba ATIVA renderiza o conteúdo e
// o clique no trigger troca a aba (delegação por `data-tab-value`).
vi.mock('@/components/ui/tabs', async () => {
  const React = await import('react');
  const Ctx = React.createContext('');
  return {
    Tabs: ({ children, value, onValueChange }: any) => (
      <Ctx.Provider value={value}>
        <div
          onClick={(e: any) => {
            const alvo = e.target?.dataset?.tabValue;
            if (alvo) onValueChange?.(alvo);
          }}
        >
          {children}
        </div>
      </Ctx.Provider>
    ),
    TabsList: ({ children }: any) => <div role="tablist">{children}</div>,
    TabsTrigger: ({ children, value }: any) => (
      <button role="tab" data-tab-value={value}>
        {children}
      </button>
    ),
    TabsContent: ({ children, value }: any) => {
      const ativo = React.useContext(Ctx);
      return ativo === value ? <div>{children}</div> : null;
    },
  };
});

// O detalhe tem tela própria; aqui só provamos a FIACAO (abre com o colaborador
// clicado). A lista completa de tarefas é responsabilidade do detalhe.
vi.mock('@/components/admissoes/OnboardingDetalheDialog', () => ({
  OnboardingDetalheDialog: ({ colaborador, open }: any) =>
    open && colaborador ? <div>Detalhe de {colaborador.nome}</div> : null,
}));

// Popup de kit: pela mesma razão, só a fiacao interessa aqui.
vi.mock('@/components/ui/animated-cascade-dialog', () => ({
  AnimatedCascadeDialog: ({ open, title }: any) => (open ? <div>Kit aberto: {title}</div> : null),
}));

// O formulário de kit tem teste próprio (`KitOnboardingDialog.test.tsx`); aqui
// provamos só a FIACAO: abrir com o kit certo e receber o payload salvo.
vi.mock('@/components/admissoes/KitOnboardingDialog', () => ({
  KitOnboardingDialog: ({ open, kit, onSalvar }: any) =>
    open ? (
      <div data-testid="kit-dialog">
        <span>Formulário de kit: {kit?.nome ?? 'novo'}</span>
        <button
          type="button"
          aria-label="Confirmar kit de teste"
          onClick={() => onSalvar({ nome: 'Kit Teste', itens: ['Notebook'], ativo: true })}
        >
          Confirmar
        </button>
      </div>
    ) : null,
}));

vi.mock('@/lib/utils', () => ({ cn: (...args: any[]) => args.filter(Boolean).join(' ') }));

import { useQuery } from '@tanstack/react-query';
import OnboardingPage from '@/pages/OnboardingPage';

/** `created_at` deslocado em dias a partir de HOJE — mantém a régua determinística. */
const DIA = 24 * 60 * 60 * 1000;
const deslocar = (dias: number) => new Date(Date.now() + dias * DIA).toISOString();

/**
 * Espelho do mock de onboarding: um EM DIA (Lucas), um ATRASADO (Bruno, a
 * próxima ação venceu há muito) e um CONCLUÍDO (Carla) — o suficiente para
 * exercitar as duas abas, os chips e o resumo do topo.
 */
const MOCK_ONBOARDING = [
  {
    id: 'onb-1',
    nome: 'Lucas Mendes',
    cargo: 'Desenvolvedor',
    departamento: 'TI',
    data_prevista: deslocar(20),
    created_at: deslocar(-2),
    tarefas: [
      {
        id: 't1',
        titulo: 'Criar conta de e-mail',
        descricao: 'Criação das contas corporativas e liberação de perfis no sistema.',
        concluida: false,
        prazo_dias: 30,
        created_at: deslocar(-2),
        responsavel_nome: 'Bruno Alves',
      },
      { id: 't2', titulo: 'Configurar acesso', concluida: true, concluida_em: deslocar(-1) },
    ],
  },
  {
    id: 'onb-2',
    nome: 'Bruno Rocha',
    cargo: 'Analista',
    departamento: 'RH',
    created_at: deslocar(-40),
    tarefas: [
      {
        id: 't3',
        titulo: 'Assinar termo',
        concluida: false,
        prazo_dias: 5,
        created_at: deslocar(-40),
        responsavel_nome: 'Carla Dias',
      },
    ],
  },
  {
    id: 'onb-3',
    nome: 'Carla Dias',
    cargo: 'Designer',
    departamento: 'Marketing',
    created_at: deslocar(-60),
    tarefas: [
      { id: 't4', titulo: 'Tour', concluida: true, concluida_em: deslocar(-30) },
      { id: 't5', titulo: 'Check-in', concluida: true, concluida_em: deslocar(-10) },
    ],
  },
];


/** Só o Lucas — isola as asserções do CARD (as mesmas do arquivo antigo). */
const SO_LUCAS = [MOCK_ONBOARDING[0]];

/** Perfis de kit (fonte da grade de "Gestão de Kits" — tabela `onboarding_kits`). */
const MOCK_KITS = [
  { id: 'kit-dev', nome: 'Kit Desenvolvedor', itens: ['MacBook M3', 'Monitor 27"', 'Headset'] },
  { id: 'kit-adm', nome: 'Kit Administrativo', itens: ['Notebook', 'Crachá', 'Fone'] },
];

/**
 * A página tem DUAS queries (jornada + kits), então o mock responde pela
 * `queryKey` — devolver o mesmo valor para as duas contaminaria uma com a outra.
 * `kitsErro` simula falha de leitura dos kits (estado C).
 */
const montar = (dados: unknown[], isLoading = false, kits: unknown[] = MOCK_KITS, kitsErro = false) => {
  paramsMock.valor = '';
  vi.mocked(useQuery).mockImplementation(
    (opcoes: any) =>
      ({
        data: opcoes?.queryKey?.[0] === 'onboarding-kits' ? kits : dados,
        isLoading,
        isError: opcoes?.queryKey?.[0] === 'onboarding-kits' ? kitsErro : false,
      }) as any
  );
  return render(<OnboardingPage />);
};

/** Renderiza já com um deep link `?colaborador=<id>` (atalho de Admissões). */
const montarComLink = (dados: unknown[], id: string) => {
  vi.mocked(useQuery).mockImplementation(
    (opcoes: any) =>
      ({ data: opcoes?.queryKey?.[0] === 'onboarding-kits' ? MOCK_KITS : dados, isLoading: false, isError: false }) as any
  );
  paramsMock.valor = `colaborador=${id}`;
  return render(<OnboardingPage />);
};

describe('Jornada de Onboarding — card e estado (cobertura herdada)', () => {
  it('shows loading spinner while fetching', () => {
    const { container } = montar([], true);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no onboarding data', () => {
    montar([]);
    expect(screen.getByText('Nenhum onboarding ativo')).toBeInTheDocument();
    expect(screen.getByText('Inicie uma nova admissão para ver a jornada aqui.')).toBeInTheDocument();
  });

  it('renders the collaborator header (name + cargo • departamento + % progress)', () => {
    montar(SO_LUCAS);
    expect(screen.getByText('Lucas Mendes')).toBeInTheDocument();
    expect(screen.getByText('Desenvolvedor • TI')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders the milestone ruler labels', () => {
    montar(SO_LUCAS);
    ['Pré-onboarding', '1º dia', '1ª semana', '30 dias'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('renders the next action from the first pending task', () => {
    montar(SO_LUCAS);
    expect(screen.getByText('Próxima ação')).toBeInTheDocument();
    expect(screen.getByText('Criar conta de e-mail')).toBeInTheDocument();
  });

  it('mostra a DESCRIÇÃO (texto auxiliar) da próxima ação, além do título', () => {
    montar(SO_LUCAS);
    expect(screen.getByTestId('onboarding-proxima-titulo')).toHaveTextContent('Criar conta de e-mail');
    expect(screen.getByTestId('onboarding-proxima-descricao')).toHaveTextContent(
      'Criação das contas corporativas e liberação de perfis no sistema.'
    );
  });

  it('renders the compact status counters', () => {
    montar(SO_LUCAS);
    expect(screen.getByText('1 concluída')).toBeInTheDocument();
    expect(screen.getByText('1 pendente')).toBeInTheDocument();
  });

  it('does NOT render the always-open checklist on the card', () => {
    montar(SO_LUCAS);
    expect(screen.queryByText('Tarefas Críticas')).not.toBeInTheDocument();
    expect(screen.queryByText('Configurar acesso')).not.toBeInTheDocument();
  });

  it('opens the detail when "Ver onboarding" is clicked', () => {
    montar(SO_LUCAS);
    fireEvent.click(screen.getByText('Ver onboarding'));
    expect(screen.getByText('Detalhe de Lucas Mendes')).toBeInTheDocument();
  });

  it('mantém a timeline contida: trilho entre o 1º e o último ponto e preenchimento sem vazar', () => {
    montar(SO_LUCAS);

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
    montar(SO_LUCAS);

    expect(screen.getByTestId('onboarding-timeline-track').className).toContain('z-0');
    expect(screen.getByTestId('onboarding-timeline-fill').className).toContain('z-0');

    const pontos = screen.getAllByTestId('onboarding-timeline-dot');
    expect(pontos).toHaveLength(4);
    pontos.forEach((ponto) => {
      expect(ponto.className).toContain('relative');
      expect(ponto.className).toContain('z-10');
    });
  });

  it('mantém a micro barra de progresso no canto (largura curta, ao lado da porcentagem)', () => {
    montar(SO_LUCAS);

    const barra = screen.getByRole('progressbar');
    expect(barra).toHaveAttribute('aria-valuenow', '50');
    expect(barra.className).toContain('w-16');
    expect(barra.className).not.toContain('w-full');
  });

  // ⬇️ CONTRATO RECUPERADO (FASE 1 da finalização): era o 13º teste do arquivo
  // antigo (`OnboardingPageContent.test.tsx`) e havia ficado sem par na migração.
  // O componente nunca mudou — o que faltava era a GUARDA DE REGRESSÃO.
  it('NÃO corta a próxima ação: título e descrição longos aparecem por INTEIRO', () => {
    const TITULO =
      'Configuração completa dos acessos corporativos (e-mail, VPN, ERP e pastas de rede) com validação de perfis';
    const DESCRICAO =
      'Criação das contas, liberação de perfis por área e validação final dos acessos junto ao time de infraestrutura antes do primeiro dia.';
    montar([
      {
        ...MOCK_ONBOARDING[0],
        tarefas: [
          {
            id: 't-longa',
            titulo: TITULO,
            descricao: DESCRICAO,
            concluida: false,
            prazo_dias: 3,
            created_at: deslocar(-1),
            responsavel_nome: 'Bruno Alves',
          },
        ],
      },
    ]);

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
});


describe('Jornada de Onboarding — consolidação (fonte única do onboarding)', () => {
  it('os totais do resumo vivem de forma contextual nos tabs (bloco isolado removido)', () => {
    montar(MOCK_ONBOARDING);
    // O resumo deixa de ser uma ÁREA própria no topo.
    expect(screen.queryByTestId('onboarding-resumo')).not.toBeInTheDocument();
    // Os totais continuam visíveis — agora dentro dos próprios tabs.
    // (Lucas + Bruno em andamento; Carla concluída.)
    const abas = screen.getAllByRole('tab').map((aba) => aba.textContent ?? '');
    expect(abas.join(' ')).toMatch(/Em andamento \(2\)/);
    expect(abas.join(' ')).toMatch(/Concluídos \(1\)/);
  });

  it('renderiza os chips rápidos da aba Em Andamento com a contagem real', () => {
    montar(MOCK_ONBOARDING);
    // Base da aba = Lucas (em dia) + Bruno (atrasado). O rótulo e a contagem são
    // irmãos no mesmo botão, então o nome acessível sai sem espaço: "Todos(2)".
    expect(screen.getByRole('button', { name: /Todos\(2\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Em dia\(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Atrasados\(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Em risco\(0\)/ })).toBeInTheDocument();
  });

  it('o chip "Atrasados" isola o colaborador com prazo vencido', () => {
    montar(MOCK_ONBOARDING);
    fireEvent.click(screen.getByRole('button', { name: /Atrasados\(1\)/ }));
    expect(screen.getByText('Bruno Rocha')).toBeInTheDocument();
    expect(screen.queryByText('Lucas Mendes')).not.toBeInTheDocument();
  });

  it('a busca filtra por nome/cargo/departamento/responsável e "Limpar filtros" restaura', () => {
    montar(MOCK_ONBOARDING);

    fireEvent.change(screen.getByLabelText('Buscar na jornada de onboarding'), { target: { value: 'Lucas' } });
    expect(screen.getByText('Lucas Mendes')).toBeInTheDocument();
    expect(screen.queryByText('Bruno Rocha')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Limpar filtros/ }));
    expect(screen.getByText('Bruno Rocha')).toBeInTheDocument();
  });

  it('a busca sem resultado mostra o estado vazio de filtro (não o de jornada vazia)', () => {
    montar(MOCK_ONBOARDING);
    fireEvent.change(screen.getByLabelText('Buscar na jornada de onboarding'), { target: { value: 'zzz' } });
    expect(screen.getByText('Nenhum colaborador com os filtros atuais')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum onboarding ativo')).not.toBeInTheDocument();
  });

  it('a aba Concluídos mostra só as jornadas 100% integradas', () => {
    montar(MOCK_ONBOARDING);
    // "Carla Dias" também é o RESPONSÁVEL da próxima ação do Bruno, então o que
    // prova a ausência da JORNADA dela é o cabeçalho do card (cargo • depto).
    expect(screen.queryByText('Designer • Marketing')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Concluídos/ }));
    expect(screen.getByText('Designer • Marketing')).toBeInTheDocument();
    expect(screen.queryByText('Desenvolvedor • TI')).not.toBeInTheDocument();

    // Chips próprios da aba Concluídos (nada de "Em risco/Atrasados" aqui).
    expect(screen.getByRole('button', { name: /No prazo\(1\)/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Atrasados/ })).not.toBeInTheDocument();
  });

  it('"Gestão de Kits" é AÇÃO do cabeçalho — fora do grupo de abas de status', () => {
    montar(MOCK_ONBOARDING);

    const abas = screen.getAllByRole('tab').map((aba) => aba.textContent);
    expect(abas).toHaveLength(2);
    expect(abas.join(' ')).not.toMatch(/Kits/);

    const botaoKits = screen.getByRole('button', { name: /Gestão de Kits/ });
    expect(botaoKits).toBeInTheDocument();

    fireEvent.click(botaoKits);
    // A visão de kits substitui a jornada (as abas somem) e a ação libera o card.
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.getByText('Kit Desenvolvedor')).toBeInTheDocument();
    expect(screen.getByText('Kit Administrativo')).toBeInTheDocument();

    // O card NÃO tem mais "Gerenciar kit" nem o segundo ícone — só o lápis edita.
    expect(screen.queryByRole('button', { name: /Gerenciar Kit Desenvolvedor/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Editar Kit Desenvolvedor/ })).toBeInTheDocument();
  });

  it('a grade de kits cai no estado vazio quando não há perfil cadastrado (nada de kit fictício)', () => {
    montar(MOCK_ONBOARDING, false, []);
    fireEvent.click(screen.getByRole('button', { name: /Gestão de Kits/ }));
    expect(screen.getByText('Nenhum perfil de kit cadastrado')).toBeInTheDocument();
  });

  // ── CASO-LIMITE 16: erro ao buscar kits ≠ "nenhum kit" ────────────────────
  it('erro de leitura dos kits mostra estado de ERRO explícito (não "nenhum kit")', () => {
    montar(MOCK_ONBOARDING, false, [], true);
    fireEvent.click(screen.getByRole('button', { name: /Gestão de Kits/ }));
    expect(screen.getByTestId('kits-erro')).toBeInTheDocument();
    expect(screen.getByText('Não foi possível carregar os perfis de kit')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum perfil de kit cadastrado')).not.toBeInTheDocument();
  });

  // ── FASE 7: "Novo Kit" agora é ação REAL ──────────────────────────────────
  it('"Novo Kit" abre o formulário vazio (antes era botão morto)', () => {
    montar(MOCK_ONBOARDING);
    fireEvent.click(screen.getByRole('button', { name: /Gestão de Kits/ }));
    expect(screen.queryByTestId('kit-dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Novo Kit' }));
    expect(screen.getByTestId('kit-dialog')).toBeInTheDocument();
    expect(screen.getByText('Formulário de kit: novo')).toBeInTheDocument();
  });

  it('editar um perfil abre o formulário já com o kit carregado', () => {
    montar(MOCK_ONBOARDING);
    fireEvent.click(screen.getByRole('button', { name: /Gestão de Kits/ }));
    fireEvent.click(screen.getByRole('button', { name: /Editar Kit Desenvolvedor/ }));
    expect(screen.getByText('Formulário de kit: Kit Desenvolvedor')).toBeInTheDocument();
  });

  // ── FASE 17: deep link `?colaborador=<id>` ───────────────────────────────
  it('o deep link ?colaborador=<id> foca apenas o colaborador indicado', () => {
    montarComLink(MOCK_ONBOARDING, 'onb-2');
    expect(screen.getByText('Bruno Rocha')).toBeInTheDocument();
    expect(screen.queryByText('Lucas Mendes')).not.toBeInTheDocument();
  });

  it('mantém os filtros operacionais na caixa de busca (busca, departamento, responsável, etapa)', () => {
    montar(MOCK_ONBOARDING);
    expect(screen.getByLabelText('Buscar na jornada de onboarding')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar por departamento')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar por responsável')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrar por etapa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mais filtros/ })).toBeInTheDocument();

    // O painel avançado só monta ao abrir "Mais filtros".
    expect(screen.queryByLabelText('Filtrar por período de início')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Mais filtros/ }));
    expect(screen.getByLabelText('Filtrar por período de início')).toBeInTheDocument();
  });
});

