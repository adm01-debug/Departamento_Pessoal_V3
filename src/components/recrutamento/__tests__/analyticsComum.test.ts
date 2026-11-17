import { describe, it, expect } from 'vitest';
import type { CandidatoRow, CandidaturaComRelacoes, VagaRow } from '@/types/recrutamento';
import { criarCandidatura, criarVaga } from './candidatosFixture';
import {
  construirAnalytics,
  construirConversoes,
  construirEvolucao,
  construirFunil,
  formatarPercentual,
} from '../analyticsComum';

/**
 * Fixture LOCAL com o MESMO recorte do mock demonstrativo (12 candidaturas,
 * 5 vagas, 10 candidatos, datas de junho a setembro/2026). Ela existe para
 * provar as derivações com números conhecidos — o mock da aplicação não é
 * alterado e continua sendo a fonte da vitrine.
 */
const iso = (ymd: string) => `${ymd}T12:00:00Z`;

const ORIGENS = [
  'LinkedIn',
  'Indeed',
  'Site',
  'Indicação',
  'LinkedIn',
  'Site',
  'Gupy',
  'Indeed',
  'LinkedIn',
  'Indicação',
];

const DATAS_CANDIDATOS = [
  '2026-08-02',
  '2026-08-04',
  '2026-08-12',
  '2026-08-06',
  '2026-07-18',
  '2026-09-03',
  '2026-08-14',
  '2026-07-20',
  '2026-09-05',
  '2026-06-05',
];

function candidatos(): CandidatoRow[] {
  const base = criarCandidatura().candidato as CandidatoRow;
  return ORIGENS.map((origem, indice) => ({
    ...base,
    id: `cand-${indice + 1}`,
    nome: `Candidato ${indice + 1}`,
    origem,
    created_at: iso(DATAS_CANDIDATOS[indice]),
    updated_at: iso(DATAS_CANDIDATOS[indice]),
  }));
}

function vagas(): VagaRow[] {
  return [
    criarVaga({ id: 'vaga-1', titulo: 'Desenvolvedor(a) Full Stack Sênior', status: 'aberta', data_abertura: '2026-08-01', created_at: iso('2026-08-01') }),
    criarVaga({ id: 'vaga-2', titulo: 'Analista de RH Pleno', status: 'aberta', data_abertura: '2026-08-10', created_at: iso('2026-08-10') }),
    criarVaga({ id: 'vaga-3', titulo: 'Assistente Administrativo', status: 'aberta', data_abertura: '2026-07-15', created_at: iso('2026-07-15') }),
    criarVaga({ id: 'vaga-4', titulo: 'Vendedor(a) Interno', status: 'fechada', data_abertura: '2026-06-01', created_at: iso('2026-06-01') }),
    criarVaga({ id: 'vaga-5', titulo: 'Analista de Dados', status: 'aberta', data_abertura: '2026-09-01', created_at: iso('2026-09-01') }),
  ];
}

const RECORTE: [string, string, string, string, number | null][] = [
  // etapa, vaga, candidato, data de entrada, nota
  ['triagem', 'vaga-1', 'cand-1', '2026-08-03', null],
  ['triagem', 'vaga-3', 'cand-5', '2026-07-19', null],
  ['triagem', 'vaga-3', 'cand-8', '2026-07-21', null],
  ['triagem', 'vaga-4', 'cand-10', '2026-06-06', null],
  ['entrevista', 'vaga-1', 'cand-2', '2026-08-05', 4.0],
  ['entrevista', 'vaga-2', 'cand-3', '2026-08-13', 3.5],
  ['entrevista', 'vaga-2', 'cand-7', '2026-08-15', 4.5],
  ['teste', 'vaga-1', 'cand-4', '2026-08-07', 4.2],
  ['teste', 'vaga-5', 'cand-9', '2026-09-06', 4.8],
  ['proposta', 'vaga-5', 'cand-6', '2026-09-04', 4.6],
  ['proposta', 'vaga-1', 'cand-1', '2026-08-03', 4.9],
  ['contratado', 'vaga-1', 'cand-2', '2026-08-05', 5.0],
];

function candidaturas(): CandidaturaComRelacoes[] {
  const listaCandidatos = candidatos();
  return RECORTE.map(([etapa, vagaId, candidatoId, data, nota], indice) => {
    const candidatura = criarCandidatura({
      id: `candt-${indice + 1}`,
      etapa,
      vaga_id: vagaId,
      candidato_id: candidatoId,
      status: etapa === 'contratado' ? 'contratado' : 'em_andamento',
      nota_geral: nota,
      created_at: iso(data),
      updated_at: iso(data),
    });
    candidatura.candidato = { ...listaCandidatos.find((c) => c.id === candidatoId)! };
    return candidatura;
  });
}

function entrada() {
  return { candidaturas: candidaturas(), vagas: vagas(), candidatos: candidatos() };
}

const REFERENCIA = new Date(iso('2026-09-06'));

