import { describe, expect, it, vi, afterEach } from 'vitest';
import { criarCandidatura, criarVaga } from './candidatosFixture';
import { construirAnalytics } from '../analyticsComum';
import { baixarRelatorioCsv, csvDoRelatorio, linhasDoRelatorio, nomeArquivoRelatorio } from '../analyticsRelatorio';

/**
 * Relatório do botão "Exportar": o CSV é montado a partir do MESMO objeto que
 * alimenta os painéis (o recorte que está na tela), não de uma consulta nova.
 * A montagem das linhas é pura; só `baixarRelatorioCsv` toca no DOM.
 */
function analyticsDeExemplo() {
  const vaga = criarVaga({
    id: 'vaga-1',
    titulo: 'Desenvolvedor(a) Full Stack Sênior',
    data_abertura: '2026-08-01',
    created_at: '2026-08-01T12:00:00Z',
  });
  const triagem = criarCandidatura({
    id: 'cand-1',
    vaga_id: 'vaga-1',
    created_at: '2026-08-03T12:00:00Z',
    updated_at: '2026-08-03T12:00:00Z',
  });
  const contratado = criarCandidatura({
    id: 'cand-2',
    vaga_id: 'vaga-1',
    candidato_id: 'pessoa-2',
    etapa: 'contratado',
    status: 'contratado',
    created_at: '2026-08-05T12:00:00Z',
    updated_at: '2026-08-05T12:00:00Z',
  });
  contratado.candidato = {
    ...contratado.candidato!,
    id: 'pessoa-2',
    nome: 'Bruno Carvalho',
    email: 'bruno@email.com',
    origem: 'Gupy',
  };

  return construirAnalytics({
    candidaturas: [triagem, contratado],
    vagas: [vaga],
    candidatos: [triagem.candidato!, contratado.candidato!],
  });
}

describe('analyticsRelatorio — linhas', () => {
  it('cobre todos os blocos exibidos na aba', () => {
    const linhas = linhasDoRelatorio(analyticsDeExemplo());
    const blocos = new Set(linhas.map((linha) => linha.Bloco));

    expect(linhas.length).toBeGreaterThan(0);
    [
      'Indicadores principais',
      'Funil',
      'Conversão entre etapas',
      'Origens',
      'Tempo médio por etapa',
      'Desempenho por vaga',
      'Métricas gerais',
    ].forEach((bloco) => expect(blocos.has(bloco)).toBe(true));
  });

  it('usa o valor exibido nos KPIs (não recalcula nada)', () => {
    const analytics = analyticsDeExemplo();
    const linhas = linhasDoRelatorio(analytics);

    analytics.kpis.forEach((kpi) => {
      const linha = linhas.find((item) => item.Bloco === 'Indicadores principais' && item.Indicador === kpi.label);
      expect(linha?.Valor).toBe(kpi.exibicao);
    });
  });
});

describe('analyticsRelatorio — csv', () => {
  it('começa pelo cabeçalho fixo', () => {
    const csv = csvDoRelatorio(linhasDoRelatorio(analyticsDeExemplo()));
    expect(csv.split(/\r?\n/)[0]).toBe('Bloco,Indicador,Valor,Detalhe');
    expect(csv).toContain('Funil');
  });

  it('nomeia o arquivo pela data de referência', () => {
    expect(nomeArquivoRelatorio(new Date(2026, 8, 6))).toBe('analytics-recrutamento-2026-09-06.csv');
  });
});

describe('analyticsRelatorio — download', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('dispara o download e devolve o nome do arquivo', () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const append = vi.spyOn(document.body, 'appendChild');
    const remove = vi.spyOn(document.body, 'removeChild');
    const analytics = analyticsDeExemplo();

    const nome = baixarRelatorioCsv(analytics);

    expect(nome).toBe('analytics-recrutamento-2026-08-05.csv');
    expect(click).toHaveBeenCalledTimes(1);
    expect(append).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);

    const link = append.mock.calls[0][0] as HTMLAnchorElement;
    expect(link.getAttribute('download')).toBe(nome);
    expect(link.getAttribute('href')).toContain('blob:');
  });
});
