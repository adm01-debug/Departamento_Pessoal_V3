import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-1' } })),
}));

vi.mock('@/hooks/useColaboradorDetalhes', () => ({
  useCamposCustomizados: vi.fn(),
  useValoresCamposCustomizados: vi.fn(),
  useSalvarValorCampoCustomizado: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => <div data-testid="spinner" />,
}));

// Select do shadcn é baseado em Radix (portal + pointer events); um <select>
// nativo mantém o teste focado no comportamento do componente.
vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: {
    children?: ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => (
    <select data-testid="select" value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children?: ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));

import { toast } from 'sonner';
import {
  useCamposCustomizados,
  useValoresCamposCustomizados,
  useSalvarValorCampoCustomizado,
} from '@/hooks/useColaboradorDetalhes';
import { CamposCustomizadosTab } from '../CamposCustomizadosTab';

const render = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

const CAMPO_TEXTO = {
  id: 'c1',
  nome: 'Matrícula interna',
  tipo: 'texto',
  obrigatorio: true,
  opcoes: null,
  ordem: 1,
  secao: 'outros',
  ativo: true,
  empresa_id: 'emp-1',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

const CAMPO_SELECAO = {
  ...CAMPO_TEXTO,
  id: 'c2',
  nome: 'Turno',
  tipo: 'selecao',
  obrigatorio: false,
  // `opcoes` é Json no banco: valores não-string precisam ser descartados.
  opcoes: ['Manhã', 'Noite', 42, ''],
  ordem: 2,
};

const mockCampos = (estado: Partial<{ data: unknown[]; isLoading: boolean; isError: boolean }>) =>
  vi.mocked(useCamposCustomizados).mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    ...estado,
  } as never);

const mockValores = (estado: Partial<{ data: unknown[]; isLoading: boolean; isError: boolean }>) =>
  vi.mocked(useValoresCamposCustomizados).mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
    ...estado,
  } as never);

const mockSalvar = (mutateAsync: () => Promise<unknown>, isPending = false) =>
  vi.mocked(useSalvarValorCampoCustomizado).mockReturnValue({ mutateAsync, isPending } as never);

describe('CamposCustomizadosTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCampos({});
    mockValores({});
    mockSalvar(() => Promise.resolve(null));
  });

  it('mostra carregando enquanto as consultas não respondem', () => {
    mockCampos({ isLoading: true });
    render(<CamposCustomizadosTab colaboradorId="col-1" />);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('mostra falha de consulta sem inventar ausência de dados', () => {
    mockCampos({ isError: true });
    render(<CamposCustomizadosTab colaboradorId="col-1" />);
    expect(screen.getByText(/Não foi possível carregar os campos customizados/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nenhum campo customizado ativo/i)).not.toBeInTheDocument();
  });

  it('mostra estado vazio honesto quando a empresa não definiu campos', () => {
    render(<CamposCustomizadosTab colaboradorId="col-1" />);
    expect(screen.getByText(/Nenhum campo customizado ativo para esta empresa/i)).toBeInTheDocument();
  });

  it('renderiza rótulo e valor salvo de cada campo', () => {
    mockCampos({ data: [CAMPO_TEXTO] });
    mockValores({ data: [{ campo_customizado_id: 'c1', valor: 'MAT-77' }] });
    render(<CamposCustomizadosTab colaboradorId="col-1" />);
    expect(screen.getByLabelText(/Matrícula interna/i)).toHaveValue('MAT-77');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('descarta opções não-string do Json de opcoes', () => {
    mockCampos({ data: [CAMPO_SELECAO] });
    render(<CamposCustomizadosTab colaboradorId="col-1" />);
    const opcoes = screen.getAllByRole('option').map((o) => o.textContent);
    expect(opcoes).toEqual(['Manhã', 'Noite']);
  });

  it('salva apenas os campos editados e confirma com toast', async () => {
    const mutateAsync = vi.fn(() => Promise.resolve(null));
    mockCampos({ data: [CAMPO_TEXTO] });
    mockValores({ data: [{ campo_customizado_id: 'c1', valor: 'MAT-77' }] });
    mockSalvar(mutateAsync);
    render(<CamposCustomizadosTab colaboradorId="col-1" />);

    await userEvent.clear(screen.getByLabelText(/Matrícula interna/i));
    await userEvent.type(screen.getByLabelText(/Matrícula interna/i), 'MAT-80');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(mutateAsync).toHaveBeenCalledTimes(1);
    expect(mutateAsync).toHaveBeenCalledWith({ campoId: 'c1', valor: 'MAT-80' });
    expect(vi.mocked(toast.success)).toHaveBeenCalledWith('Campos customizados salvos');
  });

  it('usa o DatePicker do design system no campo de data, não input nativo', () => {
    mockCampos({ data: [{ ...CAMPO_TEXTO, id: 'c3', nome: 'Data de crachá', tipo: 'data', obrigatorio: false }] });
    const { container } = render(<CamposCustomizadosTab colaboradorId="col-1" />);
    expect(container.querySelector('input[type="date"]')).toBeNull();
    expect(screen.getByLabelText(/Data de crachá/i).tagName).toBe('BUTTON');
  });

  it('não grava vazio em campo obrigatório que o usuário apagou', async () => {
    const mutateAsync = vi.fn(() => Promise.resolve(null));
    mockCampos({ data: [CAMPO_TEXTO] });
    mockValores({ data: [{ campo_customizado_id: 'c1', valor: 'MAT-77' }] });
    mockSalvar(mutateAsync);
    render(<CamposCustomizadosTab colaboradorId="col-1" />);

    await userEvent.clear(screen.getByLabelText(/Matrícula interna/i));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(mutateAsync).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent('Matrícula interna');
    expect(vi.mocked(toast.success)).not.toHaveBeenCalled();
  });

  it('expõe estado de erro quando o salvamento falha', async () => {
    const mutateAsync = vi.fn(() => Promise.reject(new Error('Falha na rede')));
    mockCampos({ data: [CAMPO_TEXTO] });
    mockSalvar(mutateAsync);
    render(<CamposCustomizadosTab colaboradorId="col-1" />);

    await userEvent.type(screen.getByLabelText(/Matrícula interna/i), 'X');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha na rede');
    expect(vi.mocked(toast.error)).toHaveBeenCalled();
  });
});
