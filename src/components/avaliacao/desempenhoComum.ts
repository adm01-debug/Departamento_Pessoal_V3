/**
 * ============================================================================
 * GESTÃO DE DESEMPENHO — derivações compartilhadas.
 *
 * Ponto único dos cálculos que a área de Desempenho mostra na tela (progresso
 * de metas, contagem de concluídos/em andamento/atrasados, formatação de
 * período e cor semântica das barras). Nada aqui inventa dado: todas as
 * funções leem SOMENTE campos que já existem nas tabelas reais lidas por
 * `avaliacaoService` (`metas_okrs`, `feedbacks_360`, `ciclos_avaliacao`,
 * `pdi_plano_desenvolvimento`).
 *
 * O cálculo de progresso da meta reproduz a MESMA fórmula já usada na área
 * (`valor_atual / objetivo`), aceitando tanto `valor_objetivo` (nome usado
 * pelo mock visual e pelo formulário atual) quanto `meta_valor` (nome da
 * coluna real de `metas_okrs`), com fallback para a coluna `progresso`.
 * ============================================================================
 */

/** Contagem resumida de itens por situação (metas, PDIs...). */
export interface ContadoresItens {
  concluidas: number;
  emAndamento: number;
  atrasadas: number;
}

/** Status considerados "encerrado com sucesso" nas tabelas do módulo. */
const STATUS_CONCLUIDO = new Set(['concluido', 'concluida', 'concluída']);

/** Normaliza um status vindo do banco/mock para comparação. */
export function normalizarStatus(status: unknown): string {
  return String(status ?? '').trim().toLowerCase();
}

/** Trava um número no intervalo 0–100 (arredondado), ignorando NaN/Infinity. */
export function limitarPercentual(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.max(0, Math.min(100, Math.round(valor)));
}

/**
 * Progresso (%) de uma meta. Mesma regra da área: atual ÷ objetivo. Quando não
 * há objetivo válido, cai para a coluna `progresso` (0 se ausente).
 */
export function progressoMeta(meta: unknown): number {
  const m = (meta ?? {}) as Record<string, unknown>;
  const objetivo = Number(m.valor_objetivo ?? m.meta_valor ?? 0);
  const atual = Number(m.valor_atual ?? 0);
  if (Number.isFinite(objetivo) && objetivo > 0) {
    return limitarPercentual((atual / objetivo) * 100);
  }
  return limitarPercentual(Number(m.progresso ?? 0));
}

/** Média de progresso de um conjunto de metas (null quando não há metas). */
export function mediaProgresso(metas: unknown[]): number | null {
  if (!metas.length) return null;
  const soma = metas.reduce<number>((acc, meta) => acc + progressoMeta(meta), 0);
  return limitarPercentual(soma / metas.length);
}

