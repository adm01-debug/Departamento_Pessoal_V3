import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Departamento } from '@/types/entities';

const authState = { isAdmin: false, roles: [] as string[] };

vi.mock('@/contexts', () => ({
  useAuth: () => ({
    isAdmin: authState.isAdmin,
    hasRole: (r: string) => authState.roles.includes(r),
  }),
}));

const DEPTO = { id: 'dep-00000001', nome: 'Financeiro', ativo: true } as Departamento;

vi.mock('@/hooks/useDepartamentos', () => ({
  useDepartamentos: () => ({
    departamentos: [DEPTO],
    total: 1,
    isLoading: false,
    isFetching: false,
    error: null,
    page: 1,
    setPage: vi.fn(),
    pageSize: 20,
    search: '',
    setSearch: vi.fn(),
    refetch: vi.fn(),
    isRefreshing: false,
  }),
}));

vi.mock('@/components/departamentos/NovoDepartamentoDialog', () => ({
  NovoDepartamentoDialog: () => null,
}));

vi.mock('@/components/layout/EntityPageContainer', () => ({
  EntityPageContainer: ({
    items,
    renderRow,
    onAdd,
    addLabel,
  }: {
    items: Departamento[];
    renderRow: (d: Departamento) => ReactNode;
    onAdd?: () => void;
    addLabel?: string;
  }) => (
    <div>
      {onAdd && <button onClick={onAdd}>{addLabel}</button>}
      <table>
        <tbody>{items.map((d) => renderRow(d))}</tbody>
      </table>
    </div>
  ),
}));

import DepartamentosPage from '../DepartamentosPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <DepartamentosPage />
    </MemoryRouter>
  );
}

describe('DepartamentosPage — permissão de gestão', () => {
  beforeEach(() => {
    authState.isAdmin = false;
    authState.roles = [];
  });

  it('colaborador comum não vê Novo nem DETALHES (editar/inativar)', () => {
    renderPage();
    expect(screen.getByText('Financeiro')).toBeInTheDocument();
    expect(screen.queryByText('Novo Departamento')).not.toBeInTheDocument();
    expect(screen.queryByText(/DETALHES/)).not.toBeInTheDocument();
  });

  it('RH vê Novo e DETALHES', () => {
    authState.roles = ['rh'];
    renderPage();
    expect(screen.getByText('Novo Departamento')).toBeInTheDocument();
    expect(screen.getByText(/DETALHES/)).toBeInTheDocument();
  });

  it('admin vê Novo e DETALHES', () => {
    authState.isAdmin = true;
    renderPage();
    expect(screen.getByText('Novo Departamento')).toBeInTheDocument();
    expect(screen.getByText(/DETALHES/)).toBeInTheDocument();
  });
});
