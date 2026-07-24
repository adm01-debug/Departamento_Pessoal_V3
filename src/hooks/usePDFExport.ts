import { useCallback } from 'react';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

export function usePDFExport() {
  const exportarPDF = useCallback(async (titulo: string, dados: any[], colunas: string[]) => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(titulo, 14, 22);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);

      autoTable(doc, {
        startY: 36,
        head: [colunas],
        body: dados.map(item => colunas.map(col => String(item[col] ?? ''))),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [99, 102, 241] },
      });

      doc.save(`${titulo.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (e: any) {
      toast.error(safeErrorMessage(e, 'Erro ao gerar PDF.'));
    }
  }, []);

  return { exportarPDF };
}
