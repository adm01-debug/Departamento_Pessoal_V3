import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ data: [], error: null })),
      })),
    })),
  },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/utils/safeError', () => ({ safeErrorMessage: vi.fn((e: any, d: string) => d) }));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

import { RelatorioContabilDialog } from '../folha/RelatorioContabilDialog';

describe('RelatorioContabilDialog', () => {
  it('renders Conciliação Contábil trigger button', () => {
    render(<RelatorioContabilDialog folhaId="f-001" />);
    expect(screen.getByText('Conciliação Contábil')).toBeInTheDocument();
  });

  it('renders dialog title', () => {
    render(<RelatorioContabilDialog folhaId="f-001" />);
    expect(screen.getByText('Exportar para Contabilidade (Analítico)')).toBeInTheDocument();
  });

  it('renders ERP import description', () => {
    render(<RelatorioContabilDialog folhaId="f-001" />);
    expect(screen.getByText(/ERP/i)).toBeInTheDocument();
  });

  it('renders Lançamentos detalhados bullet', () => {
    render(<RelatorioContabilDialog folhaId="f-001" />);
    expect(screen.getByText(/Lançamentos detalhados/i)).toBeInTheDocument();
  });

  it('renders Centro de Custo bullet', () => {
    render(<RelatorioContabilDialog folhaId="f-001" />);
    expect(screen.getByText(/Centro de Custo/i)).toBeInTheDocument();
  });

  it('renders Encargos Patronais bullet', () => {
    render(<RelatorioContabilDialog folhaId="f-001" />);
    expect(screen.getByText(/Encargos Patronais/i)).toBeInTheDocument();
  });

  it('renders Gerar Lançamentos Contábeis button', () => {
    render(<RelatorioContabilDialog folhaId="f-001" />);
    expect(screen.getByText('Gerar Lançamentos Contábeis')).toBeInTheDocument();
  });

  it('renders Identificação por Colaborador bullet', () => {
    render(<RelatorioContabilDialog folhaId="f-001" />);
    expect(screen.getByText(/Identificação por Colaborador/i)).toBeInTheDocument();
  });
});
