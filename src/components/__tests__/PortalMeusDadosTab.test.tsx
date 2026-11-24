import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: { email_alertas: true, push_alertas: false, alertar_ferias: true, alertar_holerite: false },
    isLoading: false,
  })),
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => children,
}));

import { PortalMeusDadosTab } from '../portal/PortalMeusDadosTab';

const DEFAULT_PROPS = {
  nome: 'João Silva',
  email: 'joao@empresa.com',
  profile: { cargo: 'Analista', departamento: 'TI', telefone: '(11) 99999-0000' },
  userId: 'usr-001',
  navigate: vi.fn(),
};

describe('PortalMeusDadosTab', () => {
  it('renders Dados Pessoais section title', () => {
    render(<PortalMeusDadosTab {...DEFAULT_PROPS} />);
    expect(screen.getByText('Dados Pessoais')).toBeInTheDocument();
  });

  it('renders Nome field with value', () => {
    render(<PortalMeusDadosTab {...DEFAULT_PROPS} />);
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('renders Email field with value', () => {
    render(<PortalMeusDadosTab {...DEFAULT_PROPS} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('joao@empresa.com')).toBeInTheDocument();
  });

  it('renders Solicitar Alteração button', () => {
    render(<PortalMeusDadosTab {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /Solicitar Alteração/i })).toBeInTheDocument();
  });

  it('renders Segurança & Privacidade section', () => {
    render(<PortalMeusDadosTab {...DEFAULT_PROPS} />);
    expect(screen.getByText(/Segurança/)).toBeInTheDocument();
  });

  it('renders Alterar Senha button', () => {
    render(<PortalMeusDadosTab {...DEFAULT_PROPS} />);
    expect(screen.getByRole('button', { name: /Alterar Senha/i })).toBeInTheDocument();
  });

  it('renders Preferências de Notificação section', () => {
    render(<PortalMeusDadosTab {...DEFAULT_PROPS} />);
    expect(screen.getByText(/Preferências de Notificação/)).toBeInTheDocument();
  });

  it('renders Alertas por E-mail toggle label', () => {
    render(<PortalMeusDadosTab {...DEFAULT_PROPS} />);
    expect(screen.getByText('Alertas por E-mail')).toBeInTheDocument();
  });
});
