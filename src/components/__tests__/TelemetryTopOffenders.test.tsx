import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

import { TelemetryTopOffenders } from '../admin/telemetry/TelemetryTopOffenders';

const MOCK_OFFENDERS: [string, { count: number; totalMs: number; maxMs: number }][] = [
  ['colaboradores', { count: 12, totalMs: 60000, maxMs: 9000 }],
  ['get_folha_rpc', { count: 5, totalMs: 20000, maxMs: 5500 }],
];

describe('TelemetryTopOffenders', () => {
  it('renders null when offenders is empty', () => {
    const { container } = render(<TelemetryTopOffenders offenders={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders Tabelas Mais Problemáticas title', () => {
    render(<TelemetryTopOffenders offenders={MOCK_OFFENDERS} />);
    expect(screen.getByText('Tabelas Mais Problemáticas')).toBeInTheDocument();
  });

  it('renders first offender name', () => {
    render(<TelemetryTopOffenders offenders={MOCK_OFFENDERS} />);
    expect(screen.getByText('colaboradores')).toBeInTheDocument();
  });

  it('renders second offender name', () => {
    render(<TelemetryTopOffenders offenders={MOCK_OFFENDERS} />);
    expect(screen.getByText('get_folha_rpc')).toBeInTheDocument();
  });

  it('renders alert count for first offender', () => {
    render(<TelemetryTopOffenders offenders={MOCK_OFFENDERS} />);
    expect(screen.getByText('12× alertas')).toBeInTheDocument();
  });

  it('renders max duration for first offender in seconds', () => {
    render(<TelemetryTopOffenders offenders={MOCK_OFFENDERS} />);
    expect(screen.getByText('max 9.0s')).toBeInTheDocument();
  });

  it('renders average duration for first offender', () => {
    render(<TelemetryTopOffenders offenders={MOCK_OFFENDERS} />);
    expect(screen.getByText('média: 5.0s')).toBeInTheDocument();
  });

  it('renders single offender correctly', () => {
    const single: [string, { count: number; totalMs: number; maxMs: number }][] = [
      ['folha_pagamento', { count: 3, totalMs: 2400, maxMs: 900 }],
    ];
    render(<TelemetryTopOffenders offenders={single} />);
    expect(screen.getByText('folha_pagamento')).toBeInTheDocument();
    expect(screen.getByText('3× alertas')).toBeInTheDocument();
    expect(screen.getByText('max 900ms')).toBeInTheDocument();
  });
});
