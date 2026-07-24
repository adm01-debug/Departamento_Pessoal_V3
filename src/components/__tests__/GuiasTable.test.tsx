import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuiasTable } from '../obrigacoes/GuiasTable';

const GUIAS = [
  {
    id: 'g1',
    competencia: '2024-06',
    valor: 1500.00,
    data_vencimento: '2099-12-31',
    status: 'gerada',
  },
  {
    id: 'g2',
    competencia: '2024-05',
    valor: 2000.00,
    data_vencimento: '2099-12-31',
    status: 'paga',
  },
];

describe('GuiasTable', () => {
  it('renders table headers', () => {
    render(<GuiasTable guias={GUIAS} tabela="fgts" emptyMessage="Nenhuma guia" onMarcarPaga={vi.fn()} />);
    expect(screen.getByText('Competência')).toBeInTheDocument();
    expect(screen.getByText('Valor')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders competencia values', () => {
    render(<GuiasTable guias={GUIAS} tabela="fgts" emptyMessage="Nenhuma guia" onMarcarPaga={vi.fn()} />);
    expect(screen.getByText('2024-06')).toBeInTheDocument();
    expect(screen.getByText('2024-05')).toBeInTheDocument();
  });

  it('renders Gerada badge', () => {
    render(<GuiasTable guias={GUIAS} tabela="fgts" emptyMessage="Nenhuma guia" onMarcarPaga={vi.fn()} />);
    expect(screen.getByText('Gerada')).toBeInTheDocument();
  });

  it('renders Paga badge', () => {
    render(<GuiasTable guias={GUIAS} tabela="fgts" emptyMessage="Nenhuma guia" onMarcarPaga={vi.fn()} />);
    expect(screen.getAllByText('Paga').length).toBeGreaterThanOrEqual(1);
  });

  it('shows emptyMessage when no guias', () => {
    render(<GuiasTable guias={[]} tabela="fgts" emptyMessage="Nenhuma guia FGTS encontrada" onMarcarPaga={vi.fn()} />);
    expect(screen.getByText('Nenhuma guia FGTS encontrada')).toBeInTheDocument();
  });

  it('calls onMarcarPaga when Paga button clicked', async () => {
    const user = userEvent.setup();
    const onMarcarPaga = vi.fn();
    render(<GuiasTable guias={GUIAS} tabela="fgts" emptyMessage="" onMarcarPaga={onMarcarPaga} />);
    const pagaButtons = screen.getAllByText('Paga');
    await user.click(pagaButtons[0].closest('button')!);
    expect(onMarcarPaga).toHaveBeenCalledWith('g1', 'fgts');
  });
});
