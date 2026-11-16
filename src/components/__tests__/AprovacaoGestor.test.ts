import { describe, it, expect } from 'vitest';
import {
  MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO,
  ROTULO_STATUS_APROVACAO,
  STATUS_APROVACAO,
  TOM_STATUS_APROVACAO,
  contarAguardandoGestor,
  contarEmAndamento,
  derivarPendencias,
  estadoAprovacao,
  normalizarStatusAprovacao,
  ordenarPendencias,
  podeDecidirAprovacao,
  podeEnviarParaGestor,
  resumoPorStatus,
  situacaoAprovacao,
  validarJustificativaDevolucao,
  versaoConsolidadaDemo,
} from '@/components/avaliacao/aprovacaoGestor';

/**
 * GUARDA DO FLUXO DE APROVAÇÃO DO GESTOR — subaba "Aguardando gestor".
 *
 * O teste fixa TRÊS coisas que não podem divergir do banco:
 *   1. `situacaoAprovacao` reproduz, na MESMA ordem, a função SQL
 *      `public.situacao_aprovacao(colaborador, ciclo)`;
 *   2. os controles oferecidos por papel (`podeEnviarParaGestor` = rh/admin,
 *      `podeDecidirAprovacao` = SÓ gestor) e a justificativa mínima de 10;
 *   3. a derivação da fila sobre a lista já carregada — inclusive fora do modo
 *      real (é a mesma regra aplicada aos dados de demonstração, SEM fixture
 *      nova e SEM escrever nada).
 */

const COLABORADORES = [
  { id: 'c-1', nome_completo: 'Ana Souza', cargo: 'Analista', departamento: 'RH' },
  { id: 'c-2', nome_completo: 'Bruno Lima', cargo: 'Gestor', departamento: 'Comercial' },
  { id: 'c-3', nome_completo: 'Carla Dias', cargo: 'Coord.', departamento: 'TI' },
];

const CICLOS = [{ id: 'ciclo-1', nome: 'Ciclo S2 2026' }];

/** Avaliação do GESTOR (a consolidada do fluxo) — concluída, nota 4, potencial 5. */
const FEEDBACK_GESTOR = {
  id: 'fb-gestor-1',
  avaliado_id: 'c-1',
  avaliador_id: 'c-2',
  ciclo_id: 'ciclo-1',
  tipo: 'gestor',
  nota_geral: 4,
  potencial: 5,
  status: 'concluido',
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-02T10:00:00.000Z',
};

describe('situacaoAprovacao — espelho da função SQL', () => {
  const decisao = (d: string, versao: string) => ({ decisao: d, versao_avaliacao: versao });

  it('sem versão da avaliação do gestor ⇒ em_preparacao', () => {
    expect(situacaoAprovacao({ versaoGestor: null, decisao: null, validada: false })).toBe('em_preparacao');
  });

  it('com versão e SEM decisão ⇒ aguardando_gestor', () => {
    expect(situacaoAprovacao({ versaoGestor: 'v1', decisao: null, validada: false })).toBe('aguardando_gestor');
  });

  it('decisão de OUTRA versão ⇒ volta a aguardar o gestor (aprovação INVALIDADA)', () => {
    expect(situacaoAprovacao({ versaoGestor: 'v2', decisao: decisao('aprovado', 'v1'), validada: false })).toBe(
      'aguardando_gestor'
    );
  });

  it('decisão devolvido na MESMA versão ⇒ devolvida', () => {
    expect(situacaoAprovacao({ versaoGestor: 'v1', decisao: decisao('devolvido', 'v1'), validada: false })).toBe(
      'devolvida'
    );
  });

  it('aprovado + validação vigente ⇒ concluida_validada', () => {
    expect(situacaoAprovacao({ versaoGestor: 'v1', decisao: decisao('aprovado', 'v1'), validada: true })).toBe(
      'concluida_validada'
    );
  });

  it('aprovado SEM validação ⇒ aprovada_gestor (falta o RH validar o Potencial)', () => {
    expect(situacaoAprovacao({ versaoGestor: 'v1', decisao: decisao('aprovado', 'v1'), validada: false })).toBe(
      'aprovada_gestor'
    );
  });

  it('decisão SEM gestor identificado NÃO é aprovação (sem_gestor prevalece)', () => {
    expect(
      situacaoAprovacao({
        versaoGestor: 'v1',
        decisao: decisao('aprovado', 'v1'),
        validada: false,
        gestorIdentificado: false,
      })
    ).toBe('sem_gestor');
  });

  it('decisão SEM a avaliação do GESTOR concluída NÃO é aprovação', () => {
    expect(
      situacaoAprovacao({
        versaoGestor: 'v1',
        decisao: decisao('aprovado', 'v1'),
        validada: false,
        avaliacaoGestorValida: false,
      })
    ).toBe('aguardando_gestor');
  });

  it('SEM vínculo e SEM decisão ⇒ sem_gestor (pendência de ATRIBUIÇÃO, não de aprovação)', () => {
    expect(situacaoAprovacao({ versaoGestor: 'v1', decisao: null, validada: false, gestorIdentificado: false })).toBe(
      'sem_gestor'
    );
  });

  it('normaliza o status cru e não inventa valor desconhecido', () => {
    expect(normalizarStatusAprovacao(' aguardando_gestor ')).toBe('aguardando_gestor');
    expect(normalizarStatusAprovacao('CONCLUIDA_VALIDADA')).toBe('concluida_validada');
    expect(normalizarStatusAprovacao('qualquer-coisa')).toBe('desconhecido');
    expect(normalizarStatusAprovacao(null)).toBe('desconhecido');
  });

  it('todo status tem rótulo e tom (badge nunca fica sem classe)', () => {
    Object.values(STATUS_APROVACAO).forEach((s) => {
      expect(ROTULO_STATUS_APROVACAO[s]).toBeTruthy();
      expect(TOM_STATUS_APROVACAO[s]).toContain('border-');
    });
    expect(ROTULO_STATUS_APROVACAO.desconhecido).toBeTruthy();
  });
});

