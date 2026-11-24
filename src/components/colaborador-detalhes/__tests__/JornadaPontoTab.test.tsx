import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/services', () => ({
  colaboradorService: { buscarPorId: vi.fn() },
  jornadaService: { obterJornadaColaborador: vi.fn() },
}));

vi.mock('@/hooks', () => ({
  useRegistrosPontoSemana: vi.fn(),
  useSaldoBancoHoras: vi.fn(),
  useFaltasColaborador: vi.fn(),
}));

vi.mock('@/hooks/usePontoMelhorado', () => ({ usePontoMelhorado: vi.fn() }));
vi.mock('@/hooks/useEmpresas', () => ({ useEmpresas: vi.fn() }));

// O diálogo real vive em portal do Radix; aqui só interessa se a ação é
// alcançável e com quais props — o conteúdo tem teste próprio em
// EditarJornadaDialog.test.tsx.
vi.mock('@/components/colaborador-detalhes/EditarJornadaDialog', () => ({
  EditarJornadaDialog: ({
    open,
    jornada,
    jornadaIndisponivel,
    empresaId,
    colaboradorId,
  }: {
    open: boolean;
    jornada: { id: string } | null;
    jornadaIndisponivel?: boolean;
    empresaId: string;
    colaboradorId?: string;
  }) =>
    open ? (
      <div
        data-testid="editar-jornada-dialog"
        data-jornada={jornada?.id ?? 'sem-jornada'}
        data-indisponivel={String(!!jornadaIndisponivel)}
      >
        {`${empresaId}|${colaboradorId ?? ''}`}
      </div>
    ) : null,
}));

import { colaboradorService, jornadaService } from '@/services';
import { useFaltasColaborador, useRegistrosPontoSemana, useSaldoBancoHoras } from '@/hooks';
import { usePontoMelhorado } from '@/hooks/usePontoMelhorado';
import { useEmpresas } from '@/hooks/useEmpresas';
import { wrapper } from '@/test/queryWrapper';
import { JornadaPontoTab } from '../JornadaPontoTab';

const JORNADA = {
  id: 'j1',
  horario_entrada: '08:00:00',
  horario_saida: '17:00:00',
  intervalo_minutos: 60,
  carga_horaria_semanal: 44,
};

// PontoAjustesCard usa <Link>, por isso o router além do QueryClient.
function envoltorio({ children }: { children: ReactNode }) {
  return <MemoryRouter>{wrapper({ children })}</MemoryRouter>;
}

function renderizar() {
  return render(<JornadaPontoTab colaboradorId="col-1" />, { wrapper: envoltorio });
}

describe('JornadaPontoTab — ação de escala', () => {
  beforeEach(() => {
    vi.mocked(useEmpresas)
      .mockReset()
      .mockReturnValue({ empresaAtual: { id: 'e1' } } as never);
    vi.mocked(colaboradorService.buscarPorId)
      .mockReset()
      .mockResolvedValue({ id: 'col-1', jornada_semanal: 44 } as never);
    vi.mocked(jornadaService.obterJornadaColaborador).mockReset().mockResolvedValue(null);
    vi.mocked(useRegistrosPontoSemana)
      .mockReset()
      .mockReturnValue({ data: [], isLoading: false, isError: false } as never);
    vi.mocked(useSaldoBancoHoras)
      .mockReset()
      .mockReturnValue({ data: 0, isLoading: false, isError: false } as never);
    vi.mocked(useFaltasColaborador)
      .mockReset()
      .mockReturnValue({ data: [], isLoading: false, isError: false } as never);
    vi.mocked(usePontoMelhorado)
      .mockReset()
      .mockReturnValue({ solicitacoes: [], isLoading: false } as never);
  });

  it('sem jornada contratual a ação de escala continua alcançável', async () => {
    renderizar();

    const botao = await screen.findByRole('button', { name: 'Editar escala' });
    expect(screen.getByText('Não definida')).toBeInTheDocument();

    await userEvent.click(botao);

    const dialog = await screen.findByTestId('editar-jornada-dialog');
    expect(dialog).toHaveAttribute('data-jornada', 'sem-jornada');
    expect(dialog).toHaveAttribute('data-indisponivel', 'false');
    expect(dialog).toHaveTextContent('e1|col-1');
  });

  it('com jornada contratual a ação segue funcionando e mostra a escala atual', async () => {
    vi.mocked(jornadaService.obterJornadaColaborador).mockResolvedValue(JORNADA as never);
    renderizar();

    expect(await screen.findByText('08:00 — 17:00')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Editar escala' }));

    expect(await screen.findByTestId('editar-jornada-dialog')).toHaveAttribute('data-jornada', 'j1');
  });

  it('falha na consulta da jornada não é lida como "sem jornada"', async () => {
    vi.mocked(jornadaService.obterJornadaColaborador).mockRejectedValue(new Error('timeout'));
    renderizar();

    await userEvent.click(await screen.findByRole('button', { name: 'Editar escala' }));

    const dialog = await screen.findByTestId('editar-jornada-dialog');
    expect(dialog).toHaveAttribute('data-indisponivel', 'true');
  });

  it('sem empresa atual não oferece a ação (não há tenant para gravar)', async () => {
    vi.mocked(useEmpresas).mockReturnValue({ empresaAtual: null } as never);
    renderizar();

    await waitFor(() => expect(screen.getByText('Escala Atual')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Editar escala' })).not.toBeInTheDocument();
  });
});
