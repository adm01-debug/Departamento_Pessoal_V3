import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render as rtlRender, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Resultado por tabela; o builder do Supabase é encadeável e "thenable".
const tabelas: Record<string, { data: unknown; error: unknown }> = {};
const fromMock = vi.fn((tabela: string) => {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'order']) builder[m] = vi.fn(() => builder);
  builder.then = (resolve: (v: unknown) => unknown) => resolve(tabelas[tabela] ?? { data: [], error: null });
  return builder;
});
const rpcMock = vi.fn(async () => ({ data: null, error: null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => fromMock(t), rpc: (...a: unknown[]) => rpcMock(...(a as [])) },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Popover/Command do Radix/cmdk não abrem em jsdom: versões simples, sempre visíveis.
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
  PopoverContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/ui/command', () => ({
  Command: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CommandInput: ({ placeholder }: { placeholder?: string }) => <input placeholder={placeholder} />,
  CommandList: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CommandEmpty: () => null,
  CommandGroup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  CommandItem: ({ children, onSelect }: { children?: ReactNode; onSelect?: () => void }) => (
    <button type="button" role="option" aria-selected={false} onClick={onSelect}>
      {children}
    </button>
  ),
}));

import { VinculosRelogioTab } from '../ponto/relogio/VinculosRelogioTab';

const EMPRESA = 'emp-1';

const funcionarios = [
  {
    id: 'f-1',
    dispositivo_id: 'd-1',
    codigo: 10,
    nome: 'ANA RELOGIO',
    cpf: '123.456.789-01',
    matricula: '0010',
    situacao: 'Ativo',
    colaborador_id: null,
    vinculo_metodo: null,
    vinculado_em: null,
    colaborador: null,
  },
  {
    id: 'f-2',
    dispositivo_id: 'd-1',
    codigo: 20,
    nome: 'BIA RELOGIO',
    cpf: '98765432100',
    matricula: '0020',
    situacao: 'Ativo',
    colaborador_id: 'c-2',
    vinculo_metodo: 'cpf',
    vinculado_em: '2026-11-21T10:00:00Z',
    colaborador: { nome_completo: 'Bia Souza' },
  },
];

const colaboradores = [{ id: 'c-1', nome_completo: 'Ana Lima', cpf_last4: '8901', matricula: '0010', status: 'ativo' }];

function render() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return rtlRender(
    <QueryClientProvider client={client}>
      <VinculosRelogioTab empresaId={EMPRESA} />
    </QueryClientProvider>
  );
}

describe('VinculosRelogioTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tabelas.ponto_rep_funcionarios = { data: funcionarios, error: null };
    tabelas.colaboradores = { data: colaboradores, error: null };
  });

  it('mostra carregando antes dos dados', () => {
    render();
    expect(screen.getByRole('status')).toHaveTextContent(/Carregando funcionários do relógio/);
  });

  it('mostra erro com opção de tentar de novo', async () => {
    tabelas.ponto_rep_funcionarios = { data: null, error: new Error('falha de rede') };
    render();
    expect(await screen.findByRole('alert')).toHaveTextContent('falha de rede');
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('mostra vazio quando o relógio ainda não mandou funcionários', async () => {
    tabelas.ponto_rep_funcionarios = { data: [], error: null };
    render();
    expect(await screen.findByText('Nenhum funcionário recebido do relógio ainda.')).toBeInTheDocument();
    expect(screen.getByTestId('contador-pendentes')).toHaveTextContent('0 pendentes');
  });

  it('lista pendentes por padrão, com contador e CPF mascarado (só últimos 4)', async () => {
    render();
    const linha = await screen.findByTestId('funcionario-10');
    expect(screen.getByTestId('contador-pendentes')).toHaveTextContent('1 pendente');
    expect(within(linha).getByText('***.***.*89-01')).toBeInTheDocument();
    expect(screen.queryByText(/123\.456/)).not.toBeInTheDocument();
    expect(screen.queryByTestId('funcionario-20')).not.toBeInTheDocument();
    expect(fromMock).toHaveBeenCalledWith('ponto_rep_funcionarios');
  });

  it('filtro Vinculados mostra colaborador e método', async () => {
    render();
    await screen.findByTestId('funcionario-10');
    await userEvent.click(screen.getByRole('button', { name: 'Vinculados' }));
    const linha = screen.getByTestId('funcionario-20');
    expect(within(linha).getByText('Bia Souza')).toBeInTheDocument();
    expect(within(linha).getByText('CPF')).toBeInTheDocument();
    expect(within(linha).getByText('***.***.*21-00')).toBeInTheDocument();
    expect(screen.queryByTestId('funcionario-10')).not.toBeInTheDocument();
  });

  it('Vincular chama vincular_funcionario_relogio com funcionário e colaborador', async () => {
    render();
    const linha = await screen.findByTestId('funcionario-10');
    await userEvent.click(await within(linha).findByRole('option', { name: /Ana Lima/ }));
    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith('vincular_funcionario_relogio', {
        _funcionario_id: 'f-1',
        _colaborador_id: 'c-1',
      })
    );
  });

  it('Desfazer chama desvincular_funcionario_relogio', async () => {
    render();
    await screen.findByTestId('funcionario-10');
    await userEvent.click(screen.getByRole('button', { name: 'Todos' }));
    await userEvent.click(within(screen.getByTestId('funcionario-20')).getByRole('button', { name: /Desfazer/ }));
    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith('desvincular_funcionario_relogio', { _funcionario_id: 'f-2' })
    );
  });
});
