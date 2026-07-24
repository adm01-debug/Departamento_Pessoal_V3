import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useSystemHealthHistory', () => ({
  useSystemHealthHistory: vi.fn(() => ({
    samples: [],
    last: undefined,
    p95: null,
    avg: null,
    failRate: 0,
  })),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}));

import { HealthTrendCard } from '../admin/HealthTrendCard';

const MOCK_SAMPLES = [
  { at: '2026-07-01T10:00:00', status: 'online', latencyMs: 120 },
  { at: '2026-07-01T10:01:00', status: 'online', latencyMs: 95 },
];

describe('HealthTrendCard', () => {
  it('renders Saúde da bridge title', () => {
    render(<HealthTrendCard />);
    expect(screen.getByText(/Saúde da bridge/i)).toBeInTheDocument();
  });

  it('renders Status stat label', () => {
    render(<HealthTrendCard />);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders Latência stat label', () => {
    render(<HealthTrendCard />);
    expect(screen.getByText('Latência')).toBeInTheDocument();
  });

  it('renders Falhas stat label', () => {
    render(<HealthTrendCard />);
    expect(screen.getByText('Falhas')).toBeInTheDocument();
  });

  it('renders p95 stat label', () => {
    render(<HealthTrendCard />);
    expect(screen.getByText('p95')).toBeInTheDocument();
  });

  it('renders Aguardando primeira amostra when samples empty', () => {
    render(<HealthTrendCard />);
    expect(screen.getByText(/Aguardando primeira amostra/i)).toBeInTheDocument();
  });

  it('renders last status when samples exist', async () => {
    const { useSystemHealthHistory } = await import('@/hooks/useSystemHealthHistory');
    vi.mocked(useSystemHealthHistory).mockReturnValueOnce({
      samples: MOCK_SAMPLES as any,
      last: { at: '2026-07-01T10:01:00', status: 'online', latencyMs: 95 } as any,
      p95: 120,
      avg: 107,
      failRate: 0,
    });
    render(<HealthTrendCard />);
    expect(screen.getByText('online')).toBeInTheDocument();
  });

  it('renders Média text when avg is present', async () => {
    const { useSystemHealthHistory } = await import('@/hooks/useSystemHealthHistory');
    vi.mocked(useSystemHealthHistory).mockReturnValueOnce({
      samples: MOCK_SAMPLES as any,
      last: { at: '2026-07-01T10:01:00', status: 'online', latencyMs: 95 } as any,
      p95: 120,
      avg: 107,
      failRate: 0,
    });
    render(<HealthTrendCard />);
    expect(screen.getByText(/Média: 107ms/i)).toBeInTheDocument();
  });
});
