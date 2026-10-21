/**
 * Criação e ações sensíveis do módulo de desempenho — integração LOCAL com a
 * RPC mockada (nenhum banco, nenhuma rede). Cobre:
 *
 *   • modo real DESLIGADO → erro explícito e NENHUMA chamada de rede;
 *   • modo real LIGADO → payload exato de `criar_feedback_seguro`;
 *   • erro da RPC (autorização/validação) e falha de rede → propagados;
 *   • reenvio/duplicidade → a MESMA chave de idempotência;
 *   • identificador fictício (`mock-*`) → bloqueado antes da rede;
 *   • demonstração ligada → nenhuma gravação;
 *   • exclusão física → sempre recusada.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deepChain } from '@/test/deepChain';

const { mockFrom, mockRpc, cenario } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  cenario: { modoReal: false, demo: false },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: unknown[]) => deepChain(mockFrom(...a)),
    rpc: (...a: unknown[]) => mockRpc(...a),
  },
}));

// O portão do modo real fica controlável pelo teste (a flag do código é intacta).
vi.mock('@/components/avaliacao/nineBoxModo', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/components/avaliacao/nineBoxModo')>();
  return {
    ...real,
    modoRealAtivo: () => cenario.modoReal,
    exigirModoReal: (operacao: string) => {
      if (!cenario.modoReal) throw new real.ModoRealIndisponivelError(operacao);
    },
  };
});

vi.mock('@/mocks/desempenhoMock', () => ({
  isDesempenhoMockEnabled: () => cenario.demo,
}));

import { avaliacaoService } from '../avaliacaoService';
import { EscritaBloqueadaError } from '@/components/avaliacao/escritaOperacional';

const PARAMS = {
  empresaId: 'emp-1',
  avaliadoId: 'colab-1',
  cicloId: 'ciclo-1',
  tipo: 'gestor' as const,
  notaGeral: 4.5,
  potencial: 4,
  avaliadorId: 'colab-2',
  pontosFortes: 'Entrega',
  pontosMelhoria: 'Delegação',
  comentarios: 'Ok',
  idOperacao: 'op-1',
};

const RESPOSTA_CRIACAO = {
  ok: true,
  feedback_id: 'f1',
  status: 'pendente',
  auditoria_id: 'a1',
  idempotente: false,
};

function setupInsertChain(data: any, error: any = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data, error });
  const selectFn = vi.fn().mockReturnValue({ maybeSingle });
  const insertFn = vi.fn().mockReturnValue({ select: selectFn });
  mockFrom.mockReturnValue({ insert: insertFn });
  return { insertFn, maybeSingle };
}

beforeEach(() => {
  vi.clearAllMocks();
  cenario.modoReal = false;
  cenario.demo = false;
});

describe('flag do Nine-Box desligada NÃO bloqueia a escrita de UUID real', () => {
  it('criarFeedbackSeguro chama a RPC com IDs reais', async () => {
    mockRpc.mockResolvedValue({ data: RESPOSTA_CRIACAO, error: null });
    await avaliacaoService.criarFeedbackSeguro(PARAMS);
    expect(mockRpc).toHaveBeenCalledWith('criar_feedback_seguro', expect.objectContaining({ p_empresa_id: 'emp-1' }));
  });

  it('finalizarFeedback chama a RPC com feedback real', async () => {
    mockRpc.mockResolvedValue({ data: { ok: true, status_novo: 'concluido' }, error: null });
    await avaliacaoService.finalizarFeedback({ feedbackId: 'f1', acao: 'concluir', idOperacao: 'op-1' });
    expect(mockRpc).toHaveBeenCalledWith('finalizar_feedback', expect.objectContaining({ p_feedback_id: 'f1' }));
  });

  it('validarPotencialAvaliacao chama a RPC com feedback real', async () => {
    mockRpc.mockResolvedValue({ data: { ok: true, versao_avaliacao: 'v1' }, error: null });
    await avaliacaoService.validarPotencialAvaliacao({ feedbackId: 'f1', idOperacao: 'op-1' });
    expect(mockRpc).toHaveBeenCalledWith(
      'validar_potencial_avaliacao',
      expect.objectContaining({ p_feedback_id: 'f1' })
    );
  });
});

describe('modo real LIGADO · criação auditada', () => {
  beforeEach(() => {
    cenario.modoReal = true;
  });

  it('envia o payload EXATO para criar_feedback_seguro', async () => {
    mockRpc.mockResolvedValue({ data: RESPOSTA_CRIACAO, error: null });
    const r = await avaliacaoService.criarFeedbackSeguro(PARAMS);

    expect(mockRpc).toHaveBeenCalledTimes(1);
    const [nome, args] = mockRpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(nome).toBe('criar_feedback_seguro');
    expect(args).toEqual({
      p_empresa_id: 'emp-1',
      p_avaliado_id: 'colab-1',
      p_ciclo_id: 'ciclo-1',
      p_tipo: 'gestor',
      p_nota_geral: 4.5,
      p_potencial: 4,
      p_avaliador_id: 'colab-2',
      p_pontos_fortes: 'Entrega',
      p_pontos_melhoria: 'Delegação',
      p_comentarios: 'Ok',
      p_idempotencia: 'op-1',
    });
    expect(r).toEqual(RESPOSTA_CRIACAO);
  });

  it('Potencial e avaliador ausentes viram NULL (não undefined)', async () => {
    mockRpc.mockResolvedValue({ data: RESPOSTA_CRIACAO, error: null });
    await avaliacaoService.criarFeedbackSeguro({
      ...PARAMS,
      potencial: undefined,
      avaliadorId: null,
    });
    const args = mockRpc.mock.calls[0][1] as Record<string, unknown>;
    expect(args.p_potencial).toBeNull();
    expect(args.p_avaliador_id).toBeNull();
  });

  it('REENVIO com a mesma chave manda a MESMA idempotência (não duplica)', async () => {
    mockRpc
      .mockResolvedValueOnce({ data: { ...RESPOSTA_CRIACAO, idempotente: false }, error: null })
      .mockResolvedValueOnce({
        data: { ...RESPOSTA_CRIACAO, idempotente: true, auditoria_id: 'a1' },
        error: null,
      });

    const primeira = await avaliacaoService.criarFeedbackSeguro(PARAMS);
    const reenvio = await avaliacaoService.criarFeedbackSeguro(PARAMS);

    expect(mockRpc).toHaveBeenCalledTimes(2);
    const chaves = mockRpc.mock.calls.map((c) => (c[1] as Record<string, unknown>).p_idempotencia);
    expect(chaves).toEqual(['op-1', 'op-1']);
    expect(primeira.idempotente).toBe(false);
    expect(reenvio.idempotente).toBe(true);
  });

  it('erro da RPC (autorização/validação) é propagado com a mensagem REAL', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'permission denied for function criar_feedback_seguro' },
    });
    await expect(avaliacaoService.criarFeedbackSeguro(PARAMS)).rejects.toMatchObject({
      message: 'permission denied for function criar_feedback_seguro',
    });
  });

  it('falha de REDE é propagada (nada de sucesso falso)', async () => {
    mockRpc.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(avaliacaoService.criarFeedbackSeguro(PARAMS)).rejects.toThrow('Failed to fetch');
  });

  it('finalizarFeedback envia ação, motivo e chave', async () => {
    mockRpc.mockResolvedValue({
      data: { ok: true, status_anterior: 'pendente', status_novo: 'cancelado', auditoria_id: 'a2', idempotente: false },
      error: null,
    });
    await avaliacaoService.finalizarFeedback({
      feedbackId: 'f1',
      acao: 'cancelar',
      motivo: 'Duplicidade',
      idOperacao: 'op-2',
    });
    expect(mockRpc.mock.calls[0][0]).toBe('finalizar_feedback');
    expect(mockRpc.mock.calls[0][1]).toEqual({
      p_feedback_id: 'f1',
      p_acao: 'cancelar',
      p_motivo: 'Duplicidade',
      p_idempotencia: 'op-2',
    });
  });

  it('validarPotencialAvaliacao envia observação e chave', async () => {
    mockRpc.mockResolvedValue({
      data: { ok: true, validacao_id: 'v1', versao_avaliacao: 'h1', potencial_validado: 4, idempotente: false },
      error: null,
    });
    await avaliacaoService.validarPotencialAvaliacao({
      feedbackId: 'f1',
      idOperacao: 'op-3',
      observacao: 'Avaliado pelo comitê',
    });
    expect(mockRpc.mock.calls[0][0]).toBe('validar_potencial_avaliacao');
    expect(mockRpc.mock.calls[0][1]).toEqual({
      p_feedback_id: 'f1',
      p_idempotencia: 'op-3',
      p_observacao: 'Avaliado pelo comitê',
    });
  });
});

describe('guarda de escrita operacional (id fictício / demonstração)', () => {
  it('MESMO em modo real, id fictício é bloqueado ANTES da rede', async () => {
    cenario.modoReal = true;
    await expect(avaliacaoService.criarFeedbackSeguro({ ...PARAMS, cicloId: 'mock-ciclo-3' })).rejects.toBeInstanceOf(
      EscritaBloqueadaError
    );
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('empresa fictícia (`mock-empresa-1`) também é bloqueada', async () => {
    cenario.modoReal = true;
    let erro: unknown = null;
    try {
      await avaliacaoService.criarFeedbackSeguro({ ...PARAMS, empresaId: 'mock-empresa-1' });
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(EscritaBloqueadaError);
    expect((erro as EscritaBloqueadaError).campos).toEqual(['empresa_id']);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('ações de status/validação com feedback fictício ficam bloqueadas', async () => {
    cenario.modoReal = true;
    await expect(
      avaliacaoService.finalizarFeedback({ feedbackId: 'mock-feedback-1', acao: 'concluir', idOperacao: 'op-1' })
    ).rejects.toBeInstanceOf(EscritaBloqueadaError);
    await expect(
      avaliacaoService.validarPotencialAvaliacao({ feedbackId: 'mock-feedback-1', idOperacao: 'op-1' })
    ).rejects.toBeInstanceOf(EscritaBloqueadaError);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('demonstração ligada NÃO bloqueia UUID real; `demo-*` é bloqueado', async () => {
    cenario.modoReal = true;
    cenario.demo = true;
    mockRpc.mockResolvedValue({ data: RESPOSTA_CRIACAO, error: null });
    await avaliacaoService.criarFeedbackSeguro(PARAMS);
    expect(mockRpc).toHaveBeenCalledTimes(1);

    let erro: unknown = null;
    try {
      await avaliacaoService.criarFeedbackSeguro({ ...PARAMS, avaliadoId: 'demo-colab-1' });
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(EscritaBloqueadaError);
    expect((erro as EscritaBloqueadaError).motivo).toBe('dado_ficticio');
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it('INSERT direto legado (criarFeedback) também respeita a guarda', async () => {
    const { insertFn } = setupInsertChain({ id: 'f1' });
    await expect(
      avaliacaoService.criarFeedback({ empresa_id: 'mock-empresa-1', avaliado_id: 'mock-colab-1' })
    ).rejects.toBeInstanceOf(EscritaBloqueadaError);
    expect(insertFn).not.toHaveBeenCalled();
  });

  it('criarFeedback com dados REAIS segue gravando (nada mudou por acidente)', async () => {
    const { insertFn } = setupInsertChain({ id: 'f1' });
    const r = await avaliacaoService.criarFeedback({ empresa_id: 'emp-1', avaliado_id: 'colab-1' });
    expect(insertFn).toHaveBeenCalledTimes(1);
    expect(r).toEqual({ id: 'f1' });
  });
});

describe('exclusão física (regra oficial: cancelar, nunca apagar)', () => {
  it('excluirFeedback recusa e NÃO fala com o banco', async () => {
    await expect(avaliacaoService.excluirFeedback('f1', 'emp-1')).rejects.toThrow(/EXCLUSAO_FISICA_DESATIVADA/);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('recusa antes de tudo quando falta a empresa (isolamento de tenant)', async () => {
    await expect(avaliacaoService.excluirFeedback('f1', '')).rejects.toThrow(/empresa_id obrigatório/);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
