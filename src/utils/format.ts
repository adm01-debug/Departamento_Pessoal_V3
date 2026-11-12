/**
 * Utilitário central de formatação BR (pt-BR / BRL / America/Sao_Paulo).
 *
 * Por que existe:
 *   `value.toLocaleString()` sem locale explícito usa o locale do sistema
 *   do usuário. Um usuário em `en-US` vê `1,234.56` em vez de `1.234,56`;
 *   um usuário em `de-DE` vê datas como `15.7.2026`. Isso quebra a
 *   consistência visual do sistema e confunde suporte/auditoria.
 *
 * REGRA:
 *   - Sempre importar de `@/utils/format` em vez de chamar
 *     `toLocaleString` / `toLocaleDateString` diretamente.
 *   - Entradas inválidas (`null`, `undefined`, `NaN`, Date inválido) NUNCA
 *     lançam — retornam `fallback` (padrão `'—'`).
 *   - Datas ISO no formato `YYYY-MM-DD` (date-only, sem hora) são tratadas
 *     como data LOCAL, evitando o clássico off-by-one em UTC-3.
 */

const LOCALE_BR = 'pt-BR';
const TZ_BR = 'America/Sao_Paulo';
const DEFAULT_FALLBACK = '—';

type DateInput = Date | string | number | null | undefined;
type NumberInput = number | string | null | undefined;

/**
 * Normaliza qualquer entrada em Date válida ou `null`.
 * Trata strings `YYYY-MM-DD` como data local (não UTC).
 */
export function parseDateSafe(input: DateInput): Date | null {
  if (input === null || input === undefined || input === '') return null;
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'string') {
    // YYYY-MM-DD puro → tratar como data local (evita shift UTC-3)
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    if (dateOnly) {
      const [, y, m, d] = dateOnly;
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Formata data curta: `15/07/2026`. */
export function formatDate(input: DateInput, fallback = DEFAULT_FALLBACK): string {
  // Date-only string: formata sem conversão de fuso (evita off-by-one)
  if (typeof input === 'string') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const d = parseDateSafe(input);
  if (!d) return fallback;
  return new Intl.DateTimeFormat(LOCALE_BR, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TZ_BR,
  }).format(d);
}

/** Formata data e hora: `15/07/2026 14:32`. */
export function formatDateTime(input: DateInput, fallback = DEFAULT_FALLBACK): string {
  const d = parseDateSafe(input);
  if (!d) return fallback;
  return new Intl.DateTimeFormat(LOCALE_BR, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TZ_BR,
  }).format(d);
}

/** Formata data por extenso: `15 de julho de 2026`. */
export function formatDateLong(input: DateInput, fallback = DEFAULT_FALLBACK): string {
  const d = parseDateSafe(input);
  if (!d) return fallback;
  return new Intl.DateTimeFormat(LOCALE_BR, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: TZ_BR,
  }).format(d);
}

/** Formata competência de folha (`YYYY-MM` ou Date) como `07/2026`. */
export function formatCompetencia(input: DateInput, fallback = DEFAULT_FALLBACK): string {
  if (typeof input === 'string') {
    const m = /^(\d{4})-(\d{2})/.exec(input);
    if (m) return `${m[2]}/${m[1]}`;
  }
  const d = parseDateSafe(input);
  if (!d) return fallback;
  return new Intl.DateTimeFormat(LOCALE_BR, {
    month: '2-digit',
    year: 'numeric',
    timeZone: TZ_BR,
  }).format(d);
}

function parseNumberSafe(input: NumberInput): number | null {
  if (input === null || input === undefined || input === '') return null;
  const n = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** Formata moeda BRL: `R$ 1.234,56`. */
export function formatCurrency(input: NumberInput, fallback = DEFAULT_FALLBACK): string {
  const n = parseNumberSafe(input);
  if (n === null) return fallback;
  return new Intl.NumberFormat(LOCALE_BR, {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Converte valor monetário digitado (pt-BR) em número.
 * Aceita `1500`, `1.500`, `1.500,50`, `1500,50` e `1500.5` (valor já salvo).
 * Ponto seguido de 3 dígitos é milhar; vazio/inválido → `NaN`.
 */
export function parseMoedaBR(input: string): number {
  const s = input.trim().replace(/^R\$\s*/, '');
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'));
  if (/^\d+([.,]\d{1,2})?$/.test(s)) return Number(s.replace(',', '.'));
  return Number.NaN;
}

/** Formata número decimal BR: `1.234,56`. */
export function formatNumber(input: NumberInput, options: { decimals?: number; fallback?: string } = {}): string {
  const { decimals = 2, fallback = DEFAULT_FALLBACK } = options;
  const n = parseNumberSafe(input);
  if (n === null) return fallback;
  return new Intl.NumberFormat(LOCALE_BR, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

/** Formata porcentagem: `12,34%` (recebe `0.1234` OU `12.34` — controlado por `alreadyPercent`). */
export function formatPercent(
  input: NumberInput,
  options: { decimals?: number; alreadyPercent?: boolean; fallback?: string } = {}
): string {
  const { decimals = 2, alreadyPercent = false, fallback = DEFAULT_FALLBACK } = options;
  const n = parseNumberSafe(input);
  if (n === null) return fallback;
  const value = alreadyPercent ? n / 100 : n;
  return new Intl.NumberFormat(LOCALE_BR, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Formata CPF: `123.456.789-00`. Aceita string com ou sem máscara. */
export function formatCPF(cpf: string | null | undefined, fallback = DEFAULT_FALLBACK): string {
  if (!cpf) return fallback;
  const digits = String(cpf).replace(/\D/g, '').padStart(11, '0').slice(-11);
  if (digits.length !== 11) return fallback;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** Formata CNPJ: `12.345.678/0001-90`. */
export function formatCNPJ(cnpj: string | null | undefined, fallback = DEFAULT_FALLBACK): string {
  if (!cnpj) return fallback;
  const digits = String(cnpj).replace(/\D/g, '').padStart(14, '0').slice(-14);
  if (digits.length !== 14) return fallback;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}
