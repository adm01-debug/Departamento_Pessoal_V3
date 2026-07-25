import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div data-testid="calendar" />,
}));

vi.mock('date-fns', () => ({
  format: vi.fn(() => '01/07/2026'),
}));

import { TelemetryFilters } from '../admin/telemetry/TelemetryFilters';

const defaultProps = {
  severityFilter: 'all' as const,
  setSeverityFilter: vi.fn(),
  timeFilter: '24h' as const,
  setTimeFilter: vi.fn(),
  customDateFrom: undefined,
  setCustomDateFrom: vi.fn(),
  customDateTo: undefined,
  setCustomDateTo: vi.fn(),
  rowCount: 42,
};

describe('TelemetryFilters', () => {
  it('renders Severidade placeholder', () => {
    render(<TelemetryFilters {...defaultProps} />);
    expect(screen.getByText('Severidade')).toBeInTheDocument();
  });

  it('renders Período placeholder', () => {
    render(<TelemetryFilters {...defaultProps} />);
    expect(screen.getByText('Período')).toBeInTheDocument();
  });

  it('renders Todas option in severity select', () => {
    render(<TelemetryFilters {...defaultProps} />);
    expect(screen.getByText('Todas')).toBeInTheDocument();
  });

  it('renders rowCount in auto-refresh text', () => {
    render(<TelemetryFilters {...defaultProps} />);
    expect(screen.getByText(/42 registros/i)).toBeInTheDocument();
  });

  it('renders auto-refresh text', () => {
    render(<TelemetryFilters {...defaultProps} />);
    expect(screen.getByText(/auto-refresh 30s/i)).toBeInTheDocument();
  });

  it('renders Última hora option', () => {
    render(<TelemetryFilters {...defaultProps} />);
    expect(screen.getByText('Última hora')).toBeInTheDocument();
  });

  it('does not render date pickers when timeFilter is not custom', () => {
    render(<TelemetryFilters {...defaultProps} />);
    expect(screen.queryByText('De')).toBeNull();
  });

  it('renders De and Até buttons when timeFilter is custom', () => {
    render(<TelemetryFilters {...defaultProps} timeFilter="custom" />);
    expect(screen.getByText('De')).toBeInTheDocument();
    expect(screen.getByText('Até')).toBeInTheDocument();
  });
});
