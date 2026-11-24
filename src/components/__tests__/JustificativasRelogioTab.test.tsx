import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render as rtlRender, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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

// Select do Radix não abre em jsdom: <select> nativo com a mesma API de valor.
vi.mock('@/components/ui/select', () => {
  return {
    Select: ({
      children,
      value,
      onValueChange,
    }: {
      children?: ReactNode;
      value?: string;
      onValueChange?: (v: string) => void;
    }) => (
      <select value={value} onChange={(e) => onValueChange?.(e.target.value)} aria-label="tipo">
        {children}
      </select>
    ),
    SelectTrigger: () => null,
    SelectValue: () => null,
    SelectContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
    SelectItem: ({ children, value }: { children?: ReactNode; value: string }) => (
      <option value={value}>{children}</option>
    ),
  };
});

import { JustificativasRelogioTab } from '../ponto/relogio/JustificativasRelogioTab';

const justificativas = [
  {
    id: 'j-1',
    dispositivo_id: 'd-1',
    codigo: 1,
    nome: 'ATESTADO MEDICO',
    considera_normal: true,
    considera_falta: false,
    tipo_dia: null,
  },
];

function render() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return rtlRender(
    <QueryClientProvider client={client}>
      <JustificativasRelogioTab empresaId="emp-1" />
    </QueryClientProvider>
  );
}

describe('JustificativasRelogioTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tabelas.ponto_rep_justificativas = { data: justificativas, error: null };
  });

  it('mostra carregando', () => {
    render();
    expect(screen.getByRole('status')).toHaveTextContent(/Carregando justificativas/);
  });

  it('mostra erro', async () => {
    tabelas.ponto_rep_justificativas = { data: null, error: new Error('sem acesso') };
    render();
    expect(await screen.findByRole('alert')).toHaveTextContent('sem acesso');
  });

  it('mostra vazio', async () => {
    tabelas.ponto_rep_justificativas = { data: [], error: null };
    render();
    expect(await screen.findByText('Nenhuma justificativa recebida do relógio ainda.')).toBeInTheDocument();
  });

  it('lista a justificativa com "Sem efeito" selecionado quando tipo_dia é nulo', async () => {
    render();
    expect(await screen.findByText('ATESTADO MEDICO')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'tipo' })).toHaveValue('sem_efeito');
    expect(screen.getByRole('option', { name: 'Sem efeito' })).toBeInTheDocument();
  });

  it('escolher um tipo chama definir_tipo_dia_justificativa_relogio com o valor', async () => {
    render();
    await screen.findByText('ATESTADO MEDICO');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'tipo' }), 'atestado');
    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith('definir_tipo_dia_justificativa_relogio', {
        _justificativa_id: 'j-1',
        _tipo_dia: 'atestado',
      })
    );
  });

  it('"Sem efeito" envia NULL', async () => {
    tabelas.ponto_rep_justificativas = { data: [{ ...justificativas[0], tipo_dia: 'falta' }], error: null };
    render();
    await screen.findByText('ATESTADO MEDICO');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'tipo' }), 'sem_efeito');
    await waitFor(() =>
      expect(rpcMock).toHaveBeenCalledWith('definir_tipo_dia_justificativa_relogio', {
        _justificativa_id: 'j-1',
        _tipo_dia: null,
      })
    );
  });
});
