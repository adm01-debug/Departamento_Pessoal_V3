import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks', () => ({
  useEpisEntregasColaborador: vi.fn(() => ({ data: [], isLoading: false })),
}));
vi.mock('@/hooks/useSSTColaborador', () => ({
  useIncidentesColaborador: vi.fn(() => ({ data: [], isLoading: false })),
  useCatColaborador: vi.fn(() => ({ data: [], isLoading: false })),
  useRiscosColaborador: vi.fn(() => ({ data: [], isLoading: false })),
}));
vi.mock('@/components/ui/spinner', () => ({ Spinner: () => <div data-testid="spinner" /> }));

import { useCatColaborador } from '@/hooks/useSSTColaborador';
import { SSTResumoTab } from '../colaborador-detalhes/SSTResumoTab';

describe('SSTResumoTab', () => {
  it('renders all section titles', () => {
    render(<SSTResumoTab colaboradorId="col-1" />);
    expect(screen.getByText('EPIs Entregues')).toBeInTheDocument();
    expect(screen.getByText('Riscos Ocupacionais')).toBeInTheDocument();
    expect(screen.getByText('Incidentes Registrados')).toBeInTheDocument();
    expect(screen.getByText('CAT — Comunicação de Acidente de Trabalho')).toBeInTheDocument();
  });

  it('shows CAT type/date/status without leaking a CID diagnosis code', () => {
    vi.mocked(useCatColaborador).mockReturnValue({
      data: [{ id: 'c1', tipo_acidente: 'tipico', data_acidente: '2026-01-01', status_esocial: 'enviado', cid_principal: 'S99.9' }],
      isLoading: false,
    } as any);
    render(<SSTResumoTab colaboradorId="col-1" />);
    expect(screen.getByText('tipico — 2026-01-01')).toBeInTheDocument();
    expect(screen.queryByText('S99.9')).not.toBeInTheDocument();
  });
});
