import { describe, it, expect } from 'vitest';
import {
  agruparPorMes,
  avaliadoresDisponiveis,
  contagemTipos,
  contarPorSegmento,
  deltaMedia,
  derivarFeedbacks,
  descricaoPrazoCiclo,
  diasAteFimDoCiclo,
  distribuicaoNotas,
  estaPendente,
  faixaNota,
  formatarNota,
  mediaNotas,
  ordenarFeedbacks,
  segmentoDoTipo,
  tipoFeedback,
} from '@/components/avaliacao/feedbacksComum';

/**
 * Prova das derivações da aba "Feedbacks": tipo, faixa/nota, agrupamento por
 * mês, contadores, distribuição, médias, delta entre ciclos e prazo do ciclo.
 *
 * Tudo é determinístico (datas construídas no fuso local e `agora` injetado),
 * então nenhum resultado depende do relógio da máquina.
 */

/** Instante local (evita deslocamento de fuso nas asserções). */
const em = (ano: number, mes: number, dia: number) => new Date(ano, mes - 1, dia, 12).toISOString();

const AGORA = new Date(2026, 9, 14, 12).getTime();

/** Feedback bruto no formato que `listarFeedbacks` entrega. */
function bruto(extra: Record<string, unknown> = {}) {
  return {
    id: 'f1',
    ciclo_id: 'c3',
    avaliado_id: 'col-1',
    avaliador_id: 'col-9',
    tipo: 'gestor',
    nota_geral: 5,
    potencial: 4,
    status: 'concluido',
    pontos_fortes: 'Autonomia técnica.',
    pontos_melhoria: 'Delegar mais.',
    comentarios: 'Referência do time.',
    avaliado: { nome_completo: 'Carlos Eduardo Lima' },
    avaliador: { nome_completo: 'Mariana Oliveira' },
    created_at: em(2026, 10, 8),
    ...extra,
  };
}

const CONTEXTO = {
  colaboradores: [{ id: 'col-1', cargo: 'Desenvolvedor Frontend', departamento: 'Tecnologia' }],
  pdis: [{ colaborador_id: 'col-1', competencia_foco: 'Arquitetura de software' }],
  ciclos: [{ id: 'c3', data_fim: '2026-12-30' }],
};

describe('feedbacksComum — tipo do feedback (texto livre)', () => {
  it('normaliza os quatro tipos reais, aceitando caixa e rótulo por extenso', () => {
    expect(tipoFeedback('gestor')).toBe('gestor');
    expect(tipoFeedback('PAR')).toBe('par');
    expect(tipoFeedback('auto')).toBe('auto');
    expect(tipoFeedback('Autoavaliação')).toBe('auto');
    expect(tipoFeedback('subordinado')).toBe('subordinado');
  });

  it('cai em gestor sem valor utilizável (nunca inventa categoria)', () => {
    expect(tipoFeedback(undefined)).toBe('gestor');
    expect(tipoFeedback('')).toBe('gestor');
    expect(tipoFeedback('outro')).toBe('gestor');
  });

  it('agrupa subordinado no chip de Gestor', () => {
    expect(segmentoDoTipo('subordinado')).toBe('gestor');
    expect(segmentoDoTipo('par')).toBe('par');
    expect(segmentoDoTipo('auto')).toBe('auto');
  });
});

describe('feedbacksComum — nota e faixa', () => {
  it('rotula as cinco faixas', () => {
    expect(faixaNota(5).rotulo).toBe('Excelente');
    expect(faixaNota(4).rotulo).toBe('Muito bom');
    expect(faixaNota(3).rotulo).toBe('Bom');
    expect(faixaNota(2).rotulo).toBe('Regular');
    expect(faixaNota(1).rotulo).toBe('A melhorar');
  });

  it('arredonda e limita ao intervalo 1–5', () => {
    expect(faixaNota(4.6).nota).toBe(5);
    expect(faixaNota(0).nota).toBe(1);
    expect(faixaNota(9).nota).toBe(5);
  });

  it('formata a nota em pt-BR com uma casa', () => {
    expect(formatarNota(5)).toBe('5,0');
    expect(formatarNota(4.25)).toBe('4,3');
  });

  it('considera pendente tudo que não está concluído', () => {
    expect(estaPendente({ status: 'pendente' })).toBe(true);
    expect(estaPendente({ status: 'CONCLUIDO' })).toBe(false);
    expect(estaPendente({})).toBe(true);
  });
});

