import Papa from 'papaparse';
import { format } from 'date-fns';
import { formatarPercentual, type AnalyticsRecrutamento } from './analyticsComum';

/**
 * ============================================================================
 * RELATÓRIO DA ANALYTICS — o CSV por trás do botão "Exportar"
 *
 * O botão não baixa a tabela crua do banco: baixa O QUE ESTÁ NA TELA, no
 * recorte escolhido (período e vaga já aplicados). Por isso a função recebe o
 * `AnalyticsRecrutamento` já construído — o mesmo objeto que alimenta os
 * painéis. Exportar um número diferente do exibido seria pior que não exportar.
 *
 * A montagem das linhas é PURA (`linhasDoRelatorio`/`csvDoRelatorio`, testadas
 * sem DOM); só `baixarRelatorioCsv` toca `Blob`/`document` — a mesma mecânica
 * de `services/exportService.ts`.
 * ============================================================================
 */

export interface LinhaRelatorio {
  Bloco: string;
  Indicador: string;
  Valor: string;
  Detalhe: string;
}

const BLOCO = {
  kpi: 'Indicadores principais',
  funil: 'Funil',
  conversao: 'Conversão entre etapas',
  origem: 'Origens',
  tempo: 'Tempo médio por etapa',
  atencao: 'Pontos de atenção',
  vaga: 'Desempenho por vaga',
  geral: 'Métricas gerais',
} as const;

function percentual(valor: number): string {
  return formatarPercentual(valor);
}

/** Linhas do relatório (uma por métrica exibida na aba). */
export function linhasDoRelatorio(analytics: AnalyticsRecrutamento): LinhaRelatorio[] {
  const linhas: LinhaRelatorio[] = [];

  for (const kpi of analytics.kpis) {
    linhas.push({
      Bloco: BLOCO.kpi,
      Indicador: kpi.label,
      Valor: kpi.exibicao,
      Detalhe: [kpi.apoio, kpi.tendencia?.texto, kpi.tendencia?.label].filter(Boolean).join(' · '),
    });
  }

  for (const etapa of analytics.funil) {
    linhas.push({
      Bloco: BLOCO.funil,
      Indicador: etapa.label,
      Valor: String(etapa.total),
      Detalhe: `${percentual(etapa.percentual)} da entrada`,
    });
  }

  for (const conversao of analytics.conversoes) {
    linhas.push({
      Bloco: BLOCO.conversao,
      Indicador: `${conversao.de} → ${conversao.para}`,
      Valor: percentual(conversao.percentual),
      Detalhe: 'etapa seguinte ÷ anterior',
    });
  }

  for (const origem of analytics.origens) {
    linhas.push({
      Bloco: BLOCO.origem,
      Indicador: origem.origem,
      Valor: String(origem.total),
      Detalhe: `${percentual(origem.percentual)} da base`,
    });
  }

  for (const tempo of analytics.tempos) {
    linhas.push({
      Bloco: BLOCO.tempo,
      Indicador: tempo.label,
      Valor: tempo.dias === null ? '—' : `${tempo.dias} dias`,
      Detalhe: `${tempo.amostra} ${tempo.amostra === 1 ? 'candidato' : 'candidatos'} na etapa`,
    });
  }

  for (const alerta of analytics.atencao) {
    linhas.push({
      Bloco: BLOCO.atencao,
      /* O card resumido mostra título e descrição curtos; o relatório repete a
         descrição de apoio em vez de truncá-la. */
      Indicador: alerta.titulo,
      Valor: alerta.severidade,
      Detalhe: alerta.descricao,
    });
  }

  for (const vaga of analytics.vagas) {
    linhas.push({
      Bloco: BLOCO.vaga,
      Indicador: vaga.titulo,
      Valor: percentual(vaga.conversao),
      Detalhe: `${vaga.candidatos} candidatos · ${vaga.contratados} contratados · ${vaga.status}`,
    });
  }

  for (const indicador of analytics.indicadores) {
    linhas.push({
      Bloco: BLOCO.geral,
      Indicador: indicador.label,
      Valor: indicador.valor,
      Detalhe: indicador.apoio,
    });
  }

  return linhas;
}

/** CSV (UTF-8) das linhas — cabeçalho `Bloco,Indicador,Valor,Detalhe`. */
export function csvDoRelatorio(linhas: LinhaRelatorio[]): string {
  return Papa.unparse(linhas, { columns: ['Bloco', 'Indicador', 'Valor', 'Detalhe'] });
}

/** `analytics-recrutamento-2026-09-06.csv` */
export function nomeArquivoRelatorio(referencia: Date = new Date()): string {
  return `analytics-recrutamento-${format(referencia, 'yyyy-MM-dd')}.csv`;
}

/**
 * Dispara o download do CSV do recorte atual e devolve o nome do arquivo.
 * O `\uFEFF` (BOM) é o que faz o Excel abrir os acentos corretamente.
 */
export function baixarRelatorioCsv(
  analytics: AnalyticsRecrutamento,
  nomeArquivo: string = nomeArquivoRelatorio(analytics.referencia)
): string {
  const csv = csvDoRelatorio(linhasDoRelatorio(analytics));
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', nomeArquivo);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
  return nomeArquivo;
}
