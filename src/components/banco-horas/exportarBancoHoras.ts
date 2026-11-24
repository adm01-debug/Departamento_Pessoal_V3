/**
 * ============================================================================
 * EXPORTAÇÃO DO EXTRATO — CSV do recorte que o usuário está vendo.
 *
 * O botão "Exportar" do cabeçalho exporta EXATAMENTE o período selecionado na
 * página (o mesmo que alimenta KPI Cards, rosca, barras e evolução): o arquivo
 * nunca traz um recorte diferente do que está na tela.
 *
 * ── POR QUE UM MÓDULO (e não `exportPontoCSV` direto no clique) ─────────────
 * Três coisas precisam acontecer juntas: montar as linhas na régua da tela
 * (`linhasParaExportacao`, em `bancoHorasComum.ts`), gerar um nome de arquivo
 * que diga QUAL recorte foi baixado e avisar o usuário (toast) quando não há o
 * que exportar. Espalhar isso no `onClick` duplicaria a regra em qualquer nova
 * tela que queira exportar banco de horas.
 *
 * O download em si continua sendo `services/exportService.ts` (`exportPontoCSV`
 * + `validateExportData`, que exige as chaves `colaborador` e `data` — as duas
 * já presentes nas linhas). Nada de `Blob`/`URL.createObjectURL` reescrito aqui.
 * ============================================================================
 */
import { toast } from 'sonner';
import { exportPontoCSV } from '@/services/exportService';
import { safeErrorMessage } from '@/utils/safeError';
import {
  linhasParaExportacao,
  type PeriodoExtrato,
  type RegistroBancoHoras,
} from './bancoHorasComum';

/** Sufixo do arquivo: o recorte em si, em `YYYY-MM-DD` (ordenável e sem barra). */
function sufixoDoRecorte(periodo: PeriodoExtrato): string {
  const { de, ate } = periodo;
  if (de && ate) return `${de}_a_${ate}`;
  if (de) return `desde_${de}`;
  if (ate) return `ate_${ate}`;
  return 'completo';
}

/**
 * Baixa o extrato do recorte em CSV.
 *
 * Devolve `true` quando o arquivo foi gerado — a página usa o retorno apenas
 * para eventuais testes; o usuário é avisado por toast.
 */
export function exportarExtratoBancoHoras(
  registros: readonly RegistroBancoHoras[],
  periodo: PeriodoExtrato
): boolean {
  const linhas = linhasParaExportacao(registros);

  if (linhas.length === 0) {
    toast.error('Nenhum lançamento para exportar neste recorte');
    return false;
  }

  try {
    exportPontoCSV(linhas, `banco-de-horas-${sufixoDoRecorte(periodo)}.csv`);
    toast.success(
      linhas.length === 1
        ? '1 lançamento exportado em CSV'
        : `${linhas.length} lançamentos exportados em CSV`
    );
    return true;
  } catch (erro) {
    toast.error(safeErrorMessage(erro, 'Falha ao exportar o extrato'));
    return false;
  }
}
