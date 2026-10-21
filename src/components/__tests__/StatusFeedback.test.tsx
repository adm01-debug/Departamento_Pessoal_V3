import { describe, it, expect } from 'vitest';
import {
  MIN_CARACTERES_MOTIVO,
  ROTULO_ACAO,
  ROTULO_STATUS,
  STATUS_FEEDBACK,
  TRANSICOES,
  montarChaveIdempotencia,
  montarOperacao,
  normalizarStatus,
  validarCancelamento,
  validarConclusao,
  validarTransicao,
  type PerfilOperador,
} from '@/components/avaliacao/statusFeedback';

/**
 * ============================================================================
 * Prova da MÁQUINA DE ESTADOS da finalização de feedbacks.
 *
 * Nada aqui toca banco: são funções puras. Os dados são sintéticos e cobrem as
 * quatro correções obrigatórias do plano: autorização é do backend, operação
 * atômica, idempotência por operação e potencial que NÃO bloqueia a conclusão.
 * ============================================================================
 */

const FEEDBACK_COMPLETO = {
  avaliado_id: 'col-1',
  avaliador_id: 'aval-1',
  ciclo_id: 'ciclo-3',
  nota_geral: 4,
  potencial: 4,
  comentarios: 'Bom ciclo.',
};

describe('status — estados e leitura', () => {
  it('reconhece os três estados e isola qualquer outro valor', () => {
    expect(normalizarStatus('concluido')).toBe(STATUS_FEEDBACK.CONCLUIDO);
    expect(normalizarStatus('  PENDENTE ')).toBe(STATUS_FEEDBACK.PENDENTE);
    expect(normalizarStatus('cancelado')).toBe(STATUS_FEEDBACK.CANCELADO);
    expect(normalizarStatus('em_analise')).toBe('desconhecido');
    expect(normalizarStatus(null)).toBe('desconhecido');
  });

  it('a coluna é texto livre: o código não assume o valor do banco', () => {
    // O DDL tem DEFAULT 'pendente' e nenhum CHECK — só três valores são tratados.
    expect(ROTULO_STATUS.desconhecido).toBe('Status desconhecido');
    expect(Object.keys(ROTULO_STATUS)).toHaveLength(4);
  });
});

describe('status — transições permitidas e proibidas', () => {
  const t = (statusAtual: unknown, acao: any, perfil: PerfilOperador) =>
    validarTransicao({ statusAtual, acao, perfil });

  it('pendente → concluído é oferecido a gestor, RH/admin e avaliador designado', () => {
    for (const perfil of ['gestor', 'admin_rh', 'avaliador'] as PerfilOperador[]) {
      const r = t('pendente', 'concluir', perfil);
      expect(r.permitido).toBe(true);
      expect(r.para).toBe('concluido');
    }
    const desconhecido = t('pendente', 'concluir', 'desconhecido');
    expect(desconhecido.permitido).toBe(false);
    expect(desconhecido.para).toBeNull();
  });

  it('TODA resposta exige validação no backend (autorização não é do frontend)', () => {
    expect(t('pendente', 'concluir', 'gestor').exigeBackend).toBe(true);
    expect(t('pendente', 'concluir', 'desconhecido').exigeBackend).toBe(true);
    expect(t('lixo', 'concluir', 'admin_rh').exigeBackend).toBe(true);
  });

  it('concluído → cancelado é PROIBIDO: exige reabrir primeiro', () => {
    const r = t('concluido', 'cancelar', 'admin_rh');
    expect(r.permitido).toBe(false);
    expect(r.motivo).toBe('transicao_proibida');
    expect(r.para).toBeNull();
  });

  it('reabrir é exclusivo de admin/RH', () => {
    expect(t('concluido', 'reabrir', 'admin_rh')).toMatchObject({ permitido: true, para: 'pendente' });
    expect(t('cancelado', 'reabrir', 'admin_rh')).toMatchObject({ permitido: true, para: 'pendente' });
    expect(t('concluido', 'reabrir', 'gestor').motivo).toBe('perfil_nao_autorizado');
  });

  it('status desconhecido não permite nenhuma ação', () => {
    const r = t('qualquer_coisa', 'concluir', 'admin_rh');
    expect(r.motivo).toBe('status_desconhecido');
    expect(r.permitido).toBe(false);
  });

  it('ação sem transição declarada é recusada', () => {
    expect(t('cancelado', 'concluir', 'admin_rh').motivo).toBe('transicao_inexistente');
  });

  it('a tabela cobre os três estados sem beco sem saída', () => {
    const saidas = TRANSICOES.filter((x) => x.perfis.length > 0);
    expect(saidas.map((x) => `${x.de}-${x.acao}-${x.para}`)).toEqual([
      'pendente-concluir-concluido',
      'pendente-cancelar-cancelado',
      'concluido-reabrir-pendente',
      'cancelado-reabrir-pendente',
    ]);
  });
});

