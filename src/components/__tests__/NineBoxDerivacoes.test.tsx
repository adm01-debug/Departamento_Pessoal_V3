import { describe, it, expect } from 'vitest';
import {
  ORDEM_MATRIZ,
  QUADRANTE_POR_CHAVE,
  cargosDisponiveis,
  classifyScore,
  contarQuadrantes,
  correspondeBusca,
  departamentosDisponiveis,
  derivarPontos,
  destaques,
  lerAtencao,
  lerInsights,
  lerInsightsEstruturados,
  lerMovimento,
  pontosDoQuadrante,
  pontosEmAtencao,
  rankingPontos,
  textoInsight,
} from '@/components/avaliacao/nineBoxComum';
import { notaNaEscala } from '@/components/avaliacao/nineBoxConsolidacao';

/**
 * ============================================================================
 * Prova das DERIVAÇÕES do Nine-Box (dados/matemática, sem DOM).
 *
 * O que precisa ficar travado aqui:
 *   • `classifyScore` mantém os limiares ORIGINAIS (1,5 / 3,5);
 *   • potencial AUSENTE não é presumido — o item fica fora da matriz e é
 *     marcado como pendência (o componente antigo usava `potencial || 2`);
 *   • um colaborador aparece UMA vez por ciclo (registro mais recente);
 *   • movimentação só existe quando há as duas notas nos DOIS ciclos;
 *   • "atenção" é a união sem repetir de quadrante de atenção + sem PDI.
 * ============================================================================
 */

const COLABORADORES = [
  { id: 'c1', nome_completo: 'Ana Souza', cargo: 'Analista', departamento: 'RH', foto_url: 'x.jpg' },
  { id: 'c2', nome_completo: 'Bruno Lima', cargo: 'Desenvolvedor', departamento: 'TI' },
  { id: 'c3', nome_completo: 'Carla Dias', cargo: 'Desenvolvedor', departamento: 'TI' },
];

/** Nome que a relação embutida devolve, por id (evita nome repetido em fixture). */
const NOMES: Record<string, string> = {
  c1: 'Ana Souza',
  c2: 'Bruno Lima',
  c3: 'Carla Dias',
};

/** Feedback mínimo com os campos que a aba consome. */
function fb(extra: Record<string, unknown> = {}) {
  const id = String(extra.avaliado_id ?? 'c1');
  return {
    id: 'f1',
    avaliado_id: id,
    ciclo_id: 'ciclo-2',
    nota_geral: 4,
    potencial: 4,
    status: 'concluido',
    created_at: '2026-05-01T10:00:00',
    updated_at: '2026-05-01T10:00:00',
    avaliado: { nome_completo: NOMES[id] ?? 'Sem colaborador' },
    ...extra,
  };
}

describe('nineBoxComum — classificação (regra original preservada)', () => {
  it('mantém os limiares do componente anterior', () => {
    expect(classifyScore(1)).toBe(1);
    expect(classifyScore(1.5)).toBe(1);
    expect(classifyScore(2)).toBe(2);
    expect(classifyScore(3.5)).toBe(2);
    expect(classifyScore(4)).toBe(3);
    expect(classifyScore(5)).toBe(3);
  });

  it('a tolerância a valor vazio saiu daqui: quem valida é `notaNaEscala`', () => {
    // `classifyScore` agora recebe SEMPRE nota validada; a porta de entrada é
    // `notaNaEscala`, que isola nulos e valores fora da escala 1–5.
    expect(notaNaEscala(null)).toBeNull();
    expect(notaNaEscala(undefined)).toBeNull();
    expect(notaNaEscala('')).toBeNull();
    expect(notaNaEscala(0)).toBeNull(); // fora da escala (o antigo virava faixa 1)
    expect(notaNaEscala(7)).toBeNull();
    expect(notaNaEscala('3')).toBe(3); // string numérica que a base pode devolver
    expect(notaNaEscala(1.5)).toBe(1.5);
  });

  it('nomeia os nove quadrantes com a leitura de posição', () => {
    expect(QUADRANTE_POR_CHAVE['3-3'].nome).toBe('Estrela');
    expect(QUADRANTE_POR_CHAVE['3-3'].leitura).toBe('Alto potencial, alto desempenho');
    expect(QUADRANTE_POR_CHAVE['1-1'].nome).toBe('Sub-performer');
    expect(QUADRANTE_POR_CHAVE['1-1'].leitura).toBe('Baixo potencial, baixo desempenho');
    expect(ORDEM_MATRIZ).toHaveLength(9);
  });
});

