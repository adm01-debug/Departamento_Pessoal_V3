/**
 * ============================================================================
 * HUB DE PREMIAÇÕES — DERIVAÇÕES DA ABA PAGAMENTOS (sem React, sem I/O).
 *
 * Espelha o que `premiacoesComum` faz pela aba Campanhas: TODA a inteligência de
 * apresentação nasce aqui (etapas do fluxo, os quatro KPIs, o resumo financeiro,
 * as próximas ações, filtros, ordenação e paginação). A tela (`PagamentosTab`)
 * só consome funções puras — nada é recalculado no JSX.
 *
 * ── REGRA Nº 1: NENHUM ESTADO NOVO, NENHUM ESTADO ALTERADO ──────────────────
 * Os estados REAIS do banco continuam exatamente os mesmos (migration
 * 20260520131308 + `premiacoesService`):
 *   calculado → revisando → aprovado_gestor → aprovado_rh → aprovado_financeiro
 *   → (conciliação com a folha) → pago | divergente_em_revisao
 *   e, fora da cadeia, `rejeitado`.
 * A máquina de estados NÃO muda: `proximoStatusPagamento` devolve exatamente o
 * "próximo passo" que o antigo quadro de aprovação já usava (o MESMO
 * `nextStageMap` de `RewardsApprovalHub`).
 *
 * ── REGRA Nº 2: AGRUPAMENTO VISUAL = REGRA DE NEGÓCIO ───────────────────────
 * O fluxo horizontal (IMAGEM 4) tem cinco etapas. Cada estado real cai em UMA
 * etapa, segundo o significado do próprio nome:
 *
 *   1 · Calculado        ← `calculado`            valor calculado, ainda fora da
 *                                                 cadeia de aprovação
 *   2 · Em aprovação     ← `revisando`, `aprovado_gestor`
 *                                                 aguardando alguém APROVAR
 *   3 · Aprovado         ← `aprovado_rh`          aprovado por gestor e RH;
 *                                                 aguardando o financeiro
 *   4 · Enviado à folha  ← `aprovado_financeiro`  aprovado pelo financeiro: é o
 *                                                 estágio de conciliação
 *   5 · Conciliado       ← `pago`                 conciliado e efetivado
 *
 * `rejeitado` e `divergente_em_revisao` NÃO entram nas cinco etapas: exigem
 * ANÁLISE (rejeitado) ou resolução de divergência, então ficam "fora do fluxo" —
 * visíveis no filtro de etapa, no KPI de divergências e na faixa de "Pagamentos
 * rejeitados". Nenhum registro some da tela e nenhum estado é renomeado no banco.
 *
 * `ROTULO_STATUS_PAGAMENTO` continua sendo o rótulo humano de cada estado e é
 * exibido como SUB-RÓTULO dentro da etapa, de modo que a nomenclatura antiga
 * ("Aguardando gestor", "Aguardando RH", "Em conciliação") não se perde.
 * ============================================================================
 */
import {
  normalizar,
  numero,
  ROTULO_STATUS_PAGAMENTO,
  STATUS_PAGAMENTO_PENDENTE,
  type PagamentoHub,
} from './premiacoesComum';
import { parseDateSafe } from '@/utils/format';

/* ─── Etapas do fluxo (IMAGEM 4) ───────────────────────────────────────────── */

export type EtapaFluxoPagamento = 'calculado' | 'em_aprovacao' | 'aprovado' | 'enviado_folha' | 'conciliado';

/** Etapa "virtual" para o que exige auditoria/conciliação (ver cabeçalho). */
export const ETAPA_FORA_DO_FLUXO = 'fora' as const;
/**
 * Filtro "todos os pendentes de aprovação" — agrupa `STATUS_PAGAMENTO_PENDENTE`
 * (calculado → revisando → aprovado_gestor → aprovado_rh). Existe porque a
 * pendência mais comum ("N pagamentos aguardando aprovação") ATRAVESSA etapas do
 * fluxo: sem ele o clique levaria a um recorte menor do que o número anunciado.
 */
export const ETAPA_PENDENTES = 'pendentes' as const;
export type FiltroEtapaFluxo = 'todas' | EtapaFluxoPagamento | typeof ETAPA_FORA_DO_FLUXO | typeof ETAPA_PENDENTES;

