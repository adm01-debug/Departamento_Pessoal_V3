/**
 * ============================================================================
 * HUB DE PREMIAÇÕES — DERIVAÇÕES PURAS (sem React, sem I/O).
 *
 * Toda a inteligência de apresentação da aba Campanhas nasce aqui: métricas por
 * campanha, filtros, ordenação, pendências e atividade recente. Os componentes
 * (`CampanhaTabela`, `CampanhaLateral`, `CampanhaDetalhesDialog`) e a página só
 * consomem o que estas funções devolvem — o layout fica testável e a regra não
 * se espalha pelo JSX.
 *
 * REGRAS DE NEGÓCIO RESPEITADAS (nenhuma métrica nova foi inventada):
 *  · `status` da campanha é use-restrito aos valores do banco
 *    (rascunho | ativo | suspenso | finalizado — migration 20260520131308).
 *  · Os estágios do pagamento são os MESMOS de `RewardsApprovalHub`
 *    (calculado → revisando → aprovado_gestor → aprovado_rh → aprovado_financeiro
 *    → pago, além de rejeitado/cancelado).
 *  · "Orçamento utilizado" toma como comprometido a soma de `valor_aprovado` e,
 *    na ausência dele, `valor_calculado` (valor já reservado pela regra).
 *  · "Desempenho" é o percentual de LIQUIDAÇÃO do cálculo da campanha:
 *    valor aprovado ÷ valor calculado. Não é o orçamento (indicador próprio, na
 *    coluna vizinha) e não é meta de negócio: o schema não guarda meta atingida
 *    por campanha (`premiacoes_campanhas.meta_dados` existe, mas a aplicação
 *    nunca o escreve). Por isso o rótulo da célula é "% aprovado", nunca "da meta".
 *  · Nada de divisão por zero: orçamento nulo/zero e ausência de base de cálculo
 *    devolvem `null` (a célula mostra "—" e a barra fica vazia).
 *  · Participantes são os `colaborador_id` distintos COM pagamento na campanha —
 *    o embed disponível (`colaboradores(nome_completo, salario_base)`) não traz
 *    foto, então o avatar é o fallback de INICIAIS do próprio nome real.
 * ============================================================================
 */
import { parseDateSafe } from '@/utils/format';

/* ─── Cascata de entrada do hub ────────────────────────────────────────────── */

/**
 * Bases de índice da cascata de entrada do Hub de Premiações.
 *
 * A ANIMAÇÃO não nasce aqui: ela é a MESMA dos KPI Cards do Dashboard Executivo
 * (fade + subida de 20px, ease `[0.25, 0.46, 0.45, 0.94]`, cascata por índice),
 * com a cadência própria do hub em `premiacoesEntrada.ts` (0.55s por item e
 * 0.10s por índice — a régua de referência com dois números escalados, porque o
 * Dashboard Executivo não pode ser alterado). Aqui só mora a ORDEM DE LEITURA
 * dos seis grupos visuais da tela — a base desloca cada grupo para que eles não
 * comecem todos no mesmo instante, sem inventar tempos novos (o intervalo entre
 * itens continua sendo o mesmo passo da cascata).
 */
export const ENTRADA_BASE = {
  cabecalho: 0,
  navegacao: 1,
  kpis: 2,
  filtros: 3,
  tabela: 4,
  lateral: 5,
} as const;

/** Índice de entrada de um item dentro do seu grupo (some a base + a posição). */
export function indiceEntrada(grupo: keyof typeof ENTRADA_BASE, item = 0): number {
  return ENTRADA_BASE[grupo] + item;
}

/* ─── Modelos mínimos consumidos da tela ───────────────────────────────────── */