/** Converte uma data (DATE/ISO) no fim do dia local, em ms. */
function fimDoDia(data: unknown): number | null {
  if (!data) return null;
  const texto = String(data);
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(texto) ? `${texto}T23:59:59` : texto;
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Item em atraso: tem prazo vencido e ainda não está concluído. */
export function estaAtrasado(item: unknown, agora: number = Date.now()): boolean {
  const i = (item ?? {}) as Record<string, unknown>;
  if (STATUS_CONCLUIDO.has(normalizarStatus(i.status))) return false;
  const limite = fimDoDia(i.data_limite ?? i.prazo);
  return limite !== null && limite < agora;
}

/**
 * Contagem de itens por situação. O atraso tem prioridade sobre "em andamento"
 * (um item vencido e não concluído conta uma única vez).
 */
export function contarItens(itens: unknown[], agora: number = Date.now()): ContadoresItens {
  let concluidas = 0;
  let emAndamento = 0;
  let atrasadas = 0;
  itens.forEach((item) => {
    if (estaAtrasado(item, agora)) {
      atrasadas += 1;
    } else if (STATUS_CONCLUIDO.has(normalizarStatus((item as Record<string, unknown>)?.status))) {
      concluidas += 1;
    } else {
      emAndamento += 1;
    }
  });
  return { concluidas, emAndamento, atrasadas };
}

/**
 * Formata o período de um ciclo exatamente como a área já exibia
 * (`new Date(valor).toLocaleDateString('pt-BR')`), preservando o comportamento
 * atual de fuso — nenhuma mudança de exibição.
 */
export function formatarPeriodo(inicio: unknown, fim: unknown): string {
  return `${formatarData(inicio)} - ${formatarData(fim)}`;
}

export function formatarData(data: unknown): string {
  if (!data) return '—';
  const ms = new Date(String(data)).getTime();
  if (!Number.isFinite(ms)) return '—';
  return new Date(String(data)).toLocaleDateString('pt-BR');
}

/**
 * Cor semântica da barra de progresso (verde sucesso → âmbar → vermelho).
 *
 * É a versão SÓLIDA da escala. Hoje nenhuma barra do módulo a consome — todas
 * passaram a usar o degradê de `gradienteProgresso` (o acabamento aprovado em
 * "Amplitude de Liderança"); a função permanece exportada porque segue sendo a
 * escala semântica do módulo para qualquer superfície que precise de cor cheia.
 */
export function corProgresso(percentual: number | null): string {
  if (percentual === null) return 'bg-muted-foreground/40';
  if (percentual >= 80) return 'bg-success';
  if (percentual >= 50) return 'bg-primary';
  if (percentual >= 30) return 'bg-warning';
  return 'bg-destructive-vivid';
}

/**
 * Degradê horizontal do preenchimento das barras (cor inicial mais profunda →
 * cor final mais luminosa), usando EXATAMENTE as classes aprovadas em
 * "Amplitude de Liderança" (DashboardExecutivoPage):
 *
 *   `bg-gradient-to-r from-success to-primary`   → verde → verde-lima
 *   `bg-gradient-to-r from-warning/60 to-warning` → âmbar profundo → âmbar
 *
 * As faixas intermediárias apenas repetem o mesmo acabamento (par
 * "cor/60 → cor") mantendo a cor semântica já usada por `corProgresso`, para
 * que a leitura verde → lime → âmbar → vermelho continue idêntica.
 */
const DEGRADE_ALTO = 'bg-gradient-to-r from-success to-primary';
const DEGRADE_MEDIO = 'bg-gradient-to-r from-primary/70 to-primary';
const DEGRADE_BAIXO = 'bg-gradient-to-r from-warning/60 to-warning';
const DEGRADE_CRITICO = 'bg-gradient-to-r from-destructive/60 to-destructive-vivid';

/**
 * Mesmo mapa semântico de `corProgresso`, porém em degradê. É o acabamento
 * usado por TODAS as barras horizontais de progresso de Gestão de Desempenho
 * (`CicloAtivoPanel`, `AnaliticosDesempenho`, `TodosCiclosTable` e a grade de
 * metas da página), sempre em conjunto com `BarraProgresso` — que aplica a
 * animação do card "Amplitude de Liderança".
 */
export function gradienteProgresso(percentual: number | null): string {
  if (percentual === null) return 'bg-muted-foreground/40';
  if (percentual >= 80) return DEGRADE_ALTO;
  if (percentual >= 50) return DEGRADE_MEDIO;
  if (percentual >= 30) return DEGRADE_BAIXO;
  return DEGRADE_CRITICO;
}

/** Cor semântica (texto) para o percentual exibido ao lado da barra. */
export function tintaProgresso(percentual: number | null): string {
  if (percentual === null) return 'text-muted-foreground';
  if (percentual >= 80) return 'text-success';
  if (percentual >= 50) return 'text-primary';
  if (percentual >= 30) return 'text-warning';
  return 'text-destructive-vivid';
}

/** Iniciais de um nome para o avatar circular (máx. 2 letras). */
export function iniciais(nome: unknown): string {
  const texto = String(nome ?? '').trim();
  if (!texto) return '—';
  const partes = texto.split(/\s+/).filter(Boolean);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}