export interface DefinicaoEtapa {
  valor: EtapaFluxoPagamento;
  numero: number;
  label: string;
  /** Status REAIS que compõem a etapa (cada um pertence a exatamente uma). */
  status: readonly string[];
  /** Círculo numerado quando a etapa NÃO é a ativa: contorno + número na cor dela. */
  circulo: string;
  /** Círculo da etapa ATIVA: preenchido com a cor da etapa. */
  circuloAtivo: string;
  /** Badge do contador quando a etapa não é a ativa. */
  contador: string;
  /** Badge do contador da etapa ativa (tinta da etapa). */
  contadorAtivo: string;
}

/**
 * Tons das etapas na barra horizontal. Cada etapa tem a cor do seu SIGNIFICADO
 * (lima = cálculo · azul-ciano = aprovação em curso · verde = aprovado/conciliado
 * · roxo = enviado à folha) e o ESTADO modula a intensidade — etapa selecionada
 * ganha o círculo preenchido da própria cor e os contadores ficam sempre com o
 * fundo translúcido + texto na cor da etapa. Nada é marcado como concluído só
 * por estar à esquerda: quem diz o estado é o contador real de cada etapa.
 */
export const ETAPAS_FLUXO: readonly DefinicaoEtapa[] = [
  {
    valor: 'calculado',
    numero: 1,
    label: 'Calculado',
    status: ['calculado'],
    circulo: 'border-primary/60 text-primary',
    circuloAtivo: 'border-primary bg-primary text-primary-foreground',
    contador: 'bg-primary/15 text-primary',
    contadorAtivo: 'bg-primary/25 text-primary',
  },
  {
    valor: 'em_aprovacao',
    numero: 2,
    label: 'Em aprovação',
    status: ['revisando', 'aprovado_gestor'],
    circulo: 'border-info/60 text-info',
    circuloAtivo: 'border-info bg-info text-background',
    contador: 'bg-info/15 text-info',
    contadorAtivo: 'bg-info/25 text-info',
  },
  {
    valor: 'aprovado',
    numero: 3,
    label: 'Aprovado',
    status: ['aprovado_rh'],
    circulo: 'border-success/50 text-success',
    circuloAtivo: 'border-success bg-success/85 text-background',
    contador: 'bg-success/15 text-success',
    contadorAtivo: 'bg-success/25 text-success',
  },
  {
    valor: 'enviado_folha',
    numero: 4,
    label: 'Enviado à folha',
    status: ['aprovado_financeiro'],
    circulo: 'border-xp/60 text-xp',
    circuloAtivo: 'border-xp bg-xp text-xp-foreground',
    contador: 'bg-xp/15 text-xp',
    contadorAtivo: 'bg-xp/25 text-xp',
  },
  {
    valor: 'conciliado',
    numero: 5,
    label: 'Conciliado',
    status: ['pago'],
    circulo: 'border-success text-success',
    circuloAtivo: 'border-success bg-success text-success-foreground',
    contador: 'bg-success/15 text-success',
    contadorAtivo: 'bg-success/25 text-success',
  },
] as const;

/** Status que existem no banco mas NÃO percorrem as cinco etapas. */
export const STATUS_FORA_DO_FLUXO = ['rejeitado', 'divergente_em_revisao'] as const;

/** Etapa de um pagamento — `null` quando ele está fora do fluxo. */
export function etapaDoPagamento(status: string | null | undefined): EtapaFluxoPagamento | null {
  if (!status) return null;
  return ETAPAS_FLUXO.find((e) => e.status.includes(status))?.valor ?? null;
}

/** Rótulo humano do status (mesma tabela do restante do hub). */
export function rotuloStatusPagamento(status: string | null | undefined): string {
  if (!status) return '—';
  return ROTULO_STATUS_PAGAMENTO[status] ?? status;
}

export interface EtapasContadas {
  /** Quantidade por etapa (sempre as cinco chaves). */
  porEtapa: Record<EtapaFluxoPagamento, number>;
  /** Valor por etapa (soma de `valorDoPagamento`). */
  valorPorEtapa: Record<EtapaFluxoPagamento, number>;
  foraDoFluxo: number;
  total: number;
}

/**
 * Quantidade/valor em cada etapa. O `total` inclui o que está fora do fluxo (a
 * soma das cinco etapas + `foraDoFluxo` é sempre igual a `total`).
 */
