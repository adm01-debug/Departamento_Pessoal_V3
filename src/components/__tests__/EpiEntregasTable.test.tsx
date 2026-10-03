import type { ReactNode } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('framer-motion', () => ({
  motion: {
    tr: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => <tr {...rest}>{children}</tr>,
    div: ({ children, ...rest }: { children?: ReactNode; [key: string]: unknown }) => <div {...rest}>{children}</div>,
  },
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Tooltip: ({ children }: { children?: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: { children?: ReactNode; asChild?: boolean }) =>
    asChild ? children : <div>{children}</div>,
  TooltipContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

import { EpiEntregasTable } from '../epis/EpiEntregasTable';
import type { Tables } from '@/integrations/supabase/types';

const DATA = [
  {
    id: '1',
    epi: { nome: 'Capacete de Segurança', ca: 'CA-12345', validade_meses: 24 },
    colaborador: { nome_completo: 'Carlos Souza' },
    data_entrega: '2025-07-01',
    data_devolucao: null,
    quantidade: 2,
  },
  {
    id: '2',
    epi: { nome: 'Protetor Auricular', ca: null, validade_meses: null },
    colaborador: { nome_completo: 'Maria Lima' },
    data_entrega: '2024-06-01',
    data_devolucao: '2024-09-01',
    quantidade: 1,
  },
] as unknown as (Tables<'epis_entregas'> & {
  epi?: { ca_validade?: string | null; nome?: string | null; ca?: string | null } | null;
  colaborador?: { nome_completo?: string | null } | null;
})[];

describe('EpiEntregasTable', () => {
  it('renders table headers', () => {
    render(<EpiEntregasTable data={DATA} />);
    expect(screen.getByText('EPI')).toBeInTheDocument();
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders EPI names', () => {
    render(<EpiEntregasTable data={DATA} />);
    expect(screen.getAllByText('Capacete de Segurança').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Protetor Auricular').length).toBeGreaterThanOrEqual(1);
  });

  it('renders colaborador names', () => {
    render(<EpiEntregasTable data={DATA} />);
    expect(screen.getAllByText('Carlos Souza').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Maria Lima').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Devolvido badge for returned EPIs', () => {
    render(<EpiEntregasTable data={DATA} />);
    expect(screen.getAllByText('Devolvido').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Em uso badge for active EPIs', () => {
    render(<EpiEntregasTable data={DATA} />);
    expect(screen.getAllByText('Em uso').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no data', () => {
    render(<EpiEntregasTable data={[]} />);
    expect(screen.getByText('Nenhuma entrega registrada')).toBeInTheDocument();
  });

  it('calls onDevolver when devolução button clicked', async () => {
    const user = userEvent.setup();
    const onDevolver = vi.fn();
    render(<EpiEntregasTable data={DATA} onDevolver={onDevolver} />);
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(onDevolver).toHaveBeenCalledWith('1');
  });
});
