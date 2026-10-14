import { describe, it, expect } from 'vitest';
import {
  ESTRATEGIA_ATIVA,
  MAPA_STATUS_FEEDBACK,
  PESOS_POR_TIPO,
  PESOS_POTENCIAL,
  POLITICA_DUPLICATAS,
  PROPOSTA_CONSOLIDACAO,
  PROPOSTA_PESOS_INICIAL,
  STATUS_QUE_NAO_CONSOLIDAM,
  combinarNotasPorTipo,
  consolidarNineBox,
  lerMovimentoPorEixo,
  normalizarAvaliacoes,
  notaNaEscala,
  validarInvariantes,
  type ConsolidacaoColaborador,
} from '@/components/avaliacao/nineBoxConsolidacao';
import { contarQuadrantes, derivarPontos, lerMovimento, type PontoNineBox } from '@/components/avaliacao/nineBoxComum';

/**
 * ============================================================================
 * Prova da CONSOLIDAÇÃO do Nine-Box — os cenários exigidos pela auditoria.
 *
 * Nenhum teste usa dado de produção: tudo é montado aqui em memória, com os
 * MESMOS nomes de campo de `feedbacks_360` (`avaliado_id`, `ciclo_id`,
 * `nota_geral`/`performance`, `potencial`, `tipo`, `status`, `empresa_id`).
 *
 * Garantia central sob teste: 1 colaborador + 1 ciclo = no máximo 1
 * classificação consolidada, sempre a partir de notas VÁLIDAS de desempenho e
 * potencial — sem potencial presumido, sem desempenho ausente virando nota
 * baixa e sem feedback duplicado inflando contagem.
 * ============================================================================
 */

const EMPRESA = 'empresa-a';
const EMPRESA_B = 'empresa-b';
const CICLO_3 = 'ciclo-3';
const CICLO_2 = 'ciclo-2';

interface FeedbackFake {
  id: string;
  empresa_id?: string;
  ciclo_id?: string | null;
  avaliado_id?: string | null;
  avaliador_id?: string | null;
  tipo?: string;
  status?: string;
  nota_geral?: unknown;
  performance?: unknown;
  potencial?: unknown;
  created_at?: string;
  updated_at?: string;
}

/** Feedback mínimo no formato de `feedbacks_360`. */
function fb(extra: FeedbackFake): FeedbackFake {
  return {
    empresa_id: EMPRESA,
    ciclo_id: CICLO_3,
    avaliado_id: 'col-1',
    avaliador_id: 'aval-1',
    tipo: 'gestor',
    status: 'concluido',
    nota_geral: 4,
    potencial: 4,
    created_at: '2026-09-01T10:00:00',
    updated_at: '2026-09-01T10:00:00',
    ...extra,
  };
}

const cons = (feedbacks: FeedbackFake[], cicloId: string | null = CICLO_3, empresaId: string | null = EMPRESA) =>
  consolidarNineBox({ feedbacks, cicloId, empresaId });

const porColaborador = (lista: ConsolidacaoColaborador[], id: string) =>
  lista.find((c) => c.colaboradorId === id) as ConsolidacaoColaborador;

describe('consolidação — escala e validação das notas', () => {
  it('aceita apenas notas dentro da escala 1–5 e isola o resto', () => {
    expect(notaNaEscala(1)).toBe(1);
    expect(notaNaEscala(5)).toBe(5);
    expect(notaNaEscala('3')).toBe(3);
    expect(notaNaEscala(0)).toBeNull();
    expect(notaNaEscala(6)).toBeNull();
    expect(notaNaEscala('abc')).toBeNull();
    expect(notaNaEscala(null)).toBeNull();
  });

  it('nota fora da escala não classifica e é contada como problema de dado', () => {
    const [c] = cons([fb({ nota_geral: 9 })]);
    expect(c.classificacao).toBeNull();
    expect(c.status).toBe('sem_base');
    expect(c.notasForaDaEscala).toBe(1);
    expect(c.desempenhoConsolidado).toBeNull();
  });
});

