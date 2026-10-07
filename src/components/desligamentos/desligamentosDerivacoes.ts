/**
 * ============================================================================
 * Derivações PURAS da área de Desligamentos (mesma entrada → mesma saída).
 *
 * Mesmo princípio de `admissoes/admissoesDerivacoes.ts`: aqui só vive matemática
 * (dias, período, variação, série do gráfico e prazo da rescisão). Nada de
 * classe CSS, nada de token de cor e nada de JSX — assim as MESMAS funções
 * alimentam os KPIs, a faixa de atenção, o gráfico e a tabela sem que os números
 * possam divergir entre as peças da tela.
 * ============================================================================
 */
import { parseDateLocalISO, addDaysLocal } from '@/utils/dateLocal';
import { ETAPA_FLUXO, proximaAcaoDaEtapa } from './desligamentosComum';

/** Registro mínimo que as telas do módulo leem (desligamento real ou fictício). */
export type DesligamentoLike = {
  id?: string | number;
  data_desligamento?: string | null;
  data_aviso_previo?: string | null;
  tipo?: string | null;
  status?: string | null;
  etapa?: string | null;
  motivo?: string | null;
  valor_liquido?: number | null;
  created_at?: string | null;
  colaborador?: {
    nome_completo?: string | null;
    cargo?: string | null;
    departamento?: string | null;
  } | null;
};

export const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Prazo legal de pagamento da rescisão: até 10 dias após o término do contrato
 * (art. 477, §6º, CLT). É a régua do prazo/atraso exibido na coluna "Próxima
 * ação" e na faixa de atenção — um prazo REAL, não um número inventado.
 */
export const PRAZO_RESCISAO_DIAS = 10;

/* ─── Datas ───────────────────────────────────────────────────────────────── */

/** Converte uma data `YYYY-MM-DD`/ISO em `Date` LOCAL (evita o day-shift do UTC). */
export function dataValida(valor?: string | null): Date | undefined {
  if (!valor) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return parseDateLocalISO(valor);
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? undefined : data;
}

/** Início do dia (comparações por data, sem ruído de hora). */
export function inicioDoDia(referencia: Date): number {
  return new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate()).getTime();
}

/** Iniciais do colaborador (avatar textual). */
export function iniciais(nome?: string | null): string {
  if (!nome) return '—';
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return `${primeira}${ultima}`.toUpperCase() || '—';
}

/** Percentual inteiro seguro (divisão por zero → 0). */
export function percentual(parcial: number, total: number): number {
  return total > 0 ? Math.round((parcial / total) * 100) : 0;
}

/** Moeda BRL com duas casas (o padrão da coluna "Valor Líquido"). */
export function formatCurrencyBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

/**
 * Dias entre a data do desligamento e HOJE, por data (sem ruído de hora):
 * `> 0` ainda falta para acontecer, `0` é hoje, `< 0` já passou e `null` sem data.
 */
export function diasAteHoje(valor: string | null | undefined, hojeMs: number): number | null {
  const data = dataValida(valor);
  if (!data) return null;
  return Math.round((data.getTime() - hojeMs) / DIA_MS);
}

/**
 * Prazo-limite da rescisão: `data_desligamento + 10 dias` (art. 477 CLT).
 * `undefined` quando não há data de desligamento.
 */
export function prazoRescisao(d: DesligamentoLike): Date | undefined {
  const data = dataValida(d.data_desligamento);
  return data ? addDaysLocal(data, PRAZO_RESCISAO_DIAS) : undefined;
}

/* ─── Período e variação ──────────────────────────────────────────────────── */

/**
 * Recorte por período sobre `data_desligamento`. Registros sem a coluna são
 * mantidos (não há como recortá-los) — no payload real a coluna sempre existe.
 */
export function recortarPorPeriodo<T extends DesligamentoLike>(lista: T[], meses: number, agora: Date): T[] {
  if (!meses) return lista;
  const limite = new Date(agora.getFullYear(), agora.getMonth() - meses, agora.getDate()).getTime();
  return lista.filter((item) => {
    const data = dataValida(item.data_desligamento);
    return data ? data.getTime() >= limite : true;
  });
}

/**
 * Variação percentual dos últimos 30 dias contra os 30 anteriores
 * (`data_desligamento`). Sem base anterior não existe comparação honesta →
 * `undefined`, e o card mostra o texto de apoio em vez de um número inventado.
 */
export function variacaoRecente(
  lista: DesligamentoLike[],
  referenciaMs: number
): { value: number; label: string } | undefined {
  const fim = referenciaMs;
  const inicioAtual = fim - 30 * DIA_MS;
  const inicioAnterior = inicioAtual - 30 * DIA_MS;

  let atual = 0;
  let anterior = 0;
  lista.forEach((item) => {
    const data = dataValida(item.data_desligamento);
    if (!data) return;
    const t = data.getTime();
    if (t >= inicioAtual && t < fim) atual += 1;
    else if (t >= inicioAnterior && t < inicioAtual) anterior += 1;
  });

  if (anterior === 0) return undefined;
  return { value: Math.round(((atual - anterior) / anterior) * 100), label: 'vs. período anterior' };
}

/* ─── Status / etapas terminais ───────────────────────────────────────────── */

const STATUS_TERMINAIS = ['finalizado', 'concluido', 'cancelado'];

/** Processo ainda em aberto (não concluído nem cancelado). */
export function emAberto(d: DesligamentoLike): boolean {
  return !STATUS_TERMINAIS.includes(d.status ?? '');
}

