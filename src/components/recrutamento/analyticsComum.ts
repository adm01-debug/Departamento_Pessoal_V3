/**
 * ============================================================================
 * ANALYTICS DO RECRUTAMENTO — derivações puras (mesma entrada → mesma saída)
 *
 * A tela alimenta-se APENAS do que a página já carrega: `candidaturas`,
 * `vagas` e `candidatos` (mock em demonstração, Supabase fora dele). Nenhuma
 * consulta nova, nenhum backend novo e nenhuma escrita: este módulo só lê e
 * calcula.
 *
 * DATA DE REFERÊNCIA — os mocks têm datas de junho a setembro/2026; usar o
 * relógio do navegador deixaria janelas vazias e comparações inventadas. Por
 * isso a referência é o MAIOR timestamp da própria base (movimentação mais
 * recente). No banco real isso equivale a "última movimentação registrada" e
 * mantém as janelas de comparação e a evolução coerentes com os dados.
 *
 * LIMITES HONESTOS:
 *   • `historico_etapas` não é usado (vem nulo no mock e não é consultado pela
 *     página). O tempo por etapa é a permanência desde `updated_at` — a última
 *     movimentação registrada — e não uma soma de durações históricas.
 *   • A conversão do funil é a razão entre os totais ATUAIS das etapas (foto do
 *     pipeline), a mesma leitura da referência aprovada.
 *   • Sem base anterior, a comparação não é exibida (nada de percentual
 *     inventado); com base, a variação é calculada na janela de 45 dias.
 *   • Os indicadores do rodapé comparam as MESMAS réguas na janela atual e na
 *     anterior medindo o que aconteceu em cada uma (conclusões, movimentações e
 *     entradas) — não uma reconstrução do passado, que o modelo não guarda.
 *     Faltando base de um dos lados, o card não exibe variação.
 * ============================================================================
 */
