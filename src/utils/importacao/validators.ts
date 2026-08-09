import { formatDateLocalISO } from '@/utils/dateLocal';
/**
 * Pure validators/normalizers for colaborador mass import.
 * No I/O, no side effects — safe to unit test.
 */

export function validarCPF(cpf: string): boolean {
  const clean = String(cpf ?? '').replace(/\D/g, '');
  if (clean.length !== 11 || /^(\d)\1{10}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i);
  let rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  if (rest !== parseInt(clean[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10) rest = 0;
  return rest === parseInt(clean[10]);
}

export function normalizarCPF(cpf: string | number | null | undefined): string {
  if (cpf === null || cpf === undefined) return '';
  return String(cpf).replace(/\D/g, '').padStart(11, '0');
}

export function parseDate(val: unknown): string | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') {
    // Serial Excel: a conversão clássica produz meia-noite UTC; reinterpretar
    // como data local para evitar off-by-one em fusos negativos (ex.: UTC-3).
    const d = new Date((val - 25569) * 86400 * 1000);
    if (isNaN(d.getTime())) return null;
    const local = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    return formatDateLocalISO(local);
  }
  const s = String(val);
  const parts = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (parts) return `${parts[3]}-${parts[2]}-${parts[1]}`;
  // `new Date('YYYY-MM-DD')` interpreta como meia-noite UTC → off-by-one em
  // fusos negativos (ex.: UTC-3). Construir como meia-noite LOCAL.
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const local = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (isNaN(local.getTime())) return null;
    const formatted = formatDateLocalISO(local);
    // round-trip: rejeita datas inexistentes (ex.: 2023-02-30 → 2023-03-02)
    return formatted === s ? formatted : null;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : formatDateLocalISO(d);
}

export function parseSalario(val: unknown): number | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  let s = String(val).replace(/[^\d.,-]/g, '');
  // pt-BR: if both '.' and ',' appear, '.' is thousands and ',' is decimal
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
