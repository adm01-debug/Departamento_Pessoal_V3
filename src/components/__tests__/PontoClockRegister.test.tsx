import type { ReactNode } from 'react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Tables } from '@/integrations/supabase/types';

const state = vi.hoisted(() => ({
  queueSize: 0,
  onLine: true,
  user: { id: 'user-001', email: 'joao@empresa.com' } as { id: string; email: string } | null,
  colabChain: { data: { id: 'col-1', empresa_id: 'emp-1' }, error: null } as {
    data: { id: string; empresa_id: string } | null;
    error: { message: string } | null;
  },
  storageUpload: vi.fn(async () => ({ error: null })),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/contexts', () => ({
  useAuth: vi.fn(() => ({ user: state.user })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => {
      const builder = {
        select: () => builder,
        eq: () => builder,
        limit: () => builder,
        maybeSingle: () => Promise.resolve(state.colabChain),
      };
      return builder;
    }),
    storage: {
      from: vi.fn(() => ({ upload: state.storageUpload })),
    },
  },
}));

vi.mock('@/services/pontoOfflineService', () => ({
  pontoOfflineService: {
    getQueueSize: vi.fn(() => state.queueSize),
    sync: vi.fn().mockResolvedValue(undefined),
    syncOfflineQueue: vi.fn(async () => ({ synced: 0, errors: 0 })),
    queueRegistro: vi.fn(async () => undefined),
    generateIntegrityHash: vi.fn(() => 'hash-abc'),
  },
}));

vi.mock('@/services/loggerService', () => ({
  loggerService: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: unknown, d?: string) => d ?? String(e)),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
}));

import { toast } from 'sonner';
import { pontoOfflineService } from '@/services/pontoOfflineService';
import { PontoClockRegister } from '../ponto/PontoClockRegister';

const MOCK_TIME = new Date('2026-07-24T08:00:00');
const onRegistrar = vi.fn().mockResolvedValue({ biometriaValida: true });

function renderClock(props: Partial<Parameters<typeof PontoClockRegister>[0]> = {}) {
  return render(
    <PontoClockRegister time={MOCK_TIME} loading={null} geoStatus="idle" onRegistrar={onRegistrar} {...props} />
  );
}

const fakeStream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;

