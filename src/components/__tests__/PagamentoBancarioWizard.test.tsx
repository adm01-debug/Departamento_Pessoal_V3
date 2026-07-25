import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false })),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-1', razao_social: 'Empresa Teste' } })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ data: [], error: null })) })),
    })),
  },
}));

vi.mock('@/services/cnabService', () => ({
  cnabService: {
    generateCNAB240: vi.fn(() => Promise.resolve('cnab')),
    generatePIXBatch: vi.fn(() => Promise.resolve('pix')),
  },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/utils/safeError', () => ({ safeErrorMessage: vi.fn((e: any, d: string) => d) }));
vi.mock('@/lib/utils', () => ({ cn: (...a: string[]) => a.filter(Boolean).join(' ') }));

vi.mock('framer-motion', () => ({
  motion: { div: ({ children }: any) => <div>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, onClick }: any) => <div onClick={onClick}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

import { PagamentoBancarioWizard } from '../folha/PagamentoBancarioWizard';

describe('PagamentoBancarioWizard', () => {
  it('renders Pagar Salários trigger button', () => {
    render(<PagamentoBancarioWizard folhaId="f-001" />);
    expect(screen.getByText('Pagar Salários')).toBeInTheDocument();
  });

  it('trigger button disabled when no folhaId', () => {
    render(<PagamentoBancarioWizard />);
    const button = screen.getByText('Pagar Salários').closest('button');
    expect(button).toBeDisabled();
  });

  it('renders Liquidação de Folha heading', () => {
    render(<PagamentoBancarioWizard folhaId="f-001" />);
    expect(screen.getByText('Liquidação de Folha')).toBeInTheDocument();
  });

  it('renders Ambiente de Operações Bancárias subtitle', () => {
    render(<PagamentoBancarioWizard folhaId="f-001" />);
    expect(screen.getByText(/Ambiente de Operações Bancárias/i)).toBeInTheDocument();
  });

  it('renders Lote PIX option', () => {
    render(<PagamentoBancarioWizard folhaId="f-001" />);
    expect(screen.getByText('Lote PIX')).toBeInTheDocument();
  });

  it('renders Remessa CNAB option', () => {
    render(<PagamentoBancarioWizard folhaId="f-001" />);
    expect(screen.getByText('Remessa CNAB')).toBeInTheDocument();
  });

  it('renders TLS security notice', () => {
    render(<PagamentoBancarioWizard folhaId="f-001" />);
    expect(screen.getByText(/TLS 1\.3/i)).toBeInTheDocument();
  });

  it('renders Cancelar button in step 1', () => {
    render(<PagamentoBancarioWizard folhaId="f-001" />);
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });
});