export function concluido(d: DesligamentoLike): boolean {
  return d.status === 'finalizado' || d.status === 'concluido';
}

export function cancelado(d: DesligamentoLike): boolean {
  return d.status === 'cancelado';
}

export function pendente(d: DesligamentoLike): boolean {
  return d.status === 'pendente' || d.status === 'comunicado' || d.status === 'em_andamento';
}

/* ─── Próxima ação + prazo ────────────────────────────────────────────────── */

export type TomPrazo = 'destructive' | 'warning' | 'muted';

export interface ProximaAcao {
  /** Ação operacional derivada da etapa (ver `desligamentosComum`). */
  label: string;
  /** Cue de prazo relativo ("Hoje", "Amanhã", "Prazo: 26/09", "Atrasado há 5d"). */
  prazo: string | null;
  tom: TomPrazo;
}

/**
 * Deriva a "próxima ação" e o cue de prazo de um desligamento usando SOMENTE
 * dados reais: a ação vem da `etapa`; o prazo, da `data_desligamento + 10 dias`
 * (limite legal). Estados terminais não têm próxima ação.
 */
export function proximaAcaoDesligamento(d: DesligamentoLike, hojeMs: number): ProximaAcao {
  if (cancelado(d)) return { label: 'Processo cancelado', prazo: null, tom: 'muted' };
  if (concluido(d)) return { label: 'Processo concluído', prazo: null, tom: 'muted' };

  const label = proximaAcaoDaEtapa(d.etapa);
  const limite = prazoRescisao(d);
  if (!limite) return { label, prazo: null, tom: 'muted' };

  const dias = Math.round((limite.getTime() - hojeMs) / DIA_MS);

  if (dias < 0) {
    const abs = Math.abs(dias);
    return { label, prazo: `Atrasado há ${abs}${abs === 1 ? ' dia' : ' dias'}`, tom: 'destructive' };
  }
  if (dias === 0) return { label, prazo: 'Hoje', tom: 'warning' };
  if (dias === 1) return { label, prazo: 'Amanhã', tom: 'warning' };
  if (dias <= 7) return { label, prazo: `Em ${dias} dias`, tom: 'warning' };
  return {
    label,
    prazo: `Prazo: ${limite.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`,
    tom: 'muted',
  };
}

/* ─── Faixa de atenção ────────────────────────────────────────────────────── */

export interface ResumoAtencao {
  atrasados: number;
  pendentes: number;
  hoje: number;
  total: number;
}

/**
 * Resumo inteligente dos processos que precisam de atenção (não é um dado
 * novo — é a contagem da própria lista pelas mesmas réguas da coluna de prazo):
 *   • `atrasados` — em aberto e com o prazo legal (data + 10 dias) vencido;
 *   • `pendentes` — status pendente/comunicado/em_andamento;
 *   • `hoje` — prazo legal vencendo hoje.
 */
export function resumoAtencao(lista: DesligamentoLike[], hojeMs: number): ResumoAtencao {
  let atrasados = 0;
  let pendentes = 0;
  let hoje = 0;
  let total = 0;

  lista.forEach((d) => {
    if (concluido(d) || cancelado(d)) return;
    // `total` é a UNIÃO (processo distinto que dispara qualquer um dos três
    // critérios) — as subcontagens podem se sobrepor (um atrasado também é
    // pendente), então somar/pegar o máximo inflaria ou mentiria o número.
    let precisa = false;
    if (pendente(d)) {
      pendentes += 1;
      precisa = true;
    }
    const limite = prazoRescisao(d);
    if (limite) {
      const dias = Math.round((limite.getTime() - hojeMs) / DIA_MS);
      if (dias < 0) {
        atrasados += 1;
        precisa = true;
      } else if (dias === 0) {
        hoje += 1;
        precisa = true;
      }
    }
    if (precisa) total += 1;
  });

  return { atrasados, pendentes, hoje, total };
}

/* ─── Série do gráfico ────────────────────────────────────────────────────── */

export interface PontoSerieMensal {
  label: string;
  key: string;
  pedido: number;
  acordo: number;
  justa: number;
  termino: number;
  outros: number;
  total: number;
}

/**
 * Série mensal das últimas `meses` competências. Cada tipo de desligamento vira
 * uma série empilhada; tudo que não cai nas quatro categorias nomeadas entra em
 * "Outros" (o mesmo recorte semântico da legenda do gráfico).
 */
export function construirSerieMensal(lista: DesligamentoLike[], meses: number, agora: Date): PontoSerieMensal[] {
  const pontos: PontoSerieMensal[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    pontos.push({ label, key, pedido: 0, acordo: 0, justa: 0, termino: 0, outros: 0, total: 0 });
  }

  lista.forEach((item) => {
    const data = dataValida(item.data_desligamento);
    if (!data) return;
    const key = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    const ponto = pontos.find((p) => p.key === key);
    if (!ponto) return;
    switch (item.tipo) {
      case 'pedido_demissao':
        ponto.pedido += 1;
        break;
      case 'acordo_mutuo':
        ponto.acordo += 1;
        break;
      case 'com_justa_causa':
        ponto.justa += 1;
        break;
      case 'termino_contrato':
        ponto.termino += 1;
        break;
      default:
        ponto.outros += 1;
    }
    ponto.total += 1;
  });

  return pontos;
}

/** Índice da etapa no fluxo (para barras de progresso), `-1` se desconhecida. */
export function indiceEtapa(etapa?: string | null): number {
  return ETAPA_FLUXO.indexOf((etapa ?? '') as (typeof ETAPA_FLUXO)[number]);
}
