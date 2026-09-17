import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => children,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div role="menuitem" onClick={onClick}>{children}</div>
  ),
}));

import { QuickActionsMenu } from '../dashboard/QuickActionsMenu';

describe('QuickActionsMenu', () => {
  it('renders Ações Rápidas label', () => {
    render(<QuickActionsMenu />);
    expect(screen.getAllByText('Ações Rápidas').length).toBeGreaterThan(0);
  });

  it('renders Novo Colaborador action', () => {
    render(<QuickActionsMenu />);
    expect(screen.getByText('Novo Colaborador')).toBeInTheDocument();
  });

  it('renders Lançar Ponto action', () => {
    render(<QuickActionsMenu />);
    expect(screen.getByText('Lançar Ponto')).toBeInTheDocument();
  });

  it('renders Calcular Folha action', () => {
    render(<QuickActionsMenu />);
    expect(screen.getByText('Calcular Folha')).toBeInTheDocument();
  });

  it('renders Férias / Ausências action', () => {
    render(<QuickActionsMenu />);
    expect(screen.getByText('Férias / Ausências')).toBeInTheDocument();
  });

  it('renders Passivo Trabalhista action', () => {
    render(<QuickActionsMenu />);
    expect(screen.getByText('Passivo Trabalhista')).toBeInTheDocument();
  });

  it('renders Relatórios DP action', () => {
    render(<QuickActionsMenu />);
    expect(screen.getByText('Relatórios DP')).toBeInTheDocument();
  });

  /**
   * A barra de acesso rápido (Workflows / BI e Metas / Auditoria / IA Insights)
   * saiu do corpo do dashboard e foi absorvida por este menu — nenhum destino
   * pode ter se perdido na mudança de layout.
   */
  it('keeps every quick access destination', () => {
    render(<QuickActionsMenu />);
    ['Workflows', 'BI e Metas', 'Auditoria', 'IA Insights'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('renders the 10 shortcuts as menu items', () => {
    render(<QuickActionsMenu />);
    expect(screen.getAllByRole('menuitem')).toHaveLength(10);
  });
});
