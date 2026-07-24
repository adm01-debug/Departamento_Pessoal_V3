import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/hooks/useBeneficiosColaborador', () => ({
  useBeneficiosColaborador: vi.fn(),
}));

vi.mock('@/hooks/useBeneficios', () => ({
  useBeneficios: vi.fn(() => ({ beneficios: [] })),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => children,
}));

vi.mock('@/components/forms', () => ({
  FormField: ({ label, ...props }: any) => (
    <div><label>{label}</label><input {...props} /></div>
  ),
  FormSelect: ({ label, options, value, onChange }: any) => (
    <div><label>{label}</label><select value={value} onChange={e => onChange(e.target.value)}>
      {(options || []).map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select></div>
  ),
}));

import { useBeneficiosColaborador } from '@/hooks/useBeneficiosColaborador';
import { BeneficiosTab } from '../colaborador-detalhes/BeneficiosTab';

const MOCK_BENEFICIOS = [
  { id: 'b1', beneficio: { nome: 'VR', tipo: 'Alimentação' }, valor: 500, desconto: 100, status_vinculo: 'ativo', data_inicio: '2025-01-01' },
];

describe('BeneficiosTab', () => {
  it('renders Benefícios Ativos title', () => {
    vi.mocked(useBeneficiosColaborador).mockReturnValue({
      beneficios: [], isLoading: false,
      vincularBeneficio: vi.fn(), desvincularBeneficio: vi.fn(),
    } as any);
    render(<BeneficiosTab colaboradorId="col-1" />);
    expect(screen.getByText('Benefícios Ativos')).toBeInTheDocument();
  });

  it('renders Vincular Benefício button', () => {
    vi.mocked(useBeneficiosColaborador).mockReturnValue({
      beneficios: [], isLoading: false,
      vincularBeneficio: vi.fn(), desvincularBeneficio: vi.fn(),
    } as any);
    render(<BeneficiosTab colaboradorId="col-1" />);
    expect(screen.getByText('Vincular Benefício')).toBeInTheDocument();
  });

  it('renders beneficio names from list', () => {
    vi.mocked(useBeneficiosColaborador).mockReturnValue({
      beneficios: MOCK_BENEFICIOS, isLoading: false,
      vincularBeneficio: vi.fn(), desvincularBeneficio: vi.fn(),
    } as any);
    render(<BeneficiosTab colaboradorId="col-1" />);
    expect(screen.getByText('VR')).toBeInTheDocument();
  });

  it('renders ativo badge', () => {
    vi.mocked(useBeneficiosColaborador).mockReturnValue({
      beneficios: MOCK_BENEFICIOS, isLoading: false,
      vincularBeneficio: vi.fn(), desvincularBeneficio: vi.fn(),
    } as any);
    render(<BeneficiosTab colaboradorId="col-1" />);
    expect(screen.getByText('Ativo')).toBeInTheDocument();
  });

  it('shows Vincular dialog on button click', async () => {
    const user = userEvent.setup();
    vi.mocked(useBeneficiosColaborador).mockReturnValue({
      beneficios: [], isLoading: false,
      vincularBeneficio: vi.fn(), desvincularBeneficio: vi.fn(),
    } as any);
    render(<BeneficiosTab colaboradorId="col-1" />);
    await user.click(screen.getByText('Vincular Benefício'));
    expect(screen.getByText('Vincular Benefício ao Colaborador')).toBeInTheDocument();
  });
});
