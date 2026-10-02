import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useAssinarAvisoFerias', () => ({
  useAssinarAvisoFerias: vi.fn(() => ({ assinar: vi.fn(), isSigning: false })),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-001', nome: 'Empresa X' } })),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, onClick }: { children?: ReactNode; disabled?: boolean; onClick?: () => void }) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange }: { checked?: boolean; onCheckedChange?: (checked: boolean) => void }) => (
    <input type="checkbox" readOnly checked={!!checked} onChange={() => onCheckedChange?.(!checked)} />
  ),
}));

import type { Ferias } from '@/types/entities';

const SOLICITACAO: Ferias = {
  id: 'sol-1',
  colaborador_id: 'c1',
  empresa_id: 'e1',
  status: 'pendente',
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
