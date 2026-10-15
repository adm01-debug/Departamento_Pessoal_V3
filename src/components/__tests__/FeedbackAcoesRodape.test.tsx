/**
 * CONTROLES FUNCIONAIS DO MODAL (rodapé) — testes de integração local.
 *
 * O serviço é mockado (nenhuma rede): o que se verifica aqui é a INTERFACE —
 * quais controles aparecem por status/papel, obrigatoriedade da justificativa,
 * bloqueio durante a operação, erro real, idempotência do reenvio, invalidação
 * de cache depois do sucesso e PRESERVAÇÃO DO MODO DEMONSTRAÇÃO.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { modo, auth, toasts, servico } = vi.hoisted(() => ({
  modo: { real: true },
  auth: { roles: ['admin'] as string[], isAdmin: false },
  toasts: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  servico: {
    finalizarFeedback: vi.fn(),
    validarPotencialAvaliacao: vi.fn(),
    listarValidacoesPotencial: vi.fn(),
    listarVersoesAvaliacao: vi.fn(),
  },
}));

vi.mock('sonner', () => ({ toast: toasts }));

vi.mock('@/components/avaliacao/nineBoxModo', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/components/avaliacao/nineBoxModo')>();
  return { ...real, modoRealAtivo: () => modo.real };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { roles: auth.roles }, isAdmin: auth.isAdmin }),
}));

vi.mock('@/services/avaliacaoService', () => ({ avaliacaoService: servico }));

import { FeedbackAcoesRodape, type PreviewAcoes } from '../avaliacao/FeedbackAcoesRodape';
import { FeedbackDetalheDialog } from '../avaliacao/FeedbackDetalheDialog';
import NineBoxPreviewPage from '@/pages/NineBoxPreviewPage';
import type { FeedbackDerivado } from '../avaliacao/feedbacksComum';

/** Item derivado com TODOS os campos que o rodapé consome. */
function montarItem(over: Record<string, unknown> = {}): FeedbackDerivado {
  return {
    feedback: {
      id: 'f1',
      empresa_id: 'emp-1',
      ciclo_id: 'ciclo-1',
      status: 'pendente',
      tipo: 'gestor',
      potencial: 4,
      nota_geral: 4.5,
      avaliado_id: 'colab-1',
      avaliador_id: 'colab-2',
      pontos_fortes: 'Entrega consistente e comunicação clara',
      pontos_melhoria: 'Delegação',
      comentarios: 'Ciclo fechado no prazo',
      ...over,
    },
    avaliado: 'Ana Silva',
    avaliador: 'Bruno Souza',
    tipoRotulo: 'Avaliação do gestor',
    data: '10/09/2026',
    prazo: '30/09/2026',
    nota: 4.5,
    notaFormatada: '4,5',
    cargo: 'Analista',
    departamento: 'RH',
    faixa: { nota: 4.5, rotulo: 'Excelente', tinta: 'text-success', badge: '', barra: '' },
  } as unknown as FeedbackDerivado;
}

function renderizar(item = montarItem(), client?: QueryClient, previa?: PreviewAcoes) {
  const qc =
    client ??
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { qc, ...render(<FeedbackAcoesRodape item={item} previa={previa} />, { wrapper }) };
}

function botao(nome: RegExp | string) {
  return screen.getByRole('button', { name: nome });
}

