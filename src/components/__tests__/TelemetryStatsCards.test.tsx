import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

import { TelemetryStatsCards } from '../admin/telemetry/TelemetryStatsCards';

describe('TelemetryStatsCards', () => {
  it('renders verySlow count', () => {
    render(<TelemetryStatsCards verySlow={3} slow={5} errors={2} avgDuration={450} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders slow count', () => {
    render(<TelemetryStatsCards verySlow={3} slow={5} errors={2} avgDuration={450} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders errors count', () => {
    render(<TelemetryStatsCards verySlow={3} slow={5} errors={2} avgDuration={450} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders avgDuration in ms when under 1000ms', () => {
    render(<TelemetryStatsCards verySlow={0} slow={0} errors={0} avgDuration={450} />);
    expect(screen.getByText('450ms')).toBeInTheDocument();
  });

  it('renders avgDuration in seconds when 1000ms or more', () => {
    render(<TelemetryStatsCards verySlow={0} slow={0} errors={0} avgDuration={2500} />);
    expect(screen.getByText('2.5s')).toBeInTheDocument();
  });

  it('renders Muito Lentas label', () => {
    render(<TelemetryStatsCards verySlow={1} slow={0} errors={0} avgDuration={100} />);
    expect(screen.getByText(/Muito Lentas/i)).toBeInTheDocument();
  });

  it('renders Lentas label', () => {
    render(<TelemetryStatsCards verySlow={0} slow={1} errors={0} avgDuration={100} />);
    expect(screen.getAllByText(/Lentas/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders Média de duração label', () => {
    render(<TelemetryStatsCards verySlow={0} slow={0} errors={0} avgDuration={300} />);
    expect(screen.getByText('Média de duração')).toBeInTheDocument();
  });
});
