/**
 * ============================================================================
 * CAMADA CANÔNICA — modelo, normalização e ações (FASE 5/6/11).
 *
 * Prova que:
 *   • campo ausente / não aplicável / preenchido são estados DISTINTOS;
 *   • status históricos são normalizados sem inventar estado;
 *   • o gestor responsável vem do vínculo (pendência), nunca do avaliador;
 *   • o conjunto de ações é o MESMO em qualquer ciclo/tipo/status e o motivo da
 *     indisponibilidade é explícito;
 *   • registro CONCLUÍDO não desabilita a aprovação da consolidação (são coisas
 *     diferentes).
 * ============================================================================
 */
import { describe, it, expect } from 'vitest';
import {
  campo,
  campoNaoAplicavel,
  getFeedbackActions,
  habilitadoPara,
  normalizarFeedback,
  statusCanonico,
  textoDoCampo,
  TEXTO_NAO_APLICAVEL,
  TEXTO_NAO_INFORMADO,
} from '@/components/avaliacao/feedbackCanonico';
import { derivarFeedbacks } from '@/components/avaliacao/feedbacksComum';
import { estadoAprovacao, type PendenciaAprovacao } from '@/components/avaliacao/aprovacaoGestor';

/** Registro bruto no formato de `feedbacks_360` (histórico pode vir sem campos). */
function bruto(extra: Record<string, unknown> = {}) {
  return {
    id: 'f1',
    empresa_id: 'emp-1',
    ciclo_id: 'ciclo-1',
    avaliado_id: 'colab-1',
    avaliador_id: 'colab-2',
    tipo: 'gestor',
    nota_geral: 4,
    potencial: 5,
    status: 'concluido',
    pontos_fortes: 'Entrega consistente',
    pontos_melhoria: 'Delegação',
    comentarios: 'Ciclo fechado no prazo',
    avaliado: { nome_completo: 'Ana Souza' },
    avaliador: { nome_completo: 'Bruno Lima' },
    created_at: '2026-10-01T12:00:00.000Z',
    ...extra,
  };
}

/** Pendência mínima (mesma forma que a fila entrega). */
function pendencia(extra: Partial<PendenciaAprovacao> = {}): PendenciaAprovacao {
  return {
    id: 'ciclo-1::colab-1',
    origem: 'real',
    colaboradorId: 'colab-1',
    colaborador: 'Ana Souza',
    cargo: 'Analista',
    departamento: 'RH',
    cicloId: 'ciclo-1',
    cicloNome: 'Ciclo S2 2026',
    gestorResponsavel: 'Bruno Lima',
    gestorResponsavelId: 'colab-2',
    gestorResponsavelUserId: 'u-bruno',
    responsavel: true,
    fontes: { gestor: 1, par: 0, auto: 0, subordinado: 0 },
    avaliacaoGestorValida: true,
    motivoBloqueioAprovacao: null,
    aprovacaoInvalidada: false,
    impedimentoEnvio: null,
    feedbackId: 'f1',
    feedback: bruto(),
    versaoAvaliacao: 'v1',
    desempenho: 4,
    potencial: 5,
    enviadoEm: '2026-10-02T12:00:00.000Z',
    justificativa: null,
    decididoEm: null,
    status: 'aguardando_gestor',
    estado: estadoAprovacao({ versaoGestor: 'v1', decisao: null, validada: false, responsavel: true }),
    quadrante: null,
    motivoNaoClassificado: null,
    ...extra,
  };
}

const derivado = (extra: Record<string, unknown> = {}) =>
  derivarFeedbacks([bruto(extra)], {
    colaboradores: [{ id: 'colab-1', nome_completo: 'Ana Souza', cargo: 'Analista', departamento: 'RH' }],
    ciclos: [{ id: 'ciclo-1', nome: 'Ciclo S2 2026', data_fim: '2026-12-31' }],
  })[0];

