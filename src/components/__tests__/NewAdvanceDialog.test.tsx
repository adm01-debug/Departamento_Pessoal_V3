import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

vi.mock('@/utils/dateLocal', () => ({
  currentCompetenciaLocal: vi.fn(() => '2026-07'),
}));

import { NewAdvanceDialog } from '../descontos/NewAdvanceDialog';

const COLABORADORES = [
  { id: 'c1', nome_completo: 'Maria Santos' },
  { id: 'c2', nome_completo: 'José Oliveira' },
];

describe('NewAdvanceDialog', () => {
  it('renders Novo Adiantamento trigger button', () => {
    render(<NewAdvanceDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Novo Adiantamento')).toBeInTheDocument();
  });

  it('renders Solicitar Adiantamento Salarial title', () => {
    render(<NewAdvanceDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Solicitar Adiantamento Salarial')).toBeInTheDocument();
  });

  it('renders Colaborador label', () => {
    render(<NewAdvanceDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
  });

  it('renders Valor Solicitado label', () => {
    render(<NewAdvanceDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Valor Solicitado (R$)')).toBeInTheDocument();
  });

  it('renders Competência para Desconto label', () => {
    render(<NewAdvanceDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Competência para Desconto')).toBeInTheDocument();
  });

  it('renders Motivo label', () => {
    render(<NewAdvanceDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Motivo (Opcional)')).toBeInTheDocument();
  });

  it('renders colaborador names in select', () => {
    render(<NewAdvanceDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    expect(screen.getByText('José Oliveira')).toBeInTheDocument();
  });

  it('renders Cancelar and Enviar Solicitação buttons', () => {
    render(<NewAdvanceDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Enviar Solicitação')).toBeInTheDocument();
  });
});
