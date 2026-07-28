/**
 * Parsing defensivo de valores `interval` do PostgreSQL para horas decimais.
 *
 * O PostgREST serializa colunas `interval` no formato textual do Postgres, que
 * NÃO é um número simples. Os formatos possíveis incluem:
 *
 *   "08:00:00"              → 8h
 *   "01:30:00"              → 1.5h
 *   "1 day 02:00:00"        → 26h
 *   "2 days"                → 48h
 *   "-1 day -02:00:00"      → -26h
 *   "00:00:30.5"            → 0.008333…h (segundos fracionários)
 *   "1 mon 3 days"          → meses são normalizados como 30 dias (convenção PG)
 *
 * Qualquer valor não interpretável retorna 0 — nunca `NaN` — para que somatórios
 * de saldo jamais sejam contaminados por um único registro corrompido.
 */

/** Convenção do PostgreSQL em `justify_hours`: 1 mês ≈ 30 dias. */
const HOURS_PER_DAY = 24;
const DAYS_PER_MONTH = 30;
const MONTHS_PER_YEAR = 12;

/** Captura os componentes textuais ("2 days", "-1 mon", "3 years", …). */
const UNIT_RE = /(-?\d+(?:\.\d+)?)\s*(year|yr|mon|month|week|day|hour|hr|min|sec)s?\b/gi;

/** Captura o componente de relógio "HH:MM:SS(.ffff)" ou "HH:MM". */
const CLOCK_RE = /(-?)(\d+):(\d{1,2})(?::(\d{1,2}(?:\.\d+)?))?/;

function unitToHours(value: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case 'year':
    case 'yr':
      return value * MONTHS_PER_YEAR * DAYS_PER_MONTH * HOURS_PER_DAY;
    case 'mon':
    case 'month':
      return value * DAYS_PER_MONTH * HOURS_PER_DAY;
    case 'week':
      return value * 7 * HOURS_PER_DAY;
    case 'day':
      return value * HOURS_PER_DAY;
    case 'hour':
    case 'hr':
      return value;
    case 'min':
      return value / 60;
    case 'sec':
      return value / 3600;
    default:
      return 0;
  }
}

/**
 * Converte um `interval` do Postgres (ou número/`null`) em horas decimais.
 * Retorna 0 para entradas ausentes, inválidas ou não numéricas.
 */
export function parsePgIntervalToHours(input: unknown): number {
  if (input === null || input === undefined) return 0;

  // Colunas numeric/float já vêm como número (ex.: agregações SQL).
  if (typeof input === 'number') {
    return Number.isFinite(input) ? input : 0;
  }

  if (typeof input !== 'string') return 0;

  const raw = input.trim();
  if (!raw) return 0;

  // Valor puramente numérico enviado como string ("8", "-2.5").
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }

  let hours = 0;
  let matched = false;

  // 1) Componentes por extenso (days, mons, years…).
  UNIT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = UNIT_RE.exec(raw)) !== null) {
    const value = parseFloat(m[1]);
    if (!Number.isFinite(value)) continue;
    hours += unitToHours(value, m[2]);
    matched = true;
  }

  // 2) Componente de relógio HH:MM:SS.
  const clock = CLOCK_RE.exec(raw);
  if (clock) {
    const sign = clock[1] === '-' ? -1 : 1;
    const h = parseInt(clock[2], 10);
    const min = parseInt(clock[3], 10);
    const sec = clock[4] ? parseFloat(clock[4]) : 0;
    if (Number.isFinite(h) && Number.isFinite(min) && Number.isFinite(sec)) {
      hours += sign * (h + min / 60 + sec / 3600);
      matched = true;
    }
  }

  if (!matched) return 0;
  return Number.isFinite(hours) ? hours : 0;
}