describe('campo — ausente ≠ não aplicável ≠ preenchido', () => {
  it('distingue os três estados', () => {
    expect(campo('texto')).toEqual({ estado: 'informado', valor: 'texto' });
    expect(campo('   ')).toEqual({ estado: 'nao_informado', valor: null });
    expect(campo(undefined)).toEqual({ estado: 'nao_informado', valor: null });
    expect(campoNaoAplicavel<string>()).toEqual({ estado: 'nao_aplicavel', valor: null });
  });

  it('texto de exibição usa o rótulo padronizado, sem inventar conteúdo', () => {
    expect(textoDoCampo(campo('Ok'))).toBe('Ok');
    expect(textoDoCampo(campo(''))).toBe(TEXTO_NAO_INFORMADO);
    expect(textoDoCampo(campoNaoAplicavel())).toBe(TEXTO_NAO_APLICAVEL);
    expect(textoDoCampo(campo(''), 'Sem nota')).toBe('Sem nota');
  });
});

describe('statusCanonico — nomenclaturas históricas', () => {
  it('reconhece as variações reais de concluído', () => {
    expect(statusCanonico('concluido').chave).toBe('concluido');
    expect(statusCanonico('Concluído').chave).toBe('concluido');
    expect(statusCanonico('CONCLUÍDA').chave).toBe('concluido');
    expect(statusCanonico('finalizado').chave).toBe('concluido');
    expect(statusCanonico('aprovado').chave).toBe('concluido');
  });

  it('reconhece pendente/cancelado/em revisão', () => {
    expect(statusCanonico('pendente').chave).toBe('pendente');
    expect(statusCanonico('em andamento').chave).toBe('pendente');
    expect(statusCanonico('cancelado').chave).toBe('cancelado');
    expect(statusCanonico('Em revisão').chave).toBe('em_revisao');
  });

  it('sem valor vira o estado vazio padronizado; desconhecido preserva o texto REAL', () => {
    expect(statusCanonico('').rotulo).toBe(TEXTO_NAO_INFORMADO);
    expect(statusCanonico('aguardando_auditoria').rotulo).toBe('aguardando_auditoria');
    expect(statusCanonico('aguardando_auditoria').chave).toBe('desconhecido');
  });
});

describe('normalizarFeedback — modelo de apresentação', () => {
  it('preenche as quatro regiões com os dados REAIS e traz o ciclo pelo nome', () => {
    const item = normalizarFeedback(derivado(), { cicloNome: 'Ciclo S2 2026', pendencia: pendencia() });

    expect(item.avaliado).toBe('Ana Souza');
    expect(item.cargo).toBe('Analista');
    expect(item.departamento).toBe('RH');
    expect(textoDoCampo(item.cicloNome)).toBe('Ciclo S2 2026');
    expect(textoDoCampo(item.gestorResponsavel)).toBe('Bruno Lima');
    expect(textoDoCampo(item.avaliadorCampo)).toBe('Bruno Lima');
    expect(item.desempenho).toEqual({ estado: 'informado', valor: 4 });
    expect(item.potencial).toEqual({ estado: 'informado', valor: 5 });
    expect(item.status.chave).toBe('concluido');
    expect(item.aprovacao.status).toBe('aguardando_gestor');
  });

  it('histórico incompleto: campos vazios ficam `nao_informado` (a seção continua existindo)', () => {
    const item = normalizarFeedback(
      derivado({ pontos_fortes: '', pontos_melhoria: null, comentarios: '   ', potencial: 0 }),
      {
        cicloNome: 'Ciclo antigo',
        pendencia: pendencia({ gestorResponsavel: 'Não identificado', gestorResponsavelId: null }),
      }
    );

    expect(item.conteudo.pontosFortes.estado).toBe('nao_informado');
    expect(item.conteudo.pontosMelhoria.estado).toBe('nao_informado');
    expect(item.conteudo.comentarios.estado).toBe('nao_informado');
    expect(item.potencial.estado).toBe('nao_informado');
    expect(item.gestorResponsavel.estado).toBe('nao_informado');
  });

  it('NÃO usa o avaliador como gestor responsável (são campos diferentes)', () => {
    const item = normalizarFeedback(derivado({ tipo: 'par' }), {
      cicloNome: 'Ciclo S2 2026',
      pendencia: pendencia({ gestorResponsavel: 'Não identificado', gestorResponsavelId: null }),
    });
    expect(item.avaliador).toBe('Bruno Lima');
    expect(item.gestorResponsavel.estado).toBe('nao_informado');
  });

  it('usa o vínculo quando não há linha de fila (registro cancelado, por exemplo)', () => {
    const item = normalizarFeedback(derivado(), { cicloNome: 'Ciclo S2 2026', gestorResponsavel: 'Mariana Oliveira' });
    expect(textoDoCampo(item.gestorResponsavel)).toBe('Mariana Oliveira');
    expect(item.aprovacao.existe).toBe(false);
  });
});

