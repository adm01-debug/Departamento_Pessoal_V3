import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/contexts', () => ({
  useEmpresa: vi.fn(() => ({ empresaAtual: { id: 'emp-001' } })),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

import { SSTRiscosTab } from '../sst/SSTRiscosTab';

describe('SSTRiscosTab', () => {
  it('renders Risco Físico category card', () => {
    render(<SSTRiscosTab />);
    expect(screen.getByText('Risco Físico')).toBeInTheDocument();
  });

  it('renders Risco Químico category card', () => {
    render(<SSTRiscosTab />);
    expect(screen.getByText('Risco Químico')).toBeInTheDocument();
  });

  it('renders Risco Biológico category card', () => {
    render(<SSTRiscosTab />);
    expect(screen.getByText('Risco Biológico')).toBeInTheDocument();
  });

  it('renders Risco Ergonômico category card', () => {
    render(<SSTRiscosTab />);
    expect(screen.getByText('Risco Ergonômico')).toBeInTheDocument();
  });

  it('renders Risco Acidente category card', () => {
    render(<SSTRiscosTab />);
    expect(screen.getByText('Risco Acidente')).toBeInTheDocument();
  });

  it('shows 0 agentes identificados for each category with no data', () => {
    render(<SSTRiscosTab />);
    const agentesLabels = screen.getAllByText('0 agentes identificados');
    expect(agentesLabels.length).toBe(5);
  });

  it('shows empty agente message for each unmapped category', () => {
    render(<SSTRiscosTab />);
    const msgs = screen.getAllByText('Nenhum agente mapeado para esta categoria.');
    expect(msgs.length).toBe(5);
  });

  it('shows spinner when loading', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [], isLoading: true } as any);
    const { container } = render(<SSTRiscosTab />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
