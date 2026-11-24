import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/hooks', () => ({
  useEmpresas: vi.fn(() => ({ empresaAtual: { id: 'emp-1' } })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('@/services/edgeFunctionsService', () => ({
  edgeFunctionsService: {
    gerarGuias: vi.fn().mockResolvedValue({}),
  },
}));

import { FGTSDigitalDashboard } from '../folha/FGTSDigitalDashboard';

describe('FGTSDigitalDashboard', () => {
  it('renders FGTS Digital title', () => {
    render(<FGTSDigitalDashboard />);
    expect(screen.getByText('FGTS Digital')).toBeInTheDocument();
  });

  it('renders API Caixa Ativa badge', () => {
    render(<FGTSDigitalDashboard />);
    expect(screen.getByText('API Caixa Ativa')).toBeInTheDocument();
  });

  it('renders Sincronizar API button', () => {
    render(<FGTSDigitalDashboard />);
    expect(screen.getByText('Sincronizar API')).toBeInTheDocument();
  });

  it('renders Portal button', () => {
    render(<FGTSDigitalDashboard />);
    expect(screen.getByText('Portal')).toBeInTheDocument();
  });

  it('renders Status Guia GFD card', () => {
    render(<FGTSDigitalDashboard />);
    expect(screen.getByText('Status Guia GFD')).toBeInTheDocument();
    expect(screen.getByText('Gerada / Paga')).toBeInTheDocument();
  });

  it('renders Vencimento card', () => {
    render(<FGTSDigitalDashboard />);
    expect(screen.getByText('Vencimento')).toBeInTheDocument();
    expect(screen.getByText('20/05/2026')).toBeInTheDocument();
  });

  it('renders Total Sistema card', () => {
    render(<FGTSDigitalDashboard />);
    expect(screen.getByText('Total Sistema')).toBeInTheDocument();
  });

  it('renders Total eSocial S-5003 card', () => {
    render(<FGTSDigitalDashboard />);
    expect(screen.getByText(/Total eSocial/)).toBeInTheDocument();
  });
});
