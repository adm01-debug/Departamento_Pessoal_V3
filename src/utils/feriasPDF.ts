import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const feriasPDF = {
  gerarRecibo: (solicitacao: any) => {
    const doc = new jsPDF();
    const colab = solicitacao.colaborador || {};
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(44, 62, 80);
    doc.text('Aviso e Recibo de Férias', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 105, 28, { align: 'center' });

    // Info Table
    autoTable(doc, {
      startY: 40,
      head: [['Informação', 'Detalhe']],
      body: [
        ['Colaborador', colab.nome_completo || '-'],
        ['CPF', colab.cpf || '-'],
        ['Cargo', colab.cargo?.nome || '-'],
        ['Departamento', colab.departamento?.nome || '-'],
        ['Período de Gozo', `${format(new Date(solicitacao.data_inicio), 'dd/MM/yyyy')} a ${format(new Date(solicitacao.data_fim), 'dd/MM/yyyy')}`],
        ['Dias de Férias', `${solicitacao.dias_ferias} dias`],
        ['Abono Pecuniário', solicitacao.abono_pecuniario ? 'Sim (10 dias)' : 'Não'],
        ['Adiantamento 13º', solicitacao.adiantamento_13 ? 'Sim' : 'Não'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [52, 152, 219], textColor: [255, 255, 255] },
    });

    // Texto Legal
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(11);
    doc.setTextColor(0);
    const texto = `Comunico-lhe que, de acordo com as disposições legais vigentes, lhe serão concedidas férias relativas ao período aquisitivo correspondente, a serem gozadas no período acima mencionado.`;
    doc.text(doc.splitTextToSize(texto, 170), 20, finalY);

    // Assinaturas
    const signatureY = finalY + 50;
    doc.line(20, signatureY, 90, signatureY);
    doc.text('Assinatura da Empresa', 35, signatureY + 5);

    doc.line(120, signatureY, 190, signatureY);
    doc.text('Assinatura do Colaborador', 130, signatureY + 5);

    doc.save(`recibo_ferias_${colab.nome_completo || 'colaborador'}.pdf`);
  },

  gerarRelatorioKPIs: async (stats: any, data: any[], filters?: any, empresa?: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Configurações Globais
    const colors = {
      primary: [44, 62, 80] as [number, number, number],
      accent: [52, 152, 219] as [number, number, number],
      text: [60, 60, 60] as [number, number, number],
      light: [200, 200, 200] as [number, number, number]
    };

    const drawHeader = (doc: jsPDF) => {
      // Header background
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      // Logo text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text(empresa?.razao_social || empresa?.nome_fantasia || 'LOVABLE HR', 20, 22);
      
      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('TECNOLOGIA PARA GESTÃO DE PESSOAS', 20, 28);

      // Report Title
      doc.setFontSize(14);
      doc.text('RELATÓRIO EXECUTIVO DE FÉRIAS', pageWidth - 20, 22, { align: 'right' });
      
      // Date info
      doc.setFontSize(8);
      doc.text(`GERADO EM: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, pageWidth - 20, 28, { align: 'right' });
    };

    const drawFooter = (doc: jsPDF, pageNumber: number, totalPages: number) => {
      doc.setDrawColor(colors.light[0], colors.light[1], colors.light[2]);
      doc.line(20, pageHeight - 15, pageWidth - 20, pageHeight - 15);
      
      doc.setFontSize(8);
      doc.setTextColor(colors.light[0], colors.light[1], colors.light[2]);
      doc.text(`${empresa?.nome_fantasia || 'Lovable HR'} - Sistema Integrado de Gestão de Férias`, 20, pageHeight - 10);
      doc.text(`Página ${pageNumber} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text(`Documento Confidencial - RH`, pageWidth - 20, pageHeight - 10, { align: 'right' });
    };

    drawHeader(doc);

    // Filtros e Contexto
    doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PARÂMETROS DO RELATÓRIO', 20, 45);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    let currentY = 50;
    doc.text(`Período Analisado: ${stats.periodoLabel || 'Todos'}`, 20, currentY);
    
    if (filters?.search || filters?.status) {
      currentY += 5;
      const filterText = [
        filters?.search ? `Busca: "${filters.search}"` : '',
        filters?.status ? `Status: ${filters.status}` : ''
      ].filter(Boolean).join(' | ');
      doc.text(`Filtros Aplicados na Exportação: ${filterText}`, 20, currentY);
    }

    // KPIs Grid
    autoTable(doc, {
      startY: currentY + 10,
      head: [['INDICADOR OPERACIONAL', 'VALOR ATUAL']],
      body: [
        ['VOLUME TOTAL DE REGISTROS NA AMOSTRA', stats.total.toString()],
        ['SOLICITAÇÕES PENDENTES (EM WORKFLOW)', stats.pendentes.toString()],
        ['CONCESSÕES APROVADAS/CONFIRMADAS', stats.aprovadas.toString()],
        ['COLABORADORES EM GOZO ATIVO', stats.emGozo.toString()],
        ['OPÇÕES POR ABONO PECUNIÁRIO', stats.abonoPecuniario.toString()],
        ['PERÍODOS AQUISITIVOS VENCIDOS (ALERTA)', stats.vencidas.toString()],
      ],
      theme: 'grid',
      headStyles: { fillColor: colors.primary, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 
        0: { cellWidth: 100 },
        1: { halign: 'center', fontStyle: 'bold' } 
      }
    });

    // Detalhamento
    const nextY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text('DETALHAMENTO DAS SOLICITAÇÕES', 20, nextY);

    autoTable(doc, {
      startY: nextY + 5,
      head: [['COLABORADOR', 'INÍCIO', 'FIM', 'DIAS', 'STATUS']],
      body: data.map(f => [
        (f.colaborador?.nome_completo || 'N/A').toUpperCase(),
        format(new Date(f.data_inicio), 'dd/MM/yyyy'),
        format(new Date(f.data_fim), 'dd/MM/yyyy'),
        (f.dias_gozo || f.dias_ferias || '-').toString(),
        f.status.toUpperCase()
      ]),
      theme: 'striped',
      headStyles: { fillColor: colors.accent, fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 40, bottom: 20 },
      didDrawPage: (dataArg) => {
        const totalPages = (doc as any).internal.getNumberOfPages();
        drawFooter(doc, dataArg.pageNumber, totalPages);
        if (dataArg.pageNumber > 1) {
          drawHeader(doc);
        }
      }
    });

    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    doc.save(`relatorio_ferias_${format(new Date(), 'yyyyMMdd')}.pdf`);
  }
};