describe('permissões e justificativa de devolução', () => {
  it('enviar é de RH/admin; decidir é SÓ do gestor', () => {
    expect(podeEnviarParaGestor('rh')).toBe(true);
    expect(podeEnviarParaGestor('admin')).toBe(true);
    expect(podeEnviarParaGestor('gestor')).toBe(false);
    expect(podeDecidirAprovacao('gestor')).toBe(true);
    expect(podeDecidirAprovacao('rh')).toBe(false);
    expect(podeDecidirAprovacao('admin')).toBe(false);
    expect(podeDecidirAprovacao(null)).toBe(false);
  });

  it('a devolução exige justificativa com o MESMO mínimo do SQL (10 caracteres)', () => {
    expect(MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO).toBe(10);
    expect(validarJustificativaDevolucao('')).toMatchObject({ pode: false, motivo: 'vazia' });
    expect(validarJustificativaDevolucao('  curta  ')).toMatchObject({ pode: false, motivo: 'curta' });
    expect(validarJustificativaDevolucao('123456789')).toMatchObject({ pode: false, motivo: 'curta' });
    expect(validarJustificativaDevolucao('1234567890')).toMatchObject({ pode: true, motivo: 'ok' });
  });
});

describe('derivarPendencias — fila de aprovação', () => {
  const base = {
    feedbacks: [FEEDBACK_GESTOR],
    colaboradores: COLABORADORES,
    ciclos: CICLOS,
    // Demonstração: sem a view de versão, a avaliação concluída é a "pronta".
    modo: 'demonstracao' as const,
  };

  it('usa a avaliação do GESTOR como âncora e ignora Par/Auto/Subordinado', () => {
    const pendencias = derivarPendencias({
      ...base,
      feedbacks: [
        FEEDBACK_GESTOR,
        { ...FEEDBACK_GESTOR, id: 'fb-par-1', tipo: 'par', avaliador_id: 'c-3' },
        { ...FEEDBACK_GESTOR, id: 'fb-auto-1', tipo: 'auto', avaliador_id: 'c-1' },
      ],
    });

    expect(pendencias).toHaveLength(1);
    expect(pendencias[0]).toMatchObject({
      colaboradorId: 'c-1',
      colaborador: 'Ana Souza',
      cargo: 'Analista',
      cicloId: 'ciclo-1',
      cicloNome: 'Ciclo S2 2026',
      gestorResponsavel: 'Bruno Lima',
      feedbackId: 'fb-gestor-1',
      status: 'aguardando_gestor',
      desempenho: 4,
      potencial: 5,
      enviadoEm: '2026-10-02T10:00:00.000Z',
    });
    expect(pendencias[0].relatos?.map((r) => `${r.tipo}:${r.avaliador}`)).toEqual([
      'gestor:Bruno Lima',
      'auto:Ana Souza',
      'par:Carla Dias',
    ]);
    expect(pendencias[0].relatos?.map((r) => r.id)).toEqual(['fb-gestor-1', 'fb-auto-1', 'fb-par-1']);
  });

  it('a pendência APARECE sem a avaliação do gestor, mas a decisão fica BLOQUEADA', () => {
    const pendencias = derivarPendencias({
      ...base,
      feedbacks: [{ ...FEEDBACK_GESTOR, status: 'pendente' }],
    });
    expect(pendencias).toHaveLength(1);
    expect(pendencias[0].status).toBe('aguardando_gestor');
    expect(pendencias[0].avaliacaoGestorValida).toBe(false);
    // A falta de Desempenho/Potencial válidos é REQUISITO da aprovação.
    expect(pendencias[0].motivoBloqueioAprovacao).toMatch(/Desempenho e Potencial/i);
    expect(pendencias[0].estado.aprovacaoPermitida).toBe(false);
    expect(pendencias[0].estado.podeDecidir).toBe(false);
  });

  it('PAR concluído SEM gestor vinculado: a pendência aparece e a aprovação é BLOQUEADA', () => {
    const par = { ...FEEDBACK_GESTOR, id: 'fb-par-1', tipo: 'par', avaliador_id: 'c-2', status: 'concluido' };
    const pendencias = derivarPendencias({
      ...base,
      modo: 'real',
      feedbacks: [par],
      versoesPorFeedback: { 'fb-par-1': 'v-par' },
      // Vínculo carregado, porém SEM supervisor definido para o colaborador.
      vinculos: [{ id: 'c-1', user_id: null, supervisor_id: null }],
      usuarioId: 'u-admin',
      podeGerirAvaliacoes: true,
    });

    expect(pendencias).toHaveLength(1);
    expect(pendencias[0].status).toBe('sem_gestor');
    expect(pendencias[0].gestorResponsavel).toBe('Não identificado');
    expect(pendencias[0].avaliacaoGestorValida).toBe(true); // proposta tem os dois valores
    expect(pendencias[0].motivoBloqueioAprovacao).toMatch(/Gestor responsável não atribuído/i);
    expect(pendencias[0].estado.pendente).toBe(true);
    expect(pendencias[0].estado.podeDecidir).toBe(false);
    expect(pendencias[0].estado.aprovacaoPermitida).toBe(false);
  });

  it('PAR sem gestor vinculado + gestor fora de escopo: bloqueado com motivo (não inventa vínculo)', () => {
    const par = { ...FEEDBACK_GESTOR, id: 'fb-par-1', tipo: 'par', status: 'concluido' };
    const pendencias = derivarPendencias({
      ...base,
      modo: 'real',
      feedbacks: [par],
      versoesPorFeedback: { 'fb-par-1': 'v-par' },
      vinculos: [{ id: 'c-1', user_id: null, supervisor_id: null }],
      usuarioId: 'u-gestor',
      podeGerirAvaliacoes: false,
    });

    expect(pendencias[0].status).toBe('sem_gestor');
    expect(pendencias[0].estado.podeDecidir).toBe(false);
    expect(pendencias[0].motivoBloqueioAprovacao).toMatch(/Gestor responsável não atribuído/i);
  });

  it('RH/admin NÃO decidem mesmo COM gestor vinculado (a aprovação é do gestor)', () => {
    const pendencias = derivarPendencias({
      ...base,
      modo: 'real',
      feedbacks: [FEEDBACK_GESTOR],
      versoesPorFeedback: { 'fb-gestor-1': 'v1' },
      vinculos: [
        { id: 'c-1', user_id: 'u-ana', supervisor_id: 'c-2' },
        { id: 'c-2', user_id: 'u-bruno', supervisor_id: null },
      ],
      usuarioId: 'u-admin',
      podeGerirAvaliacoes: true,
    });

    expect(pendencias[0].status).toBe('aguardando_gestor');
    expect(pendencias[0].gestorResponsavel).toBe('Bruno Lima');
    // A conta não é o gestor vinculado: o servidor recusa `perfil_nao_autorizado`.
    expect(pendencias[0].estado.podeDecidir).toBe(false);
  });

  it('gestor vinculado a OUTRO colaborador não decide (fora de escopo)', () => {
    const pendencias = derivarPendencias({
      ...base,
      modo: 'real',
      feedbacks: [FEEDBACK_GESTOR],
      versoesPorFeedback: { 'fb-gestor-1': 'v1' },
      vinculos: [
        { id: 'c-3', user_id: 'u-sessao', supervisor_id: null },
        { id: 'c-1', user_id: 'u-ana', supervisor_id: 'c-2' },
        { id: 'c-2', user_id: 'u-bruno', supervisor_id: null },
      ],
      usuarioId: 'u-sessao',
      podeGerirAvaliacoes: false,
    });

    expect(pendencias[0].gestorResponsavel).toBe('Bruno Lima');
    expect(pendencias[0].estado.podeDecidir).toBe(false);
  });

  it('decisão SEM gestor e SEM avaliação do gestor NÃO libera o RH', () => {
    const par = { ...FEEDBACK_GESTOR, id: 'fb-par-1', tipo: 'par', status: 'concluido' };
    const versao = versaoConsolidadaDemo([par]);
    expect(versao).toBeTruthy();
    const pendencias = derivarPendencias({
      ...base,
      modo: 'real',
      feedbacks: [par],
      versoesPorFeedback: { 'fb-par-1': versao! },
      vinculos: [{ id: 'c-1', user_id: null, supervisor_id: null }],
      podeGerirAvaliacoes: true,
      aprovacoes: [
        {
          ciclo_id: 'ciclo-1',
          colaborador_id: 'c-1',
          decisao: 'aprovado',
          versao_avaliacao: versao,
          decidido_em: '2026-10-04T10:00:00.000Z',
        },
      ],
    });

    // A decisão histórica não é aprovação válida: sem gestor e sem avaliação
    // obrigatória, o RH NÃO recebe o Potencial para validar.
    expect(pendencias[0].status).toBe('sem_gestor');
    expect(pendencias[0].estado.podeValidarPotencial).toBe(false);
    expect(pendencias[0].estado.aprovacaoPermitida).toBe(false);
  });

  it('decisão de outra versão é INVALIDADA e a linha volta a aguardar o gestor', () => {
    const pendencias = derivarPendencias({
      ...base,
      versoesPorFeedback: { 'fb-gestor-1': 'v2' },
      aprovacoes: [
        {
          ciclo_id: 'ciclo-1',
          colaborador_id: 'c-1',
          decisao: 'aprovado',
          versao_avaliacao: 'v1',
          decidido_em: '2026-10-03T10:00:00.000Z',
        },
      ],
    });
    expect(pendencias[0].status).toBe('aguardando_gestor');
    expect(pendencias[0].aprovacaoInvalidada).toBe(true);
    expect(pendencias[0].estado.aprovacaoPermitida).toBe(true);
  });

  it('aprovado na mesma versão + validação vigente ⇒ concluida_validada (Nine-Box classifica)', () => {
    const pendencias = derivarPendencias({
      ...base,
      versoesPorFeedback: { 'fb-gestor-1': 'v1' },
      aprovacoes: [{ ciclo_id: 'ciclo-1', colaborador_id: 'c-1', decisao: 'aprovado', versao_avaliacao: 'v1' }],
      validacoes: [{ ciclo_id: 'ciclo-1', colaborador_id: 'c-1', versao_avaliacao: 'v1' }],
      classificacoes: { 'c-1': { desempenho: 4.25, potencial: 5, nomeQuadrante: 'Alto potencial' } },
    });
    expect(pendencias[0].status).toBe('concluida_validada');
    expect(pendencias[0].quadrante).toBe('Alto potencial');
    // O desempenho CONSOLIDADO do motor 360° prevalece sobre a nota crua.
    expect(pendencias[0].desempenho).toBe(4.25);
  });

  it('validação ancorada na versão do GESTOR (não na do conjunto) ⇒ concluida_validada', () => {
    const par = { ...FEEDBACK_GESTOR, id: 'fb-par-1', tipo: 'par', nota_geral: 3, status: 'concluido' };
    const grupo = [FEEDBACK_GESTOR, par];
    const versaoConjunto = versaoConsolidadaDemo(grupo)!;
    const versaoGestor = versaoConsolidadaDemo([FEEDBACK_GESTOR])!;
    expect(versaoConjunto).not.toBe(versaoGestor);

    const avaliar = (versaoDaValidacao: string) =>
      derivarPendencias({
        ...base,
        modo: 'real',
        feedbacks: grupo,
        versoesPorFeedback: { 'fb-gestor-1': versaoGestor },
        consolidacoes: [{ ciclo_id: 'ciclo-1', colaborador_id: 'c-1', versao_consolidada: versaoConjunto }],
        vinculos: [
          { id: 'c-1', user_id: 'u-ana', supervisor_id: 'c-2' },
          { id: 'c-2', user_id: 'u-bruno', supervisor_id: null },
        ],
        usuarioId: 'u-ana',
        aprovacoes: [
          {
            ciclo_id: 'ciclo-1',
            colaborador_id: 'c-1',
            decisao: 'aprovado',
            versao_avaliacao: versaoConjunto,
            decidido_em: '2026-10-04T10:00:00.000Z',
          },
        ],
        validacoes: [{ ciclo_id: 'ciclo-1', colaborador_id: 'c-1', versao_avaliacao: versaoDaValidacao }],
      })[0];

    // Validação gravada na versão do CONJUNTO não casa com a âncora canônica.
    expect(avaliar(versaoConjunto).status).toBe('aprovada_gestor');
    // Na versão do GESTOR (a do banco/motor) o fluxo conclui.
    expect(avaliar(versaoGestor).status).toBe('concluida_validada');
  });

  it('tela MISTA: grupo UUID usa estado REAL e grupo mock usa estado local', () => {
    const colabReal = '11111111-1111-4111-8111-111111111111';
    const cicloReal = '22222222-2222-4222-8222-222222222222';
    const fbReal = '33333333-3333-4333-8333-333333333333';
    const real = {
      ...FEEDBACK_GESTOR,
      id: fbReal,
      avaliado_id: colabReal,
      ciclo_id: cicloReal,
      avaliador_id: '44444444-4444-4444-8444-444444444444',
    };
    const mock = { ...FEEDBACK_GESTOR, id: 'mock-fb-mix', avaliado_id: 'mock-colab-mix' };
    const pendencias = derivarPendencias({
      ...base,
      modo: 'demonstracao',
      feedbacks: [real, mock],
      colaboradores: [
        ...COLABORADORES,
        { id: colabReal, nome_completo: 'Real Um' },
        { id: '44444444-4444-4444-8444-444444444444', nome_completo: 'Gestor Real' },
        { id: 'mock-colab-mix', nome_completo: 'Mock Um' },
      ],
      versoesPorFeedback: { [fbReal]: 'v-real' },
      consolidacoes: [{ ciclo_id: cicloReal, colaborador_id: colabReal, versao_consolidada: 'v-real' }],
      aprovacoes: [
        {
          ciclo_id: cicloReal,
          colaborador_id: colabReal,
          decisao: 'aprovado',
          versao_avaliacao: 'v-real',
          decidido_em: '2026-10-04T10:00:00.000Z',
        },
      ],
    });

    const linhaReal = pendencias.find((p) => p.colaboradorId === colabReal)!;
    const linhaMock = pendencias.find((p) => p.colaboradorId === 'mock-colab-mix')!;
    expect(linhaReal.origem).toBe('real');
    expect(linhaReal.status).toBe('aprovada_gestor');
    expect(linhaReal.versaoAvaliacao).toBe('v-real');
    expect(linhaMock.origem).toBe('demonstracao');
    expect(linhaMock.versaoAvaliacao).toMatch(/^demo:/);
    expect(linhaMock.status).toBe('aguardando_gestor');
  });

  it('exceção CONFIRMADA pelo servidor autoriza a decisão sem inventar gestor', () => {
    const estado = estadoAprovacao({
      versaoGestor: 'v1',
      decisao: null,
      validada: false,
      gestorIdentificado: false,
      avaliacaoGestorValida: true,
      autorizadoServidor: true,
    });
    expect(estado.status).toBe('sem_gestor');
    expect(estado.autorizadoServidor).toBe(true);
    expect(estado.aprovacaoPermitida).toBe(true);
    expect(estado.podeDecidir).toBe(true);
    expect(estado.motivoBloqueio).toBeNull();
    // O gestor oficial continua NÃO identificado — nada é inventado.
    expect(estado.gestorIdentificado).toBe(false);
  });

  it('exceção autorizada: depois da decisão avança para aprovada/validada', () => {
    const decisaoExcecao = { decisao: 'aprovado', versao_avaliacao: 'v1' };
    expect(
      situacaoAprovacao({
        versaoGestor: 'v1',
        decisao: decisaoExcecao,
        validada: false,
        gestorIdentificado: false,
        autorizadoServidor: true,
      })
    ).toBe('aprovada_gestor');
    expect(
      situacaoAprovacao({
        versaoGestor: 'v1',
        decisao: decisaoExcecao,
        validada: true,
        gestorIdentificado: false,
        autorizadoServidor: true,
      })
    ).toBe('concluida_validada');
  });

  it('exceção NÃO dispensa a avaliação obrigatória do gestor', () => {
    const estado = estadoAprovacao({
      versaoGestor: 'v1',
      decisao: null,
      validada: false,
      gestorIdentificado: false,
      avaliacaoGestorValida: false,
      autorizadoServidor: true,
    });
    expect(estado.aprovacaoPermitida).toBe(false);
    expect(estado.motivoBloqueio).toMatch(/Desempenho e Potencial/i);
  });

  it('sem vínculo e sem confirmação do servidor continua bloqueado', () => {
    const estado = estadoAprovacao({
      versaoGestor: 'v1',
      decisao: null,
      validada: false,
      gestorIdentificado: false,
      avaliacaoGestorValida: true,
    });
    expect(estado.aprovacaoPermitida).toBe(false);
    expect(estado.podeDecidir).toBe(false);
    expect(estado.motivoBloqueio).toMatch(/Gestor responsável não atribuído/i);
  });

  it('derivarPendencias reconhece a autorização excepcional somente no grupo REAL', () => {
    const colabReal = '11111111-1111-4111-8111-111111111111';
    const cicloReal = '22222222-2222-4222-8222-222222222222';
    const gestor = {
      ...FEEDBACK_GESTOR,
      id: '33333333-3333-4333-8333-333333333333',
      avaliado_id: colabReal,
      ciclo_id: cicloReal,
      avaliador_id: '44444444-4444-4444-8444-444444444444',
    };
    const pendencias = derivarPendencias({
      ...base,
      modo: 'real',
      feedbacks: [gestor],
      colaboradores: [{ id: colabReal, nome_completo: 'Real Um' }],
      versoesPorFeedback: { [gestor.id]: 'v-real' },
      consolidacoes: [{ ciclo_id: cicloReal, colaborador_id: colabReal, versao_consolidada: 'v-real' }],
      autorizacoesAprovacao: { [colabReal]: true },
    });

    const linha = pendencias[0];
    expect(linha.status).toBe('sem_gestor'); // gestor oficial NÃO inventado
    expect(linha.autorizadoServidor).toBe(true);
    expect(linha.estado.aprovacaoPermitida).toBe(true);
    expect(linha.estado.podeDecidir).toBe(true);
    expect(linha.motivoBloqueioAprovacao).toBeNull();
  });

  it('devolvido com justificativa registrada aparece na linha', () => {
    const pendencias = derivarPendencias({
      ...base,
      versoesPorFeedback: { 'fb-gestor-1': 'v1' },
      aprovacoes: [
        {
          ciclo_id: 'ciclo-1',
          colaborador_id: 'c-1',
          decisao: 'devolvido',
          versao_avaliacao: 'v1',
          justificativa: 'Revisar os pontos de melhoria.',
          decidido_em: '2026-10-04T10:00:00.000Z',
        },
      ],
    });
    expect(pendencias[0].status).toBe('devolvida');
    expect(pendencias[0].justificativa).toBe('Revisar os pontos de melhoria.');
  });

  it('no modo REAL a versão vem do banco: sem versão não existe fila de envio', () => {
    const pendencias = derivarPendencias({ ...base, modo: 'real' });
    expect(pendencias).toHaveLength(1);
    expect(pendencias[0].status).toBe('em_preparacao');
    expect(pendencias[0].versaoAvaliacao).toBeNull();
    expect(pendencias[0].enviadoEm).toBeNull();
  });

  it('o `enviado_em` do cabeçalho do fluxo prevalece sobre a data do registro', () => {
    const pendencias = derivarPendencias({
      ...base,
      consolidacoes: [{ ciclo_id: 'ciclo-1', colaborador_id: 'c-1', enviado_em: '2026-10-05T12:00:00.000Z' }],
    });
    expect(pendencias[0].enviadoEm).toBe('2026-10-05T12:00:00.000Z');
  });

  it('NUNCA mistura categoria (tipo) com status de aprovação', () => {
    const tipos = ['gestor', 'par', 'auto', 'subordinado'];
    const pendencias = derivarPendencias({
      ...base,
      feedbacks: tipos.map((tipo, i) => ({ ...FEEDBACK_GESTOR, id: `fb-${tipo}-${i}`, tipo })),
    });
    const statusValidos = Object.values(STATUS_APROVACAO) as string[];
    pendencias.forEach((p) => {
      expect(statusValidos).toContain(p.status);
      expect(tipos).not.toContain(p.status);
    });
  });
});

