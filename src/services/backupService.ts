import { supabase } from '@/integrations/supabase/client';
import { formatDateLocalISO } from '@/utils/dateLocal';

export interface BackupRecord {
  id: string;
  data: string;
  tamanho: string;
  status: 'completo' | 'erro' | 'processando';
  tipo: 'Manual' | 'Automático';
  tabelas: string[];
  registros: number;
}

const BACKUP_TABLES = [
  'colaboradores',
  'admissoes',
  'registros_ponto',
  'folha_pagamento',
  'ferias',
  'beneficios',
  'departamentos',
  'cargos',
  'afastamentos',
  'treinamentos',
] as const;

type BackupTable = (typeof BACKUP_TABLES)[number];
type BackupRow = Record<string, unknown>;

// A exportação no navegador não tem snapshot transacional. Para não chamar um
// recorte silencioso de "backup completo", ela falha quando uma tabela excede
// este limite. Backups maiores devem usar o fluxo server-side auditável.
const MAX_RECORDS_PER_TABLE = 10_000;

function resolveTargetTables(tables?: readonly string[]): BackupTable[] {
  const targetTables = tables ? [...tables] : [...BACKUP_TABLES];

  if (targetTables.length === 0) {
    throw new Error('Selecione ao menos uma tabela para exportação');
  }

  const invalidTable = targetTables.find((table) => !BACKUP_TABLES.includes(table as BackupTable));
  if (invalidTable) {
    throw new Error(`Tabela não permitida para exportação: ${invalidTable}`);
  }

  if (new Set(targetTables).size !== targetTables.length) {
    throw new Error('A lista de tabelas para exportação contém duplicidades');
  }

  return targetTables as BackupTable[];
}

async function fetchTableData(
  table: BackupTable,
  empresaId: string
): Promise<{ table: BackupTable; data: BackupRow[]; count: number }> {
  const { data, error, count } = await supabase
    .from(table as any)
    .select('*', { count: 'exact' })
    .eq('empresa_id', empresaId)
    .limit(MAX_RECORDS_PER_TABLE);

  if (error) throw new Error(`Erro ao exportar ${table}: ${error.message}`);

  // A tipagem gerada não conhece todas as tabelas da allowlist; a fonte foi
  // validada em runtime antes desta conversão e o resultado continua privado.
  const rows = (data as unknown as BackupRow[] | null) ?? [];
  if (count === null) {
    throw new Error(`Não foi possível confirmar a quantidade de registros de ${table}`);
  }
  if (count !== rows.length) {
    throw new Error(
      `Exportação incompleta de ${table}: ${count} registros encontrados, limite de ${MAX_RECORDS_PER_TABLE}. Use o backup server-side.`
    );
  }

  return { table, data: rows, count };
}

async function fetchBackupTables(empresaId: string, tables?: readonly string[]) {
  const targetTables = resolveTargetTables(tables);
  const results = await Promise.all(targetTables.map((table) => fetchTableData(table, empresaId)));
  return { targetTables, results };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function exportarBackupCSV(
  empresaId: string,
  tables?: readonly string[]
): Promise<{ blob: Blob; fileName: string; stats: { tabelas: number; registros: number; tamanho: string } }> {
  if (!empresaId) throw new Error('empresaId é obrigatório para exportação');
  const { targetTables, results } = await fetchBackupTables(empresaId, tables);

  let csvContent = '';
  let totalRecords = 0;

  for (const result of results) {
    const { table, data, count } = result;
    totalRecords += count;

    if (data.length > 0) {
      csvContent += `\n### TABELA: ${table.toUpperCase()} (${count} registros) ###\n`;
      const headers = Object.keys(data[0]);
      csvContent += headers.join(';') + '\n';
      for (const row of data) {
        csvContent +=
          headers
            .map((header) => {
              const value = row[header];
              if (value === null || value === undefined) return '';
              const stringValue = typeof value === 'object' ? (JSON.stringify(value) ?? '') : String(value);
              return stringValue.includes(';') || stringValue.includes('\n')
                ? `"${stringValue.replace(/"/g, '""')}"`
                : stringValue;
            })
            .join(';') + '\n';
      }
    }
  }

  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const now = new Date();
  const fileName = `backup_dp_${formatDateLocalISO(now)}_${now.toTimeString().slice(0, 5).replace(':', 'h')}.csv`;

  return {
    blob,
    fileName,
    stats: {
      tabelas: targetTables.length,
      registros: totalRecords,
      tamanho: formatBytes(blob.size),
    },
  };
}

export async function exportarBackupJSON(
  empresaId: string,
  tables?: readonly string[]
): Promise<{ blob: Blob; fileName: string; stats: { tabelas: number; registros: number; tamanho: string } }> {
  if (!empresaId) throw new Error('empresaId é obrigatório para exportação');
  const { targetTables, results } = await fetchBackupTables(empresaId, tables);

  const output: Partial<Record<BackupTable, BackupRow[]>> = {};
  let totalRecords = 0;

  for (const result of results) {
    output[result.table] = result.data;
    totalRecords += result.count;
  }

  const json = JSON.stringify(
    {
      metadata: {
        gerado_em: new Date().toISOString(),
        empresa_id: empresaId,
        tabelas: Object.keys(output).length,
        total_registros: totalRecords,
      },
      dados: output,
    },
    null,
    2
  );

  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const now = new Date();
  const fileName = `backup_dp_${formatDateLocalISO(now)}_${now.toTimeString().slice(0, 5).replace(':', 'h')}.json`;

  return {
    blob,
    fileName,
    stats: {
      tabelas: Object.keys(output).length,
      registros: totalRecords,
      tamanho: formatBytes(blob.size),
    },
  };
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
