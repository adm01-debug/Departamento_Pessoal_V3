import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

let salarioBase: number | null = 3000;

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: { id: '11111111-1111-4111-8111-111111111111', salario_base: salarioBase },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/useEmpresas', () => ({
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1' } }),
}));

vi.mock('@/services/colaboradorService', () => ({
  colaboradorService: { buscarPorId: vi.fn() },
}));

vi.mock('@/hooks/useColaboradores', () => ({
  useColaboradores: () => ({
    colaboradores: [
      { id: '11111111-1111-4111-8111-111111111111', nome_completo: 'Alice Silva', status: 'ativo' },
      { id: 'col-2', nome_completo: 'Bob Desligado', status: 'desligado' },
    ],
    search: '',
    setSearch: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock('@/hooks/usePeriodosAquisitivos', () => ({
  usePeriodosAquisitivos: (colaboradorId?: string) => ({
    periodos: colaboradorId
      ? [
          {
            id: '22222222-2222-4222-8222-222222222222',
            data_inicio: '2025-01-01',
            data_fim: '2025-12-31',
            status: 'em_andamento',
            dias_direito: 30,
            perdeu_direito: false,
          },
        ]
      : [],
    isLoading: false,
  }),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children?: ReactNode; open?: boolean }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children?: ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
  }) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)} data-testid="select">
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children?: ReactNode }) => <>{children}</>,
  SelectContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <option value="">{placeholder ?? ''}</option>,
  SelectItem: ({ value, children }: { value?: string; children?: ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

import { FeriasForm } from '../ferias/FeriasForm';

function preencher(dataInicio: string, diasGozo = '30', diasAbono = '0') {
  fireEvent.change(screen.getAllByTestId('select')[0], { target: { value: '11111111-1111-4111-8111-111111111111' } });
  fireEvent.change(screen.getByLabelText('Início'), { target: { value: dataInicio } });
  fireEvent.change(screen.getByLabelText('Dias de gozo'), { target: { value: diasGozo } });
  fireEvent.change(screen.getByLabelText('Dias de abono pecuniário'), { target: { value: diasAbono } });
  fireEvent.click(screen.getByText('Solicitar').closest('button')!);
}

describe('FeriasForm', () => {
  beforeEach(() => {
    salarioBase = 3000;
  });

  it('não renderiza quando fechado', () => {
    const { container } = render(<FeriasForm open={false} onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('lista só colaboradores não desligados', () => {
    render(<FeriasForm open onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByText('Alice Silva')).toBeTruthy();
    expect(screen.queryByText('Bob Desligado')).toBeNull();
  });

  it('envia a solicitação com datas e valores calculados e fecha o diálogo', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ id: 'f-1' });
    const onOpenChange = vi.fn();
    render(<FeriasForm open onOpenChange={onOpenChange} onSubmit={onSubmit} />);

    preencher('2026-12-01');

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        colaborador_id: '11111111-1111-4111-8111-111111111111',
        periodo_aquisitivo_id: '22222222-2222-4222-8222-222222222222',
        data_inicio: '2026-12-01',
        data_fim: '2026-12-30',
        dias_gozo: 30,
        dias_abono: 0,
        abono_pecuniario: false,
        salario_base: 3000,
        valor_ferias: 3000,
        valor_terco: 1000,
      })
    );
    await vi.waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('bloqueia início em domingo (Art. 134 §3º CLT)', () => {
    const onSubmit = vi.fn();
    render(<FeriasForm open onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    preencher('2026-12-06');
    expect(screen.getByRole('alert').textContent).toMatch(/domingo/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('bloqueia gozo + abono acima do direito do período', () => {
    const onSubmit = vi.fn();
    render(<FeriasForm open onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    preencher('2026-12-01', '30', '10');
    expect(screen.getByRole('alert').textContent).toMatch(/excedem o direito/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('bloqueia colaborador sem salário base', () => {
    salarioBase = null;
    const onSubmit = vi.fn();
    render(<FeriasForm open onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    preencher('2026-12-01');
    expect(screen.getByRole('alert').textContent).toMatch(/salário base/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('mantém o diálogo aberto quando a criação falha', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('falhou'));
    const onOpenChange = vi.fn();
    render(<FeriasForm open onOpenChange={onOpenChange} onSubmit={onSubmit} />);
    preencher('2026-12-01');
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