/**
 * ============================================================================
 * ENCAMINHAMENTO — quem aprova sai do VÍNCULO, não do registro.
 *
 * Cobre as falhas observadas no fluxo real:
 *   • o card mostrava como "gestor responsável" quem AVALIOU o registro;
 *   • não havia como distinguir pendência demonstrativa de pendência real;
 *   • uma autoavaliação salva não entrava na fila e não havia explicação.
 * ============================================================================
 */
describe('derivarPendencias — vínculo do gestor responsável e origem da linha', () => {
  const base = {
    feedbacks: [FEEDBACK_GESTOR],
    colaboradores: COLABORADORES,
    ciclos: CICLOS,
    modo: 'demonstracao' as const,
  };

  /** Ana (c-1) é supervisionada por Bruno (c-2), que é o gestor de verdade. */
  const VINCULOS = [
    { id: 'c-1', user_id: 'u-ana', supervisor_id: 'c-2' },
    { id: 'c-2', user_id: 'u-bruno', supervisor_id: null },
    { id: 'c-3', user_id: 'u-carla', supervisor_id: null },
  ];

  it('atribui a pendência ao SUPERVISOR do avaliado, não a quem preencheu o registro', () => {
    const [p] = derivarPendencias({
      ...base,
      // O registro do gestor foi preenchido por Carla — não é ela quem aprova.
      feedbacks: [{ ...FEEDBACK_GESTOR, avaliador_id: 'c-3' }],
      vinculos: VINCULOS,
      usuarioId: 'u-bruno',
    });

    expect(p.gestorResponsavel).toBe('Bruno Lima');
    expect(p.gestorResponsavelId).toBe('c-2');
    expect(p.gestorResponsavelUserId).toBe('u-bruno');
    expect(p.impedimentoEnvio).toBeNull();
    // O gestor do vínculo autenticado PODE decidir (a mesma instância da fila).
    expect(p.responsavel).toBe(true);
    expect(p.estado.podeDecidir).toBe(true);
  });

  it('não oferece a decisão a gestor SEM vínculo com o avaliado (fail-closed)', () => {
    const [p] = derivarPendencias({
      ...base,
      vinculos: VINCULOS,
      usuarioId: 'u-carla',
    });
    expect(p.responsavel).toBe(false);
    expect(p.estado.podeDecidir).toBe(false);
  });

  it('sem `supervisor_id` não identifica o gestor e BLOQUEIA o envio', () => {
    const [p] = derivarPendencias({
      ...base,
      vinculos: [{ id: 'c-1', user_id: 'u-ana', supervisor_id: null }],
      usuarioId: 'u-bruno', // não é o avaliado nem supervisor de ninguém aqui
    });
    expect(p.gestorResponsavelId).toBeNull();
    expect(p.gestorResponsavel).toBe('Não identificado');
    expect(p.impedimentoEnvio).toMatch(/supervisor_id/);
    expect(p.responsavel).toBe(false);
  });

  it('sem supervisor, o PRÓPRIO avaliado é o responsável (espelho de `pode_aprovar_colaborador`)', () => {
    const [p] = derivarPendencias({
      ...base,
      vinculos: [{ id: 'c-1', user_id: 'u-ana', supervisor_id: null }],
      usuarioId: 'u-ana',
    });
    expect(p.responsavel).toBe(true);
    // O envio continua bloqueado: não há gestor identificado para receber.
    expect(p.impedimentoEnvio).toMatch(/supervisor_id/);
  });

  it('ambiente sem vínculo algum (vitrine): mantém o rótulo e não julga responsabilidade', () => {
    const [p] = derivarPendencias(base);
    expect(p.gestorResponsavel).toBe('Bruno Lima'); // avaliador do registro (legado)
    expect(p.responsavel).toBeNull();
    expect(p.impedimentoEnvio).toBeNull();
    expect(p.origem).toBe('demonstracao');
  });

  it('consolida as QUATRO categorias na mesma linha (gestor + opcionais)', () => {
    const [p] = derivarPendencias({
      ...base,
      feedbacks: [
        FEEDBACK_GESTOR,
        { ...FEEDBACK_GESTOR, id: 'fb-par', tipo: 'par', avaliador_id: 'c-3' },
        { ...FEEDBACK_GESTOR, id: 'fb-auto', tipo: 'auto', avaliador_id: 'c-1' },
        { ...FEEDBACK_GESTOR, id: 'fb-sub', tipo: 'subordinado', avaliador_id: 'c-3' },
      ],
    });

    expect(p.fontes).toEqual({ gestor: 1, par: 1, auto: 1, subordinado: 1 });
    // A âncora continua sendo a avaliação do GESTOR (uma única linha).
    expect(p.feedbackId).toBe('fb-gestor-1');
  });

  it('a PRIMEIRA avaliação de QUALQUER categoria já cria a pendência', () => {
    const pendencias = derivarPendencias({
      ...base,
      feedbacks: [
        { ...FEEDBACK_GESTOR, id: 'fb-auto', tipo: 'auto', avaliador_id: 'c-1' },
        { ...FEEDBACK_GESTOR, id: 'fb-par', tipo: 'par', avaliador_id: 'c-3' },
      ],
    });
    // Sem a avaliação do GESTOR não há evidência de quem aprova ⇒ a linha existe
    // como pendência de ATRIBUIÇÃO (visível ao RH), nunca "aprovada".
    expect(pendencias).toHaveLength(1);
    expect(pendencias[0].fontes).toEqual({ gestor: 0, par: 1, auto: 1, subordinado: 0 });
    expect(pendencias[0].status).toBe('sem_gestor');
    expect(pendencias[0].avaliacaoGestorValida).toBe(true); // proposta consolidada válida
    expect(pendencias[0].impedimentoEnvio).toMatch(/supervisor_id/);
    expect(pendencias[0].estado.podeDecidir).toBe(false);
  });

  it('quando o GESTOR entra no conjunto, a MESMA linha fica pronta para aprovar', () => {
    const semGestor = derivarPendencias({
      ...base,
      feedbacks: [{ ...FEEDBACK_GESTOR, id: 'fb-par', tipo: 'par', avaliador_id: 'c-3' }],
    });
    const comGestor = derivarPendencias({
      ...base,
      feedbacks: [{ ...FEEDBACK_GESTOR, id: 'fb-par', tipo: 'par', avaliador_id: 'c-3' }, FEEDBACK_GESTOR],
    });

    expect(semGestor).toHaveLength(1);
    expect(comGestor).toHaveLength(1); // mesma chave: NÃO duplica
    expect(comGestor[0].id).toBe(semGestor[0].id);
    expect(comGestor[0].status).toBe('aguardando_gestor');
    expect(comGestor[0].avaliacaoGestorValida).toBe(true);
    expect(comGestor[0].estado.aprovacaoPermitida).toBe(true);
    // A versão consolidada muda quando o conjunto muda (invalida decisões antigas).
    expect(comGestor[0].versaoAvaliacao).not.toBe(semGestor[0].versaoAvaliacao);
  });

  it('marca `origem: real` quando a linha vem do banco', () => {
    const [p] = derivarPendencias({ ...base, modo: 'real', versoesPorFeedback: { 'fb-gestor-1': 'v1' } });
    expect(p.origem).toBe('real');
  });
});

