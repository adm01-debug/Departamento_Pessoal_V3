/**
 * ============================================================================
 * TURNOS & ESCALAS — RÉGUA DE DATAS DO CALENDÁRIO (puro, sem React).
 * ============================================================================
 *
 * Toda a noção de "período" da área vive aqui: a semana começa na SEGUNDA
 * (como a grade de referência — Seg … Dom), o mês é o mês do calendário, e o
 * período ANTERIOR é exatamente o bloco imediatamente antes com a MESMA
 * duração. É esse par (atual × anterior) que alimenta a variação dos KPI Cards
 * — sem série histórica inventada: a comparação é sempre período contra
 * período, nas mesmas datas reais.
 *
 * O formato de chave de data é o do banco (`escalas_trabalho.data`, coluna
 * `date`): `yyyy-MM-dd`. Nada de `Date` circulando pelo estado da tela — string
 * ISO local evita o clássico "um dia a menos" de fuso.
 *
 * Utilitários de data vêm de `date-fns` (já usado no Dashboard Executivo, mesmo
 * locale `ptBR`), então não há uma segunda biblioteca de datas no módulo.
 * ============================================================================
 */
import { addDays, addMonths, endOfMonth, format, startOfMonth, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Modo de período do calendário. `lista` compartilha a janela do mês. */
export type ModoPeriodo = 'semana' | 'mes';

/** Visualizações do painel (as três abas + o atalho "Hoje"). */
export type VisualizacaoTurnos = 'semana' | 'mes' | 'lista';

/**
 * A visualização decide a JANELA do período: Semana anda de 7 em 7 dias; Mês e
 * Lista andam de mês em mês (a Lista é a mesma janela do mês, só em tabela —
 * assim alternar entre elas não muda o conjunto de dados exibido).
 */
export function modoDaVisualizacao(visualizacao: VisualizacaoTurnos): ModoPeriodo {
  return visualizacao === 'semana' ? 'semana' : 'mes';
}

/** A grade de referência começa na segunda-feira (Seg … Dom). */
const SEMANA_COMECA_SEGUNDA = { weekStartsOn: 1 } as const;

/** Janela do período, já materializada em chaves de data. */
export interface IntervaloPeriodo {
  modo: ModoPeriodo;
  /** Primeira data do período (`yyyy-MM-dd`), inclusive. */
  inicio: string;
  /** Última data do período (`yyyy-MM-dd`), inclusive. */
  fim: string;
  /** Todas as datas do período, em ordem — 7 na semana, 28–31 no mês. */
  dias: string[];
}

/** `yyyy-MM-dd` no fuso LOCAL (não usa `toISOString`, que é UTC). */
export function chaveData(data: Date): string {
  return format(data, 'yyyy-MM-dd');
}

/**
 * `yyyy-MM-dd` → `Date` local à meia-noite.
 *
 * Aceita também timestamp completo (as colunas `created_at` vêm com hora):
 * só os 10 primeiros caracteres são considerados.
 */
export function dataDaChave(chave: string): Date {
  const [ano, mes, dia] = chave.slice(0, 10).split('-').map(Number);
  return new Date(ano, (mes || 1) - 1, dia || 1);
}

/** Período de uma âncora (qualquer data dentro dele). */
export function intervaloDoPeriodo(modo: ModoPeriodo, ancora: Date): IntervaloPeriodo {
  const inicioDate = modo === 'semana' ? startOfWeek(ancora, SEMANA_COMECA_SEGUNDA) : startOfMonth(ancora);
  const fimDate = modo === 'semana' ? addDays(inicioDate, 6) : endOfMonth(ancora);

  const dias: string[] = [];
  // Laço por contador (e não por comparação de Date): um período nunca tem mais
  // de 31 dias, então não há risco de laço longo nem de `Date` inválido.
  for (let i = 0; i < 31; i += 1) {
    const dia = addDays(inicioDate, i);
    if (dia > fimDate) break;
    dias.push(chaveData(dia));
  }

  return { modo, inicio: chaveData(inicioDate), fim: chaveData(fimDate), dias };
}

/** Anda `passo` períodos (‑1 = anterior, +1 = próximo) na âncora. */
export function deslocarAncora(modo: ModoPeriodo, ancora: Date, passo: number): Date {
  return modo === 'semana' ? addDays(ancora, 7 * passo) : addMonths(ancora, passo);
}

/**
 * Bloco imediatamente anterior com a MESMA duração — a base da variação dos
 * KPI Cards (`escalas neste período` × `escalas no período anterior`).
 */
export function periodoAnterior(modo: ModoPeriodo, ancora: Date): IntervaloPeriodo {
  return intervaloDoPeriodo(modo, deslocarAncora(modo, ancora, -1));
}

/** Primeira letra maiúscula (os nomes de mês/dia do `ptBR` vêm minúsculos). */
function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Rótulo do intervalo exibido no cabeçalho.
 *
 *   semana no mesmo mês      → "05 – 11 de outubro de 2026"
 *   semana virando o mês     → "28 de setembro – 04 de outubro de 2026"
 *   mês                      → "Outubro de 2026"
 */
export function rotuloDoPeriodo({ modo, inicio, fim }: IntervaloPeriodo): string {
  const inicioDate = dataDaChave(inicio);
  const fimDate = dataDaChave(fim);
  const mesInicio = format(inicioDate, 'MMMM', { locale: ptBR });
  const mesFim = format(fimDate, 'MMMM', { locale: ptBR });
  const anoFim = format(fimDate, 'yyyy');

  if (modo === 'mes') return capitalizar(`${mesInicio} de ${anoFim}`);

  const diaInicio = format(inicioDate, 'dd');
  const diaFim = format(fimDate, 'dd');
  if (mesInicio === mesFim) return `${diaInicio} – ${diaFim} de ${mesInicio} de ${anoFim}`;
  return `${diaInicio} de ${mesInicio} – ${diaFim} de ${mesFim} de ${anoFim}`;
}

/** "Seg", "Ter"… — cabeçalho das colunas do calendário semanal. */
export function rotuloDiaSemana(chave: string): string {
  // O `ptBR` do date-fns devolve o nome COMPLETO ("segunda-feira"), não a
  // abreviação — por isso os três primeiros caracteres, e não `EEE`. Assim o
  // rótulo é o mesmo em qualquer versão do locale.
  const nome = format(dataDaChave(chave), 'EEEE', { locale: ptBR });
  return capitalizar(nome.slice(0, 3));
}

/** "Segunda-feira" — mesmo rótulo em forma longa (aria-label/tooltip). */
export function rotuloDiaSemanaCompleto(chave: string): string {
  return capitalizar(format(dataDaChave(chave), 'EEEE', { locale: ptBR }));
}

/** "05/10" — data curta sob o dia da semana. */
export function rotuloDiaMes(chave: string): string {
  return format(dataDaChave(chave), 'dd/MM');
}

/** "05/10/2026" — data completa para as listas e diálogos. */
export function rotuloDataCompleta(chave: string): string {
  return format(dataDaChave(chave), 'dd/MM/yyyy');
}

/** `true` quando a chave é a data de hoje (destaque sutil da coluna/linha). */
export function ehHoje(chave: string, referencia: Date = new Date()): boolean {
  return chave.slice(0, 10) === chaveData(referencia);
}

/**
 * Rótulo de proximidade das "Próximas escalas": `Hoje`, `Amanhã` ou o dia da
 * semana em forma curta ("Sex") — sempre acompanhado da data na tela.
 */
export function rotuloProximidade(chave: string, referencia: Date = new Date()): string {
  const hoje = chaveData(referencia);
  const amanha = chaveData(addDays(referencia, 1));
  const alvo = chave.slice(0, 10);
  if (alvo === hoje) return 'Hoje';
  if (alvo === amanha) return 'Amanhã';
  return rotuloDiaSemana(alvo);
}

/** `true` quando a chave está dentro do intervalo fechado [inicio, fim]. */
export function dentroDoIntervalo(chave: string, inicio: string, fim: string): boolean {
  const alvo = chave.slice(0, 10);
  return alvo >= inicio && alvo <= fim;
}

/** Recorrência aceita na criação de escala (a mesma do formulário). */
export type RecorrenciaEscala = 'unica' | 'diaria' | 'semanal';

/** Teto de ocorrências de uma recorrência — evita gerar meses de escala. */
export const MAX_OCORRENCIAS_ESCALA = 30;

/**
 * Datas geradas por uma recorrência, a partir da data escolhida:
 *
 *   unica   → [data]
 *   diaria  → data, data+1, data+2 … (N dias)
 *   semanal → data, data+7, data+14 … (N semanas)
 *
 * `ocorrencias` é limitado a [1, MAX_OCORRENCIAS_ESCALA]; data inválida devolve
 * lista vazia (o formulário trata como "nada a salvar").
 */
export function gerarDatasRecorrentes(data: string, recorrencia: RecorrenciaEscala, ocorrencias: number): string[] {
  const base = data.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return [];
  if (recorrencia === 'unica') return [base];

  const total = Math.min(Math.max(Math.round(ocorrencias) || 1, 1), MAX_OCORRENCIAS_ESCALA);
  const passoDias = recorrencia === 'semanal' ? 7 : 1;
  const referencia = dataDaChave(base);
  const datas: string[] = [];
  for (let indice = 0; indice < total; indice += 1) {
    datas.push(chaveData(addDays(referencia, indice * passoDias)));
  }
  return datas;
}