describe('analyticsComum', () => {
  it('usa a movimentação mais recente da base como referência', () => {
    const analytics = construirAnalytics(entrada());
    expect(analytics.referencia.toISOString().slice(0, 10)).toBe('2026-09-06');
    expect(analytics.totalCandidaturas).toBe(12);
  });

  it('monta o funil com volume e retenção sobre a entrada', () => {
    const funil = construirFunil(candidaturas());
    expect(funil.map((item) => item.total)).toEqual([4, 3, 2, 2, 1]);
    expect(funil.map((item) => item.percentual)).toEqual([100, 75, 50, 50, 25]);
  });

  it('calcula a conversão entre etapas consecutivas', () => {
    const conversoes = construirConversoes(construirFunil(candidaturas()));
    expect(conversoes).toHaveLength(4);
    expect(conversoes.map((conversao) => conversao.percentual)).toEqual([75, 66.7, 100, 50]);
    expect(formatarPercentual(conversoes[1].percentual)).toBe('66,7%');
  });

  it('distribui candidaturas e contratações nos últimos 6 meses', () => {
    const serie = construirEvolucao(candidaturas(), 6, REFERENCIA);
    expect(serie.map((ponto) => ponto.rotulo)).toEqual(['abr', 'mai', 'jun', 'jul', 'ago', 'set']);
    expect(serie.map((ponto) => ponto.candidaturas)).toEqual([0, 0, 1, 2, 7, 2]);
    expect(serie.map((ponto) => ponto.contratacoes)).toEqual([0, 0, 0, 0, 1, 0]);
  });

  it('ordena as origens por volume, com participação percentual', () => {
    const origens = construirAnalytics(entrada()).origens;
    expect(origens[0]).toMatchObject({ origem: 'LinkedIn', total: 3, percentual: 30 });
    expect(origens.map((origem) => origem.total).reduce((soma, total) => soma + total, 0)).toBe(10);
    expect(origens.find((origem) => origem.origem === 'Gupy')?.percentual).toBe(10);
  });

  it('mede a permanência média por etapa desde a última movimentação', () => {
    const tempos = construirAnalytics(entrada()).tempos;
    expect(tempos.map((tempo) => tempo.dias)).toEqual([56, 26, 15, 18, 32]);
    expect(tempos[0].amostra).toBe(4);
  });

  it('deriva pontos de atenção reais do funil', () => {
    const atencao = construirAnalytics(entrada()).atencao;
    expect(atencao).toHaveLength(3);
    expect(atencao[0].titulo).toContain('4 candidatos');
    expect(atencao[0].titulo).toContain('Triagem');
    expect(atencao.some((alerta) => alerta.titulo.includes('Assistente Administrativo'))).toBe(true);
    expect(atencao.some((alerta) => alerta.titulo.includes('Proposta → Contratado'))).toBe(true);
  });

  it('calcula conversão e volume por vaga', () => {
    const desempenho = construirAnalytics(entrada()).vagas;
    const fullstack = desempenho.find((vaga) => vaga.titulo.includes('Full Stack'));
    expect(fullstack).toMatchObject({ candidatos: 5, contratados: 1, conversao: 20 });
    expect(desempenho.reduce((soma, vaga) => soma + vaga.candidatos, 0)).toBe(12);
  });

  it('entrega os quatro indicadores gerais com as réguas declaradas', () => {
    const indicadores = construirAnalytics(entrada()).indicadores;
    expect(indicadores.map((indicador) => indicador.label)).toEqual([
      'Tempo médio de contratação',
      'Candidatos por vaga',
      'Taxa de desistência',
      'Taxa de aceitação de proposta',
    ]);
    expect(indicadores[0].valor).toBe('32 dias');
    expect(indicadores[1].valor).toBe('2,5');
    expect(indicadores[2].valor).toBe('0,0%');
    expect(indicadores[3].valor).toBe('33,3%');
  });

  it('compara KPIs com a janela anterior usando os dados da base', () => {
    const [vagasKpi, candidatosKpi, processosKpi, conversaoKpi] = construirAnalytics(entrada()).kpis;
    expect(vagasKpi.valor).toBe(4);
    expect(vagasKpi.tendencia?.texto).toBe('+200%');
    expect(candidatosKpi.valor).toBe(10);
    expect(candidatosKpi.tendencia?.texto).toBe('+250%');
    expect(processosKpi.valor).toBe(11);
    expect(processosKpi.tendencia?.texto).toBe('+350%');
    expect(conversaoKpi.exibicao).toBe('8,3%');
    expect(conversaoKpi.tendencia?.texto).toBe('+11,1 p.p.');
  });

  it('não quebra nem inventa número com a base vazia', () => {
    const analytics = construirAnalytics({ candidaturas: [], vagas: [], candidatos: [] });
    expect(analytics.funil.map((item) => item.total)).toEqual([0, 0, 0, 0, 0]);
    expect(analytics.conversoes.every((conversao) => conversao.percentual === 0)).toBe(true);
    expect(analytics.tempos.every((tempo) => tempo.dias === null)).toBe(true);
    expect(analytics.origens).toEqual([]);
    expect(analytics.atencao).toEqual([]);
    expect(analytics.vagas).toEqual([]);
    expect(analytics.kpis.every((kpi) => Number.isFinite(kpi.valor))).toBe(true);
    expect(analytics.indicadores[0].valor).toBe('—');
    expect(analytics.indicadores[2].valor).toBe('0,0%');
  });

  it('não exibe variação quando não há base de comparação', () => {
    const umaCandidatura = candidaturas().slice(0, 1);
    const candidato = umaCandidatura[0].candidato!;
    const vagasAbertas = [vagas()[0]];
    const analytics = construirAnalytics({
      candidaturas: umaCandidatura,
      vagas: vagasAbertas,
      candidatos: [candidato],
    });
    expect(analytics.kpis[0].tendencia?.texto).toBe('+1');
    expect(analytics.kpis[0].tendencia?.label).toBe('novas no período');
  });
});
