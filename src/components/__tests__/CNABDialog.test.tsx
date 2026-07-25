import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-1', razao_social: 'Empresa Teste' } })),
}));

vi.mock('@/services/cnabService', () => ({
  cnabService: {
    getConfig: vi.fn(() => Promise.resolve(null)),
    saveConfig: vi.fn(() => Promise.resolve()),
    generateCNAB240: vi.fn(() => Promise.resolve('cnab content')),
    generatePIXBatch: vi.fn(() => Promise.resolve('pix content')),
  },
}));

vi.mock('@/utils/dateLocal', () => ({
  todayLocalISO: vi.fn(() => '2026-07-24'),
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

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

import { CNABDialog } from '../folha/CNABDialog';

describe('CNABDialog', () => {
  it('renders Exportar Bancário trigger button', () => {
    render(<CNABDialog folhaId="f-001" />);
    expect(screen.getByText('Exportar Bancário')).toBeInTheDocument();
  });

  it('renders Pagamento de Salários dialog title', () => {
    render(<CNABDialog folhaId="f-001" />);
    expect(screen.getByText(/Pagamento de Salários.*CNAB\/PIX/i)).toBeInTheDocument();
  });

  it('renders Código do Banco label', () => {
    render(<CNABDialog folhaId="f-001" />);
    expect(screen.getByText('Código do Banco')).toBeInTheDocument();
  });

  it('renders Número do Convênio label', () => {
    render(<CNABDialog folhaId="f-001" />);
    expect(screen.getByText('Número do Convênio')).toBeInTheDocument();
  });

  it('renders Agência label', () => {
    render(<CNABDialog folhaId="f-001" />);
    expect(screen.getByText('Agência')).toBeInTheDocument();
  });

  it('renders Conta Corrente label', () => {
    render(<CNABDialog folhaId="f-001" />);
    expect(screen.getByText('Conta Corrente')).toBeInTheDocument();
  });

  it('renders CNAB 240 button', () => {
    render(<CNABDialog folhaId="f-001" />);
    expect(screen.getByText('CNAB 240')).toBeInTheDocument();
  });

  it('renders PIX Analítico button', () => {
    render(<CNABDialog folhaId="f-001" />);
    expect(screen.getByText('PIX Analítico')).toBeInTheDocument();
  });
});