describe('getFeedbackActions — regra única de habilitar/desabilitar', () => {
  const canonico = (extra: Parameters<typeof pendencia>[0] = {}) =>
    normalizarFeedback(derivado({ status: 'concluido' }), {
      cicloNome: 'Ciclo S2 2026',
      pendencia: pendencia(extra),
      papeis: ['gestor'],
      acoesHabilitadas: true,
    });

  it('conclusão usa autorização do REGISTRO, não o vínculo de aprovação', () => {
    const item = normalizarFeedback(derivarFeedbacks([bruto({ status: 'pendente' })])[0], {
      papeis: ['gestor'],
      autorizadoConcluir: true,
      acoesHabilitadas: true,
    });
    expect(habilitadoPara(item.acoes, 'concluir')).toBe(true);
    expect(item.acoes.find((a) => a.id === 'concluir')?.motivo).toBeNull();
  });

  it('sem autorização de conclusão o botão permanece bloqueado com motivo explícito', () => {
    const item = normalizarFeedback(derivarFeedbacks([bruto({ status: 'pendente' })])[0], {
      papeis: ['gestor'],
      autorizadoConcluir: false,
      acoesHabilitadas: true,
    });
    expect(habilitadoPara(item.acoes, 'concluir')).toBe(false);
    expect(item.acoes.find((a) => a.id === 'concluir')?.motivo).toMatch(/autorização/i);
  });

  it('gestor responsável + pendência + avaliação do gestor: Aprovar/Devolver habilitados', () => {
    const item = canonico();
    expect(habilitadoPara(item.acoes, 'aprovar')).toBe(true);
    expect(habilitadoPara(item.acoes, 'devolver')).toBe(true);
    expect(habilitadoPara(item.acoes, 'ver')).toBe(true);
  });

  it('registro CONCLUÍDO não bloqueia a aprovação (status do registro ≠ aprovação)', () => {
    const item = normalizarFeedback(derivado({ status: 'concluido' }), {
      cicloNome: 'Ciclo S2 2026',
      pendencia: pendencia(),
      papeis: ['gestor'],
      acoesHabilitadas: true,
    });
    expect(item.status.chave).toBe('concluido');
    expect(habilitadoPara(item.acoes, 'aprovar')).toBe(true);
  });

  it('proposta sem Desempenho/Potencial válidos BLOQUEIA a decisão', () => {
    const item = canonico({
      avaliacaoGestorValida: false,
      estado: estadoAprovacao({
        versaoGestor: 'v1',
        decisao: null,
        validada: false,
        responsavel: true,
        avaliacaoGestorValida: false,
      }),
    });
    const aprovar = item.acoes.find((a) => a.id === 'aprovar');
    expect(aprovar?.habilitado).toBe(false);
    expect(aprovar?.motivo).toContain('Desempenho e Potencial');
  });

  it('sem gestor identificado: gestor fora de escopo permanece bloqueado, com motivo', () => {
    const item = canonico({
      status: 'sem_gestor',
      gestorResponsavel: 'Não identificado',
      gestorResponsavelId: null,
      responsavel: false,
      estado: estadoAprovacao({
        versaoGestor: 'v1',
        decisao: null,
        validada: false,
        responsavel: false,
        gestorIdentificado: false,
      }),
    });
    const aprovar = item.acoes.find((a) => a.id === 'aprovar');
    expect(aprovar?.habilitado).toBe(false);
    expect(aprovar?.motivo).toContain('Gestor responsável');
  });

  it('sem gestor identificado: RH/admin NÃO decide a consolidação órfã', () => {
    const item = normalizarFeedback(derivado({ tipo: 'par', status: 'concluido' }), {
      cicloNome: 'Ciclo S2 2026',
      pendencia: pendencia({
        status: 'sem_gestor',
        gestorResponsavel: 'Não identificado',
        gestorResponsavelId: null,
        responsavel: false,
        avaliacaoGestorValida: false,
        estado: estadoAprovacao({
          versaoGestor: 'v1',
          decisao: null,
          validada: false,
          responsavel: false,
          gestorIdentificado: false,
        }),
      }),
      papeis: ['admin'],
      acoesHabilitadas: true,
    });
    expect(habilitadoPara(item.acoes, 'aprovar')).toBe(false);
    expect(habilitadoPara(item.acoes, 'devolver')).toBe(false);
  });

  it('usuário sem o papel gestor: controles existem e estão desabilitados', () => {
    const item = normalizarFeedback(derivado(), {
      cicloNome: 'Ciclo S2 2026',
      pendencia: pendencia(),
      papeis: ['user'],
      acoesHabilitadas: true,
    });
    expect(item.acoes.map((a) => a.id)).toEqual(expect.arrayContaining(['ver', 'devolver', 'aprovar']));
    expect(habilitadoPara(item.acoes, 'aprovar')).toBe(false);
    expect(item.acoes.find((a) => a.id === 'aprovar')?.motivo).toContain('gestor responsável');
  });

  it('escrita bloqueada (ambiente sem liberação): decisão desabilitada com motivo', () => {
    const item = normalizarFeedback(derivado(), {
      cicloNome: 'Ciclo S2 2026',
      pendencia: pendencia(),
      papeis: ['gestor'],
      acoesHabilitadas: false,
    });
    expect(habilitadoPara(item.acoes, 'aprovar')).toBe(false);
    expect(item.acoes.find((a) => a.id === 'aprovar')?.motivo).toBeTruthy();
  });

  it('ENCAMINHAR (RH/admin) só EXISTE quando há envio manual a fazer', () => {
    const base = {
      cicloNome: 'Ciclo S2 2026',
      papeis: ['rh'],
      acoesHabilitadas: true,
    };
    const aguardando = normalizarFeedback(derivado(), { ...base, pendencia: pendencia() });
    // Encaminhamento automático: fora de em_preparacao/devolvida o botão não ocupa a linha.
    expect(aguardando.acoes.find((a) => a.id === 'enviar')).toBeUndefined();

    const preparando = normalizarFeedback(derivado(), {
      ...base,
      pendencia: pendencia({ status: 'em_preparacao', versaoAvaliacao: null }),
    });
    expect(preparando.acoes.find((a) => a.id === 'enviar')?.habilitado).toBe(true);
  });

  it('EDIÇÃO: habilitada para RH/admin e bloqueada para gestor (com motivo)', () => {
    const admin = normalizarFeedback(derivado(), {
      cicloNome: 'Ciclo S2 2026',
      pendencia: pendencia(),
      papeis: ['admin'],
      acoesHabilitadas: true,
    });
    expect(admin.acoes.find((a) => a.id === 'editar')?.habilitado).toBe(true);

    const gestor = normalizarFeedback(derivado(), {
      cicloNome: 'Ciclo S2 2026',
      pendencia: pendencia(),
      papeis: ['gestor'],
      acoesHabilitadas: true,
    });
    const editar = gestor.acoes.find((a) => a.id === 'editar');
    expect(editar?.habilitado).toBe(false);
    expect(editar?.motivo).toContain('RH');
  });

  it('o conjunto obrigatório existe em QUALQUER status do registro', () => {
    ['pendente', 'concluido', 'cancelado', 'em_revisao', 'status_legado'].forEach((status) => {
      const item = normalizarFeedback(derivado({ status }), {
        cicloNome: 'Ciclo S2 2026',
        pendencia: pendencia(),
        papeis: ['gestor'],
        acoesHabilitadas: true,
      });
      const ids = getFeedbackActions(item, {
        papeis: ['gestor'],
        responsavel: true,
        acoesHabilitadas: true,
      }).map((a) => a.id);
      expect(ids).toEqual(expect.arrayContaining(['ver', 'devolver', 'aprovar']));
    });
  });
});