describe('consolidação — cenários de avaliação por colaborador', () => {
  it('1 · colaborador com apenas um feedback válido', () => {
    const lista = cons([fb({ id: 'f1', nota_geral: 5, potencial: 5 })]);
    expect(lista).toHaveLength(1);
    expect(lista[0].classificacao).toBe('3-3');
    expect(lista[0].quantidadeAvaliacoes).toBe(1);
    expect(lista[0].quantidadeAvaliacoesValidas).toBe(1);
    expect(lista[0].feedbackIdsUtilizados).toEqual(['f1']);
  });

  it('2 · gestor + pares: agrupa em 1 pessoa e mantém as duas avaliações', () => {
    const lista = cons([
      fb({ id: 'g1', tipo: 'gestor', nota_geral: 5, potencial: 5, updated_at: '2026-09-20T10:00:00' }),
      fb({ id: 'p1', tipo: 'par', avaliador_id: 'aval-2', nota_geral: 3, potencial: 3 }),
    ]);
    expect(lista).toHaveLength(1);
    expect(lista[0].quantidadeAvaliacoes).toBe(2);
    expect(lista[0].quantidadeAvaliacoesValidas).toBe(2);
    expect(lista[0].tiposAvaliadores).toEqual(['gestor', 'par']);
    // Estratégia ativa (`mais_recente`): a avaliação de gestor representa.
    expect(lista[0].feedbackIdsUtilizados).toEqual(['g1']);
    expect(lista[0].classificacao).toBe('3-3');
  });

  it('3 · autoavaliação entra na consolidação e aparece nos tipos', () => {
    const lista = cons([fb({ id: 'a1', tipo: 'auto', nota_geral: 3, potencial: 4 })]);
    expect(lista[0].tiposAvaliadores).toEqual(['auto']);
    expect(lista[0].classificacao).toBe('2-3'); // desempenho médio (3) + potencial alto (4)
  });

  it('4 · várias avaliações legítimas não são tratadas como duplicata', () => {
    const lista = cons([
      fb({ id: 'g1', tipo: 'gestor', nota_geral: 5, potencial: 5 }),
      fb({ id: 'p1', tipo: 'par', avaliador_id: 'aval-2', nota_geral: 4, potencial: 4 }),
      fb({ id: 's1', tipo: 'subordinado', avaliador_id: 'aval-3', nota_geral: 3, potencial: 3 }),
    ]);
    expect(lista[0].quantidadeAvaliacoes).toBe(3);
    expect(lista[0].quantidadeAvaliacoesValidas).toBe(3);
    expect(lista[0].quantidadeSinalizados).toBe(0);
  });

  it('5 · cópia semelhante é PRESERVADA e apenas sinalizada', () => {
    const lista = cons([
      fb({ id: 'f1', nota_geral: 4, potencial: 4 }),
      fb({ id: 'f1-copia', nota_geral: 4, potencial: 4 }),
    ]);
    expect(lista[0].quantidadeAvaliacoes).toBe(2);
    expect(lista[0].quantidadeAvaliacoesValidas).toBe(2); // as duas continuam na base
    expect(lista[0].quantidadeSinalizados).toBe(1);
    expect(lista[0].registrosSinalizados).toEqual(['f1-copia']);
    expect(lista[0].feedbackIdsUtilizados).toEqual(['f1']); // o original representa
  });
});

describe('consolidação — avaliações incompletas (nada de quadrante arbitrário)', () => {
  it('6 · potencial ausente → não classifica', () => {
    const [c] = cons([fb({ potencial: null })]);
    expect(c.potencialConsolidado).toBeNull();
    expect(c.classificacao).toBeNull();
    expect(c.status).toBe('sem_base');
    expect(c.faltando).toBe('potencial');
  });

  it('7 · desempenho ausente → não classifica (não vira nota baixa)', () => {
    const [c] = cons([fb({ nota_geral: null, performance: null })]);
    expect(c.desempenhoConsolidado).toBeNull();
    expect(c.classificacao).toBeNull();
    expect(c.faltando).toBe('desempenho');
  });

  it('8 · ambas ausentes → não classifica', () => {
    const [c] = cons([fb({ nota_geral: null, performance: null, potencial: null })]);
    expect(c.status).toBe('sem_base');
    expect(c.faltando).toBe('ambos');
  });

  it('9 · nota inválida (texto) não classifica', () => {
    const [c] = cons([fb({ nota_geral: 'nao-numero' })]);
    expect(c.classificacao).toBeNull();
    expect(c.desempenhoConsolidado).toBeNull();
  });

  it('12 · status não finalizado: hoje CONSOLIDA (filtro pronto, porém desligado)', () => {
    const [c] = cons([fb({ status: 'rascunho' })]);
    expect(c.classificacao).toBe('3-3');
    // O ponto de virada é deliberadamente explícito: ligar aqui exige decisão
    // de negócio sobre quais status representam avaliação finalizada.
    expect(STATUS_QUE_NAO_CONSOLIDAM).toEqual([]);
  });
});

