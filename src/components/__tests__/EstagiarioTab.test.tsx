import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/hooks/useTabelasReferencia', () => ({
  useDadosEstagiario: vi.fn(),
  useSalvarDadosEstagiario: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
}));

import { useDadosEstagiario } from '@/hooks/useTabelasReferencia';
import { EstagiarioTab } from '../colaborador-detalhes/EstagiarioTab';

const ESTAGIARIO_DATA = {
  instituicao_nome: 'UFMG', instituicao_cnpj: '12.345.678/0001-00',
  curso: 'Engenharia', nivel: 'Superior',
  supervisor_nome: 'Maria', supervisor_cargo: 'Gerente',
  data_inicio: '2025-01-01', data_fim: '2025-12-31',
  carga_horaria_semanal: 20, valor_bolsa: 1200, numero_apolice: 'AP123'
};

describe('EstagiarioTab', () => {
  it('renders Dados de Estagiário title', () => {
    vi.mocked(useDadosEstagiario).mockReturnValue({ data: ESTAGIARIO_DATA, isLoading: false } as any);
    render(<EstagiarioTab colaboradorId="col-1" />);
    expect(screen.getByText('Dados de Estagiário')).toBeInTheDocument();
  });

  it('shows institution in read mode', () => {
    vi.mocked(useDadosEstagiario).mockReturnValue({ data: ESTAGIARIO_DATA, isLoading: false } as any);
    render(<EstagiarioTab colaboradorId="col-1" />);
    expect(screen.getByText('UFMG')).toBeInTheDocument();
  });

  it('shows Nenhum dado cadastrado when no data', () => {
    vi.mocked(useDadosEstagiario).mockReturnValue({ data: null, isLoading: false } as any);
    render(<EstagiarioTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhum dado cadastrado.')).toBeInTheDocument();
  });

  it('shows Editar button when data exists', () => {
    vi.mocked(useDadosEstagiario).mockReturnValue({ data: ESTAGIARIO_DATA, isLoading: false } as any);
    render(<EstagiarioTab colaboradorId="col-1" />);
    expect(screen.getByText('Editar')).toBeInTheDocument();
  });

  it('switches to form mode when Editar clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(useDadosEstagiario).mockReturnValue({ data: ESTAGIARIO_DATA, isLoading: false } as any);
    render(<EstagiarioTab colaboradorId="col-1" />);
    await user.click(screen.getByText('Editar'));
    expect(screen.getByText('Salvar')).toBeInTheDocument();
  });

  it('shows Cancelar in form mode', async () => {
    const user = userEvent.setup();
    vi.mocked(useDadosEstagiario).mockReturnValue({ data: ESTAGIARIO_DATA, isLoading: false } as any);
    render(<EstagiarioTab colaboradorId="col-1" />);
    await user.click(screen.getByText('Editar'));
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });
});