export function contarEtapasPagamento(pagamentos: PagamentoHub[]): EtapasContadas {
  const porEtapa = { calculado: 0, em_aprovacao: 0, aprovado: 0, enviado_folha: 0, conciliado: 0 };
  const valorPorEtapa = { calculado: 0, em_aprovacao: 0, aprovado: 0, enviado_folha: 0, conciliado: 0 };
  let foraDoFluxo = 0;

  for (const p of pagamentos) {
    const etapa = etapaDoPagamento(p.status);
    if (!etapa) {
      foraDoFluxo += 1;
      continue;
    }
    porEtapa[etapa] += 1;
    valorPorEtapa[etapa] += valorDoPagamento(p);
  }

  return { porEtapa, valorPorEtapa, foraDoFluxo, total: pagamentos.length };
}

/**
 * Etapa em que o processo está AGORA: a PRIMEIRA etapa, na ordem do fluxo, que
 * ainda tem pagamentos aguardando algo (tudo menos `pago`). É leitura do estado
 * real — nenhum estado novo é criado — e é o que dá o destaque visual da
 * referência (a etapa atual preenchida). Quando nada está em andamento, a ÚLTIMA
 * etapa com pagamentos assume o destaque; sem pagamentos, nenhuma destaca.
 */
export function etapaAtual(etapas: EtapasContadas): EtapaFluxoPagamento | null {
  const emAndamento = ETAPAS_FLUXO.filter((e) => e.valor !== 'conciliado' && etapas.porEtapa[e.valor] > 0);
  if (emAndamento.length > 0) return emAndamento[0].valor;
  const comPagamentos = ETAPAS_FLUXO.filter((e) => etapas.porEtapa[e.valor] > 0);
  return comPagamentos.length > 0 ? comPagamentos[comPagamentos.length - 1].valor : null;
}

/* ─── Valor do pagamento (regra única, usada por todos os números da tela) ─── */

/**
 * Valor "em dinheiro" de um pagamento: o liquidado (`valor_folha_real`, quando
 * já conciliado), senão o aprovado, senão o calculado — a MESMA precedência que
 * a tabela de auditoria já usava (`valor_aprovado || valor_calculado`), apenas
 * estendida ao valor real da folha quando ele existe.
 */
export function valorDoPagamento(p: PagamentoHub): number {
  return numero(p.valor_folha_real) || numero(p.valor_aprovado) || numero(p.valor_calculado);
}

/** Diferença absoluta entre folha real e valor aprovado (0 quando não diverge). */
export function divergenciaDoPagamento(p: PagamentoHub): number {
  if (p.status_conciliacao !== 'divergente') return 0;
  const aprovado = numero(p.valor_aprovado) || numero(p.valor_calculado);
  return Math.abs(numero(p.valor_folha_real) - aprovado);
}

/* ─── Os quatro indicadores financeiros (IMAGEM 4) ─────────────────────────── */

export interface IndicadorPagamento {
  valor: number;
  quantidade: number;
}

export interface KpisPagamentos {
  /** Soma de `valor_aprovado` dos pagamentos que têm valor aprovado. */
  aprovado: IndicadorPagamento;
  /** Pendentes de aprovação (`STATUS_PAGAMENTO_PENDENTE`) — soma do calculado. */
  aguardando: IndicadorPagamento;
  /** Conciliações divergentes — soma da DIFERENÇA entre folha real e aprovado. */
  divergencias: IndicadorPagamento;
  /** Já pagos — soma do valor liquidado. */
  pago: IndicadorPagamento;
  /** Pagamentos do conjunto analisado (rodapé dos cartões). */
  total: number;
}

export function montarKpisPagamentos(pagamentos: PagamentoHub[]): KpisPagamentos {
  const comAprovado = pagamentos.filter((p) => numero(p.valor_aprovado) > 0);
  const pendentes = pagamentos.filter((p) =>
    (STATUS_PAGAMENTO_PENDENTE as readonly string[]).includes(p.status),
  );
  const divergentes = pagamentos.filter((p) => p.status_conciliacao === 'divergente');
  const pagos = pagamentos.filter((p) => p.status === 'pago');

  return {
    aprovado: {
      valor: comAprovado.reduce((acc, p) => acc + numero(p.valor_aprovado), 0),
      quantidade: comAprovado.length,
    },
    aguardando: {
      valor: pendentes.reduce((acc, p) => acc + numero(p.valor_calculado), 0),
      quantidade: pendentes.length,
    },
    divergencias: {
      valor: divergentes.reduce((acc, p) => acc + divergenciaDoPagamento(p), 0),
      quantidade: divergentes.length,
    },
    pago: {
      valor: pagos.reduce((acc, p) => acc + valorDoPagamento(p), 0),
      quantidade: pagos.length,
    },
    total: pagamentos.length,
  };
}

