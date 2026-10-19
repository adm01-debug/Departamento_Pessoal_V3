/**
 * ============================================================================
 * CONTRATO DO CAMINHO REAL — aprovação do gestor no Supabase (RPCs).
 *
 * O que esta suíte prova (sem fingir integração):
 *   • os métodos do serviço chamam EXATAMENTE as RPCs da migration aditiva;
 *   • os parâmetros (`p_colaborador_id`, `p_ciclo_id`, `p_decisao`,
 *     `p_justificativa`, `p_idempotencia`) chegam no formato esperado;
 *   • erros da RPC são REPASSADOS (nenhum sucesso fabricado);
 *   • a guarda de escrita recusa `mock-*` ANTES da rede;
 *   • as leituras são escopadas por empresa (isolamento de tenant).
 *
 * O que ela NÃO é: teste de integração com o banco real. Enquanto a migration
 * `20261017090000_ninebox_aprovacao_gestor` não for aplicada no projeto
 * `frjbfeamybqsejlvmqbl`, as RPCs respondem 404 — é o bloqueio declarado.
 * ============================================================================
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRpc, mockFrom } = vi.hoisted(() => ({ mockRpc: vi.fn(), mockFrom: vi.fn() }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Em teste, `exigirModoReal` lançaria (a flag de ambiente está desligada).
vi.mock('@/components/avaliacao/nineBoxModo', () => ({
  exigirModoReal: () => {},
  modoRealAtivo: () => true,
}));

import { avaliacaoService } from '../avaliacaoService';
import { EscritaBloqueadaError } from '@/components/avaliacao/escritaOperacional';

/** Cadeia de query thenable (select → eq → eq → await). */
function cadeia(resultado: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const devolve = () => chain;
  chain.select = vi.fn(devolve);
  chain.eq = vi.fn(devolve);
  chain.order = vi.fn(devolve);
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(resultado).then(resolve);
  return chain;
}

const ok = (data: unknown) => ({ data, error: null });

