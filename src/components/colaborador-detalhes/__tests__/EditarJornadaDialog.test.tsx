import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EscalaDoDia } from '@/services/turnoService';
import type { Tables } from '@/integrations/supabase/database.types';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/services', () => ({ jornadaService: { atualizarJornada: vi.fn() } }));

vi.mock('@/services/turnoService', () => ({
  turnoService: {
    listarTurnos: vi.fn(),
    obterEscalaDoDia: vi.fn(),
    criarEscala: vi.fn(),
    atualizarEscala: vi.fn(),
    excluirEscala: vi.fn(),
  },
}));

// Dialog e Select em portal/popover do Radix não se dirigem bem no jsdom;
// mesmo tratamento já usado em ContasBancariasTab.test.tsx.
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children?: ReactNode; open?: boolean }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
    disabled,
  }: {
    value?: string;
    onValueChange?: (v: string) => void;
    children?: ReactNode;
    disabled?: boolean;
  }) => (
    <select
      aria-label="Turno da escala"
      disabled={disabled}
      value={value ?? ''}
      onChange={(e) => onValueChange?.(e.target.value)}
    >
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

vi.mock('@/components/ui/date-picker', () => ({
  DatePicker: ({ value, onChange }: { value?: string | null; onChange: (v: string) => void }) => (
    <input aria-label="Dia da escala" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
  ),
}));

import { turnoService } from '@/services/turnoService';
import { wrapper } from '@/test/queryWrapper';
import { EditarJornadaDialog } from '../EditarJornadaDialog';

const TURNOS: Tables<'turnos'>[] = [
  {
    id: 't1',
    nome: 'Manhã',
    horario_inicio: '08:00:00',
    horario_fim: '17:00:00',
    intervalo_minutos: 60,
    cor: null,
    ativo: true,
    empresa_id: 'e1',
    created_at: null,
    updated_at: null,
  },
  {
    id: 't2',
    nome: 'Noite',
    horario_inicio: '22:00:00',
    horario_fim: '06:00:00',
    intervalo_minutos: 60,
    cor: null,
    ativo: true,
    empresa_id: 'e1',
    created_at: null,
    updated_at: null,
  },
];

const ESCALA_EXISTENTE: EscalaDoDia = {
  id: 'esc-1',
  colaborador_id: 'col-1',
  empresa_id: 'e1',
  data: '2026-11-17',
  turno_id: 't1',
  status: 'agendado',
  observacoes: 'Troca com o Paulo',
  created_at: '2026-11-10T12:00:00Z',
  created_by: null,
  updated_at: '2026-11-10T12:00:00Z',
  turno: { id: 't1', nome: 'Manhã', horario_inicio: '08:00:00', horario_fim: '17:00:00', cor: null },
};

function renderizar() {
  return render(
    <EditarJornadaDialog open onOpenChange={vi.fn()} jornada={null} empresaId="e1" colaboradorId="col-1" />,
    { wrapper }
  );
}

describe('EditarJornadaDialog — escala do dia', () => {
  beforeEach(() => {
    vi.mocked(turnoService.listarTurnos).mockReset().mockResolvedValue(TURNOS);
    vi.mocked(turnoService.obterEscalaDoDia).mockReset();
    vi.mocked(turnoService.criarEscala).mockReset();
    vi.mocked(turnoService.atualizarEscala).mockReset();
    vi.mocked(turnoService.excluirEscala).mockReset();
  });

  it('não renderiza a seção de escala sem colaboradorId', () => {
    render(<EditarJornadaDialog open onOpenChange={vi.fn()} jornada={null} empresaId="e1" />, { wrapper });
    expect(screen.queryByText('Escala do dia')).not.toBeInTheDocument();
  });

  it('mostra carregando antes da escala do dia chegar', () => {
    vi.mocked(turnoService.obterEscalaDoDia).mockReturnValue(new Promise(() => {}));
    renderizar();
    expect(screen.getByTestId('escala-dia-carregando')).toBeInTheDocument();
  });

  it('em falha de consulta mostra erro honesto, não "nenhuma escala"', async () => {
    vi.mocked(turnoService.obterEscalaDoDia).mockRejectedValue(new Error('timeout'));
    renderizar();
    expect(await screen.findByText(/Não foi possível carregar a escala deste dia/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nenhuma escala registrada neste dia/i)).not.toBeInTheDocument();
  });

  it('remove a escala do dia quando ja existe uma (criar sem excluir e fluxo pela metade)', async () => {
    vi.mocked(turnoService.obterEscalaDoDia).mockResolvedValue(ESCALA_EXISTENTE);
    vi.mocked(turnoService.excluirEscala).mockResolvedValue(undefined);
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Remover escala do dia' }));

    await waitFor(() => expect(turnoService.excluirEscala).toHaveBeenCalledTimes(1));
    expect(turnoService.excluirEscala).toHaveBeenCalledWith('esc-1', 'e1');
  });

  it('nao oferece remover quando o dia nao tem escala', async () => {
    vi.mocked(turnoService.obterEscalaDoDia).mockResolvedValue(null);
    renderizar();

    expect(await screen.findByText(/Nenhuma escala registrada neste dia/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remover escala do dia' })).not.toBeInTheDocument();
  });

  it('carrega a escala existente do dia e salva com UPDATE', async () => {
    vi.mocked(turnoService.obterEscalaDoDia).mockResolvedValue(ESCALA_EXISTENTE);
    vi.mocked(turnoService.atualizarEscala).mockResolvedValue({
      ...ESCALA_EXISTENTE,
      turno: undefined,
    } as unknown as Tables<'escalas_trabalho'>);
    renderizar();

    expect(await screen.findByText(/Já existe escala neste dia/i)).toBeInTheDocument();
    // Turno e observações vêm da escala carregada, não de texto fixo.
    expect(screen.getByLabelText('Turno da escala')).toHaveValue('t1');
    expect(screen.getByLabelText('Observações')).toHaveValue('Troca com o Paulo');

    await userEvent.click(screen.getByRole('button', { name: 'Salvar escala do dia' }));

    await waitFor(() => expect(turnoService.atualizarEscala).toHaveBeenCalledTimes(1));
    expect(turnoService.atualizarEscala).toHaveBeenCalledWith(
      'esc-1',
      { turno_id: 't1', observacoes: 'Troca com o Paulo' },
      'e1'
    );
    expect(turnoService.criarEscala).not.toHaveBeenCalled();
  });

  it('sem escala no dia mostra estado vazio honesto e salva com INSERT', async () => {
    vi.mocked(turnoService.obterEscalaDoDia).mockResolvedValue(null);
    vi.mocked(turnoService.criarEscala).mockResolvedValue({
      id: 'esc-nova',
    } as unknown as Tables<'escalas_trabalho'>);
    renderizar();

    expect(await screen.findByText(/Nenhuma escala registrada neste dia/i)).toBeInTheDocument();
    // Sem escala não há turno pré-selecionado — nada inventado.
    expect(screen.getByLabelText('Turno da escala')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Salvar escala do dia' })).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText('Turno da escala'), 't2');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar escala do dia' }));

    await waitFor(() => expect(turnoService.criarEscala).toHaveBeenCalledTimes(1));
    expect(turnoService.criarEscala).toHaveBeenCalledWith({
      colaborador_id: 'col-1',
      empresa_id: 'e1',
      data: expect.any(String),
      turno_id: 't2',
      observacoes: null,
    });
    expect(turnoService.atualizarEscala).not.toHaveBeenCalled();
  });

  it('decide UPDATE x INSERT pela releitura no salvar, não pelo estado carregado', async () => {
    // Carrega sem escala, mas no instante do salvar o dia já tem escala
    // (outro usuário/aba gravou): tem de corrigir, não duplicar.
    vi.mocked(turnoService.obterEscalaDoDia).mockResolvedValueOnce(null).mockResolvedValue(ESCALA_EXISTENTE);
    vi.mocked(turnoService.atualizarEscala).mockResolvedValue({
      id: 'esc-1',
    } as unknown as Tables<'escalas_trabalho'>);
    renderizar();

    await screen.findByText(/Nenhuma escala registrada neste dia/i);
    await userEvent.selectOptions(screen.getByLabelText('Turno da escala'), 't2');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar escala do dia' }));

    await waitFor(() => expect(turnoService.atualizarEscala).toHaveBeenCalledTimes(1));
    expect(turnoService.criarEscala).not.toHaveBeenCalled();
  });

  it('erro ao salvar aparece na tela, não só em toast', async () => {
    vi.mocked(turnoService.obterEscalaDoDia).mockResolvedValue(ESCALA_EXISTENTE);
    vi.mocked(turnoService.atualizarEscala).mockRejectedValue(new Error('escala fora do período fechado'));
    renderizar();

    await screen.findByText(/Já existe escala neste dia/i);
    await userEvent.click(screen.getByRole('button', { name: 'Salvar escala do dia' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/escala fora do período fechado/i);
  });

  it('sem turno cadastrado avisa e mantém o salvar bloqueado', async () => {
    vi.mocked(turnoService.listarTurnos).mockResolvedValue([]);
    vi.mocked(turnoService.obterEscalaDoDia).mockResolvedValue(null);
    renderizar();

    expect(await screen.findByText(/Nenhum turno cadastrado nesta empresa/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar escala do dia' })).toBeDisabled();
  });

  it('sem jornada contratual explica o vazio e não oferece salvar jornada', async () => {
    vi.mocked(turnoService.obterEscalaDoDia).mockResolvedValue(null);
    renderizar();

    expect(await screen.findByText(/Nenhuma jornada contratual ativa nesta empresa/i)).toBeInTheDocument();
    // Sem jornada não há form contratual — nada de gravar jornada vazia.
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument();
    expect(screen.queryByText('Carga semanal (horas)')).not.toBeInTheDocument();
    // E a escala do dia segue editável.
    expect(await screen.findByRole('button', { name: 'Salvar escala do dia' })).toBeInTheDocument();
  });

  it('jornada indisponível por falha mostra erro honesto, não "nenhuma jornada"', async () => {
    vi.mocked(turnoService.obterEscalaDoDia).mockResolvedValue(null);
    render(
      <EditarJornadaDialog
        open
        onOpenChange={vi.fn()}
        jornada={null}
        jornadaIndisponivel
        empresaId="e1"
        colaboradorId="col-1"
      />,
      { wrapper }
    );

    expect(await screen.findByText(/Não foi possível carregar a jornada contratual/i)).toBeInTheDocument();
    expect(screen.queryByText(/Nenhuma jornada contratual ativa nesta empresa/i)).not.toBeInTheDocument();
    // A escala do dia segue alcançável mesmo assim.
    expect(await screen.findByRole('button', { name: 'Salvar escala do dia' })).toBeInTheDocument();
  });

  it('com jornada contratual mostra o form e não o aviso de vazio', async () => {
    vi.mocked(turnoService.obterEscalaDoDia).mockResolvedValue(null);
    render(
      <EditarJornadaDialog
        open
        onOpenChange={vi.fn()}
        jornada={{
          id: 'j1',
          horario_entrada: '08:00:00',
          horario_saida: '17:00:00',
          intervalo_minutos: 60,
          carga_horaria_semanal: 44,
        }}
        empresaId="e1"
        colaboradorId="col-1"
      />,
      { wrapper }
    );

    expect(await screen.findByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument();
    expect(screen.queryByText(/Nenhuma jornada contratual ativa nesta empresa/i)).not.toBeInTheDocument();
  });

  it('trocar o dia recarrega a escala daquele dia', async () => {
    vi.mocked(turnoService.obterEscalaDoDia).mockResolvedValue(null);
    renderizar();

    await screen.findByText(/Nenhuma escala registrada neste dia/i);
    await userEvent.clear(screen.getByLabelText('Dia da escala'));
    await userEvent.type(screen.getByLabelText('Dia da escala'), '2026-12-01');

    await waitFor(() => expect(turnoService.obterEscalaDoDia).toHaveBeenCalledWith('col-1', 'e1', '2026-12-01'));
  });
});
