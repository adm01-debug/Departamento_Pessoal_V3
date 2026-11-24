import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/services/edgeFunctionsService', () => ({
  edgeFunctionsService: {
    healthcheck: vi.fn().mockResolvedValue({ status: 'healthy', services: {}, total_latency_ms: 12, timestamp: new Date().toISOString() }),
    limpezaDados: vi.fn().mockResolvedValue({ total_cleaned: 5, results: {} }),
    backupServidor: vi.fn().mockResolvedValue({ message: 'Backup OK', total_records: 100, tables: {} }),
    dispararAlertasDP: vi.fn().mockResolvedValue({}),
    processarAgendamentos: vi.fn().mockResolvedValue({ processados: 3 }),
    sincronizarBitrix: vi.fn().mockResolvedValue({}),
    cache: vi.fn().mockResolvedValue({}),
  },
}));

import { SystemHealthTab } from '../settings/SystemHealthTab';

describe('SystemHealthTab', () => {
  it('renders Console de Manutenção title', () => {
    render(<SystemHealthTab />);
    expect(screen.getByText('Console de Manutenção')).toBeInTheDocument();
  });

  it('renders Health Check button', () => {
    render(<SystemHealthTab />);
    expect(screen.getByText('Health Check')).toBeInTheDocument();
  });

  it('renders Limpeza de DB button', () => {
    render(<SystemHealthTab />);
    expect(screen.getByText('Limpeza de DB')).toBeInTheDocument();
  });

  it('renders Gerar Backup button', () => {
    render(<SystemHealthTab />);
    expect(screen.getByText('Gerar Backup')).toBeInTheDocument();
  });

  it('renders Disparar Alertas button', () => {
    render(<SystemHealthTab />);
    expect(screen.getByText('Disparar Alertas')).toBeInTheDocument();
  });

  it('renders Limpar Cache button', () => {
    render(<SystemHealthTab />);
    expect(screen.getByText('Limpar Cache')).toBeInTheDocument();
  });

  it('shows Aguardando Execução placeholder initially', () => {
    render(<SystemHealthTab />);
    expect(screen.getByText(/Aguardando Execução/)).toBeInTheDocument();
  });

  it('shows health results after clicking Health Check', async () => {
    const user = userEvent.setup();
    render(<SystemHealthTab />);
    await user.click(screen.getByText('Health Check'));
    expect(screen.getByText(/Status do Core/)).toBeInTheDocument();
  });
});
