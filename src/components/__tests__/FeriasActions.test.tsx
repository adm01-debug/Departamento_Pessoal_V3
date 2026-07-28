import { describe, it, expect, vi } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children }: any) => children,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

// O hook real consome o AuthContext; em teste unitário isolamos a dependência.
// Sessão fixa: o componente e seus filhos leem o usuário atual via AuthContext.
vi.mock('@/contexts/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useAuth: () => ({
      user: { id: 'user-1', email: 'rh@empresa.com' },
      session: { access_token: 'token' },
      isReady: true,
      loading: false,
    }),
  };
});

// Depende do AuthContext (usuário atual) — isolado no teste unitário.
vi.mock('@/hooks/ferias/useAdiantamento13', () => ({
  useSolicitarAdiantamento13: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useAssinarAvisoFerias', () => ({
  useAssinarAvisoFerias: () => ({
    baixarAvisoAssinado: vi.fn(),
    assinar: vi.fn(),
    loading: false,
  }),
}));

vi.mock('@/utils/feriasPDF', () => ({
  feriasPDF: { gerarRecibo: vi.fn() },
}));

import { FeriasActions } from '../ferias/FeriasActions';

const BASE_SOLICITACAO = { id: 'sol-1', aprovado_gestor: false, aprovado_rh: false, enviado_contabilidade: false, cancelado: false, status: 'pendente' };

const DEFAULT_PROPS = {
  solicitacao: BASE_SOLICITACAO,
  onAprovarGestor: vi.fn(),
  onAprovarRH: vi.fn(),
  onEnviarContabilidade: vi.fn(),
  onRejeitar: vi.fn(),
  onCancelar: vi.fn(),
};

/** Renderiza com QueryClient isolado: o componente usa react-query internamente. */
function render(ui: React.ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('FeriasActions', () => {
  it('renders Aprovar (Gestor) button when not yet approved', () => {
    render(<FeriasActions {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /Aprovar \(Gestor\)/i })).toBeInTheDocument();
  });

  it('renders Rejeitar button when not yet approved by gestor', () => {
    render(<FeriasActions {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /Rejeitar/i })).toBeInTheDocument();
  });

  it('renders Baixar button always', () => {
    render(<FeriasActions {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /Baixar/i })).toBeInTheDocument();
  });

  it('renders Cancelar button always', () => {
    render(<FeriasActions {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /Cancelar/i })).toBeInTheDocument();
  });

  it('renders Aprovar (RH) button when approved by gestor but not RH', () => {
    render(<FeriasActions {...DEFAULT_PROPS} solicitacao={{ ...BASE_SOLICITACAO, aprovado_gestor: true }} />);
    expect(screen.getByRole('button', { name: /Aprovar \(RH\)/i })).toBeInTheDocument();
  });

  it('returns null when solicitacao is cancelado', () => {
    const { container } = render(<FeriasActions {...DEFAULT_PROPS} solicitacao={{ ...BASE_SOLICITACAO, cancelado: true }} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when status is rejeitada', () => {
    const { container } = render(<FeriasActions {...DEFAULT_PROPS} solicitacao={{ ...BASE_SOLICITACAO, status: 'rejeitada' }} />);
    expect(container.firstChild).toBeNull();
  });

  it('calls onAprovarGestor when Aprovar (Gestor) is clicked', async () => {
    const onAprovarGestor = vi.fn();
    render(<FeriasActions {...DEFAULT_PROPS} onAprovarGestor={onAprovarGestor} />);
    await userEvent.click(screen.getByRole('button', { name: /Aprovar \(Gestor\)/i }));
    expect(onAprovarGestor).toHaveBeenCalledWith('sol-1');
  });
});