describe('consolidação — ciclo, nome repetido e empresa', () => {
  it('10 · avaliação de outro ciclo não entra', () => {
    const lista = cons([fb({ id: 'f2', ciclo_id: CICLO_2 })]);
    expect(lista).toHaveLength(0);
  });

  it('11 · colaborador sem ciclo fica fora quando há um ciclo selecionado', () => {
    const lista = cons([fb({ ciclo_id: null })]);
    expect(lista).toHaveLength(0);
  });

  it('13 · dois colaboradores com o MESMO nome e ids diferentes não se misturam', () => {
    const lista = cons([
      fb({ id: 'f1', avaliado_id: 'col-1', nota_geral: 5, potencial: 5 }),
      fb({ id: 'f2', avaliado_id: 'col-2', nota_geral: 2, potencial: 2 }),
    ]);
    expect(lista).toHaveLength(2);
    expect(porColaborador(lista, 'col-1').classificacao).toBe('3-3');
    expect(porColaborador(lista, 'col-2').classificacao).toBe('2-2');
  });

  it('14 · mesmo colaborador em dois ciclos gera duas consolidações distintas', () => {
    const feedbacks = [
      fb({ id: 'c3', ciclo_id: CICLO_3, nota_geral: 5, potencial: 5 }),
      fb({ id: 'c2', ciclo_id: CICLO_2, nota_geral: 3, potencial: 3 }),
    ];
    const atual = cons(feedbacks, CICLO_3);
    const anterior = cons(feedbacks, CICLO_2);
    expect(atual[0].classificacao).toBe('3-3');
    expect(anterior[0].classificacao).toBe('2-2');
    expect(atual[0].cicloId).toBe(CICLO_3);
    expect(anterior[0].cicloId).toBe(CICLO_2);
  });

  it('16 · a mesma pessoa em empresas diferentes não se mistura', () => {
    const feedbacks = [
      fb({ id: 'a', empresa_id: EMPRESA, nota_geral: 5, potencial: 5 }),
      fb({ id: 'b', empresa_id: EMPRESA_B, nota_geral: 2, potencial: 2 }),
    ];
    // Sem filtro de empresa (uso de auditoria), as duas convivem separadas.
    const semFiltro = cons(feedbacks, CICLO_3, null);
    expect(semFiltro).toHaveLength(2);
    expect(semFiltro.map((c) => c.empresaId).sort()).toEqual([EMPRESA, EMPRESA_B]);

    // Com empresa informada, o isolamento de tenant vale.
    const soA = cons(feedbacks, CICLO_3, EMPRESA);
    expect(soA).toHaveLength(1);
    expect(soA[0].empresaId).toBe(EMPRESA);
  });
});

describe('consolidação — movimentação entre ciclos (só com histórico comparável)', () => {
  it('15 · sem histórico no ciclo anterior, nada é presumido', () => {
    const feedbacks = [
      fb({ id: 'atual-1', ciclo_id: CICLO_3, avaliado_id: 'col-1', nota_geral: 5, potencial: 5 }),
      fb({ id: 'atual-2', ciclo_id: CICLO_3, avaliado_id: 'col-2', nota_geral: 3, potencial: 3 }),
    ];
    const atual = derivarPontos({ feedbacks, cicloId: CICLO_3 });
    const anterior = derivarPontos({ feedbacks, cicloId: CICLO_2 });
    const movimento = lerMovimento(atual, anterior);

    expect(anterior).toHaveLength(0);
    expect(movimento.comparaveis).toBe(0);
    expect(movimento.evoluiram).toBe(0);
    expect(movimento.permaneceram).toBe(0);
    expect(movimento.regrediram).toBe(0);
    expect(movimento.itens).toEqual([]);
  });

  it('compara apenas quem tem nota válida nos DOIS ciclos', () => {
    const feedbacks = [
      fb({ id: 'a1', ciclo_id: CICLO_2, avaliado_id: 'col-1', nota_geral: 3, potencial: 3 }),
      fb({ id: 'a2', ciclo_id: CICLO_3, avaliado_id: 'col-1', nota_geral: 5, potencial: 5 }),
      fb({ id: 'b1', ciclo_id: CICLO_3, avaliado_id: 'col-2', nota_geral: 4, potencial: 4 }), // só no atual
      fb({ id: 'c1', ciclo_id: CICLO_2, avaliado_id: 'col-3', nota_geral: 4, potencial: 4 }), // só no anterior
      fb({ id: 'd1', ciclo_id: CICLO_2, avaliado_id: 'col-4', nota_geral: 2, potencial: null }), // incompleto
      fb({ id: 'd2', ciclo_id: CICLO_3, avaliado_id: 'col-4', nota_geral: 4, potencial: 4 }),
    ];
    const movimento = lerMovimento(
      derivarPontos({ feedbacks, cicloId: CICLO_3 }),
      derivarPontos({ feedbacks, cicloId: CICLO_2 })
    );

    expect(movimento.comparaveis).toBe(1); // só col-1 tem nota VÁLIDA nos dois
    expect(movimento.evoluiram).toBe(1);
    expect(movimento.itens[0]).toMatchObject({ nome: expect.any(String), de: 6, para: 10, sentido: 'evoluiu' });
  });
});

