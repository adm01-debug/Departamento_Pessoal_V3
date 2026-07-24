import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(),
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: ({ size }: any) => <div data-testid="spinner" data-size={size} />,
}));

import { useEmpresas } from '@/hooks/useEmpresas';
import { EmpresaSettingsTab } from '../settings/EmpresaSettingsTab';

const MOCK_EMPRESA = {
  id: 'emp-1',
  razao_social: 'Empresa Teste Ltda',
  nome_fantasia: 'Empresa Teste',
  cnpj: '12.345.678/0001-90',
  inscricao_estadual: '123456789',
  inscricao_municipal: '',
  cidade: 'Belo Horizonte',
  uf: 'MG',
  email: 'contato@empresa.com',
  telefone: '(31) 3333-4444',
};

describe('EmpresaSettingsTab', () => {
  it('shows spinner when loading', () => {
    vi.mocked(useEmpresas).mockReturnValue({
      empresaAtual: null, loadingEmpresas: true, atualizarEmpresa: { mutate: vi.fn(), isPending: false },
    } as any);
    render(<EmpresaSettingsTab />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('renders Dados da Empresa title', () => {
    vi.mocked(useEmpresas).mockReturnValue({
      empresaAtual: null, loadingEmpresas: false, atualizarEmpresa: { mutate: vi.fn(), isPending: false },
    } as any);
    render(<EmpresaSettingsTab />);
    expect(screen.getByText('Dados da Empresa')).toBeInTheDocument();
  });

  it('renders form labels', () => {
    vi.mocked(useEmpresas).mockReturnValue({
      empresaAtual: null, loadingEmpresas: false, atualizarEmpresa: { mutate: vi.fn(), isPending: false },
    } as any);
    render(<EmpresaSettingsTab />);
    expect(screen.getByText('Razão Social')).toBeInTheDocument();
    expect(screen.getByText('Nome Fantasia')).toBeInTheDocument();
    expect(screen.getByText('CNPJ')).toBeInTheDocument();
  });

  it('renders Salvar Alterações button', () => {
    vi.mocked(useEmpresas).mockReturnValue({
      empresaAtual: null, loadingEmpresas: false, atualizarEmpresa: { mutate: vi.fn(), isPending: false },
    } as any);
    render(<EmpresaSettingsTab />);
    expect(screen.getByText('Salvar Alterações')).toBeInTheDocument();
  });

  it('pre-fills form from empresaAtual', () => {
    vi.mocked(useEmpresas).mockReturnValue({
      empresaAtual: MOCK_EMPRESA, loadingEmpresas: false, atualizarEmpresa: { mutate: vi.fn(), isPending: false },
    } as any);
    render(<EmpresaSettingsTab />);
    const input = screen.getByDisplayValue('Empresa Teste Ltda');
    expect(input).toBeInTheDocument();
  });

  it('renders email label', () => {
    vi.mocked(useEmpresas).mockReturnValue({
      empresaAtual: null, loadingEmpresas: false, atualizarEmpresa: { mutate: vi.fn(), isPending: false },
    } as any);
    render(<EmpresaSettingsTab />);
    expect(screen.getByText('E-mail Corporativo')).toBeInTheDocument();
  });

  it('renders Cidade and UF labels', () => {
    vi.mocked(useEmpresas).mockReturnValue({
      empresaAtual: null, loadingEmpresas: false, atualizarEmpresa: { mutate: vi.fn(), isPending: false },
    } as any);
    render(<EmpresaSettingsTab />);
    expect(screen.getByText('Cidade')).toBeInTheDocument();
    expect(screen.getByText('UF')).toBeInTheDocument();
  });
});
