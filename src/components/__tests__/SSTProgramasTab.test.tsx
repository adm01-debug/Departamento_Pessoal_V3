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
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock('@/utils/safeUrl', () => ({
  safeHref: vi.fn((url: string) => url),
}));

import { SSTProgramasTab } from '../sst/SSTProgramasTab';

const MOCK_PROGRAMAS = [
  {
    id: 'prog-001',
    tipo: 'PGR',
    titulo: 'Programa de Gerenciamento de Riscos',
    data_validade: '2027-12-31',
    status: 'vigente',
    responsavel: 'Dr. Silva',
    documento_url: null,
  },
  {
    id: 'prog-002',
    tipo: 'PCMSO',
    titulo: 'Programa de Controle Médico',
    data_validade: '2027-06-30',
    status: 'vigente',
    responsavel: 'Dra. Santos',
    documento_url: null,
  },
];

describe('SSTProgramasTab', () => {
  it('shows empty state when no programas', () => {
    render(<SSTProgramasTab />);
    expect(screen.getByText('Nenhum programa ou laudo cadastrado.')).toBeInTheDocument();
  });

  it('renders PGR sigla when programs provided', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_PROGRAMAS, isLoading: false } as any);
    render(<SSTProgramasTab />);
    expect(screen.getByText('PGR')).toBeInTheDocument();
  });

  it('renders NR badge for PGR', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_PROGRAMAS, isLoading: false } as any);
    render(<SSTProgramasTab />);
    expect(screen.getByText('NR-1/9')).toBeInTheDocument();
  });

  it('renders PCMSO sigla when programs provided', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_PROGRAMAS, isLoading: false } as any);
    render(<SSTProgramasTab />);
    expect(screen.getByText('PCMSO')).toBeInTheDocument();
  });

  it('renders program titulo', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_PROGRAMAS, isLoading: false } as any);
    render(<SSTProgramasTab />);
    expect(screen.getByText('Programa de Gerenciamento de Riscos')).toBeInTheDocument();
  });

  it('shows spinner when loading', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: [], isLoading: true } as any);
    const { container } = render(<SSTProgramasTab />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders correctly with empty empresaAtual (no empresa)', async () => {
    const { useEmpresa } = await import('@/contexts');
    vi.mocked(useEmpresa).mockReturnValueOnce({ empresaAtual: null } as any);
    render(<SSTProgramasTab />);
    expect(screen.getByText('Nenhum programa ou laudo cadastrado.')).toBeInTheDocument();
  });

  it('renders NR-7 badge for PCMSO', async () => {
    const { useQuery } = await import('@tanstack/react-query');
    vi.mocked(useQuery).mockReturnValueOnce({ data: MOCK_PROGRAMAS, isLoading: false } as any);
    render(<SSTProgramasTab />);
    expect(screen.getByText('NR-7')).toBeInTheDocument();
  });
});
