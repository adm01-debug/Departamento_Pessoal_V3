import type { ReactNode } from 'react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const state = vi.hoisted(() => ({
  usaRelogio: { data: false as boolean | null, error: null as { message: string } | null },
  rpc: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1', exigir_pin_quiosque: false } }),
}));

vi.mock('@/services/pontoService', () => ({
  pontoService: { registrar: vi.fn() },
}));

vi.mock('@/services/pontoOfflineService', () => ({
  pontoOfflineService: {
    getQueueSize: vi.fn(() => 0),
    syncOfflineQueue: vi.fn(async () => ({ synced: 0, errors: 0 })),
    queueRegistro: vi.fn(),
  },
}));

vi.mock('@/services/loggerService', () => ({
  loggerService: { log: vi.fn(), error: vi.fn() },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: () =>
          Promise.resolve({ data: { id: 'col-1', nome_completo: 'Ana Souza', empresa_id: 'emp-1' }, error: null }),
      };
      return builder;
    }),
    rpc: state.rpc,
  },
}));

import PontoKioskPage from '../PontoKioskPage';

const identificar = () => {
  render(<PontoKioskPage />);
  fireEvent.change(screen.getByPlaceholderText('0000'), { target: { value: '123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
};

describe('PontoKioskPage — colaborador do relógio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.rpc.mockImplementation(async () => state.usaRelogio);
  });

  it('quem usa o relógio não vê os botões de registro, só o aviso', async () => {
    state.usaRelogio = { data: true, error: null };
    identificar();
    expect(await screen.findByText('Seu ponto é registrado no relógio da unidade.')).toBeInTheDocument();
    expect(state.rpc).toHaveBeenCalledWith('colaborador_usa_relogio_por_id', { _colaborador_id: 'col-1' });
    expect(screen.queryByRole('button', { name: /Entrada/ })).not.toBeInTheDocument();
  });

  it('Voltar retorna à tela de matrícula', async () => {
    state.usaRelogio = { data: true, error: null };
    identificar();
    fireEvent.click(await screen.findByRole('button', { name: 'Voltar' }));
    expect(screen.getByText('Digite sua matrícula')).toBeInTheDocument();
  });

  it('quem não usa o relógio segue para os botões de registro', async () => {
    state.usaRelogio = { data: false, error: null };
    identificar();
    expect(await screen.findByRole('button', { name: /Entrada/ })).toBeInTheDocument();
    expect(screen.queryByText('Seu ponto é registrado no relógio da unidade.')).not.toBeInTheDocument();
  });

  it('falha na consulta não trava o quiosque (o banco recusa a batida se preciso)', async () => {
    state.usaRelogio = { data: null, error: { message: 'falhou' } };
    identificar();
    await waitFor(() => expect(screen.getByRole('button', { name: /Entrada/ })).toBeInTheDocument());
  });
});
