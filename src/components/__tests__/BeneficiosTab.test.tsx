import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

vi.mock('@/hooks/useBeneficiosColaborador', () => ({
  useBeneficiosColaborador: vi.fn(),
}));

vi.mock('@/hooks/useBeneficios', () => ({
  useBeneficios: vi.fn(() => ({ beneficios: [] })),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children?: ReactNode; open?: boolean }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => children,
}));

vi.mock('@/components/forms', () => ({
  FormField: ({ label, ...props }: { label?: string; [key: string]: unknown }) => (
    <div>
      <label>{label}</label>
      <input {...props} />
    </div>
  ),
  FormSelect: ({
    label,
    options,
    value,
    onChange,
  }: {
    label?: string;
    options?: { value?: string; label?: string }[];
    value?: string;
    onChange?: (v: string) => void;
  }) => (
    <div>
      <label>{label}</label>
      <select value={value} onChange={(e) => onChange?.(e.target.value)}>
        {(options || []).map((o: { value?: string; label?: string }) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  ),
}));

import { useBeneficiosColaborador } from '@/hooks/useBeneficiosColaborador';
import { BeneficiosTab } from '../colaborador-detalhes/BeneficiosTab';

const render = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

const MOCK_BENEFICIOS = [
  {
    id: 'b1',
    tipo_beneficio: { nome: 'VR', codigo: 'VALE_REFEICAO' },
    valor: 500,
    desconto: 100,
    status_vinculo: 'ativo',
    data_inicio: '2025-01-01',
  },
];

describe('BeneficiosTab', () => {
  it('renders Benefícios Ativos title', () => {
    vi.mocked(useBeneficiosColaborador).mockReturnValue({
      beneficios: [],
      isLoading: false,
      vincularBeneficio: vi.fn(),
      desvincularBeneficio: vi.fn(),
    } as never);
    render(<BeneficiosTab colaboradorId="col-1" />);
    expect(screen.getByText('Benefícios Ativos')).toBeInTheDocument();
  });

  it('renders Vincular Benefício button', () => {
    vi.mocked(useBeneficiosColaborador).mockReturnValue({
      beneficios: [],
      isLoading: false,
      vincularBeneficio: vi.fn(),
      desvincularBeneficio: vi.fn(),
    } as never);
    render(<BeneficiosTab colaboradorId="col-1" />);
    expect(screen.getByText('Vincular Benefício')).toBeInTheDocument();
  });

  it('renders beneficio names from list', () => {
    vi.mocked(useBeneficiosColaborador).mockReturnValue({
      beneficios: MOCK_BENEFICIOS,
      isLoading: false,
      vincularBeneficio: vi.fn(),
      desvincularBeneficio: vi.fn(),
    } as never);
    render(<BeneficiosTab colaboradorId="col-1" />);
    expect(screen.getByText('VR')).toBeInTheDocument();
  });

  it('renders ativo badge', () => {
    vi.mocked(useBeneficiosColaborador).mockReturnValue({
      beneficios: MOCK_BENEFICIOS,
      isLoading: false,
      vincularBeneficio: vi.fn(),
      desvincularBeneficio: vi.fn(),
    } as never);
    render(<BeneficiosTab colaboradorId="col-1" />);
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('shows Vincular dialog on button click', async () => {
    const user = userEvent.setup();
    vi.mocked(useBeneficiosColaborador).mockReturnValue({
      beneficios: [],
      isLoading: false,
      vincularBeneficio: vi.fn(),
      desvincularBeneficio: vi.fn(),
    } as never);
    render(<BeneficiosTab colaboradorId="col-1" />);
    await user.click(screen.getByText('Vincular Benefício'));
    expect(screen.getByText('Vincular Benefício ao Colaborador')).toBeInTheDocument();
  });
});
