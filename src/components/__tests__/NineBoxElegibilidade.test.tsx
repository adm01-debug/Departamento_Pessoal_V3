import { describe, it, expect } from 'vitest';
import {
  avaliacaoElegivel,
  consolidarNineBox,
  marcarSuspeitas,
  normalizarAvaliacoes,
  selecionarRepresentante,
  type AvaliacaoNormalizada,
} from '@/components/avaliacao/nineBoxConsolidacao';
import { derivarPontos } from '@/components/avaliacao/nineBoxComum';

/**
 * ============================================================================
 * ETAPA 1 — separação das quatro responsabilidades do pipeline:
 *
 *   1. IDENTIFICAÇÃO de suspeita (`marcarSuspeitas`)
 *   2. RASTREABILIDADE (`registrosSinalizados` / `motivoSinalizacao`)
 *   3. ELEGIBILIDADE (`avaliacaoElegivel`) — independente da suspeita
 *   4. SELEÇÃO para consolidação (`selecionarRepresentante`)
 *
 * O ponto central sob prova: SEMELHANÇA NUNCA DESCARTA AVALIAÇÃO LEGÍTIMA, e uma
 * cópia sinalizada jamais representa a pessoa quando existe alternativa.
 * Dados 100% sintéticos, em memória.
 * ============================================================================
 */

const CICLO = 'ciclo-3';
const EMPRESA = 'empresa-a';

const fb = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  empresa_id: EMPRESA,
  ciclo_id: CICLO,
  avaliado_id: 'col-1',
  avaliador_id: 'aval-1',
  tipo: 'gestor',
  status: 'concluido',
  nota_geral: 4,
  potencial: 4,
  created_at: '2026-09-01T10:00:00',
  updated_at: '2026-09-01T10:00:00',
  ...extra,
});

const normalizar1 = (f: Record<string, unknown>) => normalizarAvaliacoes([f])[0];
const consolidar1 = (feedbacks: Record<string, unknown>[]) =>
  consolidarNineBox({ feedbacks, cicloId: CICLO, empresaId: EMPRESA })[0];

describe('etapa 1 · identificação de suspeita (isolada)', () => {
  it('a PRIMEIRA ocorrência nunca é sinalizada; as repetições são', () => {
    const lista = marcarSuspeitas([
      normalizar1(fb('a')),
      normalizar1(fb('b')),
      normalizar1(fb('c')),
    ] as AvaliacaoNormalizada[]);
    expect(lista.map((a) => a.possivelDuplicata)).toEqual([false, true, true]);
    expect(lista.map((a) => a.motivoSinalizacao)).toEqual([null, 'mesma_chave_avaliacao', 'mesma_chave_avaliacao']);
  });

  it('não muta a lista recebida (função pura)', () => {
    const original = normalizar1(fb('a'));
    const antes = { ...original };
    marcarSuspeitas([original, { ...original, id: 'b' }]);
    expect(original).toEqual(antes);
  });

  it('avaliadores diferentes com as MESMAS notas não se sinalizam', () => {
    const lista = normalizarAvaliacoes([
      fb('g1', { avaliador_id: 'a1' }),
      fb('g2', { avaliador_id: 'a2', tipo: 'par' }),
    ]);
    expect(lista.every((a) => a.possivelDuplicata)).toBe(false);
  });

  it('a chave considera ciclo: o MESMO par em ciclos diferentes não sinaliza', () => {
    const lista = normalizarAvaliacoes([fb('x'), fb('y', { ciclo_id: 'ciclo-2' })]);
    expect(lista.every((a) => a.possivelDuplicata)).toBe(false);
  });
});

