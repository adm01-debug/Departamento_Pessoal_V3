import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import { SSTNRsTab } from '../sst/SSTNRsTab';

describe('SSTNRsTab', () => {
  it('renders NR-6 EPI card', () => {
    render(<SSTNRsTab />);
    expect(screen.getByText('NR-6')).toBeInTheDocument();
  });

  it('renders NR-7 PCMSO card', () => {
    render(<SSTNRsTab />);
    expect(screen.getByText('NR-7')).toBeInTheDocument();
  });

  it('renders NR-9 PGR card', () => {
    render(<SSTNRsTab />);
    expect(screen.getByText('NR-9')).toBeInTheDocument();
  });

  it('renders NR-17 Ergonomia card', () => {
    render(<SSTNRsTab />);
    expect(screen.getByText('NR-17')).toBeInTheDocument();
  });

  it('renders EPI titulo', () => {
    render(<SSTNRsTab />);
    expect(screen.getByText(/— EPI/)).toBeInTheDocument();
  });

  it('renders PCMSO description', () => {
    render(<SSTNRsTab />);
    expect(screen.getByText(/Programa de Controle Médico/)).toBeInTheDocument();
  });

  it('renders Obrigatória badges for mandatory NRs', () => {
    render(<SSTNRsTab />);
    const badges = screen.getAllByText('Obrigatória');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Condicional badge for conditional NRs', () => {
    render(<SSTNRsTab />);
    const badges = screen.getAllByText('Condicional');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });
});
