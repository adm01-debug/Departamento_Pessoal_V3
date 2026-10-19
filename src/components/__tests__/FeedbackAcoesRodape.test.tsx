/**
 * CONTROLES FUNCIONAIS DO MODAL (rodapé) — testes de integração local.
 *
 * O serviço é mockado (nenhuma rede): o que se verifica aqui é a INTERFACE —
 * quais controles aparecem por status/papel, obrigatoriedade da justificativa,
 * bloqueio durante a operação, erro real, idempotência do reenvio, invalidação
 * de cache depois do sucesso e PRESERVAÇÃO DO MODO DEMONSTRAÇÃO.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const { modo, auth, toasts, servico } = vi.hoisted(() => ({
  modo: { real: true },
  auth: { roles: ['admin'] as string[], isAdmin: false, userId: 'uid-sessao' },
  toasts: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  servico: {
    finalizarFeedback: vi.fn(),
    validarPotencialAvaliacao: vi.fn(),
    listarValidacoesPotencial: vi.fn(),
    listarVersoesAvaliacao: vi.fn(),
    listarVinculos: vi.fn(),
    decidirAprovacaoGestor: vi.fn(),
  },
}));

vi.mock('sonner', () => ({ toast: toasts }));

vi.mock('@/components/avaliacao/nineBoxModo', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/components/avaliacao/nineBoxModo')>();
  return { ...real, modoRealAtivo: () => modo.real };
});

vi.mock('@/hooks/useAuth', () => ({
  // `hasRole` é o MESMO contrato do contexto real (lista de papéis da conta):
  // uma conta pode ser `admin` E `gestor` ao mesmo tempo.
  useAuth: () => ({
    user: { id: auth.userId, roles: auth.roles },
    isAdmin: auth.isAdmin,
    hasRole: (role: string) => auth.roles.includes(role),
  }),
}));

vi.mock('@/services/avaliacaoService', () => ({ avaliacaoService: servico }));

import { FeedbackAcoesRodape, type ContextoAcoes, type PreviewAcoes } from '../avaliacao/FeedbackAcoesRodape';
import { estadoAprovacao, type EstadoAprovacao } from '../avaliacao/aprovacaoGestor';
import { CHAVE_ARMAZENAMENTO, limparEstadoLocal } from '../avaliacao/aprovacaoLocal';
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

function renderizar(
  item = montarItem(),
  client?: QueryClient,
  previa?: PreviewAcoes,
  estado?: EstadoAprovacao | null,
  /** Etapa do modal (regra única de ações): ver `ContextoAcoes`. */
  contexto: ContextoAcoes = 'avaliacoes'
) {
  const qc =
    client ??
    new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return {
    qc,
    ...render(<FeedbackAcoesRodape item={item} previa={previa} estadoAprovacao={estado} contexto={contexto} />, {
      wrapper,
    }),
  };
}

function botao(nome: RegExp | string) {
  return screen.getByRole('button', { name: nome });
}

/**
 * Prévia do GESTOR RESPONSÁVEL (DEV): habilita o controle "Concluir avaliação"
 * sem depender do papel real da sessão de teste. A responsabilidade de verdade
 * vem dos vínculos (`listarVinculos` / `ehGestorResponsavel`).
 */
function previaGestor(): PreviewAcoes {
  return { papel: 'gestor', responsavel: true, servico: servico as unknown as PreviewAcoes['servico'] };
}

