/**
 * ============================================================================
 * REGRESSÃO DA HOMOLOGAÇÃO — FEEDBACK CANCELADO NA VITRINE.
 *
 * O defeito era exatamente este: a mutation de edição gravava
 * `status: 'pendente'` no localStorage sem ler o status atual. Estes testes
 * cobrem a persistência demonstrativa e a reabertura administrativa:
 *   • cancelado sobrevive à releitura (F5 / novo login);
 *   • edição direta do cancelado lança e NÃO altera o registro;
 *   • reabrir sem capacidade administrativa é recusado;
 *   • reabrir sem justificativa é recusado;
 *   • reabrir autorizado + justificativa volta para pendente e libera edição.
 * ============================================================================
 */
import { beforeEach, describe, expect, it } from 'vitest';

import {
  atualizarRegistroDemo,
  lerRegistrosDemo,
  limparRegistrosDemo,
} from '@/components/avaliacao/desempenhoDemoStore';
import { criarServicoDemo } from '@/components/avaliacao/servicoDemo';
import { feedbackCancelado, MOTIVO_EDICAO_CANCELADA } from '@/components/avaliacao/edicaoFeedback';

const ID = 'demo-feedback-cancelado';

function feedbackDe(): {
  id: string;
  avaliado_id: string;
  ciclo_id: string;
  status?: string;
  [campo: string]: unknown;
} {
  const estado = lerRegistrosDemo();
  return {
    id: ID,
    avaliado_id: 'demo-colab-1',
    ciclo_id: 'demo-ciclo-1',
    ...(estado.criados.feedbacks[ID] ?? {}),
    ...(estado.patches.feedbacks[ID] ?? {}),
  };
}

function semearCancelado() {
  atualizarRegistroDemo(
    'feedbacks',
    ID,
    {
      id: ID,
      avaliado_id: 'demo-colab-1',
      ciclo_id: 'demo-ciclo-1',
      status: 'cancelado',
      comentarios: 'Texto original',
    },
    { operacao: 'status', descricao: 'Cancelamento da vitrine' }
  );
}

function servico(podeGerirAvaliacoes: boolean) {
  return criarServicoDemo({
    usuarioId: 'demo-user',
    email: 'demo@exemplo.invalid',
    feedbackDe,
    feedbacks: [feedbackDe()],
    podeGerirAvaliacoes,
  });
}

beforeEach(() => {
  localStorage.clear();
  limparRegistrosDemo();
});

