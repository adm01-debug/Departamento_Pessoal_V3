import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogTrigger: ({ children, asChild }: any) => asChild ? children : <div>{children}</div>,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: [], isLoading: false }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

import {
  PreferenciasTab,
  NotificacoesTab,
  FolhaConfigTab,
  PontoConfigTab,
} from '../settings/InlineTabs';

describe('PreferenciasTab', () => {
  it('renders Preferências de Interface title', () => {
    render(<PreferenciasTab user={{ name: 'Ana Lima' }} />);
    expect(screen.getByText('Preferências de Interface')).toBeInTheDocument();
  });

  it('renders Modo Escuro switch label', () => {
    render(<PreferenciasTab user={null} />);
    expect(screen.getByText('Modo Escuro')).toBeInTheDocument();
  });

  it('renders Salvar Alterações button', () => {
    render(<PreferenciasTab user={null} />);
    expect(screen.getByRole('button', { name: 'Salvar Alterações' })).toBeInTheDocument();
  });
});

describe('NotificacoesTab', () => {
  it('renders Central de Notificações title', () => {
    render(<NotificacoesTab />);
    expect(screen.getByText('Central de Notificações')).toBeInTheDocument();
  });

  it('renders Operacional section', () => {
    render(<NotificacoesTab />);
    expect(screen.getByText('Operacional')).toBeInTheDocument();
  });

  it('renders Compliance section', () => {
    render(<NotificacoesTab />);
    expect(screen.getByText('Compliance')).toBeInTheDocument();
  });

  it('renders Novas Admissões switch', () => {
    render(<NotificacoesTab />);
    expect(screen.getByText('Novas Admissões')).toBeInTheDocument();
  });

  it('renders Salvar Preferências button', () => {
    render(<NotificacoesTab />);
    expect(screen.getByRole('button', { name: 'Salvar Preferências' })).toBeInTheDocument();
  });
});

describe('FolhaConfigTab', () => {
  it('renders Parâmetros de Folha title', () => {
    render(<FolhaConfigTab />);
    expect(screen.getByText('Parâmetros de Folha')).toBeInTheDocument();
  });

  it('renders Dia de Fechamento field', () => {
    render(<FolhaConfigTab />);
    expect(screen.getByText('Dia de Fechamento')).toBeInTheDocument();
  });

  it('renders Cálculo Automático switch', () => {
    render(<FolhaConfigTab />);
    expect(screen.getByText('Cálculo Automático')).toBeInTheDocument();
  });
});

describe('PontoConfigTab', () => {
  it('renders Compliance de Jornada title', () => {
    render(<PontoConfigTab />);
    expect(screen.getByText('Compliance de Jornada')).toBeInTheDocument();
  });

  it('renders Exigir Geolocalização switch', () => {
    render(<PontoConfigTab />);
    expect(screen.getByText('Exigir Geolocalização')).toBeInTheDocument();
  });

  it('renders Ponto Offline switch', () => {
    render(<PontoConfigTab />);
    expect(screen.getByText('Ponto Offline')).toBeInTheDocument();
  });
});