/* ─── Resumo financeiro (lateral, IMAGEM 4) ───────────────────────────────── */

export interface SegmentoResumo {
  label: string;
  value: number;
  color: string;
}

export interface ResumoFinanceiro {
  total: number;
  segmentos: SegmentoResumo[];
}

/**
 * Composição do dinheiro na tela — para o donut da lateral.
 *
 * ── EXCLUSIVIDADE (correção de dupla contagem) ──────────────────────────────
 * Cada pagamento entra em UM ÚNICO segmento, pelo seu estado atual:
 *   Pendentes    → quem ainda aguarda aprovação (`STATUS_PAGAMENTO_PENDENTE`),
 *                  pelo valor calculado;
 *   Aprovados    → `aprovado_financeiro` (aprovado por todas as alçadas, aguardando
 *                  conciliação com a folha), pelo valor do pagamento;
 *   Pagos        → `pago` (liquidado);
 *   Divergências → conciliação divergente, pelo valor da DIFERENÇA.
 * Antes, um pagamento JÁ PAGO entrava em "Aprovados" E em "Pagos", inflando o
 * total; com o recorte por estado + a exclusão explícita dos divergentes, a soma
 * dos segmentos é sempre igual ao total exibido no centro da rosca. Rejeitados
 * ficam de fora (não há dinheiro em jogo).
 *
 * Os quatro INDICADORES do topo mantêm a definição própria (são cartões de
 * acompanhamento, não um gráfico de composição) — por isso "Aprovados" aqui é o
 * que aguarda conciliação, e não o "Total Aprovado" do cartão.
 *
 * As cores vêm dos tokens do tema (`hsl(var(--...))`), como o resto dos gráficos.
 */
export function montarResumoFinanceiro(pagamentos: PagamentoHub[]): ResumoFinanceiro {
  const divergentes = pagamentos.filter((p) => p.status_conciliacao === 'divergente');
  const idsDivergentes = new Set(divergentes.map((p) => p.id));
  const demais = pagamentos.filter((p) => !idsDivergentes.has(p.id));

  const pendentes = demais.filter((p) =>
    (STATUS_PAGAMENTO_PENDENTE as readonly string[]).includes(p.status),
  );
  const aprovados = demais.filter((p) => p.status === 'aprovado_financeiro');
  const pagos = demais.filter((p) => p.status === 'pago');

  const segmentos: SegmentoResumo[] = [
    {
      label: 'Aprovados',
      value: aprovados.reduce((acc, p) => acc + valorDoPagamento(p), 0),
      color: 'hsl(var(--success))',
    },
    {
      label: 'Pendentes',
      value: pendentes.reduce((acc, p) => acc + numero(p.valor_calculado), 0),
      color: 'hsl(var(--warning))',
    },
    {
      label: 'Pagos',
      value: pagos.reduce((acc, p) => acc + valorDoPagamento(p), 0),
      color: 'hsl(var(--info))',
    },
    {
      label: 'Divergências',
      value: divergentes.reduce((acc, p) => acc + divergenciaDoPagamento(p), 0),
      color: 'hsl(var(--destructive))',
    },
  ];

  return {
    total: segmentos.reduce((acc, s) => acc + s.value, 0),
    // Segmento zerado não vira fatia/legenda vazia no gráfico.
    segmentos: segmentos.filter((s) => s.value > 0),
  };
}

/* ─── Próximas ações (lateral, IMAGEM 4) ──────────────────────────────────── */

export interface AcaoPagamento {
  id: string;
  titulo: string;
  detalhe: string;
  /** Filtro de etapa para onde a ação leva (aplica o recorte da tabela). */
  destino: Exclude<FiltroEtapaFluxo, 'todas'>;
  valor: number;
  quantidade: number;
  /** Ordem de prioridade na lista (1 = mais urgente). */
  prioridade: number;
}