describe('etapa 3 · elegibilidade NÃO depende de suspeita', () => {
  it('registro sinalizado continua ELEGÍVEL', () => {
    const [primeiro, copia] = normalizarAvaliacoes([fb('f1'), fb('f2')]);
    expect(copia.possivelDuplicata).toBe(true);
    expect(copia.elegivel).toBe(true); // ← a garantia pedida
    expect(copia.valida).toBe(true);
    expect(primeiro.elegivel).toBe(true);
  });

  it('inelegibilidade vem só de escala, identidade ou status', () => {
    const base = { colaboradorId: 'col-1', nota: 4, potencial: 4, status: 'concluido' };
    expect(avaliacaoElegivel(base)).toBe(true);
    expect(avaliacaoElegivel({ ...base, nota: null })).toBe(false);
    expect(avaliacaoElegivel({ ...base, potencial: null })).toBe(false);
    expect(avaliacaoElegivel({ ...base, colaboradorId: null })).toBe(false);
    expect(avaliacaoElegivel({ ...base, nota: 0 })).toBe(false);
    expect(avaliacaoElegivel(base, ['concluido'])).toBe(false); // filtro injetado
  });

  it('com o filtro de status desligado, pendente e concluído são elegíveis', () => {
    const [pendente, concluido] = normalizarAvaliacoes([
      fb('p1', { status: 'pendente' }),
      fb('c1', { status: 'concluido' }),
    ]);
    expect(pendente.elegivel).toBe(true);
    expect(concluido.elegivel).toBe(true);
  });

  it('avaliação antiga (só `nota_geral`, sem `performance`) é elegível', () => {
    const [a] = normalizarAvaliacoes([fb('legado', { performance: null, nota_geral: 5 })]);
    expect(a.elegivel).toBe(true);
    expect(a.nota).toBe(5);
  });
});

describe('etapa 4 · seleção do representante', () => {
  it('DUAS avaliações legítimas do mesmo avaliador, notas iguais, momentos diferentes: a MAIS RECENTE representa', () => {
    const [primeira, segunda] = normalizarAvaliacoes([
      fb('primeira', { nota_geral: 4, potencial: 4, updated_at: '2026-09-01T10:00:00' }),
      fb('segunda', { nota_geral: 4, potencial: 4, updated_at: '2026-09-20T10:00:00' }),
    ]);

    // A segunda é sinalizada por semelhança (mesma chave)…
    expect(segunda.possivelDuplicata).toBe(true);
    // …mas CONTINUA ELEGÍVEL e não é rebaixada por isso.
    expect(segunda.elegivel).toBe(true);
    expect(selecionarRepresentante([primeira, segunda])?.id).toBe('segunda');

    // E no resultado final: recente representa, antiga fica rastreável.
    const r = consolidar1([
      fb('primeira', { nota_geral: 4, potencial: 4, updated_at: '2026-09-01T10:00:00' }),
      fb('segunda', { nota_geral: 4, potencial: 4, updated_at: '2026-09-20T10:00:00' }),
    ]);
    expect(r.selecionadoId).toBe('segunda');
    expect(r.feedbackIdsUtilizados).toEqual(['segunda']);
    expect(r.registrosSinalizados).toEqual(['segunda']); // rastreabilidade mantida
    expect(r.quantidadeAvaliacoesValidas).toBe(2); // nada descartado
  });

  it('a nota consolidada acompanha a avaliação MAIS RECENTE (a antiga não contamina)', () => {
    // Chaves diferentes (notas diferentes) → nenhuma sinalização; quem manda é o tempo.
    const r = consolidar1([
      fb('antiga', { nota_geral: 5, potencial: 5, updated_at: '2026-09-01T10:00:00' }),
      fb('recente', { nota_geral: 4, potencial: 3, updated_at: '2026-09-20T10:00:00' }),
    ]);
    expect(r.selecionadoId).toBe('recente');
    expect(r.desempenhoConsolidado).toBe(4);
    expect(r.potencialConsolidado).toBe(3);
    expect(r.quantidadeSinalizados).toBe(0);
  });

  it('só em empate TOTAL de tempo o original (não sinalizado) prevalece', () => {
    const [original, copiaMesmoInstante] = normalizarAvaliacoes([
      fb('original', { updated_at: '2026-09-10T10:00:00' }),
      fb('copia', { updated_at: '2026-09-10T10:00:00' }),
    ]);
    expect(selecionarRepresentante([original, copiaMesmoInstante])?.id).toBe('original');
  });

  it('sem sinalizados, escolhe o mais recente', () => {
    const lista = normalizarAvaliacoes([
      fb('antiga', { avaliador_id: 'a1', updated_at: '2026-09-01T10:00:00' }),
      fb('nova', { avaliador_id: 'a2', tipo: 'par', updated_at: '2026-09-20T10:00:00' }),
    ]);
    expect(selecionarRepresentante(lista)?.id).toBe('nova');
  });

  it('empate total resolve por id (determinístico)', () => {
    const lista = normalizarAvaliacoes([
      fb('b', { avaliador_id: 'a9', tipo: 'par' }),
      fb('a', { avaliador_id: 'a8', tipo: 'auto' }),
    ]);
    expect(selecionarRepresentante(lista)?.id).toBe('a');
  });

  it('estratégias de média não elegem representante único', () => {
    const lista = normalizarAvaliacoes([fb('f1')]);
    expect(selecionarRepresentante(lista, 'media_simples')).toBeNull();
    expect(selecionarRepresentante(lista, 'media_por_tipo')).toBeNull();
  });

  it('sem elegíveis, não há representante', () => {
    expect(selecionarRepresentante([])).toBeNull();
  });
});