describe('validação de conclusão — potenciais ausentes NÃO bloqueiam', () => {
  it('feedback completo conclui', () => {
    expect(validarConclusao(FEEDBACK_COMPLETO)).toEqual({ podeConcluir: true, impedimentos: [], avisos: [] });
  });

  it('potencial ausente é AVISO, nunca impedimento', () => {
    const r = validarConclusao({ ...FEEDBACK_COMPLETO, potencial: null });
    expect(r.podeConcluir).toBe(true);
    expect(r.impedimentos).toEqual([]);
    expect(r.avisos).toContain('potencial_ausente');
  });

  it('potencial fora da escala é aviso, não bloqueio', () => {
    const r = validarConclusao({ ...FEEDBACK_COMPLETO, potencial: 9 });
    expect(r.podeConcluir).toBe(true);
    expect(r.avisos).toContain('potencial_fora_da_escala');
  });

  it('faltando identidade/ciclo, bloqueia com o motivo certo', () => {
    const r = validarConclusao({ ...FEEDBACK_COMPLETO, avaliado_id: null, avaliador_id: '  ', ciclo_id: null });
    expect(r.podeConcluir).toBe(false);
    expect(r.impedimentos).toEqual(['avaliado_ausente', 'avaliador_ausente', 'ciclo_ausente']);
  });

  it('desempenho ausente e fora da escala são impedimentos distintos', () => {
    expect(validarConclusao({ ...FEEDBACK_COMPLETO, nota_geral: null }).impedimentos).toEqual(['desempenho_ausente']);
    expect(validarConclusao({ ...FEEDBACK_COMPLETO, nota_geral: 0 }).impedimentos).toEqual([
      'desempenho_fora_da_escala',
    ]);
    expect(validarConclusao({ ...FEEDBACK_COMPLETO, nota_geral: 5.5 }).impedimentos).toEqual([
      'desempenho_fora_da_escala',
    ]);
  });

  it('`performance` legado ainda é lido quando `nota_geral` não existe', () => {
    const r = validarConclusao({ ...FEEDBACK_COMPLETO, nota_geral: null, performance: 4 });
    expect(r.podeConcluir).toBe(true);
  });

  it('sem nenhum texto de apoio: aviso (não impede)', () => {
    const r = validarConclusao({ ...FEEDBACK_COMPLETO, comentarios: '', pontos_fortes: '', pontos_melhoria: '' });
    expect(r.podeConcluir).toBe(true);
    expect(r.avisos).toContain('sem_texto_de_apoio');
  });

  it('cancelar exige motivo com um mínimo de caracteres', () => {
    expect(validarCancelamento({}).impedimentos).toEqual(['motivo_ausente']);
    expect(validarCancelamento({ motivo: '  ' }).impedimentos).toEqual(['motivo_ausente']);
    expect(validarCancelamento({ motivo: 'a'.repeat(MIN_CARACTERES_MOTIVO - 1) }).impedimentos).toEqual([
      'motivo_curto',
    ]);
    expect(validarCancelamento({ motivo: 'erro de digitação' }).podeCancelar).toBe(true);
  });
});

describe('idempotência — chave por OPERAÇÃO, não hash de conteúdo', () => {
  it('compõe operacao:feedback:idOperacao', () => {
    const r = montarChaveIdempotencia({ operacao: 'concluir', feedbackId: 'fb-1', idOperacao: 'op-abc' });
    expect(r).toEqual({ valida: true, chave: 'concluir:fb-1:op-abc', motivo: 'ok' });
  });

  it('exige idOperacao: sem ele, a operação não é idempotente', () => {
    expect(montarChaveIdempotencia({ operacao: 'concluir', feedbackId: 'fb-1', idOperacao: '' }).motivo).toBe(
      'id_operacao_ausente'
    );
  });

  it('duas operações distintas sobre o MESMO feedback geram chaves distintas', () => {
    const a = montarChaveIdempotencia({ operacao: 'concluir', feedbackId: 'fb-1', idOperacao: 'op-1' });
    const b = montarChaveIdempotencia({ operacao: 'concluir', feedbackId: 'fb-1', idOperacao: 'op-2' });
    expect(a.chave).not.toBe(b.chave);
  });

  it('a chave NÃO depende das notas: avaliações iguais são atos diferentes', () => {
    const u1 = montarChaveIdempotencia({ operacao: 'concluir', feedbackId: 'fb-A', idOperacao: 'op-1' });
    const u2 = montarChaveIdempotencia({ operacao: 'concluir', feedbackId: 'fb-B', idOperacao: 'op-2' });
    expect(u1.chave).toBe('concluir:fb-A:op-1');
    expect(u2.chave).toBe('concluir:fb-B:op-2');
  });
});