describe('feedbacksComum — derivação do card', () => {
  it('resolve cargo, departamento, competência do PDI, data e grupo de mês', () => {
    const [d] = derivarFeedbacks([bruto()], CONTEXTO);
    expect(d.avaliado).toBe('Carlos Eduardo Lima');
    expect(d.avaliador).toBe('Mariana Oliveira');
    expect(d.cargo).toBe('Desenvolvedor Frontend');
    expect(d.departamento).toBe('Tecnologia');
    expect(d.competencia).toBe('Arquitetura de software');
    expect(d.data).toBe('08/10/2026');
    expect(d.mesRotulo).toBe('Outubro 2026');
    expect(d.notaFormatada).toBe('5,0');
    expect(d.faixa.rotulo).toBe('Excelente');
    expect(d.pendente).toBe(false);
    // `formatarData` é o helper do MÓDULO (mesma régua do resto da área) e lê o
    // valor no fuso do próprio dado — por isso a asserção é de FORMATO, não de
    // dia exato (data pura `YYYY-MM-DD` desloca um dia em UTC-3, comportamento
    // pré-existente e compartilhado).
    expect(d.prazo).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('não inventa cargo/departamento/competência quando não há correspondência', () => {
    const [d] = derivarFeedbacks([bruto({ avaliado_id: 'sem-match' })], CONTEXTO);
    expect(d.cargo).toBeNull();
    expect(d.departamento).toBeNull();
    expect(d.competencia).toBeNull();
  });

  it('usa `—` para avaliado/avaliador ausentes (sem placeholder inventado)', () => {
    const [d] = derivarFeedbacks([bruto({ avaliado: null, avaliador: null })], CONTEXTO);
    expect(d.avaliado).toBe('—');
    expect(d.avaliador).toBe('—');
  });
});

/** Conjunto de apoio: 6 feedbacks em 2 meses, 3 tipos e notas variadas. */
const LISTA = derivarFeedbacks(
  [
    bruto({ id: 'f1', tipo: 'gestor', nota_geral: 5, avaliador: { nome_completo: 'Mariana Oliveira' }, created_at: em(2026, 10, 8) }),
    bruto({ id: 'f2', tipo: 'par', nota_geral: 4, avaliador: { nome_completo: 'Rafael Mendes' }, created_at: em(2026, 10, 6) }),
    bruto({ id: 'f3', tipo: 'auto', nota_geral: 2, avaliador: { nome_completo: 'Mariana Oliveira' }, created_at: em(2026, 10, 3) }),
    bruto({ id: 'f4', tipo: 'gestor', nota_geral: 3, avaliador: { nome_completo: 'Mariana Oliveira' }, created_at: em(2026, 9, 30) }),
    bruto({ id: 'f5', tipo: 'par', nota_geral: 5, status: 'pendente', avaliador: { nome_completo: 'Rafael Mendes' }, created_at: em(2026, 9, 28) }),
    bruto({ id: 'f6', tipo: 'subordinado', nota_geral: 1, status: 'pendente', avaliador: { nome_completo: 'Mariana Oliveira' }, created_at: em(2026, 9, 22) }),
  ],
  CONTEXTO
);

describe('feedbacksComum — contadores e segmentação', () => {
  it('conta por chip, com subordinado dentro de Gestor', () => {
    expect(contarPorSegmento(LISTA)).toEqual({ todos: 6, gestor: 3, par: 2, auto: 1 });
  });

  it('lista só os avaliadores realmente presentes, em ordem pt-BR', () => {
    expect(avaliadoresDisponiveis(LISTA)).toEqual(['Mariana Oliveira', 'Rafael Mendes']);
  });
});

describe('feedbacksComum — distribuição, média e delta', () => {
  it('distribui as notas nas cinco faixas com o percentual do total', () => {
    const d = distribuicaoNotas(LISTA);
    expect(d.map((l) => [l.nota, l.quantidade])).toEqual([
      [5, 2],
      [4, 1],
      [3, 1],
      [2, 1],
      [1, 1],
    ]);
    expect(d[0].percentual).toBe(33);
    expect(d.reduce((acc, l) => acc + l.quantidade, 0)).toBe(LISTA.length);
  });

  it('calcula a média com uma casa e devolve null sem feedbacks', () => {
    expect(mediaNotas(LISTA)).toBe(3.3);
    expect(mediaNotas([])).toBeNull();
  });

  it('calcula o delta entre ciclos e devolve null quando falta base', () => {
    expect(deltaMedia(LISTA, LISTA)).toBe(0);
    expect(deltaMedia(LISTA, [])).toBeNull();
  });

  it('conta os tipos REAIS presentes (o donut não funde subordinado em gestor)', () => {
    const t = contagemTipos(LISTA);
    expect(t.map((l) => [l.tipo, l.quantidade])).toEqual([
      ['gestor', 2],
      ['par', 2],
      ['auto', 1],
      ['subordinado', 1],
    ]);
    expect(t[0].percentual).toBe(33);
    expect(t.reduce((acc, l) => acc + l.quantidade, 0)).toBe(LISTA.length);
  });
});

describe('feedbacksComum — agrupamento por mês e ordenação', () => {
  it('agrupa por mês/ano, do mais recente para o mais antigo', () => {
    const g = agruparPorMes(ordenarFeedbacks(LISTA, 'recentes'));
    expect(g.map((x) => x.rotulo)).toEqual(['Outubro 2026', 'Setembro 2026']);
    expect(g[0].itens).toHaveLength(3);
    expect(g[1].itens).toHaveLength(3);
  });

  it('ordena por nota sem mutar a entrada', () => {
    const original = LISTA.map((d) => d.nota);
    expect(ordenarFeedbacks(LISTA, 'maior_nota')[0].nota).toBe(5);
    expect(ordenarFeedbacks(LISTA, 'menor_nota')[0].nota).toBe(1);
    expect(LISTA.map((d) => d.nota)).toEqual(original);
  });

  it('ordena do mais antigo para o mais recente (pelo instante exato)', () => {
    expect(ordenarFeedbacks(LISTA, 'antigos')[0].data).toBe('22/09/2026');
    expect(ordenarFeedbacks(LISTA, 'recentes')[0].data).toBe('08/10/2026');
  });
});

describe('feedbacksComum — prazo do ciclo', () => {
  it('conta os dias até o fim do ciclo (com `agora` injetado)', () => {
    expect(diasAteFimDoCiclo({ data_fim: '2026-10-17' }, AGORA)).toBe(3);
    expect(diasAteFimDoCiclo({ data_fim: '2026-10-14' }, AGORA)).toBe(0);
    expect(diasAteFimDoCiclo({ data_fim: '2026-10-10' }, AGORA)).toBe(-4);
  });

  it('descreve o prazo e cobre ciclo sem data', () => {
    expect(descricaoPrazoCiclo({ data_fim: '2026-10-17' }, AGORA)).toBe('Próximo prazo em 3 dias.');
    expect(descricaoPrazoCiclo({ data_fim: '2026-10-15' }, AGORA)).toBe('Próximo prazo em 1 dia.');
    expect(descricaoPrazoCiclo({ data_fim: '2026-10-14' }, AGORA)).toBe('Último dia do ciclo.');
    expect(descricaoPrazoCiclo({ data_fim: '2026-10-01' }, AGORA)).toBe('Ciclo encerrado há 13 dias.');
    expect(descricaoPrazoCiclo({}, AGORA)).toBe('Ciclo sem prazo definido.');
  });
});
