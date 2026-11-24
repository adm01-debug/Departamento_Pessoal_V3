import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(),
}));

vi.mock('@/hooks/useGrupo', () => ({
  useGrupo: vi.fn(),
}));

vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children }: any) => children,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: any) => <div>{children}</div>,
  TooltipTrigger: ({ children }: any) => children,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

import { useEmpresas } from '@/hooks/useEmpresas';
import { useGrupo } from '@/hooks/useGrupo';
import { EmpresaSwitcher } from '../layout/EmpresaSwitcher';

const MOCK_EMPRESA = { id: 'e1', nome_fantasia: 'Empresa Alpha', razao_social: 'Alpha Ltda', cnpj: '00.000.000/0001-00', ativa: true };

function setupEmpresas(overrides: any = {}) {
  vi.mocked(useEmpresas).mockReturnValue({
    empresaAtual: MOCK_EMPRESA,
    empresaAtualId: 'e1',
    modo: 'empresa_unica',
    isConsolidado: false,
    setModo: vi.fn(),
    trocarEmpresa: vi.fn(),
    temMultiplasEmpresas: true,
    ...overrides,
  } as any);
  vi.mocked(useGrupo).mockReturnValue({
    empresas: [MOCK_EMPRESA],
    coresPorEmpresa: { e1: '#3b82f6' },
    regimePorEmpresa: { e1: { labelCurto: 'Lucro Real' } },
    totalAtivas: 1,
  } as any);
}

describe('EmpresaSwitcher', () => {
  it('renders empresa name when in empresa_unica mode', () => {
    setupEmpresas();
    render(<EmpresaSwitcher />);
    const names = screen.getAllByText('Empresa Alpha');
    expect(names.length).toBeGreaterThanOrEqual(1);
  });

  it('renders CNPJ in secondary label', () => {
    setupEmpresas();
    render(<EmpresaSwitcher />);
    const cnpjElements = screen.getAllByText('00.000.000/0001-00');
    expect(cnpjElements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Grupo Consolidado when isConsolidado', () => {
    setupEmpresas({ isConsolidado: true, modo: 'consolidado' });
    render(<EmpresaSwitcher />);
    expect(screen.getByText('Grupo Consolidado')).toBeInTheDocument();
  });

  it('renders totalAtivas count label when isConsolidado', () => {
    setupEmpresas({ isConsolidado: true, modo: 'consolidado' });
    vi.mocked(useGrupo).mockReturnValue({
      empresas: [MOCK_EMPRESA, { ...MOCK_EMPRESA, id: 'e2' }],
      coresPorEmpresa: {},
      regimePorEmpresa: {},
      totalAtivas: 2,
    } as any);
    render(<EmpresaSwitcher />);
    expect(screen.getByText(/2 empresas ativas/)).toBeInTheDocument();
  });

  it('renders collapsed button with aria-label when collapsed=true', () => {
    setupEmpresas();
    render(<EmpresaSwitcher collapsed />);
    expect(screen.getByRole('button', { name: 'Empresa Alpha' })).toBeInTheDocument();
  });

  it('renders Grupo and Empresa tab options in popover', () => {
    setupEmpresas();
    render(<EmpresaSwitcher />);
    expect(screen.getByRole('tab', { name: /Grupo/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Empresa/i })).toBeInTheDocument();
  });

  it('renders empresa name in the list', () => {
    setupEmpresas();
    render(<EmpresaSwitcher />);
    const names = screen.getAllByText('Empresa Alpha');
    expect(names.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Nenhuma empresa disponível when empresas empty', () => {
    setupEmpresas({ temMultiplasEmpresas: false });
    vi.mocked(useGrupo).mockReturnValue({
      empresas: [],
      coresPorEmpresa: {},
      regimePorEmpresa: {},
      totalAtivas: 0,
    } as any);
    render(<EmpresaSwitcher />);
    expect(screen.getByText(/Nenhuma empresa disponível/)).toBeInTheDocument();
  });
});
