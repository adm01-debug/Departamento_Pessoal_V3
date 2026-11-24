import { dataValida, referenciaDosDados, type EntradaAnalytics } from './analyticsComum';

/**
 * ============================================================================
 * FILTROS DA ANALYTICS — recorte de período e de vaga, funções PURAS
 *
 * A barra do topo ("Últimos 90 dias", "Todas as vagas") não é enfeite: ela
 * recorta a base ANTES de `construirAnalytics`, então funil, origens, tempos,
 * alertas, desempenho por vaga e indicadores leem todos o mesmo recorte. Nada
 * de número de um painel ignorar o filtro do painel vizinho.
 *
 * ── ÂNCORA DA JANELA ───────────────────────────────────────────────────────
 * O período é contado a partir da DATA DE REFERÊNCIA DA BASE COMPLETA
 * (`referenciaDosDados`), não de `new Date()`: a base demonstrativa é de
 * jun–set/2026, e uma janela ancorada em "hoje" devolveria zero em toda ela.
 * Ancorar na referência também evita que o recorte "ande" sozinho conforme o
 * filtro é aplicado (referência recalculada a cada seleção).
 *
 * ── REGISTRO SEM DATA ──────────────────────────────────────────────────────
 * Um registro sem data legível NÃO é excluído pelo período: não há como provar
 * que ele está fora da janela, e esconder dado por falta de data seria pior que
 * mostrá-lo. O que não tem data entra em qualquer recorte.
 * ============================================================================
 */

export type PeriodoAnalytics = 'tudo' | '30' | '90' | '180' | '365';

export interface OpcaoPeriodo {
  value: PeriodoAnalytics;
  label: string;
  /** `null` = todo o período (sem janela). */
  dias: number | null;
}

/**
 * Opções do seletor de período. `tudo` é o padrão de propósito: a aba abria
 * (e continua abrindo) com a base inteira; escolher uma janela é um recorte
 * explícito do usuário, não um recorte que aparece sozinho na primeira visita.
 */
export const PERIODOS_ANALYTICS: readonly OpcaoPeriodo[] = [
  { value: 'tudo', label: 'Todo o período', dias: null },
  { value: '30', label: 'Últimos 30 dias', dias: 30 },
  { value: '90', label: 'Últimos 90 dias', dias: 90 },
  { value: '180', label: 'Últimos 180 dias', dias: 180 },
  { value: '365', label: 'Últimos 12 meses', dias: 365 },
];

export const PERIODO_PADRAO: PeriodoAnalytics = 'tudo';

/** Sentinela do seletor de vaga — não é id de vaga, é "sem recorte". */
export const VAGA_TODAS = 'todas';

export interface FiltrosAnalytics {
  periodo: PeriodoAnalytics;
  vagaId: string;
}

export const FILTROS_PADRAO: FiltrosAnalytics = { periodo: PERIODO_PADRAO, vagaId: VAGA_TODAS };

const DIA_MS = 24 * 60 * 60 * 1000;

/** Dias da janela escolhida (`null` = base inteira). */
export function diasDoPeriodo(periodo: PeriodoAnalytics): number | null {
  return PERIODOS_ANALYTICS.find((opcao) => opcao.value === periodo)?.dias ?? null;
}

/** Rótulo legível do período — usado no cabeçalho e no relatório exportado. */
export function rotuloDoPeriodo(periodo: PeriodoAnalytics): string {
  return PERIODOS_ANALYTICS.find((opcao) => opcao.value === periodo)?.label ?? 'Todo o período';
}

/** O recorte está filtrando alguma coisa? */
export function temFiltroAtivo(filtros: FiltrosAnalytics): boolean {
  return filtros.periodo !== PERIODO_PADRAO || filtros.vagaId !== VAGA_TODAS;
}

/**
 * Recorta `candidaturas`, `vagas` e `candidatos` pelo período e pela vaga.
 *
 *  • período ... `created_at` da candidatura (mesma data que a variação dos
 *                 KPIs usa), `data_abertura ?? created_at` da vaga e
 *                 `created_at` do candidato;
 *  • vaga ...... candidaturas e vagas da vaga escolhida; candidatos passam a
 *                 ser os que têm candidatura nesse recorte (é isso que mantém
 *                 "Total de candidatos" e "Principais origens" coerentes com
 *                 as outras faixas).
 */
export function filtrarEntradaAnalytics(
  entrada: EntradaAnalytics,
  filtros: FiltrosAnalytics
): EntradaAnalytics {
  const dias = diasDoPeriodo(filtros.periodo);
  const ancora = referenciaDosDados(entrada);
  const limite = dias === null ? null : ancora.getTime() - dias * DIA_MS;

  const dentroDaJanela = (valor: string | null | undefined): boolean => {
    if (limite === null) return true;
    const data = dataValida(valor);
    return data === null ? true : data.getTime() >= limite;
  };

  const porVaga = filtros.vagaId !== VAGA_TODAS;

  const candidaturas = entrada.candidaturas.filter(
    (candidatura) =>
      dentroDaJanela(candidatura.created_at) && (!porVaga || candidatura.vaga_id === filtros.vagaId)
  );

  const vagas = entrada.vagas.filter(
    (vaga) => dentroDaJanela(vaga.data_abertura ?? vaga.created_at) && (!porVaga || vaga.id === filtros.vagaId)
  );

  const idsNoRecorte = new Set(candidaturas.map((candidatura) => candidatura.candidato_id));
  const candidatos = entrada.candidatos.filter((candidato) =>
    porVaga ? idsNoRecorte.has(candidato.id) : dentroDaJanela(candidato.created_at)
  );

  return { candidaturas, vagas, candidatos };
}
