import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks', () => ({
  useAfastamentosRecentes: vi.fn(),
}));
vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

import { useAfastamentosRecentes } from '@/hooks';
import { AfastamentosTab } from '../colaborador-detalhes/AfastamentosTab';

describe('AfastamentosTab', () => {
  it('shows spinner while loading', () => {
    vi.mocked(useAfastamentosRecentes).mockReturnValue({ data: undefined, isLoading: true } as any);
    render(<AfastamentosTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('shows no afastamento em andamento when none is ongoing', () => {
    vi.mocked(useAfastamentosRecentes).mockReturnValue({ data: [], isLoading: false } as any);
    render(<AfastamentosTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhum afastamento em andamento.')).toBeInTheDocument();
  });

  it('shows the ongoing afastamento (no data_fim_real) without exposing CID/motivo', () => {
    vi.mocked(useAfastamentosRecentes).mockReturnValue({
      data: [{ id: 'a1', tipo: 'saude', data_inicio: '2026-01-01', data_fim_prevista: '2026-02-01', status: 'aprovado', cid: 'Z99.9', medico_nome: 'Dr. Sigiloso' }],
      isLoading: false,
    } as any);
    render(<AfastamentosTab colaboradorId="col-1" />);
    expect(screen.getByText('saude')).toBeInTheDocument();
    expect(screen.queryByText('Z99.9')).not.toBeInTheDocument();
    expect(screen.queryByText('Dr. Sigiloso')).not.toBeInTheDocument();
  });

  it('separates concluded afastamentos into the history list', () => {
    vi.mocked(useAfastamentosRecentes).mockReturnValue({
      data: [{ id: 'a2', tipo: 'ferias_medicas', data_inicio: '2025-01-01', data_fim_real: '2025-01-10', status: 'concluido' }],
      isLoading: false,
    } as any);
    render(<AfastamentosTab colaboradorId="col-1" />);
    expect(screen.getByText('Nenhum afastamento em andamento.')).toBeInTheDocument();
    expect(screen.getByText('ferias_medicas — 2025-01-01 até 2025-01-10')).toBeInTheDocument();
  });
});
