import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts';
import { toast } from 'sonner';
import {
  parseWorkbookBuffer,
  type ParsedImportRow,
} from '@/utils/importacao/parser';
import { normalizarCPF } from '@/utils/importacao/validators';
import { safeErrorMessage } from '@/utils/safeError';

export type ImportRow = ParsedImportRow;

export function useImportacaoColaboradores() {
  const { empresaAtual } = useEmpresa();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const processarArquivo = useCallback(
    async (file: File) => {
      try {
        const buffer = await file.arrayBuffer();
        const { data: existingCols } = await supabase
          .from('colaboradores')
          .select('cpf')
          .eq('empresa_id', empresaAtual?.id || '');
        const existingCPFs = new Set(
          (existingCols || []).map((c: any) => normalizarCPF(c.cpf))
        );
        const parsed = await parseWorkbookBuffer(buffer, { existingCPFs });
        setRows(parsed);
        return parsed;
      } catch (err: any) {
        toast.error(safeErrorMessage(err, 'Erro ao processar arquivo de importação.'));
        throw err;
      }
    },
    [empresaAtual]
  );

  const importar = async () => {
    const validos = rows.filter((r) => r.status === 'valido');
    if (!validos.length) return;

    setIsImporting(true);
    let successCount = 0;

    for (let i = 0; i < validos.length; i++) {
      const row = validos[i];
      try {
        const { error } = await supabase.from('colaboradores').insert({
          ...row,
          empresa_id: empresaAtual?.id,
          status: 'ativo',
          erros: undefined,
        } as any);
        if (error) throw error;
        successCount++;
      } catch (err) {
        console.error(err);
      }
      setProgress(Math.round(((i + 1) / validos.length) * 100));
    }

    setIsImporting(false);
    queryClient.invalidateQueries({ queryKey: ['colaboradores'] });
    toast.success(`${successCount} colaboradores importados`);
  };

  return { rows, progress, isImporting, processarArquivo, importar, setRows };
}
