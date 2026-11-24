import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useAssinarAvisoFerias', () => ({
  useAssinarAvisoFerias: vi.fn(() => ({ assinar: vi.fn(), isSigning: false })),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001', nome: 'Empresa X' } })),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick }: any) => (
    <button disabled={disabled} onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: any) => (
    <input type="checkbox" readOnly checked={!!checked} onChange={() => onCheckedChange?.(!checked)} />
  ),
}));

const SOLICITACAO = {
  colaborador: { nome_completo: 'Carlos Andrade' },
  data_inicio: '2026-08-01',
  data_fim: '2026-08-30',
  dias_gozo: 30,
};

import { AssinarAvisoDialog } from '../ferias/AssinarAvisoDialog';

describe('AssinarAvisoDialog', () => {
  it('renders Assinar Aviso de Férias title', () => {
    render(<AssinarAvisoDialog open={true} onOpenChange={vi.fn()} solicitacao={SOLICITACAO} />);
    expect(screen.getByText('Assinar Aviso de Férias')).toBeInTheDocument();
  });

  it('renders CLT arts. 135 e 145 in description', () => {
    render(<AssinarAvisoDialog open={true} onOpenChange={vi.fn()} solicitacao={SOLICITACAO} />);
    expect(screen.getByText(/CLT arts\. 135/i)).toBeInTheDocument();
  });

  it('renders colaborador name', () => {
    render(<AssinarAvisoDialog open={true} onOpenChange={vi.fn()} solicitacao={SOLICITACAO} />);
    expect(screen.getByText(/Carlos Andrade/)).toBeInTheDocument();
  });

  it('renders period dates', () => {
    render(<AssinarAvisoDialog open={true} onOpenChange={vi.fn()} solicitacao={SOLICITACAO} />);
    expect(screen.getByText(/2026-08-01/)).toBeInTheDocument();
  });

  it('renders dias_gozo', () => {
    const { container } = render(<AssinarAvisoDialog open={true} onOpenChange={vi.fn()} solicitacao={SOLICITACAO} />);
    expect(container.textContent).toMatch(/30/);
  });

  it('renders ciência checkbox', () => {
    render(<AssinarAvisoDialog open={true} onOpenChange={vi.fn()} solicitacao={SOLICITACAO} />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('renders Assinar e Aprovar button', () => {
    render(<AssinarAvisoDialog open={true} onOpenChange={vi.fn()} solicitacao={SOLICITACAO} />);
    expect(screen.getByText('Assinar e Aprovar')).toBeInTheDocument();
  });

  it('renders Cancelar button', () => {
    render(<AssinarAvisoDialog open={true} onOpenChange={vi.fn()} solicitacao={SOLICITACAO} />);
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });
});
