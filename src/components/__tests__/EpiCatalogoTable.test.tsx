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

import { EpiCatalogoTable } from '../epis/EpiCatalogoTable';
import type { Tables } from '@/integrations/supabase/types';

const DATA = [
  {
    id: '1',
    nome: 'Capacete de Segurança',
    ca: 'CA-12345',
    fabricante: 'SafeWork',
    categoria: 'cabeca',
    estoque_atual: 15,
    estoque_minimo: 5,
    validade_ca: '2025-12-31',
  },
  {
    id: '2',
    nome: 'Protetor Auricular',
    ca: null,
    fabricante: 'ProTec',
    categoria: 'auditiva',
    estoque_atual: 2,
    estoque_minimo: 10,
    validade_ca: null,
  },
] as unknown as Tables<'epis'>[];

describe('EpiCatalogoTable', () => {
  it('renders table headers', () => {
    render(<EpiCatalogoTable data={DATA} onExcluir={vi.fn()} />);
    expect(screen.getByText('Nome')).toBeInTheDocument();
    expect(screen.getByText('CA / Fabricante')).toBeInTheDocument();
    expect(screen.getByText('Categoria')).toBeInTheDocument();
    expect(screen.getByText('Estoque')).toBeInTheDocument();
  });

  it('renders EPI names', () => {
    render(<EpiCatalogoTable data={DATA} onExcluir={vi.fn()} />);
    expect(screen.getAllByText('Capacete de Segurança').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Protetor Auricular').length).toBeGreaterThanOrEqual(1);
  });

  it('renders CA badge when ca exists', () => {
    render(<EpiCatalogoTable data={DATA} onExcluir={vi.fn()} />);
    expect(screen.getAllByText(/CA-12345/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no data', () => {
    render(<EpiCatalogoTable data={[]} onExcluir={vi.fn()} />);
    expect(screen.getByText('Nenhum EPI cadastrado')).toBeInTheDocument();
  });

  it('calls onExcluir when delete button clicked', async () => {
    const user = userEvent.setup();
    const onExcluir = vi.fn();
    render(<EpiCatalogoTable data={DATA} onExcluir={onExcluir} />);
    const deleteButtons = screen.getAllByRole('button');
    await user.click(deleteButtons[0]);
    expect(onExcluir).toHaveBeenCalledWith('1');
  });
});
