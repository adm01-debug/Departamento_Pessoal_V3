import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/hooks/useEmpresas', async () =>
  (await import('@/test/empresaMock')).useEmpresasMockModule()
);

vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  useCamposCustomizados: vi.fn(),
  useValoresCamposCustomizados: vi.fn(),
  useSalvarValorCampoCustomizado: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select data-testid="select" value={value} onChange={e => onValueChange(e.target.value)}>{children}</select>
  ),
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

import {
  useCamposCustomizados, useValoresCamposCustomizados, useSalvarValorCampoCustomizado,
} from '@/hooks/useColaboradorDetalhes';
import { CamposCustomizadosTab } from '../colaborador-detalhes/CamposCustomizadosTab';

const CAMPOS = [
  { id: 'cc1', nome: 'Número do Crachá', tipo: 'texto', obrigatorio: true, opcoes: null },
  { id: 'cc2', nome: 'Turno Preferido', tipo: 'selecao', obrigatorio: false, opcoes: ['Manhã', 'Tarde', 'Noite'] },
];

describe('CamposCustomizadosTab (Dossiê do Colaborador)', () => {
  it('shows spinner while loading', () => {
    vi.mocked(useCamposCustomizados).mockReturnValue({ data: undefined, isLoading: true } as any);
    vi.mocked(useValoresCamposCustomizados).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<CamposCustomizadosTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('shows empty state when the company has no active custom fields', () => {
    vi.mocked(useCamposCustomizados).mockReturnValue({ data: [], isLoading: false } as any);
    vi.mocked(useValoresCamposCustomizados).mockReturnValue({ data: [], isLoading: false } as any);
    render(<CamposCustomizadosTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhum campo customizado ativo para esta empresa.')).toBeInTheDocument();
  });

  it('renders one input per active custom field and prefills the saved value', () => {
    vi.mocked(useCamposCustomizados).mockReturnValue({ data: CAMPOS, isLoading: false } as any);
    vi.mocked(useValoresCamposCustomizados).mockReturnValue({
      data: [{ campo_customizado_id: 'cc1', valor: 'ABC-123' }], isLoading: false,
    } as any);
    render(<CamposCustomizadosTab colaboradorId="col-1" />);
    expect(screen.getByText('Número do Crachá')).toBeInTheDocument();
    expect(screen.getByDisplayValue('ABC-123')).toBeInTheDocument();
  });

  it('keeps Salvar disabled until a field is actually edited', async () => {
    vi.mocked(useCamposCustomizados).mockReturnValue({ data: CAMPOS, isLoading: false } as any);
    vi.mocked(useValoresCamposCustomizados).mockReturnValue({ data: [], isLoading: false } as any);
    render(<CamposCustomizadosTab colaboradorId="col-1" />);
    expect(screen.getByText('Salvar')).toBeDisabled();

    await userEvent.type(screen.getByDisplayValue(''), 'XYZ-789');
    expect(screen.getByText('Salvar')).not.toBeDisabled();
  });

  it('saves only the fields that were actually touched', async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useCamposCustomizados).mockReturnValue({ data: CAMPOS, isLoading: false } as any);
    vi.mocked(useValoresCamposCustomizados).mockReturnValue({
      data: [{ campo_customizado_id: 'cc1', valor: 'ABC-123' }], isLoading: false,
    } as any);
    vi.mocked(useSalvarValorCampoCustomizado).mockReturnValue({ mutateAsync, isPending: false } as any);
    render(<CamposCustomizadosTab colaboradorId="col-1" />);

    await userEvent.selectOptions(screen.getByTestId('select'), 'Tarde');
    await userEvent.click(screen.getByText('Salvar'));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith({ campoId: 'cc2', valor: 'Tarde' });
  });
});
