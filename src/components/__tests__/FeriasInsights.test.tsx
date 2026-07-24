import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('sonner', () => ({
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import { FeriasInsights } from '../ferias/FeriasInsights';

const BASE_STATS = { total: 10, pendentes: 2, aprovadas: 6, emGozo: 1, vencidas: 0, abonoPecuniario: 1 };

describe('FeriasInsights', () => {
  it('renders Insights IA & Analytics title', () => {
    render(<FeriasInsights stats={BASE_STATS} />);
    expect(screen.getByText(/Insights IA/)).toBeInTheDocument();
  });

  it('shows empty state when no insights', () => {
    render(<FeriasInsights stats={{ ...BASE_STATS, total: 0, vencidas: 0, pendentes: 0 }} />);
    expect(screen.getByText(/Inicie a gestão para gerar novos insights/)).toBeInTheDocument();
  });

  it('shows critical alert when vencidas > 0', () => {
    render(<FeriasInsights stats={{ ...BASE_STATS, vencidas: 3 }} />);
    expect(screen.getByText('Alerta de Vencimentos')).toBeInTheDocument();
  });

  it('shows workflow warning when pendentes > 5', () => {
    render(<FeriasInsights stats={{ ...BASE_STATS, pendentes: 8 }} />);
    expect(screen.getByText('Gargalo no Workflow')).toBeInTheDocument();
  });

  it('shows abono insight when > 40% have abono', () => {
    render(<FeriasInsights stats={{ ...BASE_STATS, total: 10, abonoPecuniario: 5 }} />);
    expect(screen.getByText('Tendência de Abono')).toBeInTheDocument();
  });

  it('shows success insight when no issues', () => {
    render(<FeriasInsights stats={{ total: 10, pendentes: 1, aprovadas: 8, emGozo: 1, vencidas: 0, abonoPecuniario: 1 }} />);
    expect(screen.getByText('Excelência Operacional')).toBeInTheDocument();
  });

  it('renders Beta badge', () => {
    render(<FeriasInsights stats={BASE_STATS} />);
    expect(screen.getByText('Beta')).toBeInTheDocument();
  });
});
