import ExcelJS from 'exceljs';
import { mapColumns } from './columnMap';
import { normalizarCPF, parseDate, parseSalario, validarCPF } from './validators';

export interface ParsedImportRow {
  nome_completo: string;
  cpf: string;
  email?: string;
  telefone?: string;
  cargo?: string;
  departamento?: string;
  salario_base?: number;
  data_admissao?: string | null;
  data_nascimento?: string | null;
  pis?: string;
  rg?: string;
  status: 'valido' | 'erro' | 'duplicado';
  erros: string[];
}

export interface ParseOptions {
  /** Set of already-existing CPFs (normalized 11 digits) used for duplicate detection. */
  existingCPFs?: Set<string>;
}

/** Read raw rows (arrays of cell values) from the first worksheet of an .xlsx buffer. */
export async function readWorkbookRows(buffer: ArrayBuffer): Promise<unknown[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheet = wb.worksheets[0];
  if (!sheet) throw new Error('Planilha vazia');
  const rows: unknown[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row: any) => {
    // row.values is 1-indexed; drop the leading undefined slot
    rows.push((row.values as unknown[]).slice(1));
  });
  return rows;
}

/**
 * Convert raw sheet rows into validated ParsedImportRow[].
 * Throws when the sheet is empty or lacks a recognizable "Nome" column.
 */
export function parseRows(
  rawData: unknown[][],
  opts: ParseOptions = {}
): ParsedImportRow[] {
  if (!rawData || rawData.length < 2) throw new Error('Planilha vazia');

  const headers = (rawData[0] as unknown[]).map((h) => String(h ?? ''));
  const colMap = mapColumns(headers);

  if (!Object.values(colMap).includes('nome_completo')) {
    throw new Error('Coluna "Nome" não encontrada');
  }

  const existing = opts.existingCPFs ?? new Set<string>();
  const out: ParsedImportRow[] = [];

  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i] as unknown[];
    if (!row || row.every((c) => c === undefined || c === null || c === '')) continue;

    const item: Record<string, unknown> = {};
    for (const [idxStr, field] of Object.entries(colMap)) {
      const raw = row[Number(idxStr)];
      item[field] = raw === undefined || raw === null ? '' : String(raw).trim();
    }

    const erros: string[] = [];
    const nome = String(item.nome_completo ?? '').trim();
    if (!nome) erros.push('Nome obrigatório');

    const cpfClean = normalizarCPF(item.cpf as string);
    if (cpfClean && !validarCPF(cpfClean)) erros.push('CPF inválido');

    const isDuplicate = !!cpfClean && existing.has(cpfClean);
    if (isDuplicate) erros.push('CPF já cadastrado');

    const parsed: ParsedImportRow = {
      nome_completo: nome,
      cpf: cpfClean,
      email: (item.email as string) || undefined,
      telefone: (item.telefone as string) || undefined,
      cargo: (item.cargo as string) || undefined,
      departamento: (item.departamento as string) || undefined,
      salario_base: parseSalario(item.salario_base),
      data_admissao: parseDate(item.data_admissao),
      data_nascimento: parseDate(item.data_nascimento),
      pis: (item.pis as string) || undefined,
      rg: (item.rg as string) || undefined,
      status: isDuplicate ? 'duplicado' : erros.length > 0 ? 'erro' : 'valido',
      erros,
    };
    out.push(parsed);
  }

  return out;
}

/** Convenience: read + parse an .xlsx buffer in one call. */
export async function parseWorkbookBuffer(
  buffer: ArrayBuffer,
  opts: ParseOptions = {}
): Promise<ParsedImportRow[]> {
  const rows = await readWorkbookRows(buffer);
  return parseRows(rows, opts);
}
