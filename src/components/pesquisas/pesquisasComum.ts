/**
 * ============================================================================
 * PESQUISAS DE CLIMA & eNPS — VOCABULÁRIO VISUAL E CÁLCULOS DO MÓDULO.
 *
 * Fonte ÚNICA de três coisas que a página e os cartões compartilham:
 *   1. a IDENTIDADE DE COR de cada tipo de pesquisa e de cada status;
 *   2. a FORMATAÇÃO de período/atualização em pt-BR ("01 de jul. de 2026");
 *   3. os CÁLCULOS (adesão, participação média, eNPS) e o filtro/ordenação da
 *      grade — todos derivados do que está na tela, nada decorativo.
 *
 * POR QUE UM MÓDULO (e não código solto na página): os três cartões (ativa,
 * encerrada, rascunho) e a faixa de indicadores leem os MESMOS rótulos e as
 * MESMAS tintas. Com a configuração num só lugar, nenhum cartão pode divergir
 * do outro — mesmo padrão de `premiacoesComum` e `chipFiltroComum`.
 *
 * CORES: só tokens do Design System (`--primary`, `--info`, `--success`,
 * `--warning`, `--chart-4`). Nenhuma tinta nova é criada aqui: a paleta é a
 * mesma do sistema e acompanha claro/escuro sozinha. O violeta do "Clima
 * Organizacional" usa `--chart-4` — mesmo precedente de `PALETAS_CHIP.violet`
 * no módulo de Desempenho (o Tailwind não compõe `/opacity` sobre um
 * `hsl(var(--token))` arbitrário, então a transparência vai DENTRO do `hsl()`).
 * ============================================================================
 */
