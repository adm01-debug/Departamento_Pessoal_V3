import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({
    userEmpresas: [],
    todasEmpresas: [],
    empresaAtual: null,
    trocarEmpresa: vi.fn(),
  })),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, disabled, ...props }: any) => (
    <button disabled={disabled} {...props}>{children}</button>
  ),
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => <div onClick={onClick}>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

import { EmpresaSelector } from '../empresa/EmpresaSelector';

describe('EmpresaSelector', () => {
  it('renders Nenhuma Empresa when no empresas', async () => {
    render(<EmpresaSelector />);
    expect(screen.getByText('Nenhuma Empresa')).toBeInTheDocument();
  });

  it('Nenhuma Empresa button is disabled', () => {
    render(<EmpresaSelector />);
    const btn = screen.getByRole('button', { name: /Nenhuma Empresa/i });
    expect(btn).toBeDisabled();
  });

  it('renders single empresa name when only one empresa', async () => {
    const { useEmpresas } = await import('@/hooks/useEmpresas');
    vi.mocked(useEmpresas).mockReturnValueOnce({
      userEmpresas: [],
      todasEmpresas: [{ id: 'e1', nome_fantasia: 'Tech Corp', razao_social: 'Tech Corp LTDA' } as any],
      empresaAtual: { id: 'e1', nome_fantasia: 'Tech Corp', razao_social: 'Tech Corp LTDA' } as any,
      trocarEmpresa: vi.fn(),
    } as any);
    render(<EmpresaSelector />);
    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
  });

  it('renders dropdown with multiple empresas', async () => {
    const { useEmpresas } = await import('@/hooks/useEmpresas');
    vi.mocked(useEmpresas).mockReturnValueOnce({
      userEmpresas: [],
      todasEmpresas: [
        { id: 'e1', nome_fantasia: 'Empresa A', razao_social: 'A LTDA' } as any,
        { id: 'e2', nome_fantasia: 'Empresa B', razao_social: 'B LTDA' } as any,
      ],
      empresaAtual: { id: 'e1', nome_fantasia: 'Empresa A', razao_social: 'A LTDA' } as any,
      trocarEmpresa: vi.fn(),
    } as any);
    render(<EmpresaSelector />);
    expect(screen.getAllByText('Empresa A').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Selecionar when multiple empresas and no current', async () => {
    const { useEmpresas } = await import('@/hooks/useEmpresas');
    vi.mocked(useEmpresas).mockReturnValueOnce({
      userEmpresas: [],
      todasEmpresas: [
        { id: 'e1', nome_fantasia: 'Empresa A', razao_social: 'A LTDA' } as any,
        { id: 'e2', nome_fantasia: 'Empresa B', razao_social: 'B LTDA' } as any,
      ],
      empresaAtual: null,
      trocarEmpresa: vi.fn(),
    } as any);
    render(<EmpresaSelector />);
    expect(screen.getByText('Selecionar')).toBeInTheDocument();
  });

  it('shows Padrão badge for default empresa', async () => {
    const { useEmpresas } = await import('@/hooks/useEmpresas');
    vi.mocked(useEmpresas).mockReturnValueOnce({
      userEmpresas: [{ empresa_id: 'e1', empresa: { id: 'e1', nome_fantasia: 'Empresa A' }, is_default: true }] as any,
      todasEmpresas: [
        { id: 'e1', nome_fantasia: 'Empresa A', razao_social: 'A LTDA' } as any,
        { id: 'e2', nome_fantasia: 'Empresa B', razao_social: 'B LTDA' } as any,
      ],
      empresaAtual: null,
      trocarEmpresa: vi.fn(),
    } as any);
    render(<EmpresaSelector />);
    expect(screen.getByText('Padrão')).toBeInTheDocument();
  });

  it('shows Acesso Admin for non-vinculada empresa', async () => {
    const { useEmpresas } = await import('@/hooks/useEmpresas');
    vi.mocked(useEmpresas).mockReturnValueOnce({
      userEmpresas: [],
      todasEmpresas: [
        { id: 'e1', nome_fantasia: 'Empresa A', razao_social: 'A LTDA' } as any,
        { id: 'e2', nome_fantasia: 'Empresa B', razao_social: 'B LTDA' } as any,
      ],
      empresaAtual: null,
      trocarEmpresa: vi.fn(),
    } as any);
    render(<EmpresaSelector />);
    const adminBadges = screen.getAllByText('Acesso Admin');
    expect(adminBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('uses razao_social when nome_fantasia is absent', async () => {
    const { useEmpresas } = await import('@/hooks/useEmpresas');
    vi.mocked(useEmpresas).mockReturnValueOnce({
      userEmpresas: [],
      todasEmpresas: [{ id: 'e1', nome_fantasia: null, razao_social: 'Razão Social SA' } as any],
      empresaAtual: { id: 'e1', nome_fantasia: null, razao_social: 'Razão Social SA' } as any,
      trocarEmpresa: vi.fn(),
    } as any);
    render(<EmpresaSelector />);
    expect(screen.getByText('Razão Social SA')).toBeInTheDocument();
  });
});