describe('PontoClockRegister', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.queueSize = 0;
    state.onLine = true;
    state.user = { id: 'user-001', email: 'joao@empresa.com' };
    state.colabChain = { data: { id: 'col-1', empresa_id: 'emp-1' }, error: null };
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => state.onLine,
    });
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => fakeStream) },
    });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,QUJD');
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((cb: BlobCallback) =>
      cb(new Blob(['jpg'], { type: 'image/jpeg' }))
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders Registrar Ponto title', () => {
    renderClock();
    expect(screen.getByText('Registrar Ponto')).toBeInTheDocument();
  });

  it('renders Entrada button', () => {
    renderClock();
    expect(screen.getByRole('button', { name: /Entrada/i })).toBeInTheDocument();
  });

  it('renders Saída Almoço button', () => {
    renderClock();
    expect(screen.getByRole('button', { name: /Sa.*da Almo.*o/i })).toBeInTheDocument();
  });

  it('renders Retorno Almoço button', () => {
    renderClock();
    expect(screen.getByRole('button', { name: /Retorno Almo.*o/i })).toBeInTheDocument();
  });

  it('renders Saída button', () => {
    renderClock();
    expect(screen.getByRole('button', { name: /^Sa.*da$/i })).toBeInTheDocument();
  });

  it('renders time display', () => {
    renderClock();
    expect(screen.getByText('08:00:00')).toBeInTheDocument();
  });

  it('renders 4 action buttons', () => {
    renderClock();
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('disables buttons when loading', () => {
    renderClock({ loading: 'entrada', geoStatus: 'capturing' });
    const entradaBtn = screen.getAllByRole('button').find((b) => b.hasAttribute('disabled'));
    expect(entradaBtn).toBeDefined();
  });

  it('mostra "Registrando..." no botão do tipo em loading', () => {
    renderClock({ loading: 'saida' });
    expect(screen.getByText('Registrando...')).toBeInTheDocument();
  });

  it('mostra "Capturando GPS..." quando geoStatus é capturing no tipo em loading', () => {
    renderClock({ loading: 'entrada', geoStatus: 'capturing' });
    expect(screen.getByText('Capturando GPS...')).toBeInTheDocument();
  });

  it('reflete geoStatus success / error / out_of_range / idle', () => {
    const { rerender } = render(
      <PontoClockRegister time={MOCK_TIME} loading={null} geoStatus="success" onRegistrar={onRegistrar} />
    );
    expect(screen.getByText(/Localização capturada/)).toBeInTheDocument();
    rerender(<PontoClockRegister time={MOCK_TIME} loading={null} geoStatus="error" onRegistrar={onRegistrar} />);
    expect(screen.getByText(/GPS indisponível/)).toBeInTheDocument();
    rerender(<PontoClockRegister time={MOCK_TIME} loading={null} geoStatus="out_of_range" onRegistrar={onRegistrar} />);
    expect(screen.getByText(/Fora do raio permitido/)).toBeInTheDocument();
    rerender(<PontoClockRegister time={MOCK_TIME} loading={null} geoStatus="idle" onRegistrar={onRegistrar} />);
    expect(screen.getByText(/Geolocalização Ativa/)).toBeInTheDocument();
  });

  it('renderiza último registro quando informado', () => {
    const ultimoRegistro = { tipo: 'saida_almoco', hora: '12:05' } as unknown as Tables<'batidas_ponto'>;
    renderClock({ ultimoRegistro });
    expect(screen.getByText('Último Registro')).toBeInTheDocument();
    expect(screen.getByText(/saida almoco às 12:05/i)).toBeInTheDocument();
  });

  it('fluxo completo online: escaneia, envia foto e registra com biometria', async () => {
    renderClock();
    fireEvent.click(screen.getByRole('button', { name: /Entrada/i }));

    await waitFor(() => expect(onRegistrar).toHaveBeenCalled(), { timeout: 5000 });
    expect(onRegistrar).toHaveBeenCalledWith(
      'entrada',
      expect.objectContaining({
        foto_biometria_url: expect.stringMatching(/^emp-1\/col-1\/.+\.jpg$/),
        foto_base64: 'data:image/jpeg;base64,QUJD',
      })
    );
    expect(state.storageUpload).toHaveBeenCalledWith(expect.stringMatching(/^emp-1\/col-1\//), expect.any(Blob));
    await waitFor(() => expect(screen.getByText(/Identidade Confirmada/)).toBeInTheDocument());
    expect(screen.getByText('Ponto Confirmado!')).toBeInTheDocument();
  }, 10000);

  it('biometria pendente: outcome sem biometriaValida mostra aviso de revisão', async () => {
    onRegistrar.mockResolvedValueOnce({ biometriaValida: false });
    renderClock();
    fireEvent.click(screen.getByRole('button', { name: /^Sa.*da$/i }));
    await waitFor(() => expect(screen.getByText(/biometria pendente de revisão/)).toBeInTheDocument(), {
      timeout: 5000,
    });
  }, 10000);

  it('câmera negada mostra toast.error e não registra', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(new Error('denied'));
    renderClock();
    fireEvent.click(screen.getByRole('button', { name: /Entrada/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Acesso à câmera é obrigatório para biometria.'));
    expect(onRegistrar).not.toHaveBeenCalled();
  });

  it('modo offline: enfileira registro com hash e avisa', async () => {
    state.onLine = false;
    renderClock();
    fireEvent.click(screen.getByRole('button', { name: /Retorno Almo.*o/i }));

    await waitFor(() => expect(pontoOfflineService.queueRegistro).toHaveBeenCalled(), { timeout: 5000 });
    expect(pontoOfflineService.generateIntegrityHash).toHaveBeenCalledWith(
      expect.objectContaining({ tipo: 'retorno_almoco', colaborador_id: 'col-1', empresa_id: 'emp-1' })
    );
    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringContaining('modo OFFLINE'),
      expect.objectContaining({ icon: expect.anything() })
    );
    expect(onRegistrar).not.toHaveBeenCalled();
  }, 10000);

  it('offline sem colaborador identificado mostra toast.error', async () => {
    state.onLine = false;
    state.colabChain = { data: null, error: null };
    renderClock();
    fireEvent.click(screen.getByRole('button', { name: /Entrada/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled(), { timeout: 5000 });
    expect(pontoOfflineService.queueRegistro).not.toHaveBeenCalled();
  }, 10000);

  it('badge de fila offline aparece quando há pendências e sincroniza ao clicar', async () => {
    state.queueSize = 3;
    vi.mocked(pontoOfflineService.syncOfflineQueue)
      .mockResolvedValueOnce({ synced: 0, errors: 0 })
      .mockResolvedValue({ synced: 3, errors: 0 });
    renderClock();
    await waitFor(() => expect(screen.getByText(/3 pendentes/)).toBeInTheDocument());
    const syncBtn = screen.getAllByRole('button').find((b) => b.textContent === '');
    fireEvent.click(syncBtn!);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('3 registros offline sincronizados!'));
  });
});
