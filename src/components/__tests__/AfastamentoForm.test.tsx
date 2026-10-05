import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useAfastamentos', () => ({
  useAfastamentos: vi.fn(() => ({
    criar: vi.fn(),
    atualizar: vi.fn(),
    configs: {},
    isCriando: false,
    isAtualizando: false,
  })),
}));

vi.mock('@/hooks/useColaboradores', () => ({
  useColaboradores: vi.fn(() => ({ colaboradores: [] })),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-1' } })),
}));

vi.mock('@/services/afastamentoService', () => ({
  afastamentoService: {
    listarHistoricoRecente: vi.fn(() => Promise.resolve([])),
    buscarCID: vi.fn(() => Promise.resolve([])),
    calcularDias: vi.fn(() => 0),
    calcularDistribuicaoDias: vi.fn(() => ({ empresa: 0, inss: 0 })),
  },
}));

vi.mock('@/utils/format', () => ({
  formatDate: vi.fn((d: string) => d),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/command', () => ({
  Command: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CommandEmpty: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CommandGroup: ({ children, heading }: { children?: ReactNode; heading?: string }) => (
    <div>
      <span>{heading}</span>
      {children}
    </div>
  ),
  CommandInput: (
    props: React.ComponentProps<'input'> & { onValueChange?: React.ChangeEventHandler<HTMLInputElement> }
  ) => <input placeholder={props.placeholder} onChange={props.onValueChange} />,
  CommandItem: ({ children, onSelect }: { children?: ReactNode; onSelect?: (v: unknown) => void }) => (
    <div onClick={onSelect}>{children}</div>
  ),
  CommandList: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CommandSeparator: () => null,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    defaultValue,
    onValueChange,
  }: {
    children?: ReactNode;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
  }) => <div data-value={defaultValue}>{children}</div>,
  SelectTrigger: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { children?: ReactNode; placeholder?: string }) => <span>{placeholder}</span>,
  SelectContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    role,
  }: {
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    role?: string;
  }) => (
    <button onClick={onClick} disabled={disabled} type={type} role={role}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children?: ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.ComponentProps<'textarea'>) => <textarea {...props} />,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import { AfastamentoForm } from '../afastamentos/AfastamentoForm';

describe('AfastamentoForm', () => {
  it('renders Colaborador label', () => {
    render(<AfastamentoForm onSuccess={vi.fn()} />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
  });

  it('renders Motivo do Afastamento label', () => {
    render(<AfastamentoForm onSuccess={vi.fn()} />);
    expect(screen.getByText('Motivo do Afastamento')).toBeInTheDocument();
  });

  it('renders Data de Início label', () => {
    render(<AfastamentoForm onSuccess={vi.fn()} />);
    expect(screen.getByText('Data de Início')).toBeInTheDocument();
  });

  it('renders Data de Fim Prevista label', () => {
    render(<AfastamentoForm onSuccess={vi.fn()} />);
    expect(screen.getByText('Data de Fim Prevista')).toBeInTheDocument();
  });

  it('renders Dados Médicos section heading', () => {
    render(<AfastamentoForm onSuccess={vi.fn()} />);
    expect(screen.getByText('Dados Médicos')).toBeInTheDocument();
  });

  it('renders CID-10 label', () => {
    render(<AfastamentoForm onSuccess={vi.fn()} />);
    expect(screen.getByText('CID-10')).toBeInTheDocument();
  });

  it('renders Nome do Médico label', () => {
    render(<AfastamentoForm onSuccess={vi.fn()} />);
    expect(screen.getByText('Nome do Médico')).toBeInTheDocument();
  });

  it('renders Observações Internas label', () => {
    render(<AfastamentoForm onSuccess={vi.fn()} />);
    expect(screen.getByText('Observações Internas')).toBeInTheDocument();
  });

  it('renders Concluir Registro submit button when no initialData', () => {
    render(<AfastamentoForm onSuccess={vi.fn()} />);
    expect(screen.getByText('Concluir Registro')).toBeInTheDocument();
  });

  it('renders Salvar Alterações button when initialData provided', () => {
    render(<AfastamentoForm onSuccess={vi.fn()} initialData={{ id: 'af-1', tipo: 'doenca' }} />);
    expect(screen.getByText('Salvar Alterações')).toBeInTheDocument();
  });

  it('renders Doença option in tipo select', () => {
    render(<AfastamentoForm onSuccess={vi.fn()} />);
    expect(screen.getByText('Doença')).toBeInTheDocument();
  });

  it('renders Acidente de Trabalho option in tipo select', () => {
    render(<AfastamentoForm onSuccess={vi.fn()} />);
    expect(screen.getByText('Acidente de Trabalho')).toBeInTheDocument();
  });

  it('renders CIDs Frequentes heading', () => {
    render(<AfastamentoForm onSuccess={vi.fn()} />);
    expect(screen.getByText('CIDs Frequentes')).toBeInTheDocument();
  });
});