describe('estadoAprovacao — regra única de estado (§5 do pedido)', () => {
  const decisao = (d: string, versao: string) => ({ decisao: d, versao_avaliacao: versao });

  it('1) pendência = existe versão e NÃO existe decisão (mesmo com status concluido)', () => {
    const e = estadoAprovacao({ versaoGestor: 'v1', decisao: null, validada: false });
    expect(e.pendente).toBe(true);
    expect(e.status).toBe('aguardando_gestor');
    expect(e.rotulo).toBe('Aguardando gestor');
    expect(e.iniciada).toBe(true);
    expect(e.podeValidarPotencial).toBe(false);
    expect(e.elegivelNineBox).toBe(false);
  });

  it('2/3) só o gestor RESPONSÁVEL pode decidir — e só com pendência', () => {
    const pendente = { versaoGestor: 'v1', decisao: null, validada: false };
    expect(estadoAprovacao({ ...pendente, responsavel: true }).podeDecidir).toBe(true);
    expect(estadoAprovacao({ ...pendente, responsavel: false }).podeDecidir).toBe(false);
    // Já decidida: ninguém decide de novo (nem o responsável).
    expect(
      estadoAprovacao({ versaoGestor: 'v1', decisao: decisao('aprovado', 'v1'), validada: false, responsavel: true })
        .podeDecidir
    ).toBe(false);
  });

  it('4) o rótulo/tom do selo vêm do MESMO status derivado', () => {
    const e = estadoAprovacao({ versaoGestor: 'v1', decisao: null, validada: false });
    expect(e.rotulo).toBe(ROTULO_STATUS_APROVACAO.aguardando_gestor);
    expect(e.tom).toBe(TOM_STATUS_APROVACAO.aguardando_gestor);
  });

  it('5) a pendência desaparece quando existe decisão para a versão vigente', () => {
    const devolvida = estadoAprovacao({
      versaoGestor: 'v1',
      decisao: { decisao: 'devolvido', versao_avaliacao: 'v1', justificativa: 'Revisar metas.' },
      validada: false,
    });
    expect(devolvida.pendente).toBe(false);
    expect(devolvida.status).toBe('devolvida');
    expect(devolvida.justificativa).toBe('Revisar metas.');
    // Avaliação alterada depois da decisão ⇒ a aprovação é INVALIDADA e a linha
    // volta para a fila do gestor (reencaminhamento automático).
    const invalidada = estadoAprovacao({ versaoGestor: 'v2', decisao: decisao('aprovado', 'v1'), validada: false });
    expect(invalidada.pendente).toBe(true);
    expect(invalidada.status).toBe('aguardando_gestor');
    expect(invalidada.aprovacaoInvalidada).toBe(true);
  });

  it('6) o RH NÃO valida Potencial no fluxo novo (aprovação do gestor é final)', () => {
    expect(estadoAprovacao({ versaoGestor: 'v1', decisao: null, validada: false }).podeValidarPotencial).toBe(false);
    expect(
      estadoAprovacao({ versaoGestor: 'v1', decisao: decisao('devolvido', 'v1'), validada: false }).podeValidarPotencial
    ).toBe(false);
    expect(
      estadoAprovacao({ versaoGestor: 'v1', decisao: decisao('aprovado', 'v1'), validada: false }).podeValidarPotencial
    ).toBe(false);
  });

  it('7) o Nine-Box é elegível na aprovação VIGENTE, sem validação posterior', () => {
    expect(
      estadoAprovacao({ versaoGestor: 'v1', decisao: decisao('aprovado', 'v1'), validada: false }).elegivelNineBox
    ).toBe(true);
    const concluida = estadoAprovacao({ versaoGestor: 'v1', decisao: decisao('aprovado', 'v1'), validada: true });
    expect(concluida.elegivelNineBox).toBe(true);
    expect(concluida.status).toBe('concluida_validada');
    expect(concluida.pendente).toBe(false);
  });

  it('sem fluxo iniciado: em preparação, sem pendência e sem validação possível', () => {
    const e = estadoAprovacao({ versaoGestor: null, decisao: null, validada: false });
    expect(e.iniciada).toBe(false);
    expect(e.pendente).toBe(false);
    expect(e.podeDecidir).toBe(false);
    expect(e.podeValidarPotencial).toBe(false);
  });

  it('a fila carrega EXATAMENTE a mesma instância usada pelo modal', () => {
    const [linha] = derivarPendencias({
      feedbacks: [FEEDBACK_GESTOR],
      colaboradores: COLABORADORES,
      ciclos: CICLOS,
      modo: 'demonstracao',
    });
    expect(linha.estado).toBeDefined();
    expect(linha.estado.status).toBe(linha.status);
    expect(linha.estado.pendente).toBe(true);
    expect(linha.estado.rotulo).toBe(ROTULO_STATUS_APROVACAO[linha.status]);
  });
});

