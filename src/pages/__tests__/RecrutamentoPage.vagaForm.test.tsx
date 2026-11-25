import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RecrutamentoPage from '@/pages/RecrutamentoPage';

const { criarVaga } = vi.hoisted(() => ({ criarVaga: vi.fn() }));

// Radix (Select/Dialog) depende de APIs de ponteiro que o jsdom não implementa.
beforeAll(() => {
  Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    setPointerCapture: () => undefined,
    releasePointerCapture: () => undefined,
    scrollIntoView: () => undefined,
  });
});

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() } }));

vi.mock('@/hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useEmpresas: () => ({ empresaAtual: { id: 'emp-1', nome: 'Empresa 1' } }),
}));

vi.mock('@/services/recrutamentoService', () => ({
  recrutamentoService: {
    listarVagas: vi.fn().mockResolvedValue([]),
    listarCandidaturas: vi.fn().mockResolvedValue([]),
    listarCandidatos: vi.fn().mockResolvedValue([]),
    criarVaga,
    atualizarVaga: vi.fn().mockResolvedValue({}),
    excluirVaga: vi.fn().mockResolvedValue(undefined),
    criarCandidatura: vi.fn(),
    atualizarCandidatura: vi.fn(),
  },
}));

function renderizar() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <RecrutamentoPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

async function abrirFormulario() {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /Nova Vaga/i }));
  const dialog = await screen.findByRole('dialog');
  return { user, dialog };
}

/**
 * Preenche um campo de texto em UM evento. O `user.type` digita tecla por tecla
 * e, com a suíte inteira rodando em paralelo, o jsdom reagia entre as teclas e
 * embaralhava o valor — o teste falhava só no run completo.
 */
function preencher(elemento: HTMLElement, texto: string) {
  fireEvent.change(elemento, { target: { value: texto } });
}

describe('RecrutamentoPage — formulário de vaga completo', () => {
  beforeEach(() => {
    criarVaga.mockReset();
    criarVaga.mockResolvedValue({ id: 'vaga-nova' });
  });

  it('envia cargo, tipo de contrato, faixa, descrição e benefícios ao criar a vaga', async () => {
    renderizar();
    const { user, dialog } = await abrirFormulario();

    preencher(within(dialog).getByPlaceholderText('Ex: Desenvolvedor Senior'), 'Pessoa Desenvolvedora Sênior');
    preencher(within(dialog).getByPlaceholderText('Ex: Desenvolvedor Full Stack'), 'Desenvolvedor Full Stack');
    preencher(within(dialog).getByPlaceholderText('Ex: Tecnologia'), 'Tecnologia');
    preencher(within(dialog).getByPlaceholderText('Remoto, Híbrido, Presencial'), 'Remoto');

    await user.click(within(dialog).getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'CLT' }));

    preencher(within(dialog).getByPlaceholderText('4500'), '4500');
    preencher(within(dialog).getByPlaceholderText('6000'), '6000');
    preencher(within(dialog).getByPlaceholderText(/Contexto da área/i), 'Time de produto, escopo de ponta a ponta.');
    preencher(within(dialog).getByPlaceholderText(/Plano de saúde/i), 'Plano de saúde, vale-refeição.');
    preencher(within(dialog).getByPlaceholderText(/React, TypeScript/i), 'React, TypeScript');

    await user.click(within(dialog).getByRole('button', { name: 'Publicar Vaga' }));

    await waitFor(() => expect(criarVaga).toHaveBeenCalledTimes(1));
    expect(criarVaga).toHaveBeenCalledWith({
      empresa_id: 'emp-1',
      titulo: 'Pessoa Desenvolvedora Sênior',
      cargo: 'Desenvolvedor Full Stack',
      departamento: 'Tecnologia',
      modalidade: 'Remoto',
      tipo_contrato: 'clt',
      quantidade: 1,
      faixa_salarial_min: 4500,
      faixa_salarial_max: 6000,
      descricao: 'Time de produto, escopo de ponta a ponta.',
      beneficios_oferecidos: 'Plano de saúde, vale-refeição.',
      requisitos: 'React, TypeScript',
    });
  });

  it('bloqueia a publicação quando a faixa máxima é menor que a mínima', async () => {
    renderizar();
    const { dialog } = await abrirFormulario();

    preencher(within(dialog).getByPlaceholderText('Ex: Desenvolvedor Senior'), 'Vaga invertida');
    preencher(within(dialog).getByPlaceholderText('4500'), '6000');
    preencher(within(dialog).getByPlaceholderText('6000'), '4500');

    expect(await within(dialog).findByText(/faixa máxima deve ser maior ou igual/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Publicar Vaga' })).toBeDisabled();
    expect(criarVaga).not.toHaveBeenCalled();
  });
});
