import { useCallback } from 'react';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import {
  buildTabularWorkbook,
  downloadWorkbook,
} from '@/utils/importacao/excelDownload';

/**
 * Generic Excel export hook. Delegates workbook construction and download to the
 * shared helpers in `src/utils/importacao/excelDownload.ts`, so column layout and
 * MIME/filename handling stay consistent with the import template flow.
 */
export function useExcelExport() {
  const exportarExcel = useCallback(
    async (titulo: string, dados: any[], colunas: string[]) => {
      try {
        const rows = dados.map((item) => colunas.map((c) => item?.[c] ?? ''));
        const wb = buildTabularWorkbook(titulo, colunas, rows);
        const filename = `${titulo.toLowerCase().replace(/\s+/g, '-')}.xlsx`;
        await downloadWorkbook(wb, filename);
        toast.success('Excel exportado com sucesso!');
      } catch (e: any) {
        toast.error(safeErrorMessage(e, 'Erro ao gerar Excel.'));
      }
    },
    []
  );

  return { exportarExcel };
}