describe('ordenação e contadores da subaba', () => {
  const linhas = [
    { status: 'concluida_validada', enviadoEm: '2026-10-01T00:00:00.000Z', colaborador: 'Zeta' },
    { status: 'aguardando_gestor', enviadoEm: '2026-10-02T00:00:00.000Z', colaborador: 'Alfa' },
    { status: 'devolvida', enviadoEm: '2026-10-03T00:00:00.000Z', colaborador: 'Beta' },
  ] as never[];

  it('a fila coloca o que exige ação primeiro (aguardando → devolvida → concluída)', () => {
    const ordenado = ordenarPendencias([...linhas]);
    expect(ordenado.map((p) => p.status)).toEqual(['aguardando_gestor', 'devolvida', 'concluida_validada']);
  });

  it('o contador da subaba conta SÓ o que aguarda o gestor', () => {
    expect(contarAguardandoGestor([...linhas])).toBe(1);
    expect(contarEmAndamento([...linhas])).toBe(2);
    expect(resumoPorStatus([...linhas]).aguardando_gestor).toBe(1);
    expect(resumoPorStatus([...linhas]).concluida_validada).toBe(1);
  });
});

/**
 * ============================================================================
 * ENCAMINHAMENTO AUTOMÁTICO — a PRIMEIRA avaliação de qualquer categoria cria
 * a pendência (T1–T5/T16 do pedido), consolidando por colaborador × ciclo.
 * ============================================================================
 */
