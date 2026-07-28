import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CienciaMedidaPage from '@/pages/CienciaMedidaPage';
import { supabase } from '@/integrations/supabase/client';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const TOKEN = 'a'.repeat(64);

const MEDIDA_VALIDA = {
  valid: true,
  medida_id: 'm-1',
  tipo: 'advertencia_escrita',
  motivo: 'Atrasos reiterados',
  descricao: 'Registrados 5 atrasos no mês.',
  data_ocorrencia: '2026-07-10',
  empresa_nome: 'Atomica',
  colaborador_nome: 'Maria Souza',
};

function renderPage(token = TOKEN) {
  return render(
    <MemoryRouter initialEntries={[`/ciencia-medida/${token}`]}>
      <Routes>
        <Route path="/ciencia-medida/:token" element={<CienciaMedidaPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CienciaMedidaPage', () => {
  let rpc: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    rpc = vi.spyOn(supabase, 'rpc') as ReturnType<typeof vi.spyOn>;
    rpc.mockReset();
  });

  it('exibe a medida e registra a ciência com o token da URL', async () => {
    rpc
      .mockResolvedValueOnce({ data: MEDIDA_VALIDA, error: null } as never)
      .mockResolvedValueOnce({
        data: { success: true, acao: 'ciencia', hash: 'deadbeef', registrado_em: '2026-07-28' },
        error: null,
      } as never);

    renderPage();

    expect(await screen.findByText('Atomica')).toBeInTheDocument();
    expect(screen.getByText('Atrasos reiterados')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByLabelText(/Confirmo que sou/i));
    await user.click(screen.getByRole('button', { name: /Registrar resposta/i }));

    await waitFor(() => expect(screen.getByText(/Ciência registrada/i)).toBeInTheDocument());
    expect(screen.getByText('deadbeef')).toBeInTheDocument();

    expect(rpc).toHaveBeenLastCalledWith('medida_registrar_ciencia_publica', {
      p_token: TOKEN,
      p_acao: 'ciencia',
      p_motivo_recusa: null,
      p_user_agent: expect.any(String),
    });
  });

  it('bloqueia o envio da recusa sem justificativa mínima', async () => {
    rpc.mockResolvedValue({ data: MEDIDA_VALIDA, error: null } as never);

    renderPage();
    await screen.findByText('Atomica');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Recuso assinar/i }));
    await user.click(screen.getByLabelText(/Confirmo que sou/i));
    await user.type(screen.getByLabelText(/Motivo da recusa/i), 'curto');

    expect(screen.getByRole('button', { name: /Registrar resposta/i })).toBeDisabled();
  });

  it('não gasta chamada ao servidor quando o token da URL é malformado', async () => {
    renderPage('abc');

    expect(await screen.findByText(/Link de ciência inválido/i)).toBeInTheDocument();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('explica a espera quando o limite de tentativas é atingido', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'rate_limit_exceeded' } } as never);

    renderPage();

    expect(await screen.findByText(/Aguarde um momento/i)).toBeInTheDocument();
    expect(screen.getByText(/10 minutos/i)).toBeInTheDocument();
  });

  it('orienta a pedir novo link quando o token já foi usado', async () => {
    rpc.mockResolvedValue({ data: { valid: false, reason: 'token_invalid_or_expired' }, error: null } as never);

    renderPage();

    expect(await screen.findByText(/já foi utilizado ou expirou/i)).toBeInTheDocument();
  });
});