beforeEach(() => {
  vi.clearAllMocks();
  modo.real = true;
  auth.roles = ['admin'];
  auth.isAdmin = false;
  servico.listarValidacoesPotencial.mockResolvedValue([]);
  servico.listarVersoesAvaliacao.mockResolvedValue([{ feedback_id: 'f1', versao_avaliacao: 'h1' }]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('modo demonstração — experiência atual preservada', () => {
  it('não renderiza NENHUM controle e não chama o serviço', () => {
    modo.real = false;
    const { container } = renderizar();
    expect(container).toBeEmptyDOMElement();
    expect(servico.finalizarFeedback).not.toHaveBeenCalled();
    expect(servico.validarPotencialAvaliacao).not.toHaveBeenCalled();
    expect(servico.listarValidacoesPotencial).not.toHaveBeenCalled();
  });
});

describe('ações disponíveis por STATUS', () => {
  it('pendente: concluir habilitado; reabrir bloqueado com motivo', () => {
    renderizar();
    expect(botao(/Concluir avaliação/)).toBeEnabled();
    expect(botao(/Cancelar avaliação/)).toBeEnabled();
    expect(botao(/Reabrir avaliação/)).toBeDisabled();
    expect(botao(/Reabrir avaliação/)).toHaveAttribute('title', expect.stringContaining('Não existe transição'));
  });

  it('concluído: concluir bloqueado; cancelar exige reabrir antes; reabrir liberado', () => {
    renderizar(montarItem({ status: 'concluido' }));
    expect(botao(/Concluir avaliação/)).toBeDisabled();
    expect(botao(/Cancelar avaliação/)).toBeDisabled();
    expect(botao(/Cancelar avaliação/)).toHaveAttribute('title', expect.stringContaining('reabrir'));
    expect(botao(/Reabrir avaliação/)).toBeEnabled();
  });
});

describe('ações disponíveis por PAPEL', () => {
  it('avaliador (user) conclui, mas NÃO cancela', () => {
    auth.roles = ['user'];
    renderizar();
    expect(botao(/Concluir avaliação/)).toBeEnabled();
    expect(botao(/Cancelar avaliação/)).toBeDisabled();
    expect(botao(/Cancelar avaliação/)).toHaveAttribute('title', expect.stringContaining('perfil'));
  });

  it('admin e rh gerenciam (concluir/cancelar/reabrir)', () => {
    auth.roles = ['rh'];
    renderizar(montarItem({ status: 'concluido' }));
    expect(botao(/Reabrir avaliação/)).toBeEnabled();
  });

  it('sem papel reconhecido, nenhum controle é liberado', () => {
    auth.roles = [];
    renderizar();
    expect(botao(/Concluir avaliação/)).toBeDisabled();
    expect(botao(/Cancelar avaliação/)).toBeDisabled();
    expect(botao(/Reabrir avaliação/)).toBeDisabled();
  });
});

describe('cancelamento com justificativa', () => {
  it('abre o diálogo, exige o motivo e envia ação + motivo', async () => {
    const usuario = userEvent.setup();
    servico.finalizarFeedback.mockResolvedValue({ ok: true, status_novo: 'cancelado', idempotente: false });
    renderizar();

    await usuario.click(botao(/Cancelar avaliação/));

    const campo = await screen.findByLabelText(/Motivo do cancelamento/i);
    const confirmar = botao(/Confirmar cancelamento/);
    expect(confirmar).toBeDisabled(); // sem justificativa

    await usuario.type(campo, 'ab');
    expect(confirmar).toBeDisabled(); // abaixo do mínimo (3)

    await usuario.type(campo, 'duplicidade');
    expect(confirmar).toBeEnabled();
    await usuario.click(confirmar);

    await waitFor(() => expect(servico.finalizarFeedback).toHaveBeenCalledTimes(1));
    expect(servico.finalizarFeedback).toHaveBeenCalledWith({
      feedbackId: 'f1',
      acao: 'cancelar',
      motivo: 'abduplicidade',
      idOperacao: expect.any(String),
    });
    expect(toasts.success).toHaveBeenCalledWith(expect.stringContaining('cancelada'));
  });

  it('fechar o diálogo limpa o motivo (nada é enviado)', async () => {
    const usuario = userEvent.setup();
    renderizar();
    await usuario.click(botao(/Cancelar avaliação/));
    await usuario.type(await screen.findByLabelText(/Motivo do cancelamento/i), 'abc');
    await usuario.click(botao('Cancelar'));
    await waitFor(() => expect(screen.queryByLabelText(/Motivo do cancelamento/i)).toBeNull());
    expect(servico.finalizarFeedback).not.toHaveBeenCalled();
  });

  it('NÃO executa exclusão física: nenhuma chamada de delete é usada', async () => {
    const usuario = userEvent.setup();
    servico.finalizarFeedback.mockResolvedValue({ ok: true, status_novo: 'cancelado', idempotente: false });
    renderizar();
    await usuario.click(botao(/Cancelar avaliação/));
    await usuario.type(await screen.findByLabelText(/Motivo do cancelamento/i), 'registro em duplicidade');
    await usuario.click(botao(/Confirmar cancelamento/));

    await waitFor(() => expect(servico.finalizarFeedback).toHaveBeenCalled());
    const servicoExposto = servico as unknown as Record<string, unknown>;
    expect(servicoExposto['excluirFeedback']).toBeUndefined();
  });
});

describe('reabertura com justificativa', () => {
  it('exige a justificativa e envia a ação de reabertura', async () => {
    const usuario = userEvent.setup();
    servico.finalizarFeedback.mockResolvedValue({ ok: true, status_novo: 'pendente', idempotente: false });
    renderizar(montarItem({ status: 'concluido' }));

    await usuario.click(botao(/Reabrir avaliação/));
    const campo = await screen.findByLabelText(/Justificativa da reabertura/i);
    const confirmar = botao(/Confirmar reabertura/);
    expect(confirmar).toBeDisabled();

    await usuario.type(campo, 'nota incorreta'); // >= 10
    expect(confirmar).toBeEnabled();
    await usuario.click(confirmar);

    await waitFor(() =>
      expect(servico.finalizarFeedback).toHaveBeenCalledWith({
        feedbackId: 'f1',
        acao: 'reabrir',
        motivo: 'nota incorreta',
        idOperacao: expect.any(String),
      })
    );
    expect(toasts.success).toHaveBeenCalledWith(expect.stringContaining('reaberta'));
  });
});

describe('validação de Potencial — exclusiva do RH', () => {
  it('gestor e admin NÃO veem o controle, mesmo com tudo elegível', async () => {
    renderizar(montarItem({ status: 'concluido' }), undefined);
    expect(screen.queryByRole('button', { name: /Validar Potencial/ })).toBeNull();

    auth.roles = ['admin'];
    renderizar(montarItem({ status: 'concluido' }));
    expect(screen.queryByRole('button', { name: /Validar Potencial/ })).toBeNull();
  });

  it('RH vê o controle em avaliação do gestor, concluída, com Potencial válido', async () => {
    auth.roles = ['rh'];
    servico.validarPotencialAvaliacao.mockResolvedValue({
      ok: true,
      validacao_id: 'v1',
      versao_avaliacao: 'h1',
      potencial_validado: 4,
      idempotente: false,
    });
    const usuario = userEvent.setup();
    renderizar(montarItem({ status: 'concluido' }));

    const validar = await screen.findByRole('button', { name: /Validar Potencial/ });
    await usuario.click(validar);

    await waitFor(() => expect(servico.validarPotencialAvaliacao).toHaveBeenCalledTimes(1));
    expect(servico.validarPotencialAvaliacao).toHaveBeenCalledWith({
      feedbackId: 'f1',
      idOperacao: expect.any(String),
    });
    expect(toasts.success).toHaveBeenCalledWith('Potencial validado pelo RH.');
  });

  it('NÃO oferece validação fora dos requisitos (pendente, par, sem Potencial ou já validado)', () => {
    auth.roles = ['rh'];
    renderizar(montarItem({ status: 'pendente' }));
    expect(screen.queryByRole('button', { name: /Validar Potencial/ })).toBeNull();

    renderizar(montarItem({ status: 'concluido', tipo: 'par' }));
    expect(screen.queryByRole('button', { name: /Validar Potencial/ })).toBeNull();

    renderizar(montarItem({ status: 'concluido', potencial: 0 }));
    expect(screen.queryByRole('button', { name: /Validar Potencial/ })).toBeNull();
  });
});

describe('indicador de situação do Potencial', () => {
  it('RH vê "Aguardando validação" sem nenhuma validação registrada', async () => {
    auth.roles = ['rh'];
    renderizar();
    expect(await screen.findByRole('status')).toHaveTextContent('Aguardando validação');
  });

  it('"Validado pelo RH" quando a versão da validação casa com a canônica', async () => {
    auth.roles = ['rh'];
    servico.listarValidacoesPotencial.mockResolvedValue([{ feedback_id: 'f1', versao_avaliacao: 'h1' }]);
    servico.listarVersoesAvaliacao.mockResolvedValue([{ feedback_id: 'f1', versao_avaliacao: 'h1' }]);
    renderizar(montarItem({ status: 'concluido' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Validado pelo RH'));
  });

  it('"Validação desatualizada" quando a avaliação mudou depois da validação', async () => {
    auth.roles = ['rh'];
    servico.listarValidacoesPotencial.mockResolvedValue([{ feedback_id: 'f1', versao_avaliacao: 'h1' }]);
    servico.listarVersoesAvaliacao.mockResolvedValue([{ feedback_id: 'f1', versao_avaliacao: 'h2' }]);
    renderizar(montarItem({ status: 'concluido' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Validação desatualizada'));
  });

  it('registro REABERTO nunca aparece como aprovado, mesmo com a versão casando', async () => {
    auth.roles = ['rh'];
    servico.listarValidacoesPotencial.mockResolvedValue([{ feedback_id: 'f1', versao_avaliacao: 'h1' }]);
    servico.listarVersoesAvaliacao.mockResolvedValue([{ feedback_id: 'f1', versao_avaliacao: 'h1' }]);
    renderizar(montarItem({ status: 'pendente' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Validação desatualizada'));
  });

  it('quem não é RH não vê selo (não afirmamos estado sem o dado do RH)', () => {
    renderizar(montarItem({ status: 'concluido' }));
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('estado de carregamento e clique duplicado', () => {
  it('desabilita os controles durante a RPC e ignora o segundo clique', async () => {
    const usuario = userEvent.setup();
    let responder: (v: unknown) => void = () => {};
    servico.finalizarFeedback.mockImplementation(
      () =>
        new Promise((resolve) => {
          responder = resolve;
        })
    );
    renderizar();

    await usuario.click(botao(/Concluir avaliação/));
    await waitFor(() => expect(botao(/Concluir avaliação/)).toBeDisabled());
    expect(botao(/Cancelar avaliação/)).toBeDisabled();
    expect(botao(/Reabrir avaliação/)).toBeDisabled();

    // Segundo clique no botão já desabilitado não pode gerar nova chamada.
    fireEvent.click(botao(/Concluir avaliação/));
    expect(servico.finalizarFeedback).toHaveBeenCalledTimes(1);

    responder({ ok: true, status_novo: 'concluido', idempotente: false });
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith('Avaliação concluída!'));
    await waitFor(() => expect(botao(/Concluir avaliação/)).toBeEnabled());
  });
});

describe('falha da RPC', () => {
  it('mostra a mensagem REAL, não anuncia sucesso e libera os controles', async () => {
    const usuario = userEvent.setup();
    servico.finalizarFeedback.mockRejectedValue(new Error('permission denied for function finalizar_feedback'));
    renderizar();

    await usuario.click(botao(/Concluir avaliação/));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledTimes(1));
    expect(String(toasts.error.mock.calls[0][0])).toContain('permission denied for function finalizar_feedback');
    expect(toasts.success).not.toHaveBeenCalled();
    await waitFor(() => expect(botao(/Concluir avaliação/)).toBeEnabled());
  });
});

describe('reenvio e idempotência', () => {
  it('reenvio da MESMA tentativa reusa a chave; após sucesso, a próxima é nova', async () => {
    const usuario = userEvent.setup();
    servico.finalizarFeedback
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce({ ok: true, status_novo: 'concluido', idempotente: false })
      .mockResolvedValueOnce({ ok: true, status_novo: 'concluido', idempotente: false });
    renderizar();

    await usuario.click(botao(/Concluir avaliação/));
    await waitFor(() => expect(servico.finalizarFeedback).toHaveBeenCalledTimes(1));

    await usuario.click(botao(/Concluir avaliação/)); // reenvio depois da falha
    await waitFor(() => expect(servico.finalizarFeedback).toHaveBeenCalledTimes(2));

    await usuario.click(botao(/Concluir avaliação/)); // operação NOVA (pós-sucesso)
    await waitFor(() => expect(servico.finalizarFeedback).toHaveBeenCalledTimes(3));

    const chaves = servico.finalizarFeedback.mock.calls.map((c) => c[0].idOperacao as string);
    expect(chaves[1]).toBe(chaves[0]);
    expect(chaves[2]).not.toBe(chaves[1]);
  });
});

describe('atualização da interface após o sucesso', () => {
  it('invalida lista, validações de Potencial e versão, e fecha o diálogo de motivo', async () => {
    const usuario = userEvent.setup();
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidar = vi.spyOn(qc, 'invalidateQueries');
    servico.finalizarFeedback.mockResolvedValue({ ok: true, status_novo: 'pendente', idempotente: false });

    renderizar(montarItem({ status: 'concluido' }), qc);
    await usuario.click(botao(/Reabrir avaliação/));
    await usuario.type(await screen.findByLabelText(/Justificativa da reabertura/i), 'nota incorreta');
    await usuario.click(botao(/Confirmar reabertura/));

    await waitFor(() => expect(invalidar).toHaveBeenCalledWith({ queryKey: ['feedbacks_360'] }));
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['feedbacks_360_validacoes_potencial'] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['vw_feedbacks_360_versao'] });
    await waitFor(() => expect(screen.queryByLabelText(/Justificativa da reabertura/i)).toBeNull());
    expect(toasts.success).toHaveBeenCalledWith(expect.stringContaining('reaberta'));
  });
});

describe('evidência de layout e integração dentro do modal', () => {
  it('usa o alinhamento e a pele do rodapé existente (h-8/text-xs, quebra, separator)', () => {
    const { container } = renderizar();
    const linha = botao(/Concluir avaliação/).parentElement as HTMLElement;

    expect(linha.className).toContain('justify-end');
    expect(linha.className).toContain('flex-wrap');
    expect(botao(/Concluir avaliação/).className).toContain('h-8');
    expect(botao(/Concluir avaliação/).className).toContain('text-xs');
    expect(container.querySelector('div[class*="bg-border"]')).not.toBeNull();
  });

  it('no modal: conteúdo existente preservado + controles no FIM do rodapé', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <FeedbackDetalheDialog item={montarItem()} aberto onOpenChange={() => {}} onFiltrarAvaliado={() => {}} />
      </QueryClientProvider>
    );

    // Conteúdo atual do modal intocado.
    expect(await screen.findByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver só deste colaborador/ })).toBeInTheDocument();
    expect(screen.getByText('Pontos fortes')).toBeInTheDocument();

    // Controles novos, DEPOIS do bloco que já existia (ordem no DOM).
    const verSo = screen.getByRole('button', { name: /Ver só deste colaborador/ });
    const concluir = screen.getByRole('button', { name: /Concluir avaliação/ });
    expect(verSo.compareDocumentPosition(concluir) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('button', { name: /Cancelar avaliação/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reabrir avaliação/ })).toBeInTheDocument();
  });

  it('em demonstração o modal continua EXATAMENTE o de antes (sem controles)', async () => {
    modo.real = false;
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <FeedbackDetalheDialog item={montarItem()} aberto onOpenChange={() => {}} onFiltrarAvaliado={() => {}} />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver só deste colaborador/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Concluir avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Validar Potencial/ })).toBeNull();
  });
});

describe('prévia local (DEV) — flag desligada e ZERO RPC', () => {
  it('a prévia liga o bloco usando o SERVIÇO SIMULADO; o serviço real não é tocado', async () => {
    modo.real = false;
    const simulado = {
      finalizarFeedback: vi.fn().mockResolvedValue({ ok: true, status_novo: 'concluido', idempotente: false }),
      validarPotencialAvaliacao: vi.fn(),
      listarValidacoesPotencial: vi.fn().mockResolvedValue([]),
      listarVersoesAvaliacao: vi.fn().mockResolvedValue([{ feedback_id: 'f1', versao_avaliacao: 'h1' }]),
    };
    const usuario = userEvent.setup();
    renderizar(montarItem(), undefined, { servico: simulado, papel: 'rh' });

    await usuario.click(botao(/Concluir avaliação/));
    await waitFor(() => expect(simulado.finalizarFeedback).toHaveBeenCalledTimes(1));

    // Serviço REAL (que chamaria as RPCs) permanece intocado.
    expect(servico.finalizarFeedback).not.toHaveBeenCalled();
    expect(servico.validarPotencialAvaliacao).not.toHaveBeenCalled();
    expect(servico.listarValidacoesPotencial).not.toHaveBeenCalled();
    expect(servico.listarVersoesAvaliacao).not.toHaveBeenCalled();
  });

  it('o papel simulado sobrescreve o papel real (gestor não reabre nem valida)', () => {
    modo.real = false;
    auth.roles = ['admin'];
    renderizar(montarItem({ status: 'concluido' }), undefined, { papel: 'gestor' });
    expect(botao(/Reabrir avaliação/)).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Validar Potencial/ })).toBeNull();
  });
});

describe('página de prévia local (/dev/ninebox-preview)', () => {
  function renderizarPagina() {
    return render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <NineBoxPreviewPage />
      </QueryClientProvider>
    );
  }

  it('mostra os 5 cenários, o aviso de DEV e NÃO chama o serviço real', async () => {
    modo.real = false;
    renderizarPagina();

    expect(await screen.findByText(/Prévia · Controles do feedback/)).toBeInTheDocument();
    expect(screen.getByText('Somente DEV')).toBeInTheDocument();
    expect(screen.getByText('RPCs reais executadas: 0')).toBeInTheDocument();
    expect(screen.getByText(/1 · Pendente/)).toBeInTheDocument();
    expect(screen.getByText(/2 · Concluída/)).toBeInTheDocument();
    expect(screen.getByText(/3 · Cancelamento com justificativa/)).toBeInTheDocument();
    expect(screen.getByText(/4 · Validação de Potencial/)).toBeInTheDocument();
    expect(screen.getByText(/5 · Selos de situação do Potencial/)).toBeInTheDocument();

    expect(servico.finalizarFeedback).not.toHaveBeenCalled();
    expect(servico.validarPotencialAvaliacao).not.toHaveBeenCalled();
    expect(servico.listarValidacoesPotencial).not.toHaveBeenCalled();
    expect(servico.listarVersoesAvaliacao).not.toHaveBeenCalled();
  });

  it('abre o modal REAL a partir de um cenário, com os controles dentro', async () => {
    modo.real = false;
    const usuario = userEvent.setup();
    renderizarPagina();

    const aberturas = await screen.findAllByRole('button', { name: /Abrir modal/ });
    await usuario.click(aberturas[0]);

    expect(await screen.findByText('Ana Silva (fictícia)')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Concluir avaliação/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Cancelar avaliação/ }).length).toBeGreaterThan(0);
  });
});