describe('consolidação automática ao salvar (qualquer categoria, idempotente)', () => {
  const base = { colaboradores: COLABORADORES, ciclos: CICLOS, modo: 'demonstracao' as const };

  it('T1–T4: gestor, par, auto e subordinado criam pendência sem clique do RH', () => {
    (['gestor', 'par', 'auto', 'subordinado'] as const).forEach((tipo) => {
      const pendencias = derivarPendencias({
        ...base,
        feedbacks: [{ ...FEEDBACK_GESTOR, id: `fb-${tipo}`, tipo }],
      });
      expect(pendencias, tipo).toHaveLength(1);
      expect(pendencias[0].fontes[tipo]).toBe(1);
      expect(pendencias[0].versaoAvaliacao).toBeTruthy();
    });

    // Só o GESTOR concluído libera a aprovação final; a linha do gestor nasce
    // pronta (é a avaliação obrigatória já válida).
    const [doGestor] = derivarPendencias({ ...base, feedbacks: [FEEDBACK_GESTOR] });
    expect(doGestor.status).toBe('aguardando_gestor');
    expect(doGestor.avaliacaoGestorValida).toBe(true);
    expect(doGestor.estado.aprovacaoPermitida).toBe(true);
  });

  it('T5: avaliações adicionais ATUALIZAM a mesma linha (nunca duplicam)', () => {
    const uma = derivarPendencias({ ...base, feedbacks: [{ ...FEEDBACK_GESTOR, id: 'a', tipo: 'par' }] });
    const tres = derivarPendencias({
      ...base,
      feedbacks: [
        { ...FEEDBACK_GESTOR, id: 'a', tipo: 'par' },
        { ...FEEDBACK_GESTOR, id: 'b', tipo: 'auto' },
        { ...FEEDBACK_GESTOR, id: 'c', tipo: 'subordinado' },
        FEEDBACK_GESTOR,
      ],
    });

    expect(uma).toHaveLength(1);
    expect(tres).toHaveLength(1);
    expect(tres[0].id).toBe(uma[0].id);
    expect(tres[0].fontes).toEqual({ gestor: 1, par: 1, auto: 1, subordinado: 1 });
  });

  it('T6: cada ciclo tem a SUA linha (nunca por nome, sempre por id)', () => {
    const doisCiclos = derivarPendencias({
      ...base,
      ciclos: [...CICLOS, { id: 'ciclo-2', nome: 'Ciclo S2 2026' }],
      feedbacks: [FEEDBACK_GESTOR, { ...FEEDBACK_GESTOR, id: 'fb-c2', ciclo_id: 'ciclo-2', tipo: 'par' }],
    });
    expect(doisCiclos).toHaveLength(2);
    expect(doisCiclos.map((p) => p.cicloId).sort()).toEqual(['ciclo-1', 'ciclo-2']);
    // Mesmo NOME de ciclo, ids diferentes ⇒ linhas diferentes.
    expect(new Set(doisCiclos.map((p) => p.id)).size).toBe(2);
  });

  it('T16: a versão consolidada muda quando o CONTEÚDO muda (invalida decisões)', () => {
    const grupo = [FEEDBACK_GESTOR];
    const v1 = versaoConsolidadaDemo(grupo);
    expect(versaoConsolidadaDemo([...grupo])).toBe(v1); // estável sem mudança
    // Datas RELATIVAS das fixtures não podem mexer na versão (senão a aprovação
    // cairia sozinha a cada carga da página).
    expect(versaoConsolidadaDemo([{ ...FEEDBACK_GESTOR, updated_at: '2026-10-09T10:00:00.000Z' }])).toBe(v1);

    const alterado = versaoConsolidadaDemo([{ ...FEEDBACK_GESTOR, nota_geral: 3 }]);
    const adicionado = versaoConsolidadaDemo([...grupo, { ...FEEDBACK_GESTOR, id: 'fb-par', tipo: 'par' }]);
    const cancelado = versaoConsolidadaDemo([{ ...FEEDBACK_GESTOR, status: 'cancelado' }]);

    expect(alterado).not.toBe(v1);
    expect(adicionado).not.toBe(v1);
    expect(cancelado).not.toBe(v1);
  });

  it('T10: colaborador sem gestor fica em `sem_gestor` (não conta como aguardando gestor)', () => {
    const semGestor = derivarPendencias({
      ...base,
      feedbacks: [{ ...FEEDBACK_GESTOR, id: 'fb-par', tipo: 'par', avaliador_id: 'c-3' }],
    });
    expect(semGestor[0].status).toBe('sem_gestor');
    expect(semGestor[0].impedimentoEnvio).toBeTruthy();
    expect(contarAguardandoGestor(semGestor)).toBe(1);
    expect(resumoPorStatus(semGestor).sem_gestor).toBe(1);
    // A linha continua na fila (visível ao RH), com o motivo explícito.
    expect(semGestor[0].motivoBloqueioAprovacao).toMatch(/gestor responsável/i);
  });

  it('avaliação CANCELADA não é fonte (mas o registro é preservado)', () => {
    const pendencias = derivarPendencias({
      ...base,
      feedbacks: [
        { ...FEEDBACK_GESTOR, id: 'fb-par', tipo: 'par' },
        { ...FEEDBACK_GESTOR, id: 'fb-auto', tipo: 'auto', status: 'cancelado' },
      ],
    });
    expect(pendencias).toHaveLength(1);
    expect(pendencias[0].fontes).toEqual({ gestor: 0, par: 1, auto: 0, subordinado: 0 });
  });
});
