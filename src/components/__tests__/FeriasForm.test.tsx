import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const PERIODO_ID = '22222222-2222-4222-8222-222222222222';

interface PeriodoFixture {
  id: string;
  data_inicio: string;
  data_fim: string;
  status: string;
  dias_direito: number;
  perdeu_direito: boolean;
}
interface UsoFixture {
  periodo_aquisitivo_id: string;
  dias_gozo: number;
  dias_abono: number;
  status: string;
}

const periodoAdquirido: PeriodoFixture = {
  id: PERIODO_ID,
  data_inicio: '2025-01-01',
  data_fim: '2025-12-31',
  status: 'adquirido',
  dias_direito: 30,
  perdeu_direito: false,
};

let salarioBase: number | null = 3000;
let periodosFixture: PeriodoFixture[] = [periodoAdquirido];
let usoFixture: UsoFixture[] = [];
/** O que o servidor devolve no refetch feito antes de enviar (null = igual ao cache). */
let usoServidor: UsoFixture[] | null = null;

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryKey }: { queryKey: unknown[] }) =>
    queryKey[0] === 'ferias-uso-colaborador'
      ? {
          data: usoFixture,
          isLoading: false,
          isFetching: false,
          isError: false,
          refetch: () => Promise.resolve({ data: usoServidor ?? usoFixture, isError: false }),
        }
      : {
          data: { id: '11111111-1111-4111-8111-111111111111', salario_base: salarioBase },
          isLoading: false,
          isError: false,
        },
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

vi.mock('@/services/feriasService', () => ({
  feriasService: { listarUsoPorColaborador: vi.fn() },
}));

