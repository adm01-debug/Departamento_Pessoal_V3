import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

import { PortalOverviewTab } from '../portal/PortalOverviewTab';

const navigate = vi.fn();

const BASE_DATA = {
  profile: { cargo: 'Analista', departamento: 'TI' },
  pontoHoje: null,
  notificacoes: [],
  feriasPendentes: [],
  comunicados: [],
};

describe('PortalOverviewTab', () => {
  it('renders user name', () => {
    render(<PortalOverviewTab nome="João Silva" data={BASE_DATA} completude={80} navigate={navigate} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('renders user initials avatar', () => {
    render(<PortalOverviewTab nome="João Silva" data={BASE_DATA} completude={80} navigate={navigate} />);
    expect(screen.getByText('JS')).toBeInTheDocument();
  });

  it('renders cargo and departamento', () => {
    render(<PortalOverviewTab nome="Maria" data={BASE_DATA} completude={60} navigate={navigate} />);
    expect(screen.getByText(/Analista/)).toBeInTheDocument();
    expect(screen.getByText(/TI/)).toBeInTheDocument();
  });

  it('renders completude percentage', () => {
    render(<PortalOverviewTab nome="João" data={BASE_DATA} completude={75} navigate={navigate} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('renders Nenhum registro hoje when no ponto', () => {
    render(<PortalOverviewTab nome="João" data={BASE_DATA} completude={80} navigate={navigate} />);
    expect(screen.getByText('Nenhum registro hoje')).toBeInTheDocument();
  });

  it('renders Tudo em dia when no notifications', () => {
    render(<PortalOverviewTab nome="João" data={BASE_DATA} completude={80} navigate={navigate} />);
    expect(screen.getByText('Tudo em dia!')).toBeInTheDocument();
  });

  it('renders Nenhuma solicitação when no férias', () => {
    render(<PortalOverviewTab nome="João" data={BASE_DATA} completude={80} navigate={navigate} />);
    expect(screen.getByText('Nenhuma solicitação')).toBeInTheDocument();
  });

  it('renders Acesso Rápido section and quick actions', () => {
    render(<PortalOverviewTab nome="João" data={BASE_DATA} completude={80} navigate={navigate} />);
    expect(screen.getByText('Acesso Rápido')).toBeInTheDocument();
    const registerButtons = screen.getAllByText('Registrar Ponto');
    expect(registerButtons.length).toBeGreaterThanOrEqual(1);
  });
});