/**
 * Pendências REAIS derivadas do próprio conjunto de pagamentos: quanto espera
 * aprovação, o que está aprovado e aguardando envio à folha e quantas
 * divergências de conciliação existem. Nenhuma tarefa é inventada — cada item só
 * aparece se existir pelo menos um pagamento no estado correspondente.
 */
export function montarAcoesPagamentos(pagamentos: PagamentoHub[]): AcaoPagamento[] {
  const acoes: AcaoPagamento[] = [];
  const kpis = montarKpisPagamentos(pagamentos);
  const etapas = contarEtapasPagamento(pagamentos);

  if (kpis.aguardando.quantidade > 0) {
    acoes.push({
      id: 'aguardando-aprovacao',
      titulo: `${kpis.aguardando.quantidade} pagamento${kpis.aguardando.quantidade === 1 ? '' : 's'} aguardando aprovação`,
      detalhe: 'Revisão, gestor, RH ou financeiro — cada um avança uma etapa.',
      // A pendência atravessa etapas (calculado → revisando → gestor → RH): o
      // destino é o filtro "pendentes", o MESMO recorte do título e do valor.
      destino: ETAPA_PENDENTES,
      valor: kpis.aguardando.valor,
      quantidade: kpis.aguardando.quantidade,
      prioridade: 1,
    });
  }

  if (kpis.divergencias.quantidade > 0) {
    acoes.push({
      id: 'divergencias',
      titulo: `${kpis.divergencias.quantidade} divergência${kpis.divergencias.quantidade === 1 ? '' : 's'} na conciliação`,
      detalhe: 'Ajuste manual ou automático do valor real da folha.',
      destino: 'enviado_folha',
      valor: kpis.divergencias.valor,
      quantidade: kpis.divergencias.quantidade,
      prioridade: 2,
    });
  }

  if (etapas.porEtapa.enviado_folha > 0) {
    acoes.push({
      id: 'enviados-folha',
      titulo: `${etapas.porEtapa.enviado_folha} aprovado${etapas.porEtapa.enviado_folha === 1 ? '' : 's'} aguardando conciliação`,
      detalhe: 'Já aprovados pelo financeiro; falta conciliar com a folha.',
      destino: 'enviado_folha',
      valor: etapas.valorPorEtapa.enviado_folha,
      quantidade: etapas.porEtapa.enviado_folha,
      prioridade: 3,
    });
  }

  return acoes.sort((a, b) => a.prioridade - b.prioridade);
}

/* ─── Filtros, ordenação e paginação da tabela ────────────────────────────── */

export type OrdenacaoPagamento = 'recentes' | 'antigos' | 'valor_desc' | 'valor_asc' | 'colaborador' | 'campanha';

export const ORDENACAO_PAGAMENTO_ROTULOS: { valor: OrdenacaoPagamento; label: string }[] = [
  { valor: 'recentes', label: 'Mais recentes' },
  { valor: 'antigos', label: 'Mais antigos' },
  { valor: 'valor_desc', label: 'Maior valor' },
  { valor: 'valor_asc', label: 'Menor valor' },
  { valor: 'colaborador', label: 'Colaborador (A–Z)' },
  { valor: 'campanha', label: 'Campanha (A–Z)' },
];

export interface FiltrosPagamento {
  busca: string;
  etapa: FiltroEtapaFluxo;
  /** Nome da campanha ou 'todas' (nunca id: o embed do pagamento traz o nome). */
  campanha: string;
  /** Status real do banco ou 'todos'. */
  status: string;
  /** Chave 'AAAA-MM' do período, ou 'todos'. */
  periodo: string;
  ordenacao: OrdenacaoPagamento;
}

export const FILTROS_PAGAMENTO_INICIAIS: FiltrosPagamento = {
  busca: '',
  etapa: 'todas',
  campanha: 'todas',
  status: 'todos',
  periodo: 'todos',
  ordenacao: 'recentes',
};

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Data que define o período/ordenação: a do pagamento, senão a de criação. */
export function dataDePagamento(p: PagamentoHub): Date | null {
  // `parseDateSafe` trata 'YYYY-MM-DD' como data LOCAL — sem ele o período do
  // pagamento cairia no mês anterior em fusos negativos (UTC-3).
  return parseDateSafe(p.data_pagamento || p.created_at || p.updated_at);
}