describe('operação completa — status + auditoria no mesmo payload', () => {
  const base = {
    feedbackId: 'fb-1',
    empresaId: 'emp-1',
    statusAtual: 'pendente',
    perfil: 'gestor' as PerfilOperador,
    feedback: FEEDBACK_COMPLETO,
    idOperacao: 'op-1',
    usuarioEmail: 'rh@empresa.com',
  };

  it('concluir monta a operação com trilha de auditoria e exige backend', () => {
    const r = montarOperacao({ ...base, operacao: 'concluir' });
    expect(r.pronta).toBe(true);
    if (!r.pronta) return;
    expect(r.operacao).toMatchObject({
      de: 'pendente',
      para: 'concluido',
      chaveIdempotencia: 'concluir:fb-1:op-1',
      exigeBackend: true,
    });
    expect(r.operacao.auditoria.camposAlterados).toEqual(['status']);
    expect(r.operacao.auditoria.dadosAnteriores).toEqual({ status: 'pendente' });
    expect(r.operacao.auditoria.dadosNovos).toEqual({ status: 'concluido' });
    expect(r.operacao.auditoria.exigeBackend).toBe(true);
  });

  it('cancelar exige motivo e o leva como observação (destino é do backend)', () => {
    const semMotivo = montarOperacao({ ...base, operacao: 'cancelar' });
    expect(semMotivo.pronta).toBe(false);

    const comMotivo = montarOperacao({ ...base, operacao: 'cancelar', motivoCancelamento: 'Duplicidade real' });
    expect(comMotivo.pronta).toBe(true);
    if (!comMotivo.pronta) return;
    expect(comMotivo.operacao.para).toBe('cancelado');
    expect(comMotivo.operacao.observacao).toBe('Duplicidade real');
  });

  it('concluir com dados insuficientes não monta operação', () => {
    const r = montarOperacao({ ...base, operacao: 'concluir', feedback: { ...FEEDBACK_COMPLETO, nota_geral: null } });
    expect(r.pronta).toBe(false);
    if (r.pronta) return;
    expect(r.motivo).toBe('desempenho_ausente');
  });

  it('perfil sem permissão não monta operação (e o backend revalida)', () => {
    const r = montarOperacao({ ...base, operacao: 'reabrir', statusAtual: 'concluido', perfil: 'gestor' });
    expect(r.pronta).toBe(false);
    if (r.pronta) return;
    expect(r.motivo).toBe('perfil_nao_autorizado');
  });

  it('REABRIR exige justificativa (histórico tem de explicar a volta a pendente)', () => {
    const semJustificativa = montarOperacao({
      ...base,
      operacao: 'reabrir',
      statusAtual: 'concluido',
      perfil: 'admin_rh',
    });
    expect(semJustificativa.pronta).toBe(false);
    if (semJustificativa.pronta) return;
    expect(semJustificativa.motivo).toBe('justificativa_ausente');

    const curta = montarOperacao({
      ...base,
      operacao: 'reabrir',
      statusAtual: 'concluido',
      perfil: 'admin_rh',
      justificativaReabertura: 'curta',
    });
    expect(curta.pronta).toBe(false);
    if (curta.pronta) return;
    expect(curta.motivo).toBe('justificativa_curta');

    const ok = montarOperacao({
      ...base,
      operacao: 'reabrir',
      statusAtual: 'concluido',
      perfil: 'admin_rh',
      justificativaReabertura: 'Potencial informado incorretamente pelo gestor.',
    });
    expect(ok.pronta).toBe(true);
    if (!ok.pronta) return;
    expect(ok.operacao.para).toBe('pendente');
    expect(ok.operacao.observacao).toContain('Potencial informado incorretamente');
    expect(ok.operacao.auditoria.dadosAnteriores).toEqual({ status: 'concluido' });
    expect(ok.operacao.auditoria.dadosNovos).toEqual({ status: 'pendente' });
  });

  it('reabrir de cancelado também exige justificativa e volta a pendente', () => {
    const r = montarOperacao({
      ...base,
      operacao: 'reabrir',
      statusAtual: 'cancelado',
      perfil: 'admin_rh',
      justificativaReabertura: 'Cancelamento lançado por engano.',
    });
    expect(r.pronta).toBe(true);
    if (!r.pronta) return;
    expect(r.operacao.para).toBe('pendente');
  });

  it('concluido → cancelado continua proibido (exige reabrir antes)', () => {
    const r = montarOperacao({
      ...base,
      operacao: 'cancelar',
      statusAtual: 'concluido',
      perfil: 'admin_rh',
      motivoCancelamento: 'motivo qualquer',
    });
    expect(r.pronta).toBe(false);
    if (r.pronta) return;
    expect(r.motivo).toBe('transicao_proibida');
  });

  it('rótulos existem para as três ações e os três estados', () => {
    expect(Object.values(ROTULO_ACAO)).toEqual(['Concluir avaliação', 'Cancelar avaliação', 'Reabrir avaliação']);
    expect(ROTULO_STATUS.pendente).toBe('Pendente');
  });
});