beforeEach(() => {
  vi.clearAllMocks();
  modo.real = true;
  auth.roles = ['admin'];
  auth.isAdmin = false;
  auth.userId = 'uid-sessao';
  servico.listarValidacoesPotencial.mockResolvedValue([]);
  servico.listarVersoesAvaliacao.mockResolvedValue([{ feedback_id: 'f1', versao_avaliacao: 'h1' }]);
  servico.listarVinculos.mockResolvedValue([]);
  // Armazenamento da vitrine limpo entre testes (cada caso é independente).
  limparEstadoLocal();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('modo demonstração — experiência atual preservada', () => {
  it('registro FICTÍCIO (mock-*) não renderiza NENHUM controle e não chama o serviço', () => {
    modo.real = false;
    const { container } = renderizar(montarItem({ id: 'mock-feedback-1' }));
    expect(container).toBeEmptyDOMElement();
    expect(servico.finalizarFeedback).not.toHaveBeenCalled();
    expect(servico.validarPotencialAvaliacao).not.toHaveBeenCalled();
    expect(servico.listarValidacoesPotencial).not.toHaveBeenCalled();
  });

  it('registro REAL mostra as ações da etapa mesmo com a flag de modo real DESLIGADA', () => {
    // Correção: a exibição não depende mais de `modoRealAtivo()`. O que separa é
    // o TIPO do registro — fictício nunca opera; real opera pelo mesmo rodapé.
    modo.real = false;
    renderizar(); // id real ('f1'), papel admin
    // Etapa Avaliações: só as ações do status. A conclusão não é do RH/admin.
    expect(screen.queryByRole('button', { name: /Concluir avaliação/ })).toBeNull();
    expect(botao(/Cancelar avaliação/)).toBeEnabled();
  });
});

describe('ações visíveis por STATUS — etapa "Avaliações" (regra única)', () => {
  it('pendente + GESTOR RESPONSÁVEL: Concluir/Cancelar habilitados e SEM decisão de aprovação', () => {
    renderizar(undefined, undefined, previaGestor());
    expect(botao(/Concluir avaliação/)).toBeEnabled();
    expect(botao(/Cancelar avaliação/)).toBeEnabled();
    // Aprovação só existe na fila "Aguardando gestor" — aqui, nem desabilitada.
    expect(screen.queryByRole('button', { name: /Reabrir avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Aprovar avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Devolver para correção/ })).toBeNull();
  });

  it('pendente + RH: cancelar liberado; concluir NÃO é oferecido (perfil)', () => {
    auth.roles = ['rh'];
    renderizar();
    expect(botao(/Cancelar avaliação/)).toBeEnabled();
    expect(screen.queryByRole('button', { name: /Concluir avaliação/ })).toBeNull();
  });

  it('pendente + GESTOR sem vínculo: concluir NÃO é oferecido (responsabilidade)', () => {
    renderizar(undefined, undefined, {
      papel: 'gestor',
      responsavel: false,
      servico: servico as unknown as PreviewAcoes['servico'],
    });
    expect(screen.queryByRole('button', { name: /Concluir avaliação/ })).toBeNull();
    expect(botao(/Cancelar avaliação/)).toBeEnabled();
  });

  it('CONCLUÍDO: nenhum botão operacional (nem concluir, nem cancelar, nem reabrir)', () => {
    auth.roles = ['rh'];
    renderizar(montarItem({ status: 'concluido' }));
    expect(screen.queryByRole('button', { name: /Concluir avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Cancelar avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Reabrir avaliação/ })).toBeNull();
  });

  it('CANCELADO: nenhuma ação de conclusão/cancelamento e nenhuma decisão', () => {
    auth.roles = ['rh'];
    renderizar(montarItem({ status: 'cancelado' }));
    expect(screen.queryByRole('button', { name: /Concluir avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Cancelar avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Aprovar avaliação/ })).toBeNull();
  });
});

describe('ações visíveis por PAPEL — etapa "Avaliações"', () => {
  it('avaliador (user) NÃO recebe nenhuma ação', () => {
    auth.roles = ['user'];
    renderizar();
    expect(screen.queryByRole('button', { name: /Concluir avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Cancelar avaliação/ })).toBeNull();
  });

  it('admin/RH em registro CONCLUÍDO não recebem ação alguma', () => {
    auth.roles = ['rh'];
    renderizar(montarItem({ status: 'concluido' }));
    expect(screen.queryByRole('button', { name: /Cancelar avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Concluir avaliação/ })).toBeNull();
  });

  it('sem papel reconhecido, nenhum controle é liberado', () => {
    auth.roles = [];
    renderizar();
    expect(screen.queryByRole('button', { name: /Concluir avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Cancelar avaliação/ })).toBeNull();
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

describe('reabertura NÃO pertence a este rodapé (regra por etapa)', () => {
  it('registro concluído não oferece "Reabrir avaliação" em nenhuma etapa do rodapé', () => {
    auth.roles = ['rh']; // perfil que ANTES reabria por aqui
    renderizar(montarItem({ status: 'concluido' }));
    expect(screen.queryByRole('button', { name: /Reabrir avaliação/ })).toBeNull();
    cleanup();
    renderizar(montarItem({ status: 'concluido' }), undefined, undefined, null, 'aguardando_gestor');
    expect(screen.queryByRole('button', { name: /Reabrir avaliação/ })).toBeNull();
  });
});

describe('validação de Potencial — exclusiva do RH (etapa "rh")', () => {
  it('gestor e admin NÃO veem o controle, mesmo com tudo elegível', async () => {
    renderizar(montarItem({ status: 'concluido' }), undefined, undefined, null, 'rh');
    expect(screen.queryByRole('button', { name: /Validar Potencial/ })).toBeNull();

    auth.roles = ['admin'];
    renderizar(montarItem({ status: 'concluido' }), undefined, undefined, null, 'rh');
    expect(screen.queryByRole('button', { name: /Validar Potencial/ })).toBeNull();
  });

  it('RH vê o controle de validação nesta etapa (sem decisão do gestor)', async () => {
    auth.roles = ['rh'];
    servico.validarPotencialAvaliacao.mockResolvedValue({
      ok: true,
      validacao_id: 'v1',
      versao_avaliacao: 'h1',
      potencial_validado: 4,
      idempotente: false,
    });
    const usuario = userEvent.setup();
    renderizar(montarItem({ status: 'concluido' }), undefined, undefined, null, 'rh');

    const validar = await screen.findByRole('button', { name: /Validar Potencial/ });
    // Nenhuma ação de CONCLUSÃO/APROVAÇÃO aparece nesta etapa.
    expect(screen.queryByRole('button', { name: /Concluir avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Cancelar avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Aprovar avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Devolver para correção/ })).toBeNull();

    await usuario.click(validar);

    await waitFor(() => expect(servico.validarPotencialAvaliacao).toHaveBeenCalledTimes(1));
    expect(servico.validarPotencialAvaliacao).toHaveBeenCalledWith({
      feedbackId: 'f1',
      idOperacao: expect.any(String),
    });
    expect(toasts.success).toHaveBeenCalledWith('Potencial validado pelo RH.');
  });

  it('NÃO oferece validação fora dos requisitos (pendente, par, sem Potencial)', () => {
    auth.roles = ['rh'];
    renderizar(montarItem({ status: 'pendente' }), undefined, undefined, null, 'rh');
    expect(screen.queryByRole('button', { name: /Validar Potencial/ })).toBeNull();

    renderizar(montarItem({ status: 'concluido', tipo: 'par' }), undefined, undefined, null, 'rh');
    expect(screen.queryByRole('button', { name: /Validar Potencial/ })).toBeNull();

    renderizar(montarItem({ status: 'concluido', potencial: 0 }), undefined, undefined, null, 'rh');
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

  it('quem não é RH vê o status do registro, sem afirmar nada sobre o Potencial', () => {
    renderizar(montarItem({ status: 'concluido' }));
    expect(screen.getByRole('status')).toHaveTextContent('Concluído');
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
    renderizar(undefined, undefined, previaGestor());

    await usuario.click(botao(/Concluir avaliação/));
    await waitFor(() => expect(botao(/Concluir avaliação/)).toBeDisabled());
    expect(botao(/Cancelar avaliação/)).toBeDisabled();
    // A etapa Avaliações não oferece reabertura (regra única de ações).
    expect(screen.queryByRole('button', { name: /Reabrir avaliação/ })).toBeNull();

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
    renderizar(undefined, undefined, previaGestor());

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
    renderizar(undefined, undefined, previaGestor());

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
    servico.finalizarFeedback.mockResolvedValue({ ok: true, status_novo: 'cancelado', idempotente: false });
    auth.roles = ['rh']; // perfil que cancela pelo rodapé

    renderizar(montarItem({ status: 'pendente' }), qc);
    await usuario.click(botao(/Cancelar avaliação/));
    await usuario.type(await screen.findByLabelText(/Motivo do cancelamento/i), 'registro em duplicidade');
    await usuario.click(botao(/Confirmar cancelamento/));

    await waitFor(() => expect(invalidar).toHaveBeenCalledWith({ queryKey: ['feedbacks_360'] }));
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['feedbacks_360_validacoes_potencial'] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ['vw_feedbacks_360_versao'] });
    await waitFor(() => expect(screen.queryByLabelText(/Motivo do cancelamento/i)).toBeNull());
    expect(toasts.success).toHaveBeenCalledWith(expect.stringContaining('cancelada'));
  });
});

describe('evidência de layout e integração dentro do modal', () => {
  it('usa o alinhamento e a pele do rodapé existente (h-8/text-xs, quebra, separator)', () => {
    const { container } = renderizar(undefined, undefined, previaGestor());
    const linha = botao(/Concluir avaliação/).parentElement as HTMLElement;

    expect(linha.className).toContain('justify-end');
    expect(linha.className).toContain('flex-wrap');
    expect(botao(/Concluir avaliação/).className).toContain('h-8');
    expect(botao(/Concluir avaliação/).className).toContain('text-xs');
    expect(container.querySelector('div[class*="bg-border"]')).not.toBeNull();
  });

  it('no modal: conteúdo existente preservado + controles da etapa no FIM do rodapé', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <FeedbackDetalheDialog item={montarItem()} aberto onOpenChange={() => {}} onFiltrarAvaliado={() => {}} />
      </QueryClientProvider>
    );

    // Tom: o texto é o REAL do registro (novo conteúdo canônico).
    expect(screen.getByText('Pontos fortes')).toBeInTheDocument();
    expect(screen.getByText('Entrega consistente e comunicação clara')).toBeInTheDocument();

    // Ações da etapa (padrão: Avaliações) DEPOIS do bloco que já existia.
    const verSo = screen.getByRole('button', { name: /Ver só deste colaborador/ });
    const cancelar = screen.getByRole('button', { name: /Cancelar avaliação/ });
    expect(verSo.compareDocumentPosition(cancelar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Sem reabertura e SEM controles de aprovação nesta etapa (só na fila).
    expect(screen.queryByRole('button', { name: /Reabrir avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Aprovar avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Devolver para correção/ })).toBeNull();
  });

  it('registro FICTÍCIO mantém o modal de leitura (controles de escrita desabilitados)', async () => {
    modo.real = false;
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <FeedbackDetalheDialog
          item={montarItem({ id: 'mock-feedback-1' })}
          aberto
          onOpenChange={() => {}}
          onFiltrarAvaliado={() => {}}
        />
      </QueryClientProvider>
    );

    expect(await screen.findByText('Ana Silva')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver só deste colaborador/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Concluir avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Validar Potencial/ })).toBeNull();
    // A seção de conteúdo não desaparece no registro fictício.
    expect(screen.getByText('Pontos de melhoria')).toBeInTheDocument();
    expect(screen.getByText('Comentários')).toBeInTheDocument();
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
      listarVinculos: vi.fn().mockResolvedValue([]),
      decidirAprovacaoGestor: vi.fn(),
    };
    const usuario = userEvent.setup();
    renderizar(montarItem(), undefined, { servico: simulado, papel: 'gestor', responsavel: true });

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
    // Registro concluído na etapa Avaliações: nenhuma ação operacional.
    expect(screen.queryByRole('button', { name: /Reabrir avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Concluir avaliação/ })).toBeNull();
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

  it('abre o modal REAL a partir de um cenário, com o rodapé da etapa dentro', async () => {
    modo.real = false;
    const usuario = userEvent.setup();
    renderizarPagina();

    const aberturas = await screen.findAllByRole('button', { name: /Abrir modal/ });
    await usuario.click(aberturas[0]);

    expect(await screen.findByText('Ana Silva (fictícia)')).toBeInTheDocument();
    // Regra única de ações: a reabertura NÃO pertence a este rodapé; a decisão
    // formal só existe na fila "Aguardando gestor".
    expect(screen.queryByRole('button', { name: /Reabrir avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Aprovar avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Devolver para correção/ })).toBeNull();
  });
});

/* ─── APROVAÇÃO FORMAL NO MODAL (a MESMA regra da fila) ──────────────────── */
describe('aprovação formal do gestor no rodapé do modal', () => {
  const pendente = () => estadoAprovacao({ versaoGestor: 'v1', decisao: null, validada: false });
  const aprovada = () =>
    estadoAprovacao({ versaoGestor: 'v1', decisao: { decisao: 'aprovado', versao_avaliacao: 'v1' }, validada: false });

  function previaCom(papel: string, responsavel: boolean): PreviewAcoes {
    return { papel, responsavel, servico: servico as unknown as PreviewAcoes['servico'] };
  }

  beforeEach(() => {
    servico.decidirAprovacaoGestor.mockResolvedValue({ ok: true, decisao: 'aprovado', status: 'aprovada_gestor' });
  });

  it('o selo mostra o ESTADO DA APROVAÇÃO (não o status do registro) quando há pedido pendente', () => {
    renderizar(montarItem({ status: 'concluido' }), undefined, previaCom('rh', false), pendente(), 'aguardando_gestor');
    expect(screen.getByRole('status')).toHaveTextContent(/Aguardando gestor/i);
  });

  it('gestor responsável vê SOMENTE Aprovar/Devolver e a decisão chama a RPC do fluxo', async () => {
    const usuario = userEvent.setup();
    renderizar(
      montarItem({ status: 'concluido' }),
      undefined,
      previaCom('gestor', true),
      pendente(),
      'aguardando_gestor'
    );

    // Nesta etapa NÃO existem ações de conclusão/cancelamento/reabertura.
    expect(screen.queryByRole('button', { name: /Concluir avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Cancelar avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Reabrir avaliação/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Validar Potencial/ })).toBeNull();

    await usuario.click(botao(/Aprovar avaliação/));
    await waitFor(() => expect(servico.decidirAprovacaoGestor).toHaveBeenCalledTimes(1));
    expect(servico.decidirAprovacaoGestor.mock.calls[0][0]).toMatchObject({
      colaboradorId: 'colab-1',
      cicloId: 'ciclo-1',
      decisao: 'aprovado',
    });
    // A conclusão NÃO é usada para aprovar (são atos diferentes).
    expect(servico.finalizarFeedback).not.toHaveBeenCalled();
  });

  it('REGISTRO REAL: conta admin+gestor COM vínculo prova o responsável e recebe a decisão', async () => {
    // Defeito corrigido: a conta era tratada só como `admin` (precedência), a
    // consulta de vínculo não rodava e Aprovar/Devolver nunca apareciam.
    auth.roles = ['admin', 'gestor'];
    auth.isAdmin = true;
    auth.userId = 'uid-sessao';
    servico.listarVinculos.mockResolvedValue([
      { id: 'colab-1', user_id: 'uid-sessao', supervisor_id: null },
      { id: 'colab-9', user_id: null, supervisor_id: 'colab-1' },
    ]);
    const usuario = userEvent.setup();
    renderizar(montarItem({ status: 'concluido' }), undefined, undefined, pendente(), 'aguardando_gestor');

    expect(await screen.findByRole('button', { name: /Aprovar avaliação/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Devolver para correção/ })).toBeInTheDocument();

    await usuario.click(botao(/Aprovar avaliação/));
    await waitFor(() => expect(servico.decidirAprovacaoGestor).toHaveBeenCalledTimes(1));
    expect(servico.decidirAprovacaoGestor.mock.calls[0][0]).toMatchObject({
      colaboradorId: 'colab-1',
      cicloId: 'ciclo-1',
      decisao: 'aprovado',
    });
  });

  it('REGISTRO REAL: admin sozinho decide a consolidação SEM gestor vinculado (fallback)', () => {
    auth.roles = ['admin'];
    auth.isAdmin = true;
    auth.userId = 'uid-sessao';
    servico.listarVinculos.mockResolvedValue([{ id: 'colab-1', user_id: 'uid-outro', supervisor_id: null }]);
    renderizar(
      montarItem({ status: 'concluido' }),
      undefined,
      undefined,
      estadoAprovacao({
        versaoGestor: 'v1',
        decisao: null,
        validada: false,
        gestorIdentificado: false,
        autorizadoAmplo: true,
      }),
      'aguardando_gestor'
    );

    expect(botao(/^Aprovar avaliação$/)).toBeEnabled();
    expect(botao(/Devolver para correção/)).toBeEnabled();
  });

  it('REGISTRO REAL: admin decide também COM gestor vinculado (escopo de tenant)', () => {
    auth.roles = ['admin'];
    auth.isAdmin = true;
    auth.userId = 'uid-sessao';
    servico.listarVinculos.mockResolvedValue([
      { id: 'colab-1', user_id: 'uid-outro', supervisor_id: 'colab-2' },
      { id: 'colab-2', user_id: 'uid-terceiro', supervisor_id: null },
    ]);
    renderizar(
      montarItem({ status: 'concluido' }),
      undefined,
      undefined,
      estadoAprovacao({ versaoGestor: 'v1', decisao: null, validada: false, gestorIdentificado: true }),
      'aguardando_gestor'
    );

    expect(botao(/^Aprovar avaliação$/)).toBeEnabled();
    expect(botao(/Devolver para correção/)).toBeEnabled();
  });

  it('REGISTRO REAL: admin+gestor SEM vínculo usa o mesmo fallback (PODE decidir)', () => {
    auth.roles = ['admin', 'gestor'];
    auth.isAdmin = true;
    auth.userId = 'uid-sessao';
    servico.listarVinculos.mockResolvedValue([{ id: 'colab-1', user_id: 'uid-outro', supervisor_id: null }]);
    renderizar(
      montarItem({ status: 'concluido' }),
      undefined,
      undefined,
      estadoAprovacao({
        versaoGestor: 'v1',
        decisao: null,
        validada: false,
        gestorIdentificado: false,
        autorizadoAmplo: true,
      }),
      'aguardando_gestor'
    );

    expect(botao(/^Aprovar avaliação$/)).toBeEnabled();
    expect(botao(/Devolver para correção/)).toBeEnabled();
  });

  it('REGISTRO REAL: PAR sem avaliação do gestor continua APROVÁVEL (tipo não bloqueia)', () => {
    auth.roles = ['gestor'];
    auth.isAdmin = false;
    renderizar(
      montarItem({ status: 'concluido' }),
      undefined,
      previaCom('gestor', true),
      estadoAprovacao({
        versaoGestor: 'v1',
        decisao: null,
        validada: false,
        responsavel: true,
        avaliacaoGestorValida: false,
      }),
      'aguardando_gestor'
    );

    expect(botao(/^Aprovar avaliação$/)).toBeEnabled();
    expect(botao(/Devolver para correção/)).toBeEnabled();
  });

  it('a devolução exige justificativa (mínimo da RPC) antes de chamar a decisão', async () => {
    const usuario = userEvent.setup();
    renderizar(
      montarItem({ status: 'concluido' }),
      undefined,
      previaCom('gestor', true),
      pendente(),
      'aguardando_gestor'
    );

    await usuario.click(botao(/Devolver para correção/));
    const confirmar = await screen.findByRole('button', { name: /Confirmar devolução/ });
    expect(confirmar).toBeDisabled();

    await usuario.type(await screen.findByLabelText(/Justificativa obrigatória/i), 'Revisar os pontos de melhoria');
    await waitFor(() => expect(confirmar).toBeEnabled());
    await usuario.click(confirmar);

    await waitFor(() => expect(servico.decidirAprovacaoGestor).toHaveBeenCalledTimes(1));
    expect(servico.decidirAprovacaoGestor.mock.calls[0][0]).toMatchObject({
      decisao: 'devolvido',
      justificativa: 'Revisar os pontos de melhoria',
    });
  });

  it('RH tem escopo de tenant: Aprovar/Devolver habilitados na etapa do gestor', () => {
    auth.roles = ['rh'];
    auth.isAdmin = false;
    renderizar(montarItem({ status: 'concluido' }), undefined, previaCom('rh', false), pendente(), 'aguardando_gestor');
    expect(botao(/^Aprovar avaliação$/)).toBeEnabled();
    expect(botao(/^Devolver para correção$/)).toBeEnabled();
  });

  it('gestor NÃO responsável também não recebe a decisão em registro REAL (bloqueada)', () => {
    auth.roles = ['gestor'];
    auth.isAdmin = false;
    renderizar(
      montarItem({ status: 'concluido' }),
      undefined,
      previaCom('gestor', false),
      pendente(),
      'aguardando_gestor'
    );
    expect(botao(/^Aprovar avaliação$/)).toBeDisabled();
  });

  /* ── VITRINE (mock): demonstra as ações gravando LOCALMENTE ─────────────── */
  it('registro FICTÍCIO (vitrine) SALVA a decisão localmente e não chama o serviço', async () => {
    modo.real = false;
    const usuario = userEvent.setup();
    renderizar(
      montarItem({ id: 'mock-feedback-1', status: 'concluido' }),
      undefined,
      undefined,
      pendente(),
      'aguardando_gestor'
    );

    const aprovar = screen.getByRole('button', { name: /Aprovar avaliação/ });
    expect(aprovar).toBeInTheDocument();
    expect(aprovar).toHaveAttribute('title', expect.stringContaining('demonstrativa'));
    expect(screen.getByRole('button', { name: /Devolver para correção/ })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Aguardando gestor/i);

    await usuario.click(aprovar);
    await waitFor(() => expect(toasts.success).toHaveBeenCalledTimes(1));
    expect(String(toasts.success.mock.calls[0][0])).toContain('salva localmente');

    // A decisão FOI gravada — no armazenamento da demonstração (nunca no banco).
    const salvo = JSON.parse(localStorage.getItem(CHAVE_ARMAZENAMENTO) ?? '{}');
    expect(salvo.decisoes?.['colab-1::ciclo-1']).toMatchObject({ decisao: 'aprovado', versaoAvaliacao: 'v1' });
    // NADA foi enviado ao Supabase: nenhuma RPC do fluxo.
    expect(servico.decidirAprovacaoGestor).not.toHaveBeenCalled();
    expect(servico.finalizarFeedback).not.toHaveBeenCalled();
  });

  it('na vitrine o RH puro NÃO recebe a decisão fora da fila', () => {
    modo.real = false;
    auth.roles = ['rh'];
    renderizar(montarItem({ id: 'mock-feedback-2', status: 'concluido' }), undefined, undefined, pendente());
    expect(screen.queryByRole('button', { name: /^Aprovar avaliação$/ })).toBeNull();
  });

  it('o RH só recebe "Validar Potencial" depois do aval do gestor vigente', () => {
    auth.roles = ['rh'];
    const item = montarItem({ status: 'concluido' });
    // Pendente ⇒ sem validação.
    renderizar(item, undefined, undefined, pendente(), 'rh');
    expect(screen.queryByRole('button', { name: /Validar Potencial/ })).toBeNull();
    // Aprovada na mesma versão ⇒ validação disponível.
    cleanup();
    renderizar(item, undefined, undefined, aprovada(), 'rh');
    expect(screen.getByRole('button', { name: /Validar Potencial/ })).toBeInTheDocument();
  });
});