/** Chave 'AAAA-MM' (fuso local) ou null quando não há data utilizável. */
function chaveMes(p: PagamentoHub): string | null {
  const d = dataDePagamento(p);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 'Jun/2026' — rótulo curto do mês (nunca inventa mês: vem da data real). */
export function rotuloPeriodo(chave: string): string {
  const [ano, mes] = chave.split('-');
  const indice = Number(mes) - 1;
  if (!ano || Number.isNaN(indice) || !MESES_CURTOS[indice]) return chave;
  return `${MESES_CURTOS[indice]}/${ano}`;
}

/** Períodos REAIS presentes nos pagamentos, do mais novo para o mais antigo. */
export function opcoesPeriodo(pagamentos: PagamentoHub[]): { valor: string; label: string }[] {
  const chaves = Array.from(new Set(pagamentos.map(chaveMes).filter((v): v is string => !!v)));
  return chaves.sort((a, b) => b.localeCompare(a)).map((valor) => ({ valor, label: rotuloPeriodo(valor) }));
}

/** Campanhas presentes nos pagamentos (nome, como vem do embed). */
export function opcoesCampanha(pagamentos: PagamentoHub[]): string[] {
  const nomes = pagamentos.map((p) => p.campanha?.nome).filter((n): n is string => !!n && n.trim().length > 0);
  return Array.from(new Set(nomes)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

/** Status reais presentes, com o rótulo humano do hub. */
export function opcoesStatus(pagamentos: PagamentoHub[]): { valor: string; label: string }[] {
  const ordem = [
    'calculado',
    'revisando',
    'aprovado_gestor',
    'aprovado_rh',
    'aprovado_financeiro',
    'pago',
    'divergente_em_revisao',
    'rejeitado',
  ];
  const valores = Array.from(new Set(pagamentos.map((p) => p.status).filter(Boolean)));
  return valores
    .sort((a, b) => ordem.indexOf(a) - ordem.indexOf(b))
    .map((valor) => ({ valor, label: rotuloStatusPagamento(valor) }));
}

function casaBusca(p: PagamentoHub, termo: string): boolean {
  if (!termo) return true;
  const alvo = normalizar(
    [p.colaborador?.nome_completo, p.campanha?.nome, p.observacoes, rotuloStatusPagamento(p.status)]
      .filter(Boolean)
      .join(' '),
  );
  return alvo.includes(termo);
}

/** Aplica busca, etapa, campanha, status e período — e devolve na ordem pedida. */
export function filtrarEOrdenarPagamentos(
  pagamentos: PagamentoHub[],
  filtros: FiltrosPagamento,
): PagamentoHub[] {
  const termo = normalizar(filtros.busca);

  const filtrados = pagamentos.filter((p) => {
    if (!casaBusca(p, termo)) return false;
    if (filtros.campanha !== 'todas' && p.campanha?.nome !== filtros.campanha) return false;
    if (filtros.status !== 'todos' && p.status !== filtros.status) return false;
    if (filtros.periodo !== 'todos' && chaveMes(p) !== filtros.periodo) return false;
    if (filtros.etapa !== 'todas') {
      if (filtros.etapa === ETAPA_PENDENTES) {
        if (!(STATUS_PAGAMENTO_PENDENTE as readonly string[]).includes(p.status)) return false;
      } else {
        const etapa = etapaDoPagamento(p.status);
        if (filtros.etapa === ETAPA_FORA_DO_FLUXO ? etapa !== null : etapa !== filtros.etapa) return false;
      }
    }
    return true;
  });

  const tempo = (p: PagamentoHub) => dataDePagamento(p)?.getTime() ?? 0;
  const nome = (p: PagamentoHub) => p.colaborador?.nome_completo ?? '';

  return filtrados.slice().sort((a, b) => {
    switch (filtros.ordenacao) {
      case 'antigos':
        return tempo(a) - tempo(b);
      case 'valor_desc':
        return valorDoPagamento(b) - valorDoPagamento(a);
      case 'valor_asc':
        return valorDoPagamento(a) - valorDoPagamento(b);
      case 'colaborador':
        return nome(a).localeCompare(nome(b), 'pt-BR');
      case 'campanha':
        return (a.campanha?.nome ?? '').localeCompare(b.campanha?.nome ?? '', 'pt-BR');
      case 'recentes':
      default:
        return tempo(b) - tempo(a);
    }
  });
}

/** Paginação LOCAL (a API não pagina) — nunca devolve página vazia/inexistente. */
export function paginarPagamentos(
  lista: PagamentoHub[],
  pagina: number,
  porPagina: number,
): { pagina: number; totalPaginas: number; linhas: PagamentoHub[] } {
  const tamanho = Math.max(1, porPagina);
  if (lista.length === 0) return { pagina: 1, totalPaginas: 1, linhas: [] };
  const totalPaginas = Math.max(1, Math.ceil(lista.length / tamanho));
  const atual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (atual - 1) * tamanho;
  return { pagina: atual, totalPaginas, linhas: lista.slice(inicio, inicio + tamanho) };
}

/* ─── Ações do fluxo (as MESMAS do quadro de aprovação anterior) ──────────── */

/**
 * Próximo passo da cadeia — espelho EXATO do `nextStageMap` que o quadro de
 * aprovação usava (calculado → revisando → aprovado_gestor → aprovado_rh →
 * aprovado_financeiro). Nos estados em que a ação não é "avançar" (conciliação,
 * reinício, já pago) devolve `null`.
 */
export function proximoStatusPagamento(status: string): string | null {
  const mapa: Record<string, string> = {
    calculado: 'revisando',
    revisando: 'aprovado_gestor',
    aprovado_gestor: 'aprovado_rh',
    aprovado_rh: 'aprovado_financeiro',
  };
  return mapa[status] ?? null;
}

/** Status para onde "Reiniciar fluxo" devolve um pagamento rejeitado. */
export const STATUS_REINICIO_PAGAMENTO = 'calculado';

/** Rejeição só faz sentido em pagamento que ainda não foi liquidado. */
export function podeRejeitarPagamento(status: string): boolean {
  return status !== 'rejeitado' && status !== 'pago';
}

/** Conciliação com a folha: estágio do financeiro e divergência em revisão. */
export function podeConciliarPagamento(status: string): boolean {
  return status === 'aprovado_financeiro' || status === 'divergente_em_revisao';
}

export type TipoAcaoPagamento = 'avancar' | 'conciliar' | 'detalhes' | 'reiniciar';

export interface AcaoPrincipalPagamento {
  tipo: TipoAcaoPagamento;
  label: string;
}

/**
 * Ação principal de cada linha. O RÓTULO diz o que o clique faz de verdade: por
 * estado o sistema só tem duas escritas possíveis (avançar um passo da cadeia
 * ou rejeitar) mais a conciliação com a folha; "Ver detalhes" é o único botão que
 * só abre a leitura — nunca um rótulo decorativo escondendo outra ação.
 */
export function acaoPrincipalPagamento(status: string): AcaoPrincipalPagamento {
  if (status === 'rejeitado') return { tipo: 'reiniciar', label: 'Reiniciar fluxo' };
  if (status === 'divergente_em_revisao') return { tipo: 'conciliar', label: 'Resolver' };
  if (podeConciliarPagamento(status)) return { tipo: 'conciliar', label: 'Conciliar' };
  if (status === 'pago') return { tipo: 'detalhes', label: 'Ver detalhes' };
  if (proximoStatusPagamento(status)) {
    return { tipo: 'avancar', label: status === 'calculado' ? 'Revisar' : 'Aprovar' };
  }
  return { tipo: 'detalhes', label: 'Ver detalhes' };
}

/* ─── Rótulos de apoio exibidos na tabela/lateral ─────────────────────────── */

/** Último comentário registrado no histórico de mudanças (o "porquê" do estado). */
export function ultimoComentario(p: PagamentoHub): string | null {
  const historico = Array.isArray(p.historico_mudancas) ? p.historico_mudancas : [];
  const ultimo = historico[historico.length - 1] as { comentario?: unknown } | undefined;
  return typeof ultimo?.comentario === 'string' && ultimo.comentario.trim() ? ultimo.comentario : null;
}

/** Quem registrou o último movimento (o histórico grava `user`). */
export function ultimoResponsavel(p: PagamentoHub): string | null {
  const historico = Array.isArray(p.historico_mudancas) ? p.historico_mudancas : [];
  const ultimo = historico[historico.length - 1] as { user?: unknown } | undefined;
  const user = typeof ultimo?.user === 'string' ? ultimo.user : '';
  if (!user || user === 'current_user') return null;
  return user;
}