describe('consolidação — invariantes da matriz', () => {
  const feedbacks = [
    // 4 pessoas no ciclo atual, com duplicata, incompleto e fora de escala.
    fb({ id: 'f1', avaliado_id: 'col-1', nota_geral: 5, potencial: 5 }),
    fb({ id: 'f1-copia', avaliado_id: 'col-1', nota_geral: 5, potencial: 5 }),
    fb({ id: 'f2', avaliado_id: 'col-1', tipo: 'par', avaliador_id: 'aval-9', nota_geral: 4, potencial: 4 }),
    fb({ id: 'f3', avaliado_id: 'col-2', nota_geral: 3, potencial: 3 }),
    fb({ id: 'f4', avaliado_id: 'col-3', nota_geral: 4, potencial: null }),
    fb({ id: 'f5', avaliado_id: 'col-4', nota_geral: 7, potencial: 4 }),
  ];

  it('1 colaborador + 1 ciclo = no máximo 1 classificação', () => {
    const lista = cons(feedbacks);
    const relatorio = validarInvariantes(lista);
    expect(relatorio.chavesDuplicadas).toEqual([]);
    expect(lista).toHaveLength(4); // col-1, col-2, col-3 e col-4 — 6 registros, 4 pessoas
    expect(relatorio.consistente).toBe(true);
  });

  it('a soma dos nove quadrantes = colaboradores únicos classificados', () => {
    const pontos = derivarPontos({ feedbacks, cicloId: CICLO_3 });
    const contagem = contarQuadrantes(pontos);
    const soma = Object.values(contagem).reduce((a, b) => a + b, 0);
    const classificados = pontos.filter((p) => p.quadrante !== null).length;

    expect(pontos).toHaveLength(4);
    expect(classificados).toBe(2); // col-1 e col-2 (col-3 sem potencial, col-4 fora de escala)
    expect(soma).toBe(classificados);
    expect(pontos.filter((p) => p.quadrante === null)).toHaveLength(2);
  });

  it('a rastreabilidade aponta só para avaliações válidas e usadas', () => {
    const pontos = derivarPontos({ feedbacks, cicloId: CICLO_3 });
    const col1 = pontos.find((p) => p.colaboradorId === 'col-1') as PontoNineBox;
    expect(col1.quantidadeAvaliacoes).toBe(3); // 2 avaliações distintas + 1 cópia semelhante
    expect(col1.quantidadeAvaliacoesValidas).toBe(3); // NADA foi descartado
    expect(col1.sinalizados).toBe(1); // a cópia foi sinalizada…
    expect(col1.registrosSinalizados).toEqual(['f1-copia']); // …e permanece rastreável
    expect(col1.feedbackIdsUtilizados).toEqual(['f1']); // o original representa a pessoa
  });
});