describe('nineBoxComum — derivação das pessoas', () => {
  it('classifica e coloca a pessoa no quadrante certo', () => {
    const pontos = derivarPontos({ feedbacks: [fb()], cicloId: 'ciclo-2', colaboradores: COLABORADORES });
    expect(pontos).toHaveLength(1);
    expect(pontos[0].quadrante).toBe('3-3');
    expect(pontos[0].nomeQuadrante).toBe('Estrela');
    expect(pontos[0].cargo).toBe('Analista');
    expect(pontos[0].departamento).toBe('RH');
    expect(pontos[0].foto).toBe('x.jpg');
  });

  it('NÃO presume potencial: sem o campo, a pessoa fica fora da matriz', () => {
    const pontos = derivarPontos({
      feedbacks: [fb({ potencial: null })],
      cicloId: 'ciclo-2',
      colaboradores: COLABORADORES,
    });
    expect(pontos[0].quadrante).toBeNull();
    expect(pontos[0].potencialFaixa).toBeNull();
    expect(pontos[0].pendencias).toBe('sem_potencial');
    expect(contarQuadrantes(pontos)['2-2']).toBe(0);
  });

  it('sem nota de desempenho também não entra na matriz', () => {
    const pontos = derivarPontos({
      feedbacks: [fb({ nota_geral: null })],
      cicloId: 'ciclo-2',
      colaboradores: COLABORADORES,
    });
    expect(pontos[0].quadrante).toBeNull();
    expect(pontos[0].pendencias).toBe('sem_nota');
  });

  it('um colaborador aparece UMA vez por ciclo, com o registro mais recente', () => {
    const pontos = derivarPontos({
      feedbacks: [
        fb({ id: 'antigo', nota_geral: 5, potencial: 5, updated_at: '2026-05-01T10:00:00' }),
        fb({ id: 'novo', nota_geral: 2, potencial: 2, updated_at: '2026-06-01T10:00:00' }),
      ],
      cicloId: 'ciclo-2',
      colaboradores: COLABORADORES,
    });
    expect(pontos).toHaveLength(1);
    expect(pontos[0].id).toBe('novo');
    expect(pontos[0].quadrante).toBe('2-2');
  });

  it('respeita o ciclo escolhido', () => {
    const pontos = derivarPontos({
      feedbacks: [fb({ id: 'a', ciclo_id: 'ciclo-2' }), fb({ id: 'b', ciclo_id: 'ciclo-3', avaliado_id: 'c2' })],
      cicloId: 'ciclo-2',
      colaboradores: COLABORADORES,
    });
    expect(pontos.map((p) => p.id)).toEqual(['a']);
  });

  it('marca PDI pela relação real de colaborador_id', () => {
    const pontos = derivarPontos({
      feedbacks: [fb(), fb({ id: 'f2', avaliado_id: 'c2', nota_geral: 3, potencial: 3 })],
      cicloId: 'ciclo-2',
      colaboradores: COLABORADORES,
      pdis: [{ id: 'p1', colaborador_id: 'c2' }],
    });
    expect(pontos.find((p) => p.colaboradorId === 'c1')?.temPdi).toBe(false);
    expect(pontos.find((p) => p.colaboradorId === 'c2')?.temPdi).toBe(true);
  });
});

describe('nineBoxComum — contagens e listas por quadrante', () => {
  const conjunto = () =>
    derivarPontos({
      feedbacks: [
        fb({ id: 'a', avaliado_id: 'c1', nota_geral: 5, potencial: 5 }),
        fb({ id: 'b', avaliado_id: 'c2', nota_geral: 4, potencial: 4 }),
        fb({ id: 'c', avaliado_id: 'c3', nota_geral: 2, potencial: 2 }),
      ],
      cicloId: 'ciclo-2',
      colaboradores: COLABORADORES,
    });

  it('conta cada pessoa em um quadrante e mantém as nove chaves', () => {
    const contagens = contarQuadrantes(conjunto());
    expect(Object.keys(contagens)).toHaveLength(9);
    expect(contagens['3-3']).toBe(2);
    expect(contagens['2-2']).toBe(1);
    expect(contagens['1-1']).toBe(0);
  });

  it('lista o quadrante em ordem alfabética', () => {
    expect(pontosDoQuadrante(conjunto(), '3-3').map((p) => p.nome)).toEqual(['Ana Souza', 'Bruno Lima']);
  });
});

