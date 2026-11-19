import type { ReactNode } from 'react';
import { readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: { children?: ReactNode; onClick?: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: { children?: ReactNode }) => <label>{children}</label>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.ComponentProps<'input'>) => <input {...props} />,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: { children?: ReactNode; onValueChange?: (v: string) => void }) => (
    <div>
      <button onClick={() => onValueChange?.('c1')}>pick-c1</button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <div data-value={value}>{children}</div>
  ),
  SelectTrigger: ({ children }: { children?: ReactNode }) => <button>{children}</button>,
  SelectValue: ({ placeholder }: { children?: ReactNode; placeholder?: string }) => <span>{placeholder}</span>,
}));

const useQueryMock = vi.fn((): { data: { salario_base: number } | null; isSuccess: boolean; isError?: boolean } => ({
  data: { salario_base: 5000 },
  isSuccess: true,
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => useQueryMock(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

vi.mock('@/utils/dateLocal', () => ({
  todayLocalISO: vi.fn(() => '2026-07-24'),
}));

import { MARGEM_CONSIGNAVEL_BANCO, MARGEM_CONSIGNAVEL_TELA, NewLoanDialog } from '../descontos/NewLoanDialog';

const COLABORADORES = [
  { id: 'c1', nome_completo: 'Ana Lima' },
  { id: 'c2', nome_completo: 'Bruno Costa' },
];

describe('NewLoanDialog', () => {
  it('renders Novo Empréstimo trigger button', () => {
    render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Novo Empréstimo')).toBeInTheDocument();
  });

  it('renders Registrar Empréstimo Consignado title', () => {
    render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Registrar Empréstimo Consignado')).toBeInTheDocument();
  });

  it('renders Compliance L10.820 badge', () => {
    render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Compliance L10.820')).toBeInTheDocument();
  });

  it('renders Colaborador label', () => {
    render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Colaborador')).toBeInTheDocument();
  });

  it('renders Instituição Financeira label', () => {
    render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Instituição Financeira')).toBeInTheDocument();
  });

  it('renders Valor Total label', () => {
    render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Valor Total (R$)')).toBeInTheDocument();
  });

  it('renders Número de Parcelas label', () => {
    render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Número de Parcelas')).toBeInTheDocument();
  });

  it('bloqueia o envio com parcelas < 1 ou valor ≤ 0 (CHECK do banco)', () => {
    const onSave = vi.fn();
    const { container } = render(<NewLoanDialog colaboradores={COLABORADORES} onSave={onSave} />);
    const [valorTotal, parcelas] = Array.from(container.querySelectorAll('input[type="number"]'));
    const confirmar = screen.getByText('Confirmar Registro');
    fireEvent.click(screen.getByText('pick-c1'));

    fireEvent.change(valorTotal, { target: { value: '1000' } });
    fireEvent.change(parcelas, { target: { value: '0' } });
    expect(confirmar).toBeDisabled();

    fireEvent.change(parcelas, { target: { value: '2.5' } });
    expect(confirmar).toBeDisabled();

    fireEvent.change(valorTotal, { target: { value: '0' } });
    fireEvent.change(parcelas, { target: { value: '10' } });
    expect(confirmar).toBeDisabled();

    // parcela < R$0,01 → numeric(12,2) arredonda para 0 e a CHECK rejeita
    fireEvent.change(valorTotal, { target: { value: '0.01' } });
    fireEvent.change(parcelas, { target: { value: '3' } });
    expect(confirmar).toBeDisabled();

    fireEvent.change(valorTotal, { target: { value: '1000' } });
    fireEvent.change(parcelas, { target: { value: '10' } });
    expect(confirmar).not.toBeDisabled();
    fireEvent.click(confirmar);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ colaborador_id: 'c1', valor_total: 1000, numero_parcelas: 10, valor_parcela: 100 })
    );
  });

  it('bloqueia quando o colaborador não tem salário base (margem incalculável)', () => {
    useQueryMock.mockReturnValueOnce({ data: null, isSuccess: true }).mockReturnValue({ data: null, isSuccess: true });
    const { container } = render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    const [valorTotal, parcelas] = Array.from(container.querySelectorAll('input[type="number"]'));
    fireEvent.click(screen.getByText('pick-c1'));
    fireEvent.change(valorTotal, { target: { value: '1000' } });
    fireEvent.change(parcelas, { target: { value: '10' } });
    expect(screen.getByText('Confirmar Registro')).toBeDisabled();
    expect(screen.getByText(/sem salário base cadastrado/)).toBeInTheDocument();
    useQueryMock.mockReturnValue({ data: { salario_base: 5000 }, isSuccess: true });
  });

  it('explica o bloqueio quando a consulta do salário falha', () => {
    useQueryMock.mockReturnValue({ data: null, isSuccess: false, isError: true });
    const { container } = render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    const [valorTotal, parcelas] = Array.from(container.querySelectorAll('input[type="number"]'));
    fireEvent.click(screen.getByText('pick-c1'));
    fireEvent.change(valorTotal, { target: { value: '1000' } });
    fireEvent.change(parcelas, { target: { value: '10' } });
    expect(screen.getByText('Confirmar Registro')).toBeDisabled();
    expect(screen.getByText(/Não foi possível carregar o salário do colaborador/)).toBeInTheDocument();
    useQueryMock.mockReturnValue({ data: { salario_base: 5000 }, isSuccess: true });
  });

  it('soma as parcelas de empréstimos ativos do colaborador na margem de 30%', () => {
    const onSave = vi.fn();
    const emprestimos = [
      { colaborador_id: 'c1', valor_parcela: 1000, status: 'ativo' },
      { colaborador_id: 'c1', valor_parcela: 900, status: 'quitado' },
      { colaborador_id: 'c2', valor_parcela: 1400, status: 'ativo' },
    ];
    const { container } = render(
      <NewLoanDialog colaboradores={COLABORADORES} emprestimos={emprestimos} onSave={onSave} />
    );
    const [valorTotal, parcelas] = Array.from(container.querySelectorAll('input[type="number"]'));
    const confirmar = screen.getByText('Confirmar Registro');
    fireEvent.click(screen.getByText('pick-c1'));

    // margem = 1500; ativo de c1 = 1000; nova parcela 600 → 1600 > 1500
    fireEvent.change(valorTotal, { target: { value: '6000' } });
    fireEvent.change(parcelas, { target: { value: '10' } });
    expect(confirmar).toBeDisabled();

    // nova parcela 500 → 1500 ≤ 1500
    fireEvent.change(valorTotal, { target: { value: '5000' } });
    expect(confirmar).not.toBeDisabled();
  });

  it('o teto da tela nunca libera o que o backstop do banco recusa', () => {
    expect(MARGEM_CONSIGNAVEL_TELA).toBeLessThanOrEqual(MARGEM_CONSIGNAVEL_BANCO);
  });

  it('o espelho do teto do banco acompanha a migration do trigger', () => {
    const sql = readFileSync('supabase/migrations/20261118235000_consignado_margem_consignavel_trigger.sql', 'utf8');
    expect(sql).toContain(`v_salario * ${MARGEM_CONSIGNAVEL_BANCO}`);
  });

  it('renders Cancelar and Confirmar Registro buttons', () => {
    render(<NewLoanDialog colaboradores={COLABORADORES} onSave={vi.fn()} />);
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
    expect(screen.getByText('Confirmar Registro')).toBeInTheDocument();
  });
});