describe('consolidação — estratégia em uso e proposta pendente de aprovação', () => {
  it('a estratégia ATIVA é `mais_recente` (nada de ponderação inventada)', () => {
    expect(ESTRATEGIA_ATIVA).toBe('mais_recente');
    expect(PROPOSTA_CONSOLIDACAO.opcoes.filter((o) => o.ativa)).toHaveLength(1);
  });

  it('`media_simples` existe, funciona e NÃO está ativa', async () => {
    const { consolidarNineBox: consolidar } = await import('@/components/avaliacao/nineBoxConsolidacao');
    const feedbacks = [
      fb({ id: 'g1', tipo: 'gestor', nota_geral: 5, potencial: 5, updated_at: '2026-09-20T10:00:00' }),
      fb({ id: 'p1', tipo: 'par', avaliador_id: 'aval-2', nota_geral: 1, potencial: 1 }),
    ];
    const [atual] = consolidarNineBox({ feedbacks, cicloId: CICLO_3, empresaId: EMPRESA });
    const [porMedia] = consolidar({ feedbacks, cicloId: CICLO_3, empresaId: EMPRESA, estrategia: 'media_simples' });

    expect(atual.desempenhoConsolidado).toBe(5); // representante (gestor, mais recente)
    expect(porMedia.desempenhoConsolidado).toBe(3); // média de 5 e 1
    expect(porMedia.feedbackIdsUtilizados).toEqual(['g1', 'p1']);
    expect(porMedia.notasPorTipo.gestor.desempenho).toBe(5);
    expect(porMedia.notasPorTipo.par.desempenho).toBe(1);
  });

  it('status: o app só grava `pendente` e NÃO existe fluxo de finalização', () => {
    // Comprova por que o filtro de status continua desligado: ligá-lo hoje
    // esvaziaria a matriz, porque todo registro nasce (e permanece) pendente.
    expect(MAPA_STATUS_FEEDBACK.escritos_pelo_app).toEqual(['pendente']);
    expect(MAPA_STATUS_FEEDBACK.finalizacao_existe).toBe(false);
    expect(STATUS_QUE_NAO_CONSOLIDAM).toEqual([]);
  });

  it('pesos por tipo: `null` até aprovação — nada é ponderado por conta própria', () => {
    expect(PESOS_POR_TIPO).toBeNull();
    expect(PESOS_POTENCIAL).toBeNull();
    expect(PROPOSTA_PESOS_INICIAL.aprovada).toBe(false);
    expect(PROPOSTA_PESOS_INICIAL.desempenho).toEqual({ gestor: 0.6, par: 0.25, auto: 0.1, subordinado: 0.05 });
    expect(PROPOSTA_PESOS_INICIAL.potencial).toBeNull(); // regra separada, pendente
    const semPesos = combinarNotasPorTipo({
      gestor: { desempenho: 5, potencial: 5, avaliacoes: 1 },
      par: { desempenho: 1, potencial: 1, avaliacoes: 1 },
    });
    expect(semPesos).toMatchObject({ desempenho: null, potencial: null, motivo: 'sem_pesos_aprovados' });
  });

  it('pesos APROVADOS (hipótese) combinam por tipo e ignoram quem não tem peso', () => {
    const r = combinarNotasPorTipo(
      {
        gestor: { desempenho: 5, potencial: 4, avaliacoes: 1 },
        par: { desempenho: 3, potencial: 5, avaliacoes: 2 },
        auto: { desempenho: 1, potencial: 1, avaliacoes: 1 },
      },
      { pesos: { gestor: 0.6, par: 0.4 }, pesosPotencial: { gestor: 0.6, par: 0.4 } } // `auto` sem peso aprovado
    );
    expect(r.motivo).toBe('ok');
    expect(r.tiposIgnorados).toEqual(['auto']);
    expect(r.pesosUsados).toEqual({ gestor: 0.6, par: 0.4 });
    expect(r.desempenho).toBeCloseTo(0.6 * 5 + 0.4 * 3, 6); // 4,2
    expect(r.potencial).toBeCloseTo(0.6 * 4 + 0.4 * 5, 6); // 4,4
  });

  it('cada eixo tem a própria regra: sem pesos de potencial, só o desempenho calcula', () => {
    const r = combinarNotasPorTipo(
      { gestor: { desempenho: 4, potencial: 5, avaliacoes: 1 } },
      { pesosDesempenho: { gestor: 1 } }
    );
    expect(r.desempenho).toBe(4);
    expect(r.potencial).toBeNull(); // NÃO herda a regra do desempenho
    expect(r.motivoPotencial).toBe('sem_pesos_aprovados');
    expect(r.motivoDesempenho).toBe('ok');
  });

  it('potencial pode ser restrito ao gestor (decisão de RH parametrizável)', () => {
    const base = {
      gestor: { desempenho: 4, potencial: 5, avaliacoes: 1 },
      par: { desempenho: 2, potencial: 1, avaliacoes: 1 },
    };
    const soGestor = combinarNotasPorTipo(base, {
      pesosDesempenho: { gestor: 0.5, par: 0.5 },
      pesosPotencial: { gestor: 0.5, par: 0.5 },
      potencialSomenteDe: ['gestor'],
    });
    expect(soGestor.potencial).toBe(5); // pares não opinam sobre potencial
    expect(soGestor.desempenho).toBeCloseTo(3, 6); // desempenho continua combinado

    const soPar = combinarNotasPorTipo(base, {
      pesosDesempenho: { gestor: 0.5, par: 0.5 },
      pesosPotencial: { gestor: 0.5, par: 0.5 },
      potencialSomenteDe: ['par'],
    });
    expect(soPar.potencial).toBe(1);
  });

  it('estratégia `media_por_tipo` está ligada a pesos: sem eles, NÃO classifica', () => {
    const lista = consolidarNineBox({
      feedbacks: [fb({ id: 'g1', tipo: 'gestor', nota_geral: 5, potencial: 5 })],
      cicloId: CICLO_3,
      empresaId: EMPRESA,
      estrategia: 'media_por_tipo',
    });
    // Recusa explícita: melhor "não classificado" do que classificar com peso
    // inexistente. Assim que os pesos forem aprovados, é trocar `PESOS_POR_TIPO`.
    expect(lista[0].desempenhoConsolidado).toBeNull();
    expect(lista[0].classificacao).toBeNull();
    // `incompleto` (e não `sem_base`): a avaliação EXISTE e é válida — o que não
    // pôde ser calculado foi a combinação, por falta de peso aprovado.
    expect(lista[0].status).toBe('incompleto');
    expect(lista[0].quantidadeAvaliacoesValidas).toBe(1);
  });
});

