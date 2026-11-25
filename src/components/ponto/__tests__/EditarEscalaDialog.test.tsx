import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/services/turnoService', () => ({
  turnoService: {
    listarTurnos: vi.fn(),
    criarEscala: vi.fn(),
    atualizarEscala: vi.fn(),
  },
}));

// Diálogo em cascata é Radix em portal: no jsdom basta expor os itens quando
// `open`, que é o conteúdo que o formulário precisa.
vi.mock('@/components/ui/animated-cascade-dialog', () => ({
  AnimatedCascadeDialog: ({ open, title, items }: { open?: boolean; title?: string; items?: ReactNode[] }) =>
    open ? (
      <div>
        <h2>{title}</h2>
        {items}
      </div>
    ) : null,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    children?: ReactNode;
  }) => (
    <select aria-label="Novo turno" value={value ?? ''} onChange={(e) => onValueChange?.(e.target.value)}>
      <option value="" />
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children?: ReactNode; value?: string }) => (
    <option value={value}>{children}</option>
  ),
}));

import { turnoService } from '@/services/turnoService';
import { EditarEscalaDialog } from '../EditarEscalaDialog';

const TURNOS = [
  { id: 't1', nome: 'Manhã', horario_inicio: '08:00:00', horario_fim: '17:00:00' },
  { id: 't2', nome: 'Noite', horario_inicio: '22:00:00', horario_fim: '06:00:00' },
];

/** Cliente novo por teste: o cache de `listarTurnos` não pode vazar entre casos. */
function envolver() {
  const cliente = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={cliente}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

function renderizar(props: Partial<Parameters<typeof EditarEscalaDialog>[0]> = {}) {
  return render(
    <EditarEscalaDialog
      open
      onOpenChange={vi.fn()}
      colaboradorId="col-1"
      colaboradorNome="Ana Souza"
      empresaId="e1"
      data="2026-11-25"
      escalaAtual={null}
      {...props}
    />,
    { wrapper: envolver() }
  );
}

describe('EditarEscalaDialog', () => {
  beforeEach(() => {
    vi.mocked(turnoService.listarTurnos)
      .mockReset()
      .mockResolvedValue(TURNOS as never);
    vi.mocked(turnoService.criarEscala)
      .mockReset()
      .mockResolvedValue({} as never);
    vi.mocked(turnoService.atualizarEscala)
      .mockReset()
      .mockResolvedValue({} as never);
  });

  it('leva para Turnos & Escalas quando a empresa não tem turno cadastrado', async () => {
    vi.mocked(turnoService.listarTurnos).mockResolvedValue([] as never);
    renderizar();

    expect(await screen.findByText('Nenhum turno cadastrado.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ir para Turnos & Escalas/i })).toHaveAttribute('href', '/turnos');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('cria a escala do dia quando ainda não existe linha para a data', async () => {
    const onOpenChange = vi.fn();
    renderizar({ onOpenChange });

    await userEvent.selectOptions(await screen.findByLabelText('Novo turno'), 't2');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() =>
      expect(turnoService.criarEscala).toHaveBeenCalledWith({
        empresa_id: 'e1',
        colaborador_id: 'col-1',
        turno_id: 't2',
        data: '2026-11-25',
        status: 'agendado',
      })
    );
    expect(turnoService.atualizarEscala).not.toHaveBeenCalled();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('atualiza a linha existente em vez de duplicar a escala do dia', async () => {
    renderizar({
      escalaAtual: {
        id: 'esc-1',
        turno_id: 't1',
        turno: { nome: 'Manhã', horario_inicio: '08:00:00', horario_fim: '17:00:00' },
      },
    });

    expect(await screen.findByText('Manhã · 08:00–17:00')).toBeInTheDocument();
    await userEvent.selectOptions(await screen.findByLabelText('Novo turno'), 't2');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(turnoService.atualizarEscala).toHaveBeenCalledWith('esc-1', { turno_id: 't2' }, 'e1'));
    expect(turnoService.criarEscala).not.toHaveBeenCalled();
  });
});
