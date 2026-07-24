import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import { FolhaValidationAlerts } from '../folha/FolhaValidationAlerts';

const BASE_RESUMO = {
  colaboradores: 5,
  totalProventos: 10000,
  totalDescontos: 2000,
  liquido: 8000,
  inss: 1100,
  fgts: 800,
  irrf: 500,
};

describe('FolhaValidationAlerts', () => {
  it('renders Audit Smart Validation title', () => {
    render(<FolhaValidationAlerts resumo={BASE_RESUMO} />);
    expect(screen.getByText('Audit Smart Validation')).toBeInTheDocument();
  });

  it('renders score badge', () => {
    render(<FolhaValidationAlerts resumo={BASE_RESUMO} />);
    expect(screen.getByText(/Score:/)).toBeInTheDocument();
  });

  it('renders eSocial success alert', () => {
    render(<FolhaValidationAlerts resumo={BASE_RESUMO} />);
    expect(screen.getByText(/S-1010/)).toBeInTheDocument();
  });

  it('renders warning when no colaboradores', () => {
    render(<FolhaValidationAlerts resumo={{ ...BASE_RESUMO, colaboradores: 0 }} />);
    expect(screen.getByText(/Nenhum colaborador processado/)).toBeInTheDocument();
  });

  it('renders critical alert when liquido is negative', () => {
    render(<FolhaValidationAlerts resumo={{ ...BASE_RESUMO, liquido: -100 }} />);
    expect(screen.getByText(/líquido negativo/)).toBeInTheDocument();
  });

  it('renders Bloqueia Encerramento when critical', () => {
    render(<FolhaValidationAlerts resumo={{ ...BASE_RESUMO, liquido: -100 }} />);
    expect(screen.getByText(/Bloqueia Encerramento/i)).toBeInTheDocument();
  });

  it('renders discount alert when descontos exceed 40%', () => {
    render(<FolhaValidationAlerts resumo={{ ...BASE_RESUMO, totalDescontos: 5000, totalProventos: 10000 }} />);
    expect(screen.getByText(/Descontos totais elevados/)).toBeInTheDocument();
  });

  it('renders variation alert always present', () => {
    render(<FolhaValidationAlerts resumo={BASE_RESUMO} />);
    expect(screen.getByText(/Variação salarial atípica/)).toBeInTheDocument();
  });
});
