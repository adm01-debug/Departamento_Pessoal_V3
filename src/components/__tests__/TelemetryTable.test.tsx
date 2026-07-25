import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: any) => <div className={className} data-testid="skeleton" />,
}));

import { TelemetryTable } from '../admin/telemetry/TelemetryTable';

const MOCK_ROW = {
  id: 'r1',
  operation: 'select',
  table_name: 'colaboradores',
  rpc_name: null,
  duration_ms: 3200,
  record_count: 50,
  query_limit: 100,
  query_offset: 0,
  count_mode: 'exact',
  severity: 'slow',
  error_message: null,
  user_id: 'u1',
  created_at: '2026-07-24T10:00:00.000Z',
};

describe('TelemetryTable', () => {
  it('shows skeletons when loading', () => {
    render(<TelemetryTable rows={[]} isLoading={true} />);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no rows and not loading', () => {
    render(<TelemetryTable rows={[]} isLoading={false} />);
    expect(screen.getByText('Nenhuma query lenta registrada')).toBeInTheDocument();
  });

  it('shows positive empty state message', () => {
    render(<TelemetryTable rows={[]} isLoading={false} />);
    expect(screen.getByText(/sistema está performando bem/i)).toBeInTheDocument();
  });

  it('renders Quando column header', () => {
    render(<TelemetryTable rows={[MOCK_ROW]} isLoading={false} />);
    expect(screen.getByText('Quando')).toBeInTheDocument();
  });

  it('renders Operação column header', () => {
    render(<TelemetryTable rows={[MOCK_ROW]} isLoading={false} />);
    expect(screen.getByText('Operação')).toBeInTheDocument();
  });

  it('renders Severidade column header', () => {
    render(<TelemetryTable rows={[MOCK_ROW]} isLoading={false} />);
    expect(screen.getByText('Severidade')).toBeInTheDocument();
  });

  it('renders operation badge value', () => {
    render(<TelemetryTable rows={[MOCK_ROW]} isLoading={false} />);
    expect(screen.getByText('select')).toBeInTheDocument();
  });

  it('renders duration formatted as seconds', () => {
    render(<TelemetryTable rows={[MOCK_ROW]} isLoading={false} />);
    expect(screen.getByText('3.2s')).toBeInTheDocument();
  });
});