describe('edição de feedback cancelado na demonstração', () => {
  it('reconhece todas as grafias de cancelamento', () => {
    ['cancelado', 'Cancelada', ' CANCELADO ', 'cancel'].forEach((status) =>
      expect(feedbackCancelado(status)).toBe(true)
    );
    ['pendente', 'concluido', 'concluída', ''].forEach((status) => expect(feedbackCancelado(status)).toBe(false));
  });

  it('cancelado permanece cancelado após reler o armazenamento (F5/novo login)', () => {
    semearCancelado();
    // `lerRegistrosDemo` é a MESMA leitura feita depois de recarregar a página.
    expect(lerRegistrosDemo().patches.feedbacks[ID]?.status).toBe('cancelado');
    expect(feedbackDe().status).toBe('cancelado');
  });

  it('cancelamento demonstrativo grava status + motivo e confirma a releitura local', async () => {
    atualizarRegistroDemo(
      'feedbacks',
      ID,
      { id: ID, avaliado_id: 'demo-colab-1', ciclo_id: 'demo-ciclo-1', status: 'pendente' },
      { operacao: 'status', descricao: 'Registro pendente da vitrine' }
    );

    await expect(
      servico(true).finalizarFeedback({
        feedbackId: ID,
        acao: 'cancelar',
        motivo: 'Cancelamento demonstrativo com justificativa',
        idOperacao: 'op-cancelar-demo',
      })
    ).resolves.toMatchObject({ ok: true, status: 'cancelado' });

    expect(feedbackDe().status).toBe('cancelado');
    expect(feedbackDe().motivo_cancelamento).toBe('Cancelamento demonstrativo com justificativa');
    expect(lerRegistrosDemo().historico.at(-1)).toMatchObject({
      id: ID,
      operacao: 'status',
      dados: { status: 'cancelado' },
    });
  });

  it('edição direta do cancelado é recusada e não altera texto/status', () => {
    semearCancelado();

    expect(() =>
      atualizarRegistroDemo(
        'feedbacks',
        ID,
        { status: 'pendente', comentarios: 'Tentativa de edição' },
        { operacao: 'editar', descricao: 'Edição indevida' }
      )
    ).toThrow(MOTIVO_EDICAO_CANCELADA);

    const estado = lerRegistrosDemo();
    expect(estado.patches.feedbacks[ID]?.status).toBe('cancelado');
    expect(estado.patches.feedbacks[ID]?.comentarios).toBe('Texto original');
    expect(estado.historico.filter((e) => e.operacao === 'editar')).toHaveLength(0);
  });

  it('reabertura sem capacidade administrativa é bloqueada', async () => {
    semearCancelado();

    await expect(
      servico(false).finalizarFeedback({
        feedbackId: ID,
        acao: 'reabrir',
        motivo: 'Justificativa administrativa válida',
        idOperacao: 'op-sem-permissao',
      })
    ).rejects.toThrow('perfil_nao_autorizado');

    expect(feedbackDe().status).toBe('cancelado');
  });

  it('reabertura autorizada sem justificativa é bloqueada', async () => {
    semearCancelado();

    await expect(
      servico(true).finalizarFeedback({
        feedbackId: ID,
        acao: 'reabrir',
        motivo: 'curta',
        idOperacao: 'op-sem-justificativa',
      })
    ).rejects.toThrow('justificativa_obrigatoria');

    expect(feedbackDe().status).toBe('cancelado');
  });

  it('reabertura autorizada com justificativa volta a pendente e libera a edição', async () => {
    semearCancelado();

    await expect(
      servico(true).finalizarFeedback({
        feedbackId: ID,
        acao: 'reabrir',
        motivo: 'Reabertura autorizada pelo RH para corrigir a nota',
        idOperacao: 'op-reabertura-autorizada',
      })
    ).resolves.toMatchObject({ ok: true, status: 'pendente', acao: 'reabrir' });

    expect(feedbackDe().status).toBe('pendente');

    expect(() =>
      atualizarRegistroDemo(
        'feedbacks',
        ID,
        { status: 'pendente', comentarios: 'Texto corrigido após reabertura' },
        { operacao: 'editar', descricao: 'Edição após reabertura' }
      )
    ).not.toThrow();

    const estado = lerRegistrosDemo();
    expect(estado.patches.feedbacks[ID]?.status).toBe('pendente');
    expect(estado.patches.feedbacks[ID]?.comentarios).toBe('Texto corrigido após reabertura');
  });

  it('concluído pode ser reaberto pela administração com justificativa', async () => {
    atualizarRegistroDemo(
      'feedbacks',
      ID,
      { id: ID, avaliado_id: 'demo-colab-1', ciclo_id: 'demo-ciclo-1', status: 'concluido' },
      { operacao: 'status', descricao: 'Registro concluído da vitrine' }
    );

    await expect(
      servico(true).finalizarFeedback({
        feedbackId: ID,
        acao: 'reabrir',
        motivo: 'Reabertura de avaliação concluída para correção',
        idOperacao: 'op-reabrir-concluido',
      })
    ).resolves.toMatchObject({ ok: true, status: 'pendente', acao: 'reabrir' });

    expect(feedbackDe().status).toBe('pendente');
  });

  it('feedback pendente continua editável sem passar por reabertura', () => {
    atualizarRegistroDemo(
      'feedbacks',
      ID,
      { id: ID, avaliado_id: 'demo-colab-1', ciclo_id: 'demo-ciclo-1', status: 'pendente' },
      { operacao: 'status', descricao: 'Registro pendente da vitrine' }
    );

    expect(() =>
      atualizarRegistroDemo(
        'feedbacks',
        ID,
        { status: 'pendente', pontos_fortes: 'Ajuste permitido' },
        { operacao: 'editar', descricao: 'Edição permitida' }
      )
    ).not.toThrow();

    expect(lerRegistrosDemo().patches.feedbacks[ID]?.pontos_fortes).toBe('Ajuste permitido');
  });
});