describe('duplicatas — nenhuma avaliação legítima é descartada', () => {
  it('política declarada: sem descarte automático, sem janela de tempo', () => {
    expect(POLITICA_DUPLICATAS.descarte_automatico).toBe(false);
    expect(POLITICA_DUPLICATAS.janela_de_tempo).toBeNull();
    expect(POLITICA_DUPLICATAS.exige_idempotencia_na_gravacao).toBe(true);
  });

  it('notas IGUAIS de avaliadores diferentes NÃO são nem sinalizadas', () => {
    const lista = cons([
      fb({ id: 'g1', tipo: 'gestor', avaliador_id: 'a1', nota_geral: 4, potencial: 4 }),
      fb({ id: 'p1', tipo: 'par', avaliador_id: 'a2', nota_geral: 4, potencial: 4 }),
      fb({ id: 'p2', tipo: 'par', avaliador_id: 'a3', nota_geral: 4, potencial: 4 }),
    ]);
    expect(lista[0].quantidadeAvaliacoesValidas).toBe(3);
    expect(lista[0].quantidadeSinalizados).toBe(0);
    expect(lista[0].registrosSinalizados).toEqual([]);
  });

  it('semelhança é SINALIZADA e PRESERVADA (nada sai da consolidação)', () => {
    const lista = cons([
      fb({ id: 'f1', avaliador_id: 'a1', nota_geral: 4, potencial: 4, created_at: '2026-09-01T10:00:00' }),
      fb({ id: 'f2', avaliador_id: 'a1', nota_geral: 4, potencial: 4, created_at: '2026-09-01T10:00:30' }),
    ]);
    expect(lista[0].quantidadeAvaliacoesValidas).toBe(2); // as DUAS valem
    expect(lista[0].quantidadeSinalizados).toBe(1);
    expect(lista[0].registrosSinalizados).toEqual(['f2']); // rastreável para revisão
    // O original (não sinalizado) é quem representa a pessoa.
    expect(lista[0].feedbackIdsUtilizados).toEqual(['f1']);
  });

  it('dois registros sem `avaliador_id` também são preservados', () => {
    const lista = cons([
      fb({ id: 'f1', avaliador_id: null, nota_geral: 4, potencial: 4 }),
      fb({ id: 'f2', avaliador_id: null, nota_geral: 4, potencial: 4 }),
    ]);
    expect(lista[0].quantidadeAvaliacoesValidas).toBe(2);
    expect(lista[0].registrosSinalizados).toEqual(['f2']);
  });

  it('reavaliação do mesmo avaliador com a MESMA nota é preservada, não descartada', () => {
    const lista = cons([
      fb({ id: 'f1', avaliador_id: 'a1', nota_geral: 4, potencial: 4, created_at: '2026-09-01T10:00:00' }),
      fb({ id: 'f2', avaliador_id: 'a1', nota_geral: 4, potencial: 4, created_at: '2026-09-20T10:00:00' }),
    ]);
    expect(lista[0].quantidadeAvaliacoesValidas).toBe(2);
    expect(lista[0].registrosSinalizados).toEqual(['f2']); // sinalizado, porém preservado
  });

  it('sinaliza divergência entre `performance` (legado) e `nota_geral` sem escolher sozinho', () => {
    const [norm] = normalizarAvaliacoes([fb({ performance: 4, nota_geral: 2, potencial: 3 })]);
    expect(norm.divergenciaNotas).toBe(true);
    expect(norm.nota).toBe(4); // precedência atual preservada (aguardando decisão)
  });
});

