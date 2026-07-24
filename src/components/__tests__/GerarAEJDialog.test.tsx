import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
  DialogTrigger: ({ children }: any) => children,
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001', nome: 'Empresa Teste' } })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { GerarAEJDialog } from '../ponto/GerarAEJDialog';

describe('GerarAEJDialog', () => {
  it('renders Gerar AEJ trigger button', () => {
    render(<GerarAEJDialog />);
    expect(screen.getByRole('button', { name: /Gerar AEJ/i })).toBeInTheDocument();
  });

  it('renders dialog title', () => {
    render(<GerarAEJDialog />);
    expect(screen.getByText(/Gerar AEJ.*Portaria MTP 671/i)).toBeInTheDocument();
  });

  it('renders dialog description', () => {
    render(<GerarAEJDialog />);
    expect(screen.getByText(/Arquivo Eletr.*nico de Jornada/i)).toBeInTheDocument();
  });

  it('renders Início date label', () => {
    render(<GerarAEJDialog />);
    expect(screen.getByText('Início')).toBeInTheDocument();
  });

  it('renders Fim date label', () => {
    render(<GerarAEJDialog />);
    expect(screen.getByText('Fim')).toBeInTheDocument();
  });

  it('renders Gerar e baixar button', () => {
    render(<GerarAEJDialog />);
    expect(screen.getByRole('button', { name: /Gerar e baixar/i })).toBeInTheDocument();
  });

  it('renders Fechar button', () => {
    render(<GerarAEJDialog />);
    expect(screen.getByRole('button', { name: /Fechar/i })).toBeInTheDocument();
  });

  it('renders date inputs', () => {
    render(<GerarAEJDialog />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);
  });
});
