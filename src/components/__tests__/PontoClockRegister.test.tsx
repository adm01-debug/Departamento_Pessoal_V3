import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/contexts', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'user-001', email: 'joao@empresa.com' } })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('@/services/pontoOfflineService', () => ({
  pontoOfflineService: {
    getQueueSize: vi.fn().mockResolvedValue(0),
    sync: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/utils/safeError', () => ({
  safeErrorMessage: vi.fn((e: any) => String(e)),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div role="dialog">{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

import { PontoClockRegister } from '../ponto/PontoClockRegister';

const MOCK_TIME = new Date('2026-07-24T08:00:00');
const onRegistrar = vi.fn().mockResolvedValue(undefined);

describe('PontoClockRegister', () => {
  it('renders Registrar Ponto title', () => {
    render(<PontoClockRegister time={MOCK_TIME} loading={null} geoStatus="idle" onRegistrar={onRegistrar} />);
    expect(screen.getByText('Registrar Ponto')).toBeInTheDocument();
  });

  it('renders Entrada button', () => {
    render(<PontoClockRegister time={MOCK_TIME} loading={null} geoStatus="idle" onRegistrar={onRegistrar} />);
    expect(screen.getByRole('button', { name: /Entrada/i })).toBeInTheDocument();
  });

  it('renders Saída Almoço button', () => {
    render(<PontoClockRegister time={MOCK_TIME} loading={null} geoStatus="idle" onRegistrar={onRegistrar} />);
    expect(screen.getByRole('button', { name: /Sa.*da Almo.*o/i })).toBeInTheDocument();
  });

  it('renders Retorno Almoço button', () => {
    render(<PontoClockRegister time={MOCK_TIME} loading={null} geoStatus="idle" onRegistrar={onRegistrar} />);
    expect(screen.getByRole('button', { name: /Retorno Almo.*o/i })).toBeInTheDocument();
  });

  it('renders Saída button', () => {
    render(<PontoClockRegister time={MOCK_TIME} loading={null} geoStatus="idle" onRegistrar={onRegistrar} />);
    expect(screen.getByRole('button', { name: /^Sa.*da$/i })).toBeInTheDocument();
  });

  it('renders time display', () => {
    render(<PontoClockRegister time={MOCK_TIME} loading={null} geoStatus="idle" onRegistrar={onRegistrar} />);
    expect(screen.getByText('08:00:00')).toBeInTheDocument();
  });

  it('renders 4 action buttons', () => {
    render(<PontoClockRegister time={MOCK_TIME} loading={null} geoStatus="idle" onRegistrar={onRegistrar} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4);
  });

  it('disables buttons when loading', () => {
    render(<PontoClockRegister time={MOCK_TIME} loading="entrada" geoStatus="capturing" onRegistrar={onRegistrar} />);
    const entradaBtn = screen.getAllByRole('button').find(b => b.hasAttribute('disabled'));
    expect(entradaBtn).toBeDefined();
  });
});
