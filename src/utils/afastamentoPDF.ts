import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { loggerService } from '@/services/loggerService';

interface AfastamentoPDFData {
  colaborador: string;
  tipo: string;
  cid: string;
  inicio: string;
  fim: string;
  dias: number;
  status: string;
  diasInss: number;
  pericia: string;
}

export async function gerarAfastamentosPDF(
  titulo: string, 
  dados: AfastamentoPDFData[], 
  filtros: any = {}
) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cabeçalho Profissional
    doc.setFillColor(240, 240, 240);
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text('ERP DP - Módulo de Afastamentos', 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text(titulo, 14, 30);

    // Info do Relatório
    doc.setFontSize(9);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}`, pageWidth - 14, 20, { align: 'right' });
    doc.text(`Total de registros: ${dados.length}`, pageWidth - 14, 26, { align: 'right' });

    // Filtros Aplicados
    let yPos = 50;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Filtros aplicados:', 14, yPos);
    doc.setFont('helvetica', 'normal');
    
    const activeFilters = [];
    if (filtros.cid) activeFilters.push(`CID: ${filtros.cid}`);
    if (filtros.status) activeFilters.push(`Status: ${filtros.status}`);
    if (filtros.tipo) activeFilters.push(`Tipo: ${filtros.tipo}`);
    
    const filterText = activeFilters.length > 0 ? activeFilters.join(' | ') : 'Nenhum filtro específico aplicado';
    doc.text(filterText, 45, yPos);

    // Totais
    const totalDias = dados.reduce((acc, curr) => acc + curr.dias, 0);
    const totalInss = dados.reduce((acc, curr) => acc + curr.diasInss, 0);
    
    yPos += 10;
    doc.setFillColor(245, 247, 250);
    doc.rect(14, yPos - 5, pageWidth - 28, 12, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text(`Total de Dias Afastados: ${totalDias}d`, 20, yPos + 2);
    doc.text(`Impacto INSS (Empresa): ${totalInss}d`, 100, yPos + 2);

    // Tabela
    autoTable(doc, {
      startY: yPos + 15,
      head: [['Colaborador', 'Tipo/CID', 'Período', 'Dias', 'Status', 'INSS', 'Perícia']],
      body: dados.map(item => [
        item.colaborador,
        `${item.tipo}\n(CID: ${item.cid})`,
        `${item.inicio} - ${item.fim}`,
        item.dias,
        item.status.toUpperCase(),
        item.diasInss > 0 ? `${item.diasInss}d` : '-',
        item.pericia
      ]),
      styles: { 
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak'
      },
      headStyles: { 
        fillColor: [220, 38, 38], // Red-600 to match Afastamentos theme
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250]
      },
      columnStyles: {
        0: { cellWidth: 45 },
        2: { cellWidth: 35 },
        3: { halign: 'center' },
        5: { halign: 'center' }
      }
    });

    // Rodapé
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${pageCount} - Documento para fins de auditoria interna.`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }

    doc.save(`relatorio-afastamentos-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`);
    return true;
  } catch (error: unknown) {
    loggerService.error('Erro ao gerar PDF', { titulo }, error instanceof Error ? error : undefined);
    throw error;
  }
}