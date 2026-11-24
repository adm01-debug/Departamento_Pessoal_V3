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

import { ExameTable } from '../exames/ExameTable';

const FUTURE_DATE = '2099-12-31';
const PAST_DATE = '2020-01-01';

const DATA = [
  {
    id: '1',
    colaborador: { nome_completo: 'Ana Lima' },
    tipo: 'admissional',
    data_exame: '2024-01-10',
    data_validade: FUTURE_DATE,
    resultado: 'apto',
    nome_medico: 'Dr. Silva',
  },
  {
    id: '2',
    colaborador: { nome_completo: 'Bruno Costa' },
    tipo: 'demissional',
    data_exame: '2024-06-01',
    data_validade: PAST_DATE,
    resultado: 'inapto',
    nome_medico: null,
  },
];

describe('ExameTable', () => {
  it('renders table headers', () => {
    render(<ExameTable data={DATA} onExcluir={vi.fn()} />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
    expect(screen.getByText('Tipo')).toBeInTheDocument();
    expect(screen.getByText('Resultado')).toBeInTheDocument();
  });

  it('renders colaborador names', () => {
    render(<ExameTable data={DATA} onExcluir={vi.fn()} />);
    expect(screen.getAllByText('Ana Lima').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Bruno Costa').length).toBeGreaterThanOrEqual(1);
  });

  it('renders tipo badges', () => {
    render(<ExameTable data={DATA} onExcluir={vi.fn()} />);
    expect(screen.getAllByText('Admissional').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Demissional').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Apto badge for apto result', () => {
    render(<ExameTable data={DATA} onExcluir={vi.fn()} />);
    expect(screen.getAllByText('Apto').length).toBeGreaterThanOrEqual(1);
  });

  it('renders Inapto badge for inapto result', () => {
    render(<ExameTable data={DATA} onExcluir={vi.fn()} />);
    expect(screen.getAllByText('Inapto').length).toBeGreaterThanOrEqual(1);
  });

  it('renders dash for null medico', () => {
    render(<ExameTable data={DATA} onExcluir={vi.fn()} />);
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
  });

  it('calls onExcluir when delete button clicked', async () => {
    const user = userEvent.setup();
    const onExcluir = vi.fn();
    render(<ExameTable data={DATA} onExcluir={onExcluir} />);
    const deleteButtons = screen.getAllByRole('button');
    await user.click(deleteButtons[0]);
    expect(onExcluir).toHaveBeenCalledWith('1');
  });
});
