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

  it('decisão de OUTRA versão ⇒ devolvida (a avaliação mudou depois da decisão)', () => {
    expect(situacaoAprovacao({ versaoGestor: 'v2', decisao: decisao('aprovado', 'v1'), validada: false })).toBe(
      'devolvida'
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
  });

  it('sem avaliação do gestor concluída NÃO há pendência (fica em preparação)', () => {
    const pendencias = derivarPendencias({
      ...base,
      feedbacks: [{ ...FEEDBACK_GESTOR, status: 'pendente' }],
    });
    expect(pendencias).toHaveLength(1);
    expect(pendencias[0].status).toBe('em_preparacao');
  });

  it('decisão de outra versão devolve para correção', () => {
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
    expect(pendencias[0].status).toBe('devolvida');
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
    // Avaliação alterada depois da decisão ⇒ volta a exigir decisão (devolvida).
    expect(
      estadoAprovacao({ versaoGestor: 'v2', decisao: decisao('aprovado', 'v1'), validada: false }).pendente
    ).toBe(false);
  });

  it('6) o RH valida o Potencial SÓ depois do aval do gestor vigente', () => {
    expect(estadoAprovacao({ versaoGestor: 'v1', decisao: null, validada: false }).podeValidarPotencial).toBe(false);
    expect(
      estadoAprovacao({ versaoGestor: 'v1', decisao: decisao('devolvido', 'v1'), validada: false }).podeValidarPotencial
    ).toBe(false);
    expect(
      estadoAprovacao({ versaoGestor: 'v1', decisao: decisao('aprovado', 'v1'), validada: false }).podeValidarPotencial
    ).toBe(true);
  });

  it('7) o Nine-Box só é elegível com a validação VIGENTE (as duas aprovações)', () => {
    expect(
      estadoAprovacao({ versaoGestor: 'v1', decisao: decisao('aprovado', 'v1'), validada: false }).elegivelNineBox
    ).toBe(false);
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