describe('movimentação por eixo — positiva, negativa, estável e mista', () => {
  const ponto = (id: string, nome: string, desempenho: 1 | 2 | 3, potencial: 1 | 2 | 3) => ({
    id,
    colaboradorId: id,
    nome,
    desempenho,
    potencialFaixa: potencial,
  });

  it('classifica cada eixo e distingue o caso MISTO', () => {
    const anterior = [
      ponto('c1', 'Subiu tudo', 1, 1),
      ponto('c2', 'Caiu tudo', 3, 3),
      ponto('c3', 'Estável', 2, 2),
      ponto('c4', 'Trocou de eixo', 1, 3), // desempenho sobe, potencial desce
      ponto('c5', 'Só potencial', 2, 1),
    ];
    const atual = [
      ponto('c1', 'Subiu tudo', 3, 3),
      ponto('c2', 'Caiu tudo', 1, 1),
      ponto('c3', 'Estável', 2, 2),
      ponto('c4', 'Trocou de eixo', 3, 1),
      ponto('c5', 'Só potencial', 2, 3),
    ];

    const r = lerMovimentoPorEixo(atual, anterior);
    expect(r.comparaveis).toBe(5);
    expect(r.evoluiram).toBe(2); // c1 (ambos subiram) + c5 (só potencial subiu)
    expect(r.regrediram).toBe(1); // c2
    expect(r.permaneceram).toBe(1); // c3
    expect(r.mistas).toBe(1); // c4 — troca de eixo, NÃO é evolução

    const c4 = r.itens.find((i) => i.colaboradorId === 'c4');
    expect(c4?.sentido).toBe('mista');
    expect(c4?.desempenho).toMatchObject({ de: 1, para: 3, sentido: 'subiu' });
    expect(c4?.potencial).toMatchObject({ de: 3, para: 1, sentido: 'desceu' });
  });

  it('mudar de NOTA sem mudar de FAIXA é estável (a matriz não se move)', () => {
    const antes = [{ id: 'c1', colaboradorId: 'c1', nome: 'Ana', desempenho: 3 as const, potencialFaixa: 3 as const }];
    const agora = [{ id: 'c1', colaboradorId: 'c1', nome: 'Ana', desempenho: 3 as const, potencialFaixa: 3 as const }];
    const r = lerMovimentoPorEixo(agora, antes);
    expect(r.permaneceram).toBe(1);
    expect(r.evoluiram + r.regrediram + r.mistas).toBe(0);
  });

  it('a soma das categorias fecha com os comparáveis (sem perder ninguém)', () => {
    const anterior = [ponto('c1', 'A', 1, 1), ponto('c2', 'B', 2, 2)];
    const atual = [ponto('c1', 'A', 2, 2), ponto('c2', 'B', 3, 1)];
    const r = lerMovimentoPorEixo(atual, anterior);
    expect(r.evoluiram + r.regrediram + r.permaneceram + r.mistas).toBe(r.comparaveis);
  });

  it('quem falta em qualquer um dos ciclos fica fora da comparação', () => {
    const anterior = [ponto('c1', 'A', 1, 1)];
    const atual = [ponto('c1', 'A', 2, 2), ponto('c2', 'B', 2, 2)];
    const r = lerMovimentoPorEixo(atual, anterior);
    expect(r.comparaveis).toBe(1);
    expect(r.itens.map((i) => i.colaboradorId)).toEqual(['c1']);
  });
});