import { format, startOfYear, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { LucideIcon } from 'lucide-react';
import { Gauge, HeartHandshake, SlidersHorizontal, Smile } from 'lucide-react';

/* ─── Modelo lido pela tela ─────────────────────────────────────────────────── */

/**
 * Formato MÍNIMO que os cartões/indicadores consomem. As linhas de `pesquisas`
 * (Supabase) e a vitrine (`src/mocks/pesquisasClimaMock.ts`) cabem nele; os
 * campos de métrica são opcionais porque são AGREGADOS, não colunas da tabela.
 */
export interface PesquisaListada {
  id: string;
  titulo: string;
  descricao?: string | null;
  tipo: string;
  status: string;
  anonima: boolean;
  data_inicio?: string | null;
  data_fim?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  /** Convidados/respondentes agregados (ver comentário no mock). */
  total_convidados?: number | null;
  total_respostas?: number | null;
  enps?: number | null;
}

/** Tipos de pesquisa do módulo (coluna `pesquisas.tipo`). */
export type TipoPesquisa = 'clima' | 'enps' | 'satisfacao' | 'custom';

/** Status da pesquisa (coluna `pesquisas.status`). */
export type StatusPesquisa = 'ativa' | 'encerrada' | 'rascunho';

/* ─── Tipos de pesquisa ─────────────────────────────────────────────────────── */

export interface TemaTipoPesquisa {
  rotulo: string;
  icone: LucideIcon;
  /** Ponto sólido da categoria (tag do tipo e filtros). */
  ponto: string;
  /** Tag do tipo: fundo/borda/texto tingidos no MESMO tom. */
  tag: string;
  /** Quadrado do ícone na faixa de indicadores. */
  caixa: string;
}

export const TEMAS_TIPO: Record<TipoPesquisa, TemaTipoPesquisa> = {
  clima: {
    rotulo: 'Clima Organizacional',
    icone: HeartHandshake,
    ponto: 'bg-[hsl(var(--chart-4))]',
    tag: 'border-[hsl(var(--chart-4)/0.30)] bg-[hsl(var(--chart-4)/0.12)] text-[hsl(var(--chart-4))]',
    caixa: 'bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))]',
  },
  enps: {
    rotulo: 'eNPS',
    icone: Gauge,
    ponto: 'bg-info',
    tag: 'border-info/30 bg-info/10 text-info',
    caixa: 'bg-info/15 text-info',
  },
  satisfacao: {
    rotulo: 'Satisfação',
    icone: Smile,
    ponto: 'bg-success',
    tag: 'border-success/30 bg-success/10 text-success',
    caixa: 'bg-success/15 text-success',
  },
  custom: {
    rotulo: 'Personalizada',
    icone: SlidersHorizontal,
    ponto: 'bg-warning',
    tag: 'border-warning/30 bg-warning/10 text-warning',
    caixa: 'bg-warning/15 text-warning',
  },
};

/** Tema do tipo — qualquer valor desconhecido cai em "Clima Organizacional". */
export function temaTipo(tipo: string): TemaTipoPesquisa {
  return TEMAS_TIPO[tipo as TipoPesquisa] ?? TEMAS_TIPO.clima;
}

/** Opções do filtro "Todos os tipos" (mesma ordem da referência). */
export const OPCOES_TIPO: Array<{ valor: TipoPesquisa | 'todos'; rotulo: string }> = [
  { valor: 'todos', rotulo: 'Todos os tipos' },
  { valor: 'clima', rotulo: TEMAS_TIPO.clima.rotulo },
  { valor: 'enps', rotulo: TEMAS_TIPO.enps.rotulo },
  { valor: 'satisfacao', rotulo: TEMAS_TIPO.satisfacao.rotulo },
  { valor: 'custom', rotulo: TEMAS_TIPO.custom.rotulo },
];

/* ─── Status ────────────────────────────────────────────────────────────────── */

export interface TemaStatusPesquisa {
  rotulo: string;
  /** Tag oval do cartão. */
  tag: string;
  ponto: string;
}

/**
 * TAG de status do cartão — três estados, três famílias de cor.
 *
 * `ativa` (verde `--success`) e `rascunho` (âmbar `--warning`) seguem como
 * estavam. `encerrada` deixou o cinza (`bg-muted`/`text-muted-foreground`, que
 * lia como "desabilitado") e passou a usar o AZUL do sistema (`--info`) — a
 * MESMA família do chip "Encerradas" da barra de abas (`PALETAS_CHIP.blue`,
 * `chipFiltroComum`). Fundo em tint de 10%, borda em 35% e texto na cor cheia
 * são o mesmo desenho de `ativa`/`rascunho`; a bolinha usa o azul sólido, para
 * acompanhar o texto.
 */
export const TEMAS_STATUS: Record<StatusPesquisa, TemaStatusPesquisa> = {
  ativa: {
    rotulo: 'Ativa',
    tag: 'border-success/35 bg-success/10 text-success',
    ponto: 'bg-success',
  },
  encerrada: {
    rotulo: 'Encerrada',
    tag: 'border-info/35 bg-info/10 text-info',
    ponto: 'bg-info',
  },
  rascunho: {
    rotulo: 'Rascunho',
    tag: 'border-warning/35 bg-warning/10 text-warning',
    ponto: 'bg-warning',
  },
};

export function temaStatus(status: string): TemaStatusPesquisa {
  return TEMAS_STATUS[status as StatusPesquisa] ?? TEMAS_STATUS.rascunho;
}

export const OPCOES_STATUS: Array<{ valor: StatusPesquisa | 'todos'; rotulo: string }> = [
  { valor: 'todos', rotulo: 'Todos os status' },
  { valor: 'ativa', rotulo: TEMAS_STATUS.ativa.rotulo },
  { valor: 'encerrada', rotulo: TEMAS_STATUS.encerrada.rotulo },
  { valor: 'rascunho', rotulo: TEMAS_STATUS.rascunho.rotulo },
];

/* ─── Datas em pt-BR ────────────────────────────────────────────────────────── */

const ISO_DIA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Aceita `date` puro ('2026-07-01', colunas `data_*`) e `timestamptz`
 * ('2026-07-10T12:00:00Z', `created_at`/`updated_at`). O `date` puro recebe
 * meio-dia LOCAL para não recuar um dia ao formatar em UTC-3.
 *
 * O ponto depois do mês entra LITERAL (`MMM'.'`): o locale `ptBR` do date-fns
 * devolve "jul" e a referência aprovada escreve "jul." — todos os meses
 * abreviados de pt-BR são curtos, então o ponto é sempre o mesmo.
 */
function formatarData(valor?: string | null): string | null {
  if (!valor) return null;
  const data = ISO_DIA.test(valor) ? new Date(`${valor}T12:00:00`) : new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return format(data, "dd 'de' MMM'.' 'de' yyyy", { locale: ptBR });
}

/** "01 de jul. de 2026 → 31 de jul. de 2026" · "Início não definido". */
export function formatarPeriodo(inicio?: string | null, fim?: string | null): string {
  const de = formatarData(inicio);
  const ate = formatarData(fim);
  if (de && ate) return `${de} → ${ate}`;
  if (de) return `A partir de ${de}`;
  if (ate) return `Até ${ate}`;
  return 'Início não definido';
}

/** "Atualizado em 10 de jul. de 2026". */
export function formatarAtualizacao(updatedAt?: string | null): string {
  const data = formatarData(updatedAt);
  return data ? `Atualizado em ${data}` : 'Sem atualização registrada';
}

/* ─── Adesão (barra de progresso) ───────────────────────────────────────────── */

export interface Adesao {
  respostas: number;
  convidados: number;
  /** 0–100, arredondado — nunca estoura as duas pontas. */
  percentual: number;
  /** `false` quando os agregados ainda não existem para a pesquisa. */
  disponivel: boolean;
}

/**
 * Adesão de UMA pesquisa.
 *
 * Os agregados vêm de `total_respostas`/`total_convidados` (ver o comentário em
 * `pesquisasClimaMock.ts`). Sem eles — caso de uma linha real de `pesquisas`,
 * que não guarda contagem — o cartão NÃO inventa percentual: devolve
 * `disponivel: false` e a página mostra o estado neutro de participação.
 */
export function adesaoDe(pesquisa: PesquisaListada): Adesao {
  const temAgregados =
    pesquisa.total_respostas !== null &&
    pesquisa.total_respostas !== undefined &&
    pesquisa.total_convidados !== null &&
    pesquisa.total_convidados !== undefined;

  const respostas = temAgregados ? Number(pesquisa.total_respostas) : Number.NaN;
  const convidados = temAgregados ? Number(pesquisa.total_convidados) : Number.NaN;
  const disponivel = Number.isFinite(respostas) && Number.isFinite(convidados) && convidados > 0;

  if (!disponivel) {
    return { respostas: 0, convidados: 0, percentual: 0, disponivel: false };
  }

  const percentual = Math.min(100, Math.max(0, Math.round((respostas / convidados) * 100)));
  return { respostas, convidados, percentual, disponivel: true };
}

/* ─── Indicadores ───────────────────────────────────────────────────────────── */

export interface MetricasPesquisas {
  total: number;
  ativas: number;
  encerradas: number;
  rascunhos: number;
  /** Média PONDERADA (respostas ÷ convidados de todas as pesquisas com adesão). */
  participacaoMedia: number | null;
  /** eNPS mais recente entre as pesquisas de eNPS. */
  enps: number | null;
}

/** Data de referência da pesquisa: fim do período, com recuo para criação. */
function dataDeReferencia(pesquisa: PesquisaListada): number {
  const bruto = pesquisa.data_fim ?? pesquisa.data_inicio ?? pesquisa.created_at ?? null;
  if (!bruto) return 0;
  const data = new Date(bruto);
  return Number.isNaN(data.getTime()) ? 0 : data.getTime();
}

export function calcularMetricas(pesquisas: PesquisaListada[]): MetricasPesquisas {
  let respostas = 0;
  let convidados = 0;

  for (const pesquisa of pesquisas) {
    const adesao = adesaoDe(pesquisa);
    if (!adesao.disponivel) continue;
    respostas += adesao.respostas;
    convidados += adesao.convidados;
  }

  const comEnps = pesquisas
    .filter((p) => p.tipo === 'enps' && p.enps !== null && p.enps !== undefined)
    .sort((a, b) => dataDeReferencia(b) - dataDeReferencia(a));

  return {
    total: pesquisas.length,
    ativas: pesquisas.filter((p) => p.status === 'ativa').length,
    encerradas: pesquisas.filter((p) => p.status === 'encerrada').length,
    rascunhos: pesquisas.filter((p) => p.status === 'rascunho').length,
    participacaoMedia: convidados > 0 ? Math.round((respostas / convidados) * 100) : null,
    enps: comEnps.length > 0 ? Number(comEnps[0].enps) : null,
  };
}

/**
 * VARIAÇÃO DOS INDICADORES — dados de VITRINE.
 *
 * A variação só existe com HISTÓRICO (snapshot do período anterior).
 * `public.pesquisas` guarda o estado ATUAL de cada pesquisa: não há série
 * temporal nem tabela de snapshots, então nada aqui pode ser calculado ainda.
 * Os valores ficam neste mapa (um lugar só) e são exibidos como na referência
 * aprovada; quando o backend passar a fechar período, troque por um cálculo
 * derivado e o resto da tela não muda.
 */
export const VARIACAO_INDICADORES = {
  total: '+25%',
  ativas: '+100%',
  participacao: '+12 p.p.',
  enps: '+10',
} as const;

/* ─── Filtro e ordenação da grade ───────────────────────────────────────────── */

export type AbaFiltro = 'todas' | StatusPesquisa;
export type PeriodoFiltro = 'qualquer' | '30d' | '90d' | 'ano';
export type Ordenacao = 'recentes' | 'antigas' | 'adesao' | 'titulo';

export const OPCOES_PERIODO: Array<{ valor: PeriodoFiltro; rotulo: string }> = [
  { valor: 'qualquer', rotulo: 'Qualquer período' },
  { valor: '30d', rotulo: 'Últimos 30 dias' },
  { valor: '90d', rotulo: 'Últimos 90 dias' },
  { valor: 'ano', rotulo: 'Este ano' },
];

export const OPCOES_ORDENACAO: Array<{ valor: Ordenacao; rotulo: string }> = [
  { valor: 'recentes', rotulo: 'Mais recentes' },
  { valor: 'antigas', rotulo: 'Mais antigas' },
  { valor: 'adesao', rotulo: 'Maior adesão' },
  { valor: 'titulo', rotulo: 'Título (A-Z)' },
];

export interface FiltrosPesquisas {
  aba: AbaFiltro;
  tipo: TipoPesquisa | 'todos';
  status: StatusPesquisa | 'todos';
  periodo: PeriodoFiltro;
  busca: string;
  ordenacao: Ordenacao;
}

/** Busca sem acento e sem caixa — "satisfacao" encontra "Satisfação". */
const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function inicioDaJanela(periodo: PeriodoFiltro, hoje: Date): Date | null {
  if (periodo === '30d') return subDays(hoje, 30);
  if (periodo === '90d') return subDays(hoje, 90);
  if (periodo === 'ano') return startOfYear(hoje);
  return null;
}

/**
 * Aplica aba de status, dropdowns, período e busca — e devolve a lista JÁ
 * ordenada. A aba manda no status; o dropdown "Todos os status" é um recorte
 * adicional, então os dois combinam (interseção), como o usuário espera de uma
 * barra de filtros.
 */
export function filtrarPesquisas(
  pesquisas: PesquisaListada[],
  filtros: FiltrosPesquisas,
  hoje: Date
): PesquisaListada[] {
  const inicio = inicioDaJanela(filtros.periodo, hoje);
  const termo = normalizar(filtros.busca.trim());

  const filtradas = pesquisas.filter((pesquisa) => {
    if (filtros.aba !== 'todas' && pesquisa.status !== filtros.aba) return false;
    if (filtros.tipo !== 'todos' && pesquisa.tipo !== filtros.tipo) return false;
    if (filtros.status !== 'todos' && pesquisa.status !== filtros.status) return false;

    if (inicio) {
      const referencia = dataDeReferencia(pesquisa);
      if (!referencia || referencia < inicio.getTime()) return false;
    }

    if (!termo) return true;
    return normalizar(`${pesquisa.titulo} ${pesquisa.descricao ?? ''}`).includes(termo);
  });

  return ordenarPesquisas(filtradas, filtros.ordenacao);
}

export function ordenarPesquisas(pesquisas: PesquisaListada[], ordenacao: Ordenacao): PesquisaListada[] {
  const lista = [...pesquisas];
  switch (ordenacao) {
    case 'antigas':
      return lista.sort((a, b) => dataDeReferencia(a) - dataDeReferencia(b));
    case 'adesao':
      return lista.sort((a, b) => adesaoDe(b).percentual - adesaoDe(a).percentual);
    case 'titulo':
      return lista.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
    case 'recentes':
    default:
      return lista.sort((a, b) => dataDeReferencia(b) - dataDeReferencia(a));
  }
}