describe('avaliação — RPCs reais de aprovação do gestor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enviar: chama `enviar_avaliacao_ao_gestor` com a chave de idempotência', async () => {
    mockRpc.mockResolvedValue(ok({ ok: true, status: 'aguardando_gestor' }));

    await avaliacaoService.enviarAvaliacaoAoGestor({
      colaboradorId: '11111111-1111-4111-8111-111111111111',
      cicloId: '22222222-2222-4222-8222-222222222222',
      idOperacao: 'op-1',
    });

    expect(mockRpc).toHaveBeenCalledWith('enviar_avaliacao_ao_gestor', {
      p_colaborador_id: '11111111-1111-4111-8111-111111111111',
      p_ciclo_id: '22222222-2222-4222-8222-222222222222',
      p_idempotencia: 'op-1',
    });
  });

  it('enviar: recusa identificador fictício ANTES da rede', async () => {
    await expect(
      avaliacaoService.enviarAvaliacaoAoGestor({
        colaboradorId: 'mock-2',
        cicloId: 'mock-ciclo-3',
        idOperacao: 'op-1',
      })
    ).rejects.toBeInstanceOf(EscritaBloqueadaError);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('aprovar: envia decisão + justificativa + idempotência para a RPC', async () => {
    mockRpc.mockResolvedValue(
      ok({ ok: true, aprovacao_id: 'a1', decisao: 'aprovado', status: 'aprovada_gestor', versao_avaliacao: 'v1' })
    );

    const r = await avaliacaoService.decidirAprovacaoGestor({
      colaboradorId: '11111111-1111-4111-8111-111111111111',
      cicloId: '22222222-2222-4222-8222-222222222222',
      decisao: 'aprovado',
      justificativa: null,
      idOperacao: 'op-2',
    });

    expect(mockRpc).toHaveBeenCalledWith('decidir_aprovacao_gestor', {
      p_colaborador_id: '11111111-1111-4111-8111-111111111111',
      p_ciclo_id: '22222222-2222-4222-8222-222222222222',
      p_decisao: 'aprovado',
      p_justificativa: null,
      p_idempotencia: 'op-2',
    });
    expect(r).toMatchObject({ ok: true, status: 'aprovada_gestor' });
  });

  it('devolver: repassa a justificativa obrigatória', async () => {
    mockRpc.mockResolvedValue(ok({ ok: true, status: 'devolvida' }));

    await avaliacaoService.decidirAprovacaoGestor({
      colaboradorId: '11111111-1111-4111-8111-111111111111',
      cicloId: '22222222-2222-4222-8222-222222222222',
      decisao: 'devolvido',
      justificativa: 'Revisar os pontos de melhoria',
      idOperacao: 'op-3',
    });

    expect(mockRpc.mock.calls[0][1]).toMatchObject({
      p_decisao: 'devolvido',
      p_justificativa: 'Revisar os pontos de melhoria',
    });
  });

  it('erro da RPC (ex.: perfil_nao_autorizado) é PROPAGADO — sem sucesso falso', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'perfil_nao_autorizado' } });

    await expect(
      avaliacaoService.decidirAprovacaoGestor({
        colaboradorId: '11111111-1111-4111-8111-111111111111',
        cicloId: '22222222-2222-4222-8222-222222222222',
        decisao: 'aprovado',
        idOperacao: 'op-4',
      })
    ).rejects.toMatchObject({ message: 'perfil_nao_autorizado' });
  });

  it('validar Potencial: chama a RPC com feedback + idempotência + observação', async () => {
    mockRpc.mockResolvedValue(ok({ ok: true, validacao_id: 'v1', versao_avaliacao: 'h1', potencial_validado: 4 }));

    await avaliacaoService.validarPotencialAvaliacao({
      feedbackId: '33333333-3333-4333-8333-333333333333',
      idOperacao: 'op-5',
      observacao: 'ok',
    });

    expect(mockRpc).toHaveBeenCalledWith('validar_potencial_avaliacao', {
      p_feedback_id: '33333333-3333-4333-8333-333333333333',
      p_idempotencia: 'op-5',
      p_observacao: 'ok',
    });
  });

  it('validar Potencial: recusa `mock-*` antes da rede', async () => {
    await expect(
      avaliacaoService.validarPotencialAvaliacao({ feedbackId: 'mock-fb-1', idOperacao: 'op-5' })
    ).rejects.toBeInstanceOf(EscritaBloqueadaError);
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe('avaliação — leituras do fluxo escopadas por empresa', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('consolidações: filtra por empresa (e ciclo, quando informado)', async () => {
    const chain = cadeia(ok([{ id: 'c1' }]));
    mockFrom.mockReturnValue(chain);

    const linhas = await avaliacaoService.listarConsolidacoes('emp-1', 'ciclo-1');

    expect(mockFrom).toHaveBeenCalledWith('feedbacks_360_consolidacoes');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
    expect(chain.eq).toHaveBeenCalledWith('ciclo_id', 'ciclo-1');
    expect(linhas).toEqual([{ id: 'c1' }]);
  });

  it('decisões: filtra por empresa e ordena pela decisão mais recente', async () => {
    const chain = cadeia(ok([{ id: 'a1' }]));
    mockFrom.mockReturnValue(chain);

    await avaliacaoService.listarAprovacoesGestor('emp-1');

    expect(mockFrom).toHaveBeenCalledWith('feedbacks_360_aprovacoes_gestor');
    expect(chain.order).toHaveBeenCalledWith('decidido_em', { ascending: false });
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('vínculos: lê SOMENTE id/user_id/supervisor_id da empresa', async () => {
    const chain = cadeia(ok([{ id: 'colab-1', user_id: 'u1', supervisor_id: null }]));
    mockFrom.mockReturnValue(chain);

    await avaliacaoService.listarVinculos('emp-1');

    expect(mockFrom).toHaveBeenCalledWith('colaboradores');
    expect(chain.select).toHaveBeenCalledWith('id, user_id, supervisor_id');
    expect(chain.eq).toHaveBeenCalledWith('empresa_id', 'emp-1');
  });

  it('erro de leitura é propagado (a fila não inventa estado)', async () => {
    const chain = cadeia({ data: null, error: { message: 'permission denied' } });
    mockFrom.mockReturnValue(chain);

    await expect(avaliacaoService.listarConsolidacoes('emp-1')).rejects.toMatchObject({
      message: 'permission denied',
    });
  });
});
