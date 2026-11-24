import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn() },
  },
}));

import { useQuery } from '@tanstack/react-query';
import { MetricasFolhaDashboard } from '../folha/MetricasFolhaDashboard';

const MOCK_METRICS = {
  window_hours: 24,
  generated_at: '2024-06-15T10:00:00Z',
  idempotency: {
    total: 100,
    by_status: { succeeded: 90, conflict: 5, failed: 5 },
    by_endpoint: { '/folha/calcular': 80, '/folha/aprovar': 20 },
  },
  folha_audit: {
    total: 50,
    by_acao: { CALCULAR: 30, APROVAR: 20 },
  },
  alerts: {
    slack_configured: true,
    triggered: false,
    thresholds: { conflict: 10, failed: 5 },
  },
};

describe('MetricasFolhaDashboard', () => {
  it('shows loading state', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    render(<MetricasFolhaDashboard />);
    expect(screen.getByText(/Carregando métricas/)).toBeInTheDocument();
  });

  it('shows error state when query fails', () => {
    vi.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false, error: new Error('fail') } as any);
    render(<MetricasFolhaDashboard />);
    expect(screen.getByText(/Métricas indisponíveis/)).toBeInTheDocument();
  });

  it('renders Idempotência KPI when data is available', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_METRICS, isLoading: false, error: null } as any);
    render(<MetricasFolhaDashboard />);
    expect(screen.getByText('Idempotência (24h)')).toBeInTheDocument();
  });

  it('renders Sucessos KPI with correct value', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_METRICS, isLoading: false, error: null } as any);
    render(<MetricasFolhaDashboard />);
    expect(screen.getByText('Sucessos')).toBeInTheDocument();
    expect(screen.getByText('90')).toBeInTheDocument();
  });

  it('renders Conflitos KPI', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_METRICS, isLoading: false, error: null } as any);
    render(<MetricasFolhaDashboard />);
    expect(screen.getByText('Conflitos')).toBeInTheDocument();
  });

  it('renders endpoint badges', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_METRICS, isLoading: false, error: null } as any);
    render(<MetricasFolhaDashboard />);
    expect(screen.getByText(/folha\/calcular/)).toBeInTheDocument();
  });

  it('renders Slack alert status', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_METRICS, isLoading: false, error: null } as any);
    render(<MetricasFolhaDashboard />);
    expect(screen.getByText(/Alertas Slack/)).toBeInTheDocument();
    expect(screen.getByText('armado')).toBeInTheDocument();
  });

  it('renders acao badges from folha_audit', () => {
    vi.mocked(useQuery).mockReturnValue({ data: MOCK_METRICS, isLoading: false, error: null } as any);
    render(<MetricasFolhaDashboard />);
    expect(screen.getByText(/CALCULAR/)).toBeInTheDocument();
  });
});