describe('nineBoxComum — movimentação entre ciclos', () => {
  const pessoas = (ciclo: string, dados: [string, number, number][]) =>
    derivarPontos({
      feedbacks: dados.map(([id, nota, potencial], i) =>
        fb({
          id: `${id}-${ciclo}`,
          avaliado_id: id,
          ciclo_id: ciclo,
          nota_geral: nota,
          potencial,
          updated_at: `2026-0${i + 1}-01T10:00:00`,
        })
      ),
      cicloId: ciclo,
      colaboradores: COLABORADORES,
    });

  it('compara pela soma das duas notas reais', () => {
    const atual = pessoas('ciclo-2', [
      ['c1', 5, 5], // 10 (era 8) → evoluiu
      ['c2', 3, 3], // 6 (era 6) → permaneceu
      ['c3', 2, 2], // 4 (era 9) → regrediu
    ]);
    const anterior = pessoas('ciclo-1', [
      ['c1', 4, 4],
      ['c2', 3, 3],
      ['c3', 5, 4],
    ]);
    const leitura = lerMovimento(atual, anterior);
    expect(leitura.comparaveis).toBe(3);
    expect(leitura.evoluiram).toBe(1);
    expect(leitura.permaneceram).toBe(1);
    expect(leitura.regrediram).toBe(1);
    expect(leitura.itens[0].nome).toBe('Carla Dias'); // maior variação primeiro
  });

  it('quem só aparece em um dos ciclos não entra no comparativo', () => {
    const atual = pessoas('ciclo-2', [['c1', 5, 5]]);
    const anterior = pessoas('ciclo-1', [['c2', 4, 4]]);
    const leitura = lerMovimento(atual, anterior);
    expect(leitura.comparaveis).toBe(0);
    expect(leitura.evoluiram + leitura.permaneceram + leitura.regrediram).toBe(0);
  });

  it('sem ciclo anterior, nada é comparável (estado informativo)', () => {
    const leitura = lerMovimento(pessoas('ciclo-2', [['c1', 5, 5]]), []);
    expect(leitura.comparaveis).toBe(0);
  });
});

describe('nineBoxComum — atenção, ranking e insights', () => {
  const comAtencao = () =>
    derivarPontos({
      feedbacks: [
        fb({ id: 'risco', avaliado_id: 'c1', nota_geral: 1, potencial: 1 }), // Sub-performer, sem PDI
        fb({ id: 'estrela', avaliado_id: 'c2', nota_geral: 5, potencial: 5 }), // Estrela, COM PDI
        fb({ id: 'core', avaliado_id: 'c3', nota_geral: 3, potencial: 3 }), // Core Player, sem PDI
      ],
      cicloId: 'ciclo-2',
      colaboradores: COLABORADORES,
      pdis: [{ id: 'p1', colaborador_id: 'c2' }],
    });

  it('une quadrante de atenção e "sem PDI" sem repetir', () => {
    const leitura = lerAtencao(comAtencao());
    expect(leitura.emRisco).toBe(1); // Ana (Sub-performer)
    expect(leitura.semPdi).toBe(2); // Ana + Carla (a Estrela tem PDI)
    expect(leitura.total).toBe(2); // Ana entra uma única vez, apesar dos dois critérios
  });

  it('listagem de atenção prioriza a menor pontuação', () => {
    expect(pontosEmAtencao(comAtencao())[0].nome).toBe('Ana Souza');
  });

  it('ranking e destaques seguem a soma das notas', () => {
    expect(rankingPontos(comAtencao())[0].nome).toBe('Bruno Lima');
    expect(destaques(comAtencao(), 1)).toHaveLength(1);
  });

  it('insights citam o dado real e não inventam plano de sucesso', () => {
    const pontos = comAtencao();
    const linhas = lerInsights(contarQuadrantes(pontos), lerAtencao(pontos), lerMovimento(pontos, []));
    expect(linhas.join(' ')).toMatch(/sem PDI vinculado/);
    expect(linhas.join(' ')).toMatch(/Sem histórico comparável/);
    expect(linhas.join(' ')).not.toMatch(/sucesso/i);
  });

  it('os insights estruturados vêm em ordem de gravidade (risco primeiro)', () => {
    const pontos = comAtencao();
    const itens = lerInsightsEstruturados(contarQuadrantes(pontos), lerAtencao(pontos), lerMovimento(pontos, []));
    expect(itens.length).toBeGreaterThan(1);
    expect(itens[0].tipo).toBe('risco');
    expect(itens.map((i) => i.id)).toEqual(['sub-performer', 'sem-pdi', 'core-players', 'historico']);
  });

  it('marca números e palavras-chave como destaque, sem mudar a frase', () => {
    const pontos = comAtencao();
    const itens = lerInsightsEstruturados(contarQuadrantes(pontos), lerAtencao(pontos), lerMovimento(pontos, []));
    const risco = itens.find((i) => i.tipo === 'risco');
    expect(risco?.trechos[0]).toEqual({ texto: '1 Sub-performer', forte: true });

    const pdi = itens.find((i) => i.id === 'sem-pdi');
    expect(pdi?.trechos[0]).toEqual({ texto: '2 colaboradores', forte: true });
    expect(textoInsight(pdi!)).toBe('2 colaboradores classificados estão sem PDI vinculado.');
  });

  it('busca e facetas saem dos valores presentes', () => {
    const pontos = comAtencao();
    expect(departamentosDisponiveis(pontos)).toEqual(['RH', 'TI']);
    expect(cargosDisponiveis(pontos)).toEqual(['Analista', 'Desenvolvedor']);
    expect(correspondeBusca(pontos[0], 'ana')).toBe(true);
    expect(correspondeBusca(pontos[0], 'RH')).toBe(true);
    expect(correspondeBusca(pontos[0], 'inexistente')).toBe(false);
    expect(correspondeBusca(pontos[0], '  ')).toBe(true);
  });
});
