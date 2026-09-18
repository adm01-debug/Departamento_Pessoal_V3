import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks', () => ({
  useMedidasDisciplinaresColaborador: vi.fn(() => ({ data: [], isLoading: false })),
}));
vi.mock('@/hooks/useComplianceColaborador', () => ({
  useConsentimentosColaborador: vi.fn(() => ({ data: [], isLoading: false })),
}));
vi.mock('@/components/ui/spinner', () => ({ Spinner: () => <div data-testid="spinner" /> }));

import { useMedidasDisciplinaresColaborador } from '@/hooks';
import { ComplianceTab } from '../colaborador-detalhes/ComplianceTab';

describe('ComplianceTab', () => {
  it('renders Medidas Disciplinares, Consentimentos LGPD and the eSocial limitation note', () => {
    render(<ComplianceTab colaboradorId="col-1" />);
    expect(screen.getByText('Medidas Disciplinares')).toBeInTheDocument();
    expect(screen.getByText('Consentimentos LGPD')).toBeInTheDocument();
    expect(screen.getByText('Eventos eSocial')).toBeInTheDocument();
  });

  it('shows tipo/gravidade/data for a medida disciplinar without the free-text descricao', () => {
    vi.mocked(useMedidasDisciplinaresColaborador).mockReturnValue({
      data: [{ id: 'm1', tipo: 'advertencia', gravidade: 'leve', data_ocorrencia: '2026-01-01', descricao: 'Texto sigiloso do caso' }],
      isLoading: false,
    } as any);
    render(<ComplianceTab colaboradorId="col-1" />);
    expect(screen.getByText('advertencia — 2026-01-01')).toBeInTheDocument();
    expect(screen.queryByText('Texto sigiloso do caso')).not.toBeInTheDocument();
  });
});
