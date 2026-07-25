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
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/command', () => ({
  Command: ({ children }: any) => <div>{children}</div>,
  CommandEmpty: ({ children }: any) => <div>{children}</div>,
  CommandGroup: ({ children, heading }: any) => <div><span>{heading}</span>{children}</div>,
  CommandInput: (props: any) => <input placeholder={props.placeholder} onChange={props.onValueChange} />,
  CommandItem: ({ children, onSelect }: any) => <div onClick={onSelect}>{children}</div>,
  CommandList: ({ children }: any) => <div>{children}</div>,
  CommandSeparator: () => null,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, defaultValue, onValueChange }: any) => <div data-value={defaultValue}>{children}</div>,
  SelectTrigger: ({ children }: any) => <button>{children}</button>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, role }: any) => (
    <button onClick={onClick} disabled={disabled} type={type} role={role}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: any) => <textarea {...props} />,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
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
