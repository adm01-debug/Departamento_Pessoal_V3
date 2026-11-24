import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    circle: (props: any) => <circle {...props} />,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    button: ({ children, onClick, ...props }: any) => <button onClick={onClick} {...props}>{children}</button>,
  },
  useInView: () => true,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

import { WorkforceHealthScore } from '../dashboard/WorkforceHealthScore';

const BASE_PROPS = {
  turnover: 5,
  absenteismo: 3,
  cadastrosCompletos: 80,
  totalColaboradores: 100,
  feriasPendentes: 2,
};

describe('WorkforceHealthScore', () => {
  it('renders Saúde RH badge', () => {
    render(<WorkforceHealthScore {...BASE_PROPS} />);
    expect(screen.getByText('Saúde RH')).toBeInTheDocument();
  });

  it('renders de 100 label', () => {
    render(<WorkforceHealthScore {...BASE_PROPS} />);
    expect(screen.getByText('de 100')).toBeInTheDocument();
  });

  it('renders score label when excellent', () => {
    render(<WorkforceHealthScore turnover={0} absenteismo={0} cadastrosCompletos={100} totalColaboradores={100} feriasPendentes={0} />);
    expect(screen.getByText('Excelente')).toBeInTheDocument();
  });

  it('renders score label when critical', () => {
    render(<WorkforceHealthScore turnover={20} absenteismo={10} cadastrosCompletos={0} totalColaboradores={100} feriasPendentes={20} />);
    expect(screen.getByText('Crítico')).toBeInTheDocument();
  });

  it('renders Turnover metric', () => {
    render(<WorkforceHealthScore {...BASE_PROPS} />);
    expect(screen.getByText('Turnover')).toBeInTheDocument();
  });

  it('renders Absenteísmo metric', () => {
    render(<WorkforceHealthScore {...BASE_PROPS} />);
    expect(screen.getByText('Absenteísmo')).toBeInTheDocument();
  });

  it('renders Férias metric', () => {
    render(<WorkforceHealthScore {...BASE_PROPS} />);
    expect(screen.getAllByText('Férias').length).toBeGreaterThanOrEqual(1);
  });

  it('renders composite score as number', () => {
    render(<WorkforceHealthScore {...BASE_PROPS} />);
    const scoreEls = screen.getAllByText(/^\d+$/);
    expect(scoreEls.length).toBeGreaterThanOrEqual(1);
  });
});