export interface CampanhaHub {
  id: string;
  nome: string;
  descricao?: string | null;
  data_inicio: string;
  data_fim: string;
  status: string;
  orcamento_estimado?: number | string | null;
  status_aprovacao?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PagamentoHub {
  id: string;
  campanha_id: string;
  colaborador_id?: string | null;
  valor_calculado?: number | string | null;
  valor_aprovado?: number | string | null;
  status: string;
  status_conciliacao?: string | null;
  data_pagamento?: string | null;
  updated_at?: string | null;
  historico_mudancas?: unknown;
  colaborador?: { nome_completo?: string | null } | null;
  campanha?: { nome?: string | null } | null;
}

export interface AuditoriaHub {
  id: string;
  entidade_tipo: string;
  entidade_id: string;
  acao: string;
  motivo: string;
  created_at: string;
}

/* ─── Vocabulário real do domínio ──────────────────────────────────────────── */

/** Estágios que ainda dependem de alguém (espelha `RewardsApprovalHub.stages`). */
export const STATUS_PAGAMENTO_PENDENTE = ['calculado', 'revisando', 'aprovado_gestor', 'aprovado_rh'] as const;

/** Estágios já liquidados pelo financeiro. */
export const STATUS_PAGAMENTO_LIQUIDADO = ['aprovado_financeiro', 'pago'] as const;

export type FiltroStatusCampanha = 'todos' | 'ativo' | 'finalizado' | 'rascunho' | 'suspenso';
export type FiltroPeriodoCampanha = 'todos' | 'mes_atual' | 'ultimos_90' | 'ano_atual';
/**
 * Critérios de ordenação — TODOS por campos reais da campanha. Os rótulos são os
 * do seletor "Ordenar por" e as colunas da tabela exibem o indicador quando o
 * critério ativo aponta para elas (ver `ORDENACAO_POR_COLUNA`).
 */
export type OrdenacaoCampanha =
  | 'inicio_recente'
  | 'inicio_antigo'
  | 'nome'
  | 'nome_desc'
  | 'atualizadas'
  | 'orcamento'
  | 'participantes'
  | 'aprovacao';

/** Rótulo do seletor "Ordenar por" — um item por critério, sem opção morta. */
export const ORDENACAO_ROTULOS: { valor: OrdenacaoCampanha; label: string; chip: string }[] = [
  { valor: 'inicio_recente', label: 'Mais recentes', chip: 'Período' },
  { valor: 'inicio_antigo', label: 'Mais antigas', chip: 'Período' },
  { valor: 'nome', label: 'Nome (A–Z)', chip: 'Campanha' },
  { valor: 'nome_desc', label: 'Nome (Z–A)', chip: 'Campanha' },
  { valor: 'atualizadas', label: 'Última atualização', chip: 'Campanha' },
  { valor: 'orcamento', label: 'Maior orçamento', chip: 'Orçamento' },
  { valor: 'participantes', label: 'Mais participantes', chip: 'Participantes' },
  { valor: 'aprovacao', label: 'Maior % aprovado', chip: 'Desempenho' },
];

/** Coluna da tabela que cada critério alimenta (para o indicador do cabeçalho). */
export const ORDENACAO_POR_COLUNA: Record<OrdenacaoCampanha, string> = {
  inicio_recente: 'periodo',
  inicio_antigo: 'periodo',
  nome: 'campanha',
  nome_desc: 'campanha',
  atualizadas: 'campanha',
  orcamento: 'orcamento',
  participantes: 'participantes',
  aprovacao: 'desempenho',
};

/** Aparência de cada status real — etiqueta + indicador secundário. */
export const APARENCIA_STATUS: Record<string, { label: string; badge: string; ponto: string }> = {
  ativo: { label: 'Ativa', badge: 'bg-primary/15 text-primary border-primary/30', ponto: 'bg-primary' },
  finalizado: { label: 'Finalizada', badge: 'bg-info/15 text-info border-info/30', ponto: 'bg-info' },
  rascunho: { label: 'Rascunho', badge: 'bg-warning/15 text-warning border-warning/30', ponto: 'bg-warning' },
  suspenso: { label: 'Suspensa', badge: 'bg-muted text-muted-foreground border-border/60', ponto: 'bg-muted-foreground' },
};

/** Aparência neutra para status desconhecido (nunca inventa rótulo bonito). */
export const APARENCIA_STATUS_PADRAO = {
  label: 'Indefinida',
  badge: 'bg-muted text-muted-foreground border-border/60',
  ponto: 'bg-muted-foreground',
};

export function aparenciaStatus(status: string | null | undefined) {
  return (
    (status && APARENCIA_STATUS[status]) || {
      ...APARENCIA_STATUS_PADRAO,
      label: status || APARENCIA_STATUS_PADRAO.label,
    }
  );
}

/** Rótulo de `status_aprovacao` (valores da migration 20260520160810). */
export const ROTULO_APROVACAO: Record<string, string> = {
  rascunho: 'Aguardando envio',
  revisando: 'Em revisão',
  aprovado: 'Aprovada',
  rejeitado: 'Rejeitada',
};

/**
 * Rótulo humano de cada estágio do pagamento — os MESMOS estágios/etapas de
 * `RewardsApprovalHub` (lá em `stages`), aqui centralizados para o detalhe e a
 * coluna de conciliação não divergirem do fluxo real.
 */
export const ROTULO_STATUS_PAGAMENTO: Record<string, string> = {
  calculado: 'Aguardando gestor',
  revisando: 'Em revisão',
  aprovado_gestor: 'Aguardando RH',
  aprovado_rh: 'Aguardando financeiro',
  aprovado_financeiro: 'Em conciliação',
  pago: 'Pago',
  rejeitado: 'Rejeitado',
  cancelado: 'Cancelado',
};

/** Aparência do selo de conciliação (valores reais de `status_conciliacao`). */
export const APARENCIA_CONCILIACAO: Record<string, string> = {
  conciliado: 'bg-success/15 text-success border-success/30',
  divergente: 'bg-warning/15 text-warning border-warning/30',
  pendente: 'bg-muted/60 text-muted-foreground border-border/60',
};

/* ─── Utilidades ───────────────────────────────────────────────────────────── */

/** Converte qualquer valor monetário da API em número seguro (0 quando inválido). */
export function numero(valor: unknown): number {
  const n = typeof valor === 'number' ? valor : Number(valor);
  return Number.isFinite(n) ? n : 0;
}

/** Normaliza texto para busca (minúsculas, sem acento) — "bonus" acha "Bônus". */
export function normalizar(texto: string | null | undefined): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Iniciais para o avatar de fallback (até 2 letras, do nome real). */
export function iniciaisDe(nome: string | null | undefined): string {
  const partes = String(nome ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

/** Data (local) como `Date` ou `null`; aceita `YYYY-MM-DD` sem deslocar o dia. */
export function dataDe(input: unknown): Date | null {
  return parseDateSafe(input as never);
}

/** Diferença em dias inteiros entre duas datas (b − a), ignorando o horário. */
export function diferencaEmDias(a: Date, b: Date): number {
  const inicio = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const fim = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((fim - inicio) / 86_400_000);
}

/** Tempo relativo curto no padrão da referência: "há 2 h", "há 3 dias". */
export function tempoRelativo(input: unknown, agora: Date = new Date()): string | null {
  const d = dataDe(input);
  if (!d) return null;
  const minutos = Math.floor((agora.getTime() - d.getTime()) / 60_000);
  if (minutos < 0) return 'agendado';
  if (minutos < 1) return 'agora';
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'há 1 dia';
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? 'há 1 mês' : `há ${meses} meses`;
}

/* ─── Métricas por campanha ────────────────────────────────────────────────── */

export type SituacaoTemporal = 'futura' | 'vigente' | 'encerrada';

export interface MetricasCampanha {
  campanha: CampanhaHub;
  /** Orçamento cadastrado (0 quando nulo). */
  orcamentoTotal: number;
  /** `true` quando não há orçamento utilizável (nulo ou zero) — nada de dividir por 0. */
  orcamentoIndisponivel: boolean;
  /** Soma de `valor_aprovado` e, quando ausente, `valor_calculado`. */
  valorComprometido: number;
  /** % do orçamento já comprometido (null quando não há orçamento). */
  pctOrcamento: number | null;
  /** Soma de todos os `valor_calculado` da campanha (base do "desempenho"). */
  valorCalculado: number;
  /** Soma de todos os `valor_aprovado` da campanha. */
  valorAprovado: number;
  /** % aprovado sobre o calculado (null quando não há base de cálculo). */
  pctAprovado: number | null;
  /** Colaboradores distintos com pagamento na campanha (nomes reais, em ordem). */
  participantes: { total: number; nomes: string[] };
  pagamentosPendentes: number;
  divergencias: number;
  situacaoTemporal: SituacaoTemporal;
  /** Dias até o fim (vigente) ou até o início (futura); null quando encerrada. */
  diasRestantes: number | null;
}

/** Situação temporal da campanha a partir das datas reais (nunca de campo ausente). */
export function situacaoTemporal(
  campanha: CampanhaHub,
  hoje: Date = new Date(),
): { situacao: SituacaoTemporal; diasRestantes: number | null } {
  const inicio = dataDe(campanha.data_inicio);
  const fim = dataDe(campanha.data_fim);
  if (inicio && diferencaEmDias(hoje, inicio) > 0) {
    return { situacao: 'futura', diasRestantes: diferencaEmDias(hoje, inicio) };
  }
  if (fim) {
    const dias = diferencaEmDias(hoje, fim);
    if (dias >= 0) return { situacao: 'vigente', diasRestantes: dias };
    return { situacao: 'encerrada', diasRestantes: null };
  }
  // Sem `data_fim` utilizável não inventamos contagem regressiva.
  return { situacao: inicio ? 'vigente' : 'encerrada', diasRestantes: null };
}

/** Pagamentos que ainda aguardam alguém no fluxo de aprovação. */
export function pagamentosPendentesDa(pagamentos: PagamentoHub[]): PagamentoHub[] {
  return pagamentos.filter((p) => (STATUS_PAGAMENTO_PENDENTE as readonly string[]).includes(p.status));
}

/** Pagamentos com divergência de conciliação. */
export function pagamentosDivergentesDa(pagamentos: PagamentoHub[]): PagamentoHub[] {
  return pagamentos.filter((p) => p.status_conciliacao === 'divergente');
}

/** Métricas de UMA campanha — dos pagamentos que a tela já traz embutidos. */
export function calcularMetricasCampanha(
  campanha: CampanhaHub,
  pagamentos: PagamentoHub[],
  hoje: Date = new Date(),
): MetricasCampanha {
  const orcamentoTotal = numero(campanha.orcamento_estimado);
  const valorCalculado = pagamentos.reduce((acc, p) => acc + numero(p.valor_calculado), 0);
  const valorAprovado = pagamentos.reduce((acc, p) => acc + numero(p.valor_aprovado), 0);
  const valorComprometido = pagamentos.reduce(
    (acc, p) =>
      acc +
      (p.valor_aprovado === null || p.valor_aprovado === undefined
        ? numero(p.valor_calculado)
        : numero(p.valor_aprovado)),
    0,
  );

  const porColaborador = new Map<string, string>();
  for (const p of pagamentos) {
    const chave = p.colaborador_id || p.colaborador?.nome_completo || p.id;
    if (porColaborador.has(chave)) continue;
    porColaborador.set(chave, p.colaborador?.nome_completo ?? '');
  }
  const nomes = [...porColaborador.values()].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const { situacao, diasRestantes } = situacaoTemporal(campanha, hoje);

  return {
    campanha,
    orcamentoTotal,
    orcamentoIndisponivel: orcamentoTotal <= 0,
    valorComprometido,
    pctOrcamento: orcamentoTotal > 0 ? (valorComprometido / orcamentoTotal) * 100 : null,
    valorCalculado,
    valorAprovado,
    pctAprovado: valorCalculado > 0 ? (valorAprovado / valorCalculado) * 100 : null,
    participantes: { total: porColaborador.size, nomes },
    pagamentosPendentes: pagamentosPendentesDa(pagamentos).length,
    divergencias: pagamentosDivergentesDa(pagamentos).length,
    situacaoTemporal: situacao,
    diasRestantes,
  };
}

/** Agrupa os pagamentos por campanha (uma passada só) e deriva todas as métricas. */
export function montarMetricas(
  campanhas: CampanhaHub[],
  pagamentos: PagamentoHub[],
  hoje: Date = new Date(),
): MetricasCampanha[] {
  const porCampanha = new Map<string, PagamentoHub[]>();
  for (const p of pagamentos) {
    const lista = porCampanha.get(p.campanha_id);
    if (lista) lista.push(p);
    else porCampanha.set(p.campanha_id, [p]);
  }
  return campanhas.map((c) => calcularMetricasCampanha(c, porCampanha.get(c.id) ?? [], hoje));
}

/* ─── Filtros, ordenação e contadores ──────────────────────────────────────── */

export interface FiltrosHub {
  busca: string;
  status: FiltroStatusCampanha;
  periodo: FiltroPeriodoCampanha;
  ordenacao: OrdenacaoCampanha;
}

/** Seleção inicial: todas as campanhas permitidas ao usuário, mais recentes antes. */
export const FILTROS_HUB_INICIAIS: FiltrosHub = {
  busca: '',
  status: 'todos',
  periodo: 'todos',
  ordenacao: 'inicio_recente',
};

/** O período filtra pelas datas REAIS da campanha (`data_inicio`). */
function dentroDoPeriodo(campanha: CampanhaHub, periodo: FiltroPeriodoCampanha, hoje: Date): boolean {
  if (periodo === 'todos') return true;
  const inicio = dataDe(campanha.data_inicio);
  if (!inicio) return false;
  if (periodo === 'mes_atual') {
    return inicio.getFullYear() === hoje.getFullYear() && inicio.getMonth() === hoje.getMonth();
  }
  if (periodo === 'ano_atual') return inicio.getFullYear() === hoje.getFullYear();
  // ultimos_90: início dentro dos últimos 90 dias.
  const dias = diferencaEmDias(inicio, hoje);
  return dias >= 0 && dias <= 90;
}

/** A busca alcança os campos disponíveis: nome, descrição, status e aprovação. */
function combinaBusca(metricas: MetricasCampanha, termo: string): boolean {
  if (!termo) return true;
  const { campanha } = metricas;
  const alvo = normalizar(
    [
      campanha.nome,
      campanha.descricao,
      campanha.status,
      campanha.status_aprovacao,
      aparenciaStatus(campanha.status).label,
    ].join(' '),
  );
  return termo.split(/\s+/).every((parte) => alvo.includes(parte));
}

function compararPorOrdenacao(a: MetricasCampanha, b: MetricasCampanha, ordenacao: OrdenacaoCampanha): number {
  const tempo = (valor: unknown) => dataDe(valor)?.getTime() ?? 0;
  // Desempate estável: sem ele, campanhas com a mesma data trocariam de lugar a
  // cada render. O nome é o critério final de todos os casos.
  const desempate = () => a.campanha.nome.localeCompare(b.campanha.nome, 'pt-BR');
  switch (ordenacao) {
    case 'inicio_antigo':
      return tempo(a.campanha.data_inicio) - tempo(b.campanha.data_inicio) || desempate();
    case 'nome':
      return a.campanha.nome.localeCompare(b.campanha.nome, 'pt-BR');
    case 'nome_desc':
      return b.campanha.nome.localeCompare(a.campanha.nome, 'pt-BR');
    case 'atualizadas':
      return tempo(b.campanha.updated_at) - tempo(a.campanha.updated_at) || desempate();
    case 'orcamento':
      return b.orcamentoTotal - a.orcamentoTotal || desempate();
    case 'participantes':
      return b.participantes.total - a.participantes.total || desempate();
    case 'aprovacao':
      return (b.pctAprovado ?? -1) - (a.pctAprovado ?? -1) || desempate();
    case 'inicio_recente':
    default:
      return tempo(b.campanha.data_inicio) - tempo(a.campanha.data_inicio) || desempate();
  }
}

/** Aplica busca + status + período e devolve na ordem pedida. */
export function filtrarEOrdenarCampanhas(
  metricas: MetricasCampanha[],
  filtros: FiltrosHub,
  hoje: Date = new Date(),
): MetricasCampanha[] {
  const termo = normalizar(filtros.busca);
  return metricas
    .filter((m) => filtros.status === 'todos' || m.campanha.status === filtros.status)
    .filter((m) => dentroDoPeriodo(m.campanha, filtros.periodo, hoje))
    .filter((m) => combinaBusca(m, termo))
    .sort((a, b) => compararPorOrdenacao(a, b, filtros.ordenacao));
}

export type ContagemStatus = Record<FiltroStatusCampanha, number>;

/** Contadores REAIS por status (alimentam os chips "Ativas (n)" etc.). */
export function contarPorStatus(metricas: MetricasCampanha[]): ContagemStatus {
  const contagem: ContagemStatus = { todos: metricas.length, ativo: 0, finalizado: 0, rascunho: 0, suspenso: 0 };
  for (const m of metricas) {
    const status = m.campanha.status as FiltroStatusCampanha;
    if (status in contagem && status !== 'todos') contagem[status] += 1;
  }
  return contagem;
}

export interface PaginaCampanhas {
  /** Número da página exibida (1-based, já recortado para a faixa válida). */
  pagina: number;
  totalPaginas: number;
  /** Linhas da página atual. */
  linhas: MetricasCampanha[];
}

/**
 * Recorta a página da tabela (paginação LOCAL — a API de campanhas não pagina).
 * A página pedida é SEMPRE recortada para a faixa válida: trocar o filtro com a
 * página 4 selecionada (ou remover registros) nunca deixa a tabela vazia.
 */
export function paginarCampanhas(
  metricas: MetricasCampanha[],
  paginaPedida: number,
  porPagina: number,
): PaginaCampanhas {
  const tamanho = Math.max(1, Math.floor(porPagina));
  const totalPaginas = Math.max(1, Math.ceil(metricas.length / tamanho));
  const pagina = Math.min(Math.max(1, Math.floor(paginaPedida) || 1), totalPaginas);
  const inicio = (pagina - 1) * tamanho;
  return { pagina, totalPaginas, linhas: metricas.slice(inicio, inicio + tamanho) };
}

/* ─── Indicador de variação do total aprovado ──────────────────────────────── */

/**
 * Variação do total aprovado do MÊS CORRENTE contra o mês anterior, pelas datas
 * reais (`data_pagamento` e, na falta dela, `updated_at`). Sem base no mês
 * anterior devolve `null` — nesse caso a variação simplesmente não é exibida.
 */
export function calcularVariacaoMensal(
  pagamentos: PagamentoHub[],
  agora: Date = new Date(),
): { atual: number; anterior: number; percentual: number } | null {
  const mesDe = (input: unknown): { ano: number; mes: number } | null => {
    const d = dataDe(input);
    return d ? { ano: d.getFullYear(), mes: d.getMonth() } : null;
  };
  const anterior = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const alvoAnterior = { ano: anterior.getFullYear(), mes: anterior.getMonth() };
  const alvoAtual = { ano: agora.getFullYear(), mes: agora.getMonth() };

  let atual = 0;
  let mesAnterior = 0;
  for (const p of pagamentos) {
    const valor = numero(p.valor_aprovado);
    if (valor <= 0) continue;
    const ref = mesDe(p.data_pagamento ?? p.updated_at);
    if (!ref) continue;
    if (ref.ano === alvoAtual.ano && ref.mes === alvoAtual.mes) atual += valor;
    else if (ref.ano === alvoAnterior.ano && ref.mes === alvoAnterior.mes) mesAnterior += valor;
  }
  if (mesAnterior <= 0 || atual <= 0) return null;
  return { atual, anterior: mesAnterior, percentual: ((atual - mesAnterior) / mesAnterior) * 100 };
}

/* ─── Próximas ações (pendências reais do hub) ─────────────────────────────── */

export type TipoAcaoPendente = 'configuracao' | 'aprovacao' | 'conciliacao';
export type DestinoAcao = 'campanhas' | 'pagamentos';

export interface AcaoPendente {
  id: string;
  tipo: TipoAcaoPendente;
  titulo: string;
  /** Campanha (ou objeto) relacionado — sempre o nome real. */
  objeto: string;
  detalhe: string;
  /** Data real mais antiga que originou a pendência (base do "há N dias"). */
  desde: string | null;
  destino: DestinoAcao;
}

const LABEL_CAMPANHA_PENDENTE: Record<string, string> = {
  revisando: 'Revisar aprovação',
  rascunho: 'Continuar configuração',
};

/**
 * Pendências derivadas de fatos do sistema: campanha em rascunho/revisão,
 * pagamentos aguardando aprovação e divergências de conciliação.
 * Nenhum tipo de ação é criado sem um registro real por trás.
 */
export function montarAcoesPendentes(metricas: MetricasCampanha[], pagamentos: PagamentoHub[]): AcaoPendente[] {
  const porCampanha = new Map<string, PagamentoHub[]>();
  for (const p of pagamentos) {
    const lista = porCampanha.get(p.campanha_id);
    if (lista) lista.push(p);
    else porCampanha.set(p.campanha_id, [p]);
  }

  /** Data (ISO) mais antiga do conjunto — "esperando desde". */
  const maisAntigo = (lista: PagamentoHub[]): string | null =>
    lista.reduce<string | null>((mais, p) => {
      if (!p.updated_at) return mais;
      if (!mais) return p.updated_at;
      const atual = dataDe(p.updated_at)?.getTime() ?? Infinity;
      const anterior = dataDe(mais)?.getTime() ?? Infinity;
      return atual < anterior ? p.updated_at : mais;
    }, null);

  const acoes: AcaoPendente[] = [];

  for (const m of metricas) {
    const campanha = m.campanha;
    const aguardandoAprovacao = campanha.status === 'rascunho' || campanha.status_aprovacao === 'revisando';
    if (aguardandoAprovacao) {
      acoes.push({
        id: `config-${campanha.id}`,
        tipo: 'configuracao',
        titulo: LABEL_CAMPANHA_PENDENTE[campanha.status_aprovacao ?? ''] ?? 'Continuar configuração',
        objeto: campanha.nome,
        detalhe:
          campanha.status_aprovacao === 'revisando'
            ? 'Orçamento aguardando aprovação'
            : 'Campanha salva como rascunho',
        desde: campanha.updated_at ?? campanha.created_at ?? null,
        destino: 'campanhas',
      });
    }

    const pendentes = pagamentosPendentesDa(porCampanha.get(campanha.id) ?? []);
    if (pendentes.length > 0) {
      acoes.push({
        id: `aprov-${campanha.id}`,
        tipo: 'aprovacao',
        titulo: pendentes.length === 1 ? 'Aprovar pagamento' : `Aprovar ${pendentes.length} pagamentos`,
        objeto: campanha.nome,
        detalhe: `${pendentes.length} ${pendentes.length === 1 ? 'solicitação pendente' : 'solicitações pendentes'}`,
        desde: maisAntigo(pendentes),
        destino: 'pagamentos',
      });
    }

    const divergentes = pagamentosDivergentesDa(porCampanha.get(campanha.id) ?? []);
    if (divergentes.length > 0) {
      acoes.push({
        id: `conc-${campanha.id}`,
        tipo: 'conciliacao',
        titulo: 'Reconciliar divergência',
        objeto: campanha.nome,
        detalhe: `${divergentes.length} ${divergentes.length === 1 ? 'pagamento divergente' : 'pagamentos divergentes'}`,
        desde: maisAntigo(divergentes),
        destino: 'pagamentos',
      });
    }
  }

  // Mais antigas primeiro: são as que esperam há mais tempo.
  return acoes.sort(
    (a, b) => (dataDe(a.desde)?.getTime() ?? Infinity) - (dataDe(b.desde)?.getTime() ?? Infinity),
  );
}

/* ─── Atividade recente (trilha de auditoria já existente) ─────────────────── */

export interface EventoAtividade {
  id: string;
  titulo: string;
  descricao: string;
  objeto: string | null;
  responsavel: string | null;
  quando: string | null;
}

/** Gênero do substantivo de cada entidade da trilha (para o particípio correto). */
const ENTIDADE_AUDITORIA: Record<string, { singular: string; feminino: boolean }> = {
  campanha: { singular: 'Campanha', feminino: true },
  regra: { singular: 'Regra', feminino: true },
  pagamento: { singular: 'Pagamento', feminino: false },
};

/** Particípio por ação, nas duas flexões. */
const ACAO_AUDITORIA: Record<string, [string, string]> = {
  criacao: ['criada', 'criado'],
  aprovacao: ['aprovada', 'aprovado'],
  alteracao: ['alterada', 'alterado'],
  exclusao: ['excluída', 'excluído'],
  conciliacao: ['conciliada', 'conciliado'],
};

/** Rótulo curto do evento a partir de entidade + ação reais. */
export function rotuloEventoAuditoria(entidadeTipo: string, acao: string): string {
  const entidade = ENTIDADE_AUDITORIA[entidadeTipo];
  if (!entidade) return `${entidadeTipo} · ${acao}`;
  const particion = ACAO_AUDITORIA[acao];
  if (!particion) return `${entidade.singular} · ${acao}`;
  return `${entidade.singular} ${entidade.feminino ? particion[0] : particion[1]}`;
}

/** Responsável registrado no histórico do pagamento (quando é nominal). */
function responsavelDoPagamento(pagamento: PagamentoHub | undefined): string | null {
  const historico = pagamento?.historico_mudancas;
  if (!Array.isArray(historico) || historico.length === 0) return null;
  const ultimo = historico[historico.length - 1] as { user?: unknown };
  const user = typeof ultimo?.user === 'string' ? ultimo.user : '';
  if (!user || user === 'current_user') return null;
  return user;
}

/**
 * Eventos REAIS da trilha de auditoria, do mais recente para o mais antigo.
 * A campanha relacionada é resolvida pelo vínculo do pagamento quando o evento
 * é de pagamento; o responsável, pelo histórico de mudanças do mesmo pagamento.
 */
export function montarAtividadeRecente(
  auditoria: AuditoriaHub[],
  campanhas: CampanhaHub[],
  pagamentos: PagamentoHub[],
  limite = 4,
): EventoAtividade[] {
  const campanhaPorId = new Map(campanhas.map((c) => [c.id, c]));
  const pagamentoPorId = new Map(pagamentos.map((p) => [p.id, p]));

  return auditoria
    .filter((a) => Boolean(a.created_at))
    .slice()
    .sort((a, b) => (dataDe(b.created_at)?.getTime() ?? 0) - (dataDe(a.created_at)?.getTime() ?? 0))
    .slice(0, limite)
    .map((a) => {
      const pagamento = a.entidade_tipo === 'pagamento' ? pagamentoPorId.get(a.entidade_id) : undefined;
      const campanha =
        a.entidade_tipo === 'campanha'
          ? campanhaPorId.get(a.entidade_id)
          : pagamento
            ? campanhaPorId.get(pagamento.campanha_id)
            : undefined;
      return {
        id: a.id,
        titulo: rotuloEventoAuditoria(a.entidade_tipo, a.acao),
        descricao: a.motivo,
        objeto: campanha?.nome ?? pagamento?.campanha?.nome ?? null,
        responsavel: responsavelDoPagamento(pagamento),
        quando: a.created_at,
      };
    });
}
