import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('framer-motion', () => ({
  motion: {
    tr: ({ children, ...rest }: any) => <tr {...rest}>{children}</tr>,
    div: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
  },
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: any) => <>{children}</>,
  Tooltip: ({ children }: any) => <>{children}</>,
  TooltipTrigger: ({ children, asChild }: any) => asChild ? children : <div>{children}</div>,
  TooltipContent: ({ children }: any) => <div>{children}</div>,
}));

import { EpiCatalogoTable } from '../epis/EpiCatalogoTable';

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
];

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