import { differenceInCalendarDays, format, startOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { CandidaturaComRelacoes, CandidatoRow, VagaRow } from '@/types/recrutamento';
import { ETAPAS, type EtapaPipelineId } from './pipelineEtapas';

/** Janela das comparações "vs. período anterior" (e do rótulo exibido). */
export const JANELA_COMPARACAO_DIAS = 45;
/** Permanência que passa a ser tratada como gargalo no painel de atenção. */
const DIAS_ALERTA_ETAPA = 21;
/** Vaga aberta sem nenhuma movimentação há mais dias que isto vira alerta. */
const DIAS_ALERTA_VAGA = 15;
const DIA_MS = 24 * 60 * 60 * 1000;

export type SeveridadeAtencao = 'alta' | 'media' | 'baixa';

export interface EntradaAnalytics {
  candidaturas: CandidaturaComRelacoes[];
  vagas: VagaRow[];
  candidatos: CandidatoRow[];
}

export interface ItemFunil {
  id: EtapaPipelineId;
  label: string;
  total: number;
  /** Percentual sobre a ENTRADA do funil (primeira etapa) — leitura de retenção. */
  percentual: number;
}

export interface ConversaoFunil {
  de: string;
  para: string;
  /** % da etapa seguinte sobre a anterior. */
  percentual: number;
}

export interface PontoEvolucao {
  /** Chave estável do mês (`yyyy-MM`). */
  mes: string;
  /** Rótulo curto em pt-BR (`ago`). */
  rotulo: string;
  candidaturas: number;
  contratacoes: number;
}

export interface OrigemRanking {
  origem: string;
  total: number;
  percentual: number;
}

export interface TempoEtapa {
  id: EtapaPipelineId;
  label: string;
  /** Dias desde a última movimentação; `null` sem amostra. */
  dias: number | null;
  amostra: number;
}

export interface PontoAtencao {
  id: string;
  tipo: 'gargalo' | 'vaga' | 'conversao' | 'desistencia';
  severidade: SeveridadeAtencao;
  /** Frase CURTA (≤ ~32 caracteres): é a linha de 13px do card resumido. */
  titulo: string;
  /** Apoio CURTO (≤ ~35 caracteres): uma linha de 12px, nunca repete o título. */
  descricao: string;
  /**
   * Detalhe técnico completo (média de permanência, nome da vaga, última
   * movimentação, números do funil). Não aparece no card resumido — viaja no
   * `title` da linha (tooltip) e é o texto que a leitura detalhada deve usar.
   * Existe porque o resumo mostra só o essencial: título e descrição longos
   * eram truncados com reticências dentro do card.
   */
  detalhe: string;
}

export interface DesempenhoVaga {
  id: string;
  titulo: string;
  status: string;
  candidatos: number;
  contratados: number;
  conversao: number;
}

/**
 * SITUAÇÃO da vaga para o detalhamento (janela "Ver todas").
 *
 * `aberta`/`pausada`/`encerrada` são as leituras REAIS do campo `vagas.status`:
 * os três conjuntos abaixo cobrem os valores que o módulo já grava/consome
 * (`aberta`, `fechada` — ver `vagasComum`) e os sinônimos que a base pode
 * trazer. O que não cair em nenhum deles é `indefinida`, exibido como
 * "Não informado": nada é reclassificado por conta própria — o filtro de
 * situação simplesmente não inventa uma categoria para esse registro.
 */
export type SituacaoVaga = 'aberta' | 'pausada' | 'encerrada' | 'indefinida';

/**
 * Linha do detalhamento — o MESMO registro de `DesempenhoVaga` (mesmos
 * `candidatos`, `contratados` e `conversao`, vindos de
 * `construirDesempenhoVagas`) acrescido do que só a janela precisa: situação
 * legível, departamento, candidatos ainda em andamento, a foto do pipeline por
 * etapa e o tempo médio do processo.
 */
export interface DetalheVaga extends DesempenhoVaga {
  situacao: SituacaoVaga;
  /** Rótulo legível da situação (`Aberta`, `Pausada`, `Encerrada`, `Não informado`). */
  statusRotulo: string;
  /** `vagas.departamento` normalizado; `null` quando a vaga não informa. */
  departamento: string | null;
  /** Candidaturas da vaga que ainda NÃO terminaram (contratação, desistência, reprovação). */
  emProcesso: number;
  /** Quantidade de candidaturas por etapa, na ordem de `ETAPAS`. */
  porEtapa: { id: EtapaPipelineId; label: string; total: number }[];
  /**
   * Média de dias entre a entrada na base (`created_at`) e a última
   * movimentação (`updated_at`) — ou a data de referência, quando o registro
   * não tem movimentação. `null` sem nenhuma amostra com data legível.
   */
  tempoMedioDias: number | null;
}

export interface IndicadorGeral {
  id: 'tempo-contratacao' | 'candidatos-vaga' | 'desistencia' | 'aceitacao';
  label: string;
  valor: string;
  apoio: string;
  /**
   * Variação da MESMA régua medida na janela de 45 dias vs. a janela anterior.
   * `null` quando não há base de comparação — nada é inventado.
   */
  tendencia: TendenciaKpi | null;
}

export interface TendenciaKpi {
  texto: string;
  positiva: boolean;
  neutra: boolean;
  label: string;
}

export interface KpiRecrutamento {
  id: 'vagas' | 'candidatos' | 'processos' | 'conversao';
  label: string;
  valor: number;
  exibicao: string;
  apoio: string;
  tendencia: TendenciaKpi | null;
}

export interface AnalyticsRecrutamento {
  referencia: Date;
  totalCandidaturas: number;
  kpis: KpiRecrutamento[];
  funil: ItemFunil[];
  conversoes: ConversaoFunil[];
  origens: OrigemRanking[];
  tempos: TempoEtapa[];
  atencao: PontoAtencao[];
  vagas: DesempenhoVaga[];
  indicadores: IndicadorGeral[];
}

/* ─── Helpers numéricos e de data ─────────────────────────────────────────── */

export function dataValida(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

/** Arredonda para `casas` decimais, sem `-0`. */
function arredondar(valor: number, casas = 1): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator + 0;
}

/** Percentual pt-BR com uma casa (`66,7%`). */
export function formatarPercentual(valor: number, casas = 1): string {
  return `${arredondar(valor, casas).toFixed(casas).replace('.', ',')}%`;
}

/** Número pt-BR com uma casa (`2,5`). */
export function formatarNumero(valor: number, casas = 1): string {
  return arredondar(valor, casas).toFixed(casas).replace('.', ',');
}

/** Etapa final do funil. */
function ehContratada(candidatura: CandidaturaComRelacoes): boolean {
  return candidatura.etapa === 'contratado' || candidatura.status === 'contratado';
}

/** Desistência/reprovação não contam como processo ativo. */
function encerrada(candidatura: CandidaturaComRelacoes): boolean {
  const status = (candidatura.status ?? '').toLowerCase();
  return ['contratado', 'cancelado', 'desistente', 'desistiu', 'reprovado'].includes(status);
}

/** Última data conhecida da candidatura (movimentação, com fallback de entrada). */
function dataDaCandidatura(candidatura: CandidaturaComRelacoes): Date | null {
  return dataValida(candidatura.updated_at) ?? dataValida(candidatura.created_at);
}

/** Maior timestamp da base — ver o bloco "DATA DE REFERÊNCIA" no topo. */
export function referenciaDosDados({ candidaturas, vagas, candidatos }: EntradaAnalytics): Date {
  const datas: number[] = [];
  for (const candidatura of candidaturas) {
    const criada = dataValida(candidatura.created_at)?.getTime();
    const movida = dataValida(candidatura.updated_at)?.getTime();
    if (criada) datas.push(criada);
    if (movida) datas.push(movida);
  }
  for (const vaga of vagas) {
    const aberta = dataValida(vaga.data_abertura)?.getTime();
    const criada = dataValida(vaga.created_at)?.getTime();
    if (aberta) datas.push(aberta);
    if (criada) datas.push(criada);
  }
  for (const candidato of candidatos) {
    const criado = dataValida(candidato.created_at)?.getTime();
    if (criado) datas.push(criado);
  }
  return datas.length > 0 ? new Date(Math.max(...datas)) : new Date();
}

/* ─── Funil e conversões ──────────────────────────────────────────────────── */

export function construirFunil(candidaturas: CandidaturaComRelacoes[]): ItemFunil[] {
  const contagem = new Map<string, number>();
  for (const candidatura of candidaturas) {
    const etapa = candidatura.etapa || 'triagem';
    contagem.set(etapa, (contagem.get(etapa) ?? 0) + 1);
  }
  const entrada = contagem.get('triagem') ?? 0;
  return ETAPAS.map((etapa) => {
    const total = contagem.get(etapa.id) ?? 0;
    return {
      id: etapa.id,
      label: etapa.label,
      total,
      percentual: entrada > 0 ? arredondar((total / entrada) * 100) : 0,
    };
  });
}

export function construirConversoes(funil: ItemFunil[]): ConversaoFunil[] {
  return funil.slice(1).map((etapa, indice) => {
    const anterior = funil[indice];
    return {
      de: anterior.label,
      para: etapa.label,
      percentual: anterior.total > 0 ? arredondar((etapa.total / anterior.total) * 100) : 0,
    };
  });
}

/* ─── Evolução mensal ─────────────────────────────────────────────────────── */

export function construirEvolucao(
  candidaturas: CandidaturaComRelacoes[],
  meses: number,
  referencia: Date
): PontoEvolucao[] {
  const totalMeses = Math.max(1, Math.min(24, Math.round(meses)));
  const fim = startOfMonth(referencia);
  const pontos: PontoEvolucao[] = [];
  const indicePorMes = new Map<number, number>();

  for (let i = 0; i < totalMeses; i += 1) {
    const mes = subMonths(fim, totalMeses - 1 - i);
    indicePorMes.set(mes.getTime(), i);
    pontos.push({
      mes: format(mes, 'yyyy-MM'),
      rotulo: format(mes, 'MMM', { locale: ptBR }).replace('.', ''),
      candidaturas: 0,
      contratacoes: 0,
    });
  }

  for (const candidatura of candidaturas) {
    const criada = dataValida(candidatura.created_at);
    if (criada) {
      const indice = indicePorMes.get(startOfMonth(criada).getTime());
      if (indice !== undefined) pontos[indice].candidaturas += 1;
    }
    if (!ehContratada(candidatura)) continue;
    const concluida = dataDaCandidatura(candidatura);
    if (!concluida) continue;
    const indice = indicePorMes.get(startOfMonth(concluida).getTime());
    if (indice !== undefined) pontos[indice].contratacoes += 1;
  }

  return pontos;
}

/* ─── Origens ─────────────────────────────────────────────────────────────── */

export function construirOrigens(candidatos: CandidatoRow[]): OrigemRanking[] {
  const contagem = new Map<string, number>();
  for (const candidato of candidatos) {
    const origem = (candidato.origem ?? '').trim() || 'Não informada';
    contagem.set(origem, (contagem.get(origem) ?? 0) + 1);
  }
  const total = candidatos.length;
  return [...contagem.entries()]
    .map(([origem, quantidade]) => ({
      origem,
      total: quantidade,
      percentual: total > 0 ? arredondar((quantidade / total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total || a.origem.localeCompare(b.origem, 'pt-BR'));
}

/* ─── Tempo por etapa / desempenho por vaga ───────────────────────────────── */

/** Dias entre a última movimentação e a data de referência (nunca negativo). */
function diasNaEtapa(candidatura: CandidaturaComRelacoes, referencia: Date): number {
  const ultima = dataDaCandidatura(candidatura);
  if (!ultima) return 0;
  return Math.max(0, differenceInCalendarDays(referencia, ultima));
}

export function construirTempos(candidaturas: CandidaturaComRelacoes[], referencia: Date): TempoEtapa[] {
  return ETAPAS.map((etapa) => {
    const naEtapa = candidaturas.filter((candidatura) => (candidatura.etapa || 'triagem') === etapa.id);
    const dias = naEtapa.map((candidatura) => diasNaEtapa(candidatura, referencia));
    return {
      id: etapa.id,
      label: etapa.label,
      dias: dias.length > 0 ? Math.round(dias.reduce((soma, valor) => soma + valor, 0) / dias.length) : null,
      amostra: dias.length,
    };
  });
}

export function construirDesempenhoVagas(vagas: VagaRow[], candidaturas: CandidaturaComRelacoes[]): DesempenhoVaga[] {
  return vagas
    .map((vaga) => {
      const daVaga = candidaturas.filter((candidatura) => candidatura.vaga_id === vaga.id);
      const contratados = daVaga.filter(ehContratada).length;
      return {
        id: vaga.id,
        titulo: vaga.titulo ?? 'Vaga sem título',
        status: vaga.status ?? 'aberta',
        candidatos: daVaga.length,
        contratados,
        conversao: daVaga.length > 0 ? arredondar((contratados / daVaga.length) * 100) : 0,
      };
    })
    .sort(
      (a, b) => b.candidatos - a.candidatos || b.conversao - a.conversao || a.titulo.localeCompare(b.titulo, 'pt-BR')
    );
}

/* ─── Detalhamento por vaga (janela "Ver todas") ──────────────────────────── */

/** Status que significam "vaga em andamento" (ver `SituacaoVaga`). */
const SITUACAO_ABERTA = new Set(['aberta', 'aberto', 'open', 'ativa', 'ativo']);
/** Status de vaga parada — nenhum fluxo do módulo grava este valor hoje. */
const SITUACAO_PAUSADA = new Set(['pausada', 'pausado', 'suspensa', 'suspenso', 'em pausa']);
/** Status de vaga concluída (`fechada` é o valor gravado; o resto são sinônimos). */
const SITUACAO_ENCERRADA = new Set([
  'fechada',
  'fechado',
  'closed',
  'encerrada',
  'encerrado',
  'inativa',
  'inativo',
  'concluida',
  'concluido',
]);

/** Rótulo de cada situação — o único texto aceito na interface. */
export const ROTULO_SITUACAO: Record<SituacaoVaga, string> = {
  aberta: 'Aberta',
  pausada: 'Pausada',
  encerrada: 'Encerrada',
  indefinida: 'Não informado',
};

/** Normaliza `vagas.status` (sem acento, minúsculo) e classifica a situação. */
export function situacaoDaVaga(status: string | null | undefined): SituacaoVaga {
  const valor = (status ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (SITUACAO_ABERTA.has(valor)) return 'aberta';
  if (SITUACAO_PAUSADA.has(valor)) return 'pausada';
  if (SITUACAO_ENCERRADA.has(valor)) return 'encerrada';
  return 'indefinida';
}

/**
 * Enriquecimento do desempenho por vaga para a janela de detalhamento.
 *
 * A base é `construirDesempenhoVagas` — o MESMO cálculo que alimenta o card —,
 * então `candidatos`, `contratados`, `conversao` e a ORDEM da lista são
 * idênticos aos do resumo: abrir o modal nunca "corrige" um número da tela.
 *
 * O que é acrescentado vem só dos registros já carregados:
 *   • `departamento` ..... `vagas.departamento`;
 *   • `emProcesso` ....... candidaturas que ainda não terminaram, pela MESMA
 *                          definição de `encerrada` usada nos indicadores;
 *   • `porEtapa` ......... contagem por `candidaturas.etapa` (vazio = triagem),
 *                          exatamente como `construirFunil`;
 *   • `tempoMedioDias` ... média de dias entre `created_at` e `updated_at`
 *                          (ou a referência). Sem amostra, `null` — a janela
 *                          mostra "não disponível" em vez de um número.
 */
export function construirDetalheVagas(
  vagas: VagaRow[],
  candidaturas: CandidaturaComRelacoes[],
  referencia: Date
): DetalheVaga[] {
  const resumos = construirDesempenhoVagas(vagas, candidaturas);
  const vagaPorId = new Map(vagas.map((vaga) => [vaga.id, vaga]));

  return resumos.map((resumo) => {
    const daVaga = candidaturas.filter((candidatura) => candidatura.vaga_id === resumo.id);

    const contagem = new Map<string, number>();
    for (const candidatura of daVaga) {
      const etapa = candidatura.etapa || 'triagem';
      contagem.set(etapa, (contagem.get(etapa) ?? 0) + 1);
    }

    const tempos = daVaga
      .map((candidatura) => {
        const inicio = dataValida(candidatura.created_at);
        if (!inicio) return null;
        const fim = dataValida(candidatura.updated_at) ?? referencia;
        const dias = differenceInCalendarDays(fim, inicio);
        return dias >= 0 ? dias : null;
      })
      .filter((dias): dias is number => dias !== null);

    const situacao = situacaoDaVaga(resumo.status);
    const departamento = vagaPorId.get(resumo.id)?.departamento?.trim();

    return {
      ...resumo,
      situacao,
      statusRotulo: ROTULO_SITUACAO[situacao],
      departamento: departamento ? departamento : null,
      emProcesso: daVaga.filter((candidatura) => !encerrada(candidatura)).length,
      porEtapa: ETAPAS.map((etapa) => ({
        id: etapa.id,
        label: etapa.label,
        total: contagem.get(etapa.id) ?? 0,
      })),
      tempoMedioDias:
        tempos.length > 0 ? Math.round(tempos.reduce((soma, dias) => soma + dias, 0) / tempos.length) : null,
    };
  });
}

export interface ResumoDesempenhoVagas {
  /** Vagas consideradas no recorte. */
  vagas: number;
  /** Candidaturas somadas das vagas consideradas (mesma régua do card). */
  candidatos: number;
  /** Contratações concluídas somadas. */
  contratacoes: number;
  /** Candidaturas ainda em andamento somadas. */
  emProcesso: number;
  /** Contratações ÷ candidaturas do recorte, em % (0 sem candidaturas). */
  conversao: number;
}

/** Os quatro KPIs da janela — sempre sobre a base INTEIRA do recorte. */
export function resumirDesempenhoVagas(detalhes: readonly DetalheVaga[]): ResumoDesempenhoVagas {
  const candidatos = detalhes.reduce((soma, vaga) => soma + vaga.candidatos, 0);
  const contratacoes = detalhes.reduce((soma, vaga) => soma + vaga.contratados, 0);
  return {
    vagas: detalhes.length,
    candidatos,
    contratacoes,
    emProcesso: detalhes.reduce((soma, vaga) => soma + vaga.emProcesso, 0),
    conversao: candidatos > 0 ? arredondar((contratacoes / candidatos) * 100) : 0,
  };
}

/* ─── Pontos de atenção (regras do próprio funil, sem IA) ─────────────────── */

export function construirPontosDeAtencao({
  candidaturas,
  vagas,
  funil,
  conversoes,
  tempos,
  referencia,
}: {
  candidaturas: CandidaturaComRelacoes[];
  vagas: VagaRow[];
  funil: ItemFunil[];
  conversoes: ConversaoFunil[];
  tempos: TempoEtapa[];
  referencia: Date;
}): PontoAtencao[] {
  const alertas: PontoAtencao[] = [];

  // 1) Gargalo: etapa com maior permanência média acima do limite.
  const gargalo = tempos
    .filter((tempo) => tempo.id !== 'contratado' && tempo.dias !== null)
    .sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0))[0];
  if (gargalo && (gargalo.dias ?? 0) > DIAS_ALERTA_ETAPA) {
    const parados = candidaturas.filter(
      (candidatura) =>
        (candidatura.etapa || 'triagem') === gargalo.id && diasNaEtapa(candidatura, referencia) > DIAS_ALERTA_ETAPA
    ).length;
    if (parados > 0) {
      alertas.push({
        id: `gargalo-${gargalo.id}`,
        tipo: 'gargalo',
        severidade: (gargalo.dias ?? 0) >= 30 ? 'alta' : 'media',
        /* Resumo curto: etapa primeiro, depois a contagem — a frase inteira
           ("4 candidatos há mais de 21 dias em Triagem") passava da largura
           útil do card e caía em reticências. O limite de 21 dias, a
           permanência média e o tamanho da amostra vivem no `detalhe`. */
        titulo: `${gargalo.label}: ${parados} ${parados === 1 ? 'candidato parado' : 'candidatos parados'}`,
        descricao: 'Priorize a análise desta etapa.',
        detalhe: `Permanência média de ${gargalo.dias} dias em ${gargalo.label} · ${gargalo.amostra} ${
          gargalo.amostra === 1 ? 'candidato' : 'candidatos'
        } na etapa · alerta a partir de ${DIAS_ALERTA_ETAPA} dias.`,
      });
    }
  }

  // 2) Vaga aberta sem movimentação — pior caso entre as vagas com candidatos.
  const vagaParada = vagas
    .filter((vaga) => vaga.status === 'aberta')
    .map((vaga) => {
      const daVaga = candidaturas.filter((candidatura) => candidatura.vaga_id === vaga.id);
      const ultima = daVaga
        .map(dataDaCandidatura)
        .filter((data): data is Date => Boolean(data))
        .sort((a, b) => b.getTime() - a.getTime())[0];
      return {
        vaga,
        dias: ultima ? Math.max(0, differenceInCalendarDays(referencia, ultima)) : null,
        ultima,
        candidatos: daVaga.length,
      };
    })
    .filter((item) => item.candidatos > 0 && item.dias !== null && item.dias > DIAS_ALERTA_VAGA)
    .sort((a, b) => (b.dias ?? 0) - (a.dias ?? 0))[0];

  if (vagaParada && vagaParada.ultima) {
    alertas.push({
      id: `vaga-${vagaParada.vaga.id}`,
      tipo: 'vaga',
      severidade: (vagaParada.dias ?? 0) >= 30 ? 'alta' : 'media',
      /* Nome da vaga FORA do título: "Assistente Administrativo sem
         movimentação há 47 dias" ocupava duas linhas dentro do card. O título
         fica com o fato (dias parada) e o nome completo, a data da última
         movimentação e o volume de candidaturas vivem no `detalhe`. */
      titulo: `Vaga parada há ${vagaParada.dias} dias`,
      descricao: 'Revise o andamento da vaga.',
      detalhe: `${vagaParada.vaga.titulo} · última movimentação em ${format(vagaParada.ultima, 'dd/MM')} · ${
        vagaParada.candidatos
      } ${vagaParada.candidatos === 1 ? 'candidatura' : 'candidaturas'}. Reative os candidatos ou encerre a vaga.`,
    });
  }

  // 3) Menor conversão entre etapas (a queda mais forte do funil). Só entra
  // quando ALGUÉM chegou à etapa seguinte — 0% por amostra vazia não é alerta.
  const piorConversao = conversoes
    .map((conversao, indice) => ({
      ...conversao,
      indice,
      origem: funil[indice]?.total ?? 0,
      destino: funil[indice + 1]?.total ?? 0,
    }))
    .filter((conversao) => conversao.origem > 0 && conversao.destino > 0 && conversao.percentual < 60)
    .sort((a, b) => a.percentual - b.percentual)[0];
  if (piorConversao) {
    const percentual = formatarPercentual(piorConversao.percentual, 0);
    /* "Conversão de 50% em Proposta → Contratado" cortava no card; a passagem
       final ganha o rótulo curto da referência ("na etapa final") e as demais
       viram "Conversão de X% para <etapa de destino>". A passagem completa
       (origem → destino + menor taxa do funil) está no `detalhe`. */
    const etapaFinal = piorConversao.indice === conversoes.length - 1;
    alertas.push({
      id: `conversao-${piorConversao.de}-${piorConversao.para}`,
      tipo: 'conversao',
      severidade: piorConversao.percentual < 40 ? 'alta' : 'media',
      titulo: etapaFinal
        ? `Conversão de ${percentual} na etapa final`
        : `Conversão de ${percentual} para ${piorConversao.para}`,
      descricao: 'Revise os critérios de aprovação.',
      detalhe: `Menor taxa do funil: ${piorConversao.de} → ${piorConversao.para} · ${percentual} de conversão (piso de 60%).`,
    });
  }

  // 4) Desistências — só existe alerta se houver registro; nada é inventado.
  const desistencias = candidaturas.filter((candidatura) =>
    ['desistente', 'desistiu', 'cancelado'].includes((candidatura.status ?? '').toLowerCase())
  ).length;
  if (desistencias > 0) {
    alertas.push({
      id: 'desistencias',
      tipo: 'desistencia',
      severidade: 'media',
      titulo: `${desistencias} ${desistencias === 1 ? 'desistência registrada' : 'desistências registradas'}`,
      descricao: 'Entenda o motivo antes de encerrar.',
      detalhe:
        'Contate os candidatos para entender o motivo antes de encerrar o processo — a desistência não entra no cálculo de conversão.',
    });
  }

  const peso: Record<SeveridadeAtencao, number> = { alta: 0, media: 1, baixa: 2 };
  return alertas.sort((a, b) => peso[a.severidade] - peso[b.severidade]).slice(0, 4);
}

/* ─── Indicadores gerais ──────────────────────────────────────────────────── */

export function construirIndicadores(entrada: EntradaAnalytics & { referencia: Date }): IndicadorGeral[] {
  const { candidaturas, vagas, candidatos, referencia } = entrada;
  const contratados = candidaturas.filter(ehContratada);
  const abertas = vagas.filter((vaga) => vaga.status === 'aberta').length;
  const propostas = candidaturas.filter((candidatura) => candidatura.etapa === 'proposta').length;
  const desistencias = candidaturas.filter((candidatura) =>
    ['desistente', 'desistiu', 'cancelado'].includes((candidatura.status ?? '').toLowerCase())
  ).length;

  const temposContratacao = contratados
    .map((candidatura) => {
      const entrada = dataValida(candidatura.created_at);
      return entrada ? Math.max(0, differenceInCalendarDays(referencia, entrada)) : null;
    })
    .filter((dias): dias is number => dias !== null);
  const tempoMedio = temposContratacao.length
    ? Math.round(temposContratacao.reduce((soma, dias) => soma + dias, 0) / temposContratacao.length)
    : null;

  const candidatosPorVaga = abertas > 0 ? candidatos.length / abertas : null;
  const taxaDesistencia = candidaturas.length > 0 ? arredondar((desistencias / candidaturas.length) * 100) : 0;
  const basePropostas = propostas + contratados.length;
  const aceitacao = basePropostas > 0 ? arredondar((contratados.length / basePropostas) * 100) : null;

  // Comparação "vs. período anterior": a MESMA régua medida na janela atual e na
  // anterior (ver `metricasDaJanela`). O valor grande acima continua sendo a
  // foto de toda a base.
  const janelaAtual = metricasDaJanela(entrada, referencia);
  const janelaAnterior = metricasDaJanela(entrada, referencia, 1);
  const rotuloComparacao = (assunto: string) => `${assunto} vs. ${JANELA_COMPARACAO_DIAS} dias anteriores`;

  return [
    {
      id: 'tempo-contratacao',
      label: 'Tempo médio de contratação',
      valor: tempoMedio === null ? '—' : `${tempoMedio} ${tempoMedio === 1 ? 'dia' : 'dias'}`,
      apoio: `${contratados.length} ${contratados.length === 1 ? 'processo concluído' : 'processos concluídos'} na base`,
      tendencia: tendenciaEmDias(
        janelaAtual.tempoMedio,
        janelaAnterior.tempoMedio,
        rotuloComparacao('tempo de contratação')
      ),
    },
    {
      id: 'candidatos-vaga',
      label: 'Candidatos por vaga',
      valor: candidatosPorVaga === null ? '—' : formatarNumero(candidatosPorVaga),
      apoio: `${candidatos.length} candidatos para ${abertas} ${abertas === 1 ? 'vaga aberta' : 'vagas abertas'}`,
      tendencia: tendenciaPercentual(
        janelaAtual.candidatosPorVaga,
        janelaAnterior.candidatosPorVaga,
        rotuloComparacao('candidatos por vaga')
      ),
    },
    {
      id: 'desistencia',
      label: 'Taxa de desistência',
      valor: formatarPercentual(taxaDesistencia),
      apoio: `${desistencias} de ${candidaturas.length} processos`,
      tendencia: tendenciaEmPontos(
        janelaAtual.taxaDesistencia,
        janelaAnterior.taxaDesistencia,
        rotuloComparacao('desistência'),
        false
      ),
    },
    {
      id: 'aceitacao',
      label: 'Taxa de aceitação de proposta',
      valor: aceitacao === null ? '—' : formatarPercentual(aceitacao),
      apoio: `${contratados.length} de ${basePropostas} propostas emitidas`,
      tendencia: tendenciaEmPontos(
        janelaAtual.aceitacao,
        janelaAnterior.aceitacao,
        rotuloComparacao('aceitação de proposta'),
        true
      ),
    },
  ];
}

/* ─── KPIs com comparação de janela ───────────────────────────────────────── */

/** Início do dia em ms (comparações por data, sem ruído de hora). */
function inicioDoDia(data: Date): number {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();
}

/** Conta itens cuja data cai em `[fim - dias, fim)`; `deslocamento` move a janela. */
function contarNaJanela<T>(
  itens: T[],
  obterData: (item: T) => Date | null,
  referencia: Date,
  dias: number,
  deslocamento = 0
): number {
  return itens.reduce(
    (total, item) => (dentroDaJanela(obterData(item), referencia, dias, deslocamento) ? total + 1 : total),
    0
  );
}

/**
 * Recorte de janela — a MESMA régua de `contarNaJanela` e de todas as
 * comparações da aba: `[fim - dias, fim)`, com `deslocamento` em janelas para
 * trás. Centralizado aqui para os KPIs do topo e os indicadores do rodapé não
 * divergirem na borda do período.
 */
function dentroDaJanela(data: Date | null, referencia: Date, dias: number, deslocamento = 0): boolean {
  if (!data) return false;
  const fim = inicioDoDia(referencia) + DIA_MS - deslocamento * dias * DIA_MS;
  const inicio = fim - dias * DIA_MS;
  const timestamp = data.getTime();
  return timestamp >= inicio && timestamp < fim;
}

/** Variação percentual entre janelas; sem base anterior, mostra o volume novo. */
function tendenciaDeJanela(
  atual: number,
  anterior: number,
  rotuloComparacao = `vs. ${JANELA_COMPARACAO_DIAS} dias anteriores`,
  rotuloNovo = 'novos no período'
): TendenciaKpi | null {
  if (atual === 0 && anterior === 0) return null;
  if (anterior === 0) {
    return {
      texto: `+${atual}`,
      positiva: true,
      neutra: false,
      label: rotuloNovo,
    };
  }
  const variacao = Math.round(((atual - anterior) / anterior) * 100);
  return {
    texto: `${variacao > 0 ? '+' : ''}${variacao}%`,
    positiva: variacao >= 0,
    neutra: variacao === 0,
    label: rotuloComparacao,
  };
}

function taxaConversaoDaJanela(candidaturas: CandidaturaComRelacoes[], referencia: Date, deslocamento = 0): number {
  const daJanela = candidaturas.filter((candidatura) =>
    dentroDaJanela(dataValida(candidatura.created_at), referencia, JANELA_COMPARACAO_DIAS, deslocamento)
  );
  if (daJanela.length === 0) return 0;
  return arredondar((daJanela.filter(ehContratada).length / daJanela.length) * 100);
}

/* ─── Comparação dos indicadores gerais (janela atual × anterior) ─────────── */

/** Última movimentação registrada — o mesmo critério de `construirTempos`. */
function dataDaMovimentacao(candidatura: CandidaturaComRelacoes): Date | null {
  return dataValida(candidatura.updated_at) ?? dataValida(candidatura.created_at);
}

interface MetricasJanela {
  /** Dias entre entrada e conclusão dos processos concluídos na janela. */
  tempoMedio: number | null;
  /** Candidatos que entraram na janela ÷ vagas abertas na janela. */
  candidatosPorVaga: number | null;
  taxaDesistencia: number | null;
  aceitacao: number | null;
}

/**
 * As QUATRO réguas dos indicadores gerais medidas DENTRO de uma janela.
 *
 * O número grande dos cards continua sendo a foto de TODA a base (nada muda no
 * que já era exibido); esta função existe apenas para a comparação "vs. período
 * anterior" e obedece à MESMA convenção das tendências dos KPIs do topo: cada
 * janela é medida pelo que ACONTECEU nela (movimentação/conclusão), e não por
 * uma reconstrução do passado — o modelo não guarda histórico de etapas
 * (`historico_etapas` vem nulo), então "foto de 45 dias atrás" seria invenção.
 *
 * Sem base em qualquer um dos lados a métrica volta `null` e o card não exibe
 * variação — nenhum percentual é inventado.
 */
function metricasDaJanela(
  { candidaturas, vagas, candidatos }: EntradaAnalytics,
  referencia: Date,
  deslocamento = 0
): MetricasJanela {
  const naJanela = (data: Date | null) => dentroDaJanela(data, referencia, JANELA_COMPARACAO_DIAS, deslocamento);

  const movimentados = candidaturas.filter((candidatura) => naJanela(dataDaMovimentacao(candidatura)));
  const concluidos = movimentados.filter(ehContratada);
  const propostas = movimentados.filter((candidatura) => candidatura.etapa === 'proposta');
  const desistencias = movimentados.filter((candidatura) =>
    ['desistente', 'desistiu', 'cancelado'].includes((candidatura.status ?? '').toLowerCase())
  );

  const tempos = concluidos
    .map((candidatura) => {
      const entrada = dataValida(candidatura.created_at);
      const conclusao = dataDaMovimentacao(candidatura);
      return entrada && conclusao ? Math.max(0, differenceInCalendarDays(conclusao, entrada)) : null;
    })
    .filter((dias): dias is number => dias !== null);
  const tempoMedio = tempos.length ? Math.round(tempos.reduce((soma, dias) => soma + dias, 0) / tempos.length) : null;

  const candidatosDaJanela = candidatos.filter((candidato) => naJanela(dataValida(candidato.created_at))).length;
  const vagasDaJanela = vagas.filter(
    (vaga) => vaga.status === 'aberta' && naJanela(dataValida(vaga.data_abertura) ?? dataValida(vaga.created_at))
  ).length;
  const candidatosPorVaga = vagasDaJanela > 0 ? candidatosDaJanela / vagasDaJanela : null;

  const taxaDesistencia =
    movimentados.length > 0 ? arredondar((desistencias.length / movimentados.length) * 100) : null;
  const basePropostas = propostas.length + concluidos.length;
  const aceitacao = basePropostas > 0 ? arredondar((concluidos.length / basePropostas) * 100) : null;

  return { tempoMedio, candidatosPorVaga, taxaDesistencia, aceitacao };
}

/**
 * Variação em DIAS (tempo de contratação). Menos dias é melhor, então a queda
 * é lida como positiva — a mesma semântica de cor dos KPIs do topo.
 */
function tendenciaEmDias(atual: number | null, anterior: number | null, label: string): TendenciaKpi | null {
  if (atual === null || anterior === null) return null;
  const diferenca = atual - anterior;
  return {
    texto: `${diferenca > 0 ? '+' : ''}${diferenca} ${Math.abs(diferenca) === 1 ? 'dia' : 'dias'}`,
    positiva: diferenca < 0,
    neutra: diferenca === 0,
    label,
  };
}

/**
 * Variação em PONTOS PERCENTUAIS (taxas já expressas em %). `maiorEhMelhor`
 * define a direção favorável: aceitação para cima é bom, desistência para cima
 * não é.
 */
function tendenciaEmPontos(
  atual: number | null,
  anterior: number | null,
  label: string,
  maiorEhMelhor: boolean
): TendenciaKpi | null {
  if (atual === null || anterior === null) return null;
  const diferenca = arredondar(atual - anterior);
  return {
    texto: `${diferenca > 0 ? '+' : ''}${formatarNumero(diferenca)} p.p.`,
    positiva: diferenca === 0 ? true : maiorEhMelhor ? diferenca > 0 : diferenca < 0,
    neutra: diferenca === 0,
    label,
  };
}

/** Variação percentual de uma razão (candidatos por vaga); sem base = sem selo. */
function tendenciaPercentual(atual: number | null, anterior: number | null, label: string): TendenciaKpi | null {
  if (atual === null || anterior === null || anterior === 0) return null;
  const variacao = arredondar(((atual - anterior) / anterior) * 100);
  return {
    texto: `${variacao > 0 ? '+' : ''}${formatarNumero(variacao)}%`,
    positiva: variacao >= 0,
    neutra: variacao === 0,
    label,
  };
}

export function construirKpis({
  candidaturas,
  vagas,
  candidatos,
  referencia,
}: EntradaAnalytics & { referencia: Date }): KpiRecrutamento[] {
  const abertas = vagas.filter((vaga) => vaga.status === 'aberta');
  const contratados = candidaturas.filter(ehContratada).length;
  const processosAtivos = candidaturas.filter((candidatura) => !encerrada(candidatura)).length;
  const taxa = candidaturas.length > 0 ? arredondar((contratados / candidaturas.length) * 100) : 0;

  const dataVaga = (vaga: VagaRow) => dataValida(vaga.data_abertura) ?? dataValida(vaga.created_at);
  const dataCandidato = (candidato: CandidatoRow) => dataValida(candidato.created_at);
  const dataCandidatura = (candidatura: CandidaturaComRelacoes) => dataValida(candidatura.created_at);

  const novasVagasAtual = contarNaJanela(abertas, dataVaga, referencia, JANELA_COMPARACAO_DIAS);
  const novasVagasAnterior = contarNaJanela(abertas, dataVaga, referencia, JANELA_COMPARACAO_DIAS, 1);
  const novosCandidatosAtual = contarNaJanela(candidatos, dataCandidato, referencia, JANELA_COMPARACAO_DIAS);
  const novosCandidatosAnterior = contarNaJanela(candidatos, dataCandidato, referencia, JANELA_COMPARACAO_DIAS, 1);
  const novosProcessosAtual = contarNaJanela(candidaturas, dataCandidatura, referencia, JANELA_COMPARACAO_DIAS);
  const novosProcessosAnterior = contarNaJanela(candidaturas, dataCandidatura, referencia, JANELA_COMPARACAO_DIAS, 1);

  const conversaoAtual = taxaConversaoDaJanela(candidaturas, referencia);
  const conversaoAnterior = taxaConversaoDaJanela(candidaturas, referencia, 1);
  const variacaoConversao = arredondar(conversaoAtual - conversaoAnterior);
  const tendenciaConversao: TendenciaKpi | null =
    conversaoAtual === 0 && conversaoAnterior === 0
      ? null
      : {
          texto: `${variacaoConversao > 0 ? '+' : ''}${formatarNumero(variacaoConversao)} p.p.`,
          positiva: variacaoConversao >= 0,
          neutra: variacaoConversao === 0,
          label: `conversão vs. ${JANELA_COMPARACAO_DIAS} dias anteriores`,
        };

  const origens = new Set(candidatos.map((candidato) => (candidato.origem ?? '').trim()).filter(Boolean));

  return [
    {
      id: 'vagas',
      label: 'Vagas abertas',
      valor: abertas.length,
      exibicao: String(abertas.length),
      apoio: `${abertas.length} de ${vagas.length} vagas cadastradas`,
      tendencia: tendenciaDeJanela(
        novasVagasAtual,
        novasVagasAnterior,
        `novas vagas vs. ${JANELA_COMPARACAO_DIAS} dias anteriores`,
        'novas no período'
      ),
    },
    {
      id: 'candidatos',
      label: 'Total de candidatos',
      valor: candidatos.length,
      exibicao: String(candidatos.length),
      apoio: `${origens.size} ${origens.size === 1 ? 'origem de captação' : 'origens de captação'}`,
      tendencia: tendenciaDeJanela(
        novosCandidatosAtual,
        novosCandidatosAnterior,
        `novos candidatos vs. ${JANELA_COMPARACAO_DIAS} dias anteriores`
      ),
    },
    {
      id: 'processos',
      label: 'Processos ativos',
      valor: processosAtivos,
      exibicao: String(processosAtivos),
      apoio: `${contratados} ${contratados === 1 ? 'processo concluído' : 'processos concluídos'}`,
      tendencia: tendenciaDeJanela(
        novosProcessosAtual,
        novosProcessosAnterior,
        `novos processos vs. ${JANELA_COMPARACAO_DIAS} dias anteriores`
      ),
    },
    {
      id: 'conversao',
      label: 'Taxa de conversão',
      valor: taxa,
      exibicao: formatarPercentual(taxa),
      apoio: `${contratados} de ${candidaturas.length} candidaturas`,
      tendencia: tendenciaConversao,
    },
  ];
}

/* ─── Composição ──────────────────────────────────────────────────────────── */

export function construirAnalytics(entrada: EntradaAnalytics): AnalyticsRecrutamento {
  const referencia = referenciaDosDados(entrada);
  const funil = construirFunil(entrada.candidaturas);
  const conversoes = construirConversoes(funil);
  const tempos = construirTempos(entrada.candidaturas, referencia);

  return {
    referencia,
    totalCandidaturas: entrada.candidaturas.length,
    kpis: construirKpis({ ...entrada, referencia }),
    funil,
    conversoes,
    origens: construirOrigens(entrada.candidatos),
    tempos,
    atencao: construirPontosDeAtencao({
      candidaturas: entrada.candidaturas,
      vagas: entrada.vagas,
      funil,
      conversoes,
      tempos,
      referencia,
    }),
    vagas: construirDesempenhoVagas(entrada.vagas, entrada.candidaturas),
    indicadores: construirIndicadores({ ...entrada, referencia }),
  };
}