describe('etapa 2 · rastreabilidade e efeito real na consolidação', () => {
  it('a cópia sinalizada permanece na base e é rastreável', () => {
    const r = consolidar1([fb('f1'), fb('f2')]);
    expect(r.quantidadeAvaliacoesValidas).toBe(2); // nada descartado
    expect(r.quantidadeSinalizados).toBe(1);
    expect(r.registrosSinalizados).toEqual(['f2']);
    expect(r.selecionadoId).toBe('f1'); // o original representa
  });

  it('a sinalização não altera a nota consolidada quando as notas são iguais', () => {
    const r = consolidar1([fb('f1', { nota_geral: 5, potencial: 5 }), fb('f2', { nota_geral: 5, potencial: 5 })]);
    expect(r.desempenhoConsolidado).toBe(5);
    expect(r.potencialConsolidado).toBe(5);
    expect(r.classificacao).toBe('3-3');
  });

  it('quando o ORIGINAL é inelegível, a cópia elegível assume (nada se perde)', () => {
    const r = consolidar1([fb('f1', { potencial: null }), fb('f2', { nota_geral: 5, potencial: 5 })]);
    expect(r.quantidadeAvaliacoesValidas).toBe(1); // só a cópia é elegível
    expect(r.selecionadoId).toBe('f2');
    expect(r.desempenhoConsolidado).toBe(5);
  });

  it('`derivarPontos` expõe seleção e rastreabilidade sem mudar a classificação', () => {
    const pontos = derivarPontos({
      // Mesma chave (mesmo avaliador/tipo/notas) → a segunda é sinalizada.
      feedbacks: [fb('f1', { nota_geral: 5, potencial: 5 }), fb('f2', { nota_geral: 5, potencial: 5 })],
      cicloId: CICLO,
    });
    expect(pontos).toHaveLength(1);
    expect(pontos[0]).toMatchObject({
      selecionadoId: 'f1',
      sinalizados: 1,
      registrosSinalizados: ['f2'],
      quadrante: '3-3',
      quantidadeAvaliacoesValidas: 2,
    });
  });

  it('suspeita em outro ciclo não contamina o ciclo analisado', () => {
    const pontos = derivarPontos({
      feedbacks: [fb('atual'), fb('anterior', { ciclo_id: 'ciclo-2' })],
      cicloId: CICLO,
    });
    expect(pontos[0].sinalizados).toBe(0);
    expect(pontos[0].selecionadoId).toBe('atual');
  });
});