vi.mock('@/hooks/usePeriodosAquisitivos', () => ({
  usePeriodosAquisitivos: (colaboradorId?: string) => ({
    periodos: colaboradorId ? periodosFixture : [],
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
    periodosFixture = [periodoAdquirido];
    usoFixture = [];
    usoServidor = null;
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-12T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
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
        periodo_aquisitivo_id: PERIODO_ID,
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

  it('bloqueia gozo + abono acima do direito do período', async () => {
    const onSubmit = vi.fn();
    render(<FeriasForm open onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    preencher('2026-12-01', '30', '10');
    expect((await screen.findByRole('alert')).textContent).toMatch(/excedem o direito/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('desconta do saldo os dias já lançados no período (15 dias já solicitados)', async () => {
    usoFixture = [{ periodo_aquisitivo_id: PERIODO_ID, dias_gozo: 15, dias_abono: 0, status: 'aprovada' }];
    const onSubmit = vi.fn().mockResolvedValue({ id: 'f-2' });
    render(<FeriasForm open onOpenChange={vi.fn()} onSubmit={onSubmit} />);

    preencher('2026-12-01', '30');
    expect(screen.getByText(/saldo 15 de 30 dias, adquirido/)).toBeTruthy();
    expect((await screen.findByRole('alert')).textContent).toMatch(
      /excedem o direito disponível no período \(saldo 15 de 30 dias\)/
    );
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Dias de gozo'), { target: { value: '15' } });
    fireEvent.click(screen.getByText('Solicitar').closest('button')!);
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ periodo_aquisitivo_id: PERIODO_ID, dias_gozo: 15 })
    );
  });

  it('ignora férias rejeitadas no saldo', async () => {
    usoFixture = [{ periodo_aquisitivo_id: PERIODO_ID, dias_gozo: 30, dias_abono: 0, status: 'rejeitada' }];
    const onSubmit = vi.fn().mockResolvedValue({ id: 'f-3' });
    render(<FeriasForm open onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    preencher('2026-12-01', '14');
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('bloqueia quarto período de férias no mesmo aquisitivo (máx. 3)', async () => {
    usoFixture = [
      { periodo_aquisitivo_id: PERIODO_ID, dias_gozo: 14, dias_abono: 0, status: 'aprovada' },
      { periodo_aquisitivo_id: PERIODO_ID, dias_gozo: 5, dias_abono: 0, status: 'aprovada' },
      { periodo_aquisitivo_id: PERIODO_ID, dias_gozo: 5, dias_abono: 0, status: 'aprovada' },
    ];
    const onSubmit = vi.fn();
    render(<FeriasForm open onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    preencher('2026-12-01', '5');
    expect((await screen.findByRole('alert')).textContent).toMatch(/3 períodos/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('bloqueia fracionamento sem nenhum período de 14 dias', async () => {
    usoFixture = [{ periodo_aquisitivo_id: PERIODO_ID, dias_gozo: 10, dias_abono: 0, status: 'aprovada' }];
    const onSubmit = vi.fn();
    render(<FeriasForm open onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    preencher('2026-12-01', '10');
    expect((await screen.findByRole('alert')).textContent).toMatch(/14 dias/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('usa como padrão o período adquirido/vencido mais antigo e omite em aquisição e pago', async () => {
    const base = { dias_direito: 30, perdeu_direito: false };
    periodosFixture = [
      {
        ...base,
        id: '33333333-3333-4333-8333-333333333331',
        data_inicio: '2026-01-01',
        data_fim: '2026-12-31',
        status: 'em_aquisicao',
      },
      {
        ...base,
        id: '33333333-3333-4333-8333-333333333332',
        data_inicio: '2025-01-01',
        data_fim: '2025-12-31',
        status: 'adquirido',
      },
      {
        ...base,
        id: '33333333-3333-4333-8333-333333333333',
        data_inicio: '2024-01-01',
        data_fim: '2024-12-31',
        status: 'vencido',
      },
      {
        ...base,
        id: '33333333-3333-4333-8333-333333333334',
        data_inicio: '2023-01-01',
        data_fim: '2023-12-31',
        status: 'pago',
      },
    ];
    const onSubmit = vi.fn().mockResolvedValue({ id: 'f-4' });
    render(<FeriasForm open onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    preencher('2026-12-01');
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ periodo_aquisitivo_id: '33333333-3333-4333-8333-333333333333' })
    );
    expect(screen.queryByText(/em_aquisicao/)).toBeNull();
    expect(screen.queryByText(/, pago\)/)).toBeNull();
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

  it('recalcula o saldo com dados do servidor antes de enviar (cache desatualizado)', async () => {
    usoFixture = [];
    usoServidor = [{ periodo_aquisitivo_id: PERIODO_ID, dias_gozo: 20, dias_abono: 0, status: 'pendente' }];
    const onSubmit = vi.fn();
    render(<FeriasForm open onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    preencher('2027-01-04', '20');
    expect((await screen.findByRole('alert')).textContent).toMatch(/saldo 10 de 30 dias/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('bloqueia abono acima de 1/3 do direito somando o já convertido (Art. 143 CLT)', async () => {
    usoFixture = [{ periodo_aquisitivo_id: PERIODO_ID, dias_gozo: 14, dias_abono: 8, status: 'aprovada' }];
    const onSubmit = vi.fn();
    render(<FeriasForm open onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    preencher('2027-01-04', '5', '3');
    expect((await screen.findByRole('alert')).textContent).toMatch(/1\/3 do direito/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('bloqueia fracionamento que deixa o restante sem como cumprir 14 dias', async () => {
    const onSubmit = vi.fn();
    render(<FeriasForm open onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    preencher('2027-01-04', '10', '10');
    expect((await screen.findByRole('alert')).textContent).toMatch(/deixa 10 dias/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('bloqueia início no passado', () => {
    const onSubmit = vi.fn();
    render(<FeriasForm open onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    preencher('2026-11-03');
    expect(screen.getByRole('alert').textContent).toMatch(/passado/);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('avisa (sem bloquear) início a menos de 30 dias — Art. 135 CLT', async () => {
    const onSubmit = vi.fn().mockResolvedValue({ id: 'f-5' });
    render(<FeriasForm open onOpenChange={vi.fn()} onSubmit={onSubmit} />);
    preencher('2026-12-01');
    expect(screen.getByRole('status').textContent).toMatch(/19 dia\(s\).*Art\. 135/);
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it('não exibe aviso de antecedência com 30 dias ou mais', () => {
    render(<FeriasForm open onOpenChange={vi.fn()} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2026-12-14' } });
    expect(screen.queryByRole('status')).toBeNull();
  });
});
