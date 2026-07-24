import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdiantamentosTable } from '../descontos/AdiantamentosTable';

const cn = (...args: any[]) => args.filter(Boolean).join(' ');
const fmt = (v: number) => `R$ ${v.toFixed(2)}`;

const SAMPLE = [
  {
    id: '1',
    colaborador: { nome_completo: 'João Silva' },
    data_solicitacao: '2024-07-01T00:00:00',
    valor_solicitado: 1000,
    competencia_desconto: '2024-07',
    status: 'pendente',
  },
  {
    id: '2',
    colaborador: { nome_completo: 'Maria Santos' },
    data_solicitacao: '2024-06-15T00:00:00',
    valor_solicitado: 500,
    competencia_desconto: '2024-06',
    status: 'aprovado',
  },
];

describe('AdiantamentosTable', () => {
  it('renders table headers', () => {
    render(<AdiantamentosTable adiantamentos={SAMPLE} fmt={fmt} onUpdateStatus={vi.fn()} cn={cn} />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
    expect(screen.getByText('Valor')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders colaborador names', () => {
    render(<AdiantamentosTable adiantamentos={SAMPLE} fmt={fmt} onUpdateStatus={vi.fn()} cn={cn} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
  });

  it('shows approve and reject buttons for pendente', () => {
    render(<AdiantamentosTable adiantamentos={SAMPLE} fmt={fmt} onUpdateStatus={vi.fn()} cn={cn} />);
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rejeitar' })).toBeInTheDocument();
  });

  it('calls onUpdateStatus with aprovado when approve clicked', async () => {
    const user = userEvent.setup();
    const onUpdateStatus = vi.fn();
    render(<AdiantamentosTable adiantamentos={SAMPLE} fmt={fmt} onUpdateStatus={onUpdateStatus} cn={cn} />);
    await user.click(screen.getByRole('button', { name: 'Aprovar' }));
    expect(onUpdateStatus).toHaveBeenCalledWith({ id: '1', status: 'aprovado' });
  });

  it('calls onUpdateStatus with rejeitado when reject clicked', async () => {
    const user = userEvent.setup();
    const onUpdateStatus = vi.fn();
    render(<AdiantamentosTable adiantamentos={SAMPLE} fmt={fmt} onUpdateStatus={onUpdateStatus} cn={cn} />);
    await user.click(screen.getByRole('button', { name: 'Rejeitar' }));
    expect(onUpdateStatus).toHaveBeenCalledWith({ id: '1', status: 'rejeitado' });
  });

  it('shows empty state when no adiantamentos', () => {
    render(<AdiantamentosTable adiantamentos={[]} fmt={fmt} onUpdateStatus={vi.fn()} cn={cn} />);
    expect(screen.getByText('Nenhuma solicitação de adiantamento.')).toBeInTheDocument();
  });

  it('formats values using fmt function', () => {
    render(<AdiantamentosTable adiantamentos={SAMPLE} fmt={fmt} onUpdateStatus={vi.fn()} cn={cn} />);
    expect(screen.getByText('R$ 1000.00')).toBeInTheDocument();
    expect(screen.getByText('R$ 500.00')).toBeInTheDocument();
  });
});
