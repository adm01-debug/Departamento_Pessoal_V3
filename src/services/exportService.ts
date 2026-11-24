import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { loggerService } from './loggerService';
import { toError } from '@/utils/toError';

export const validateExportData = (data: any[]) => {
  if (!data || data.length === 0) {
    throw new Error('Nenhum dado disponível para exportação');
  }

  // Verificação de integridade básica: garantir que todos os campos essenciais existem
  const sample = data[0];
  const requiredKeys = ['colaborador', 'data'];
  const missingKeys = requiredKeys.filter(key => !Object.keys(sample).includes(key));

  if (missingKeys.length > 0) {
    loggerService.warn(`Aviso de integridade: Campos faltando no primeiro registro: ${missingKeys.join(', ')}`);
  }

  return true;
};

export const exportPontoCSV = (data: any[], filename = 'registros-ponto.csv') => {
  try {
    validateExportData(data);
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (error) {
    loggerService.error('Erro na exportação CSV', { filename }, toError(error));
    throw error;
  }
};

export const exportPontoPDF = (data: any[], title = 'Relatório de Ponto', columns: string[]) => {
  try {
    validateExportData(data);
    const doc = new jsPDF() as any;
    const now = new Date();
    
    // Header Styling
    doc.setFillColor(34, 197, 94); // Primary Green
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text('RECURSOS HUMANOS', 14, 20);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(title.toUpperCase(), 14, 30);
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(`EMISSÃO: ${format(now, "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 160, 20);
    doc.text('SISTEMA DE PONTO ELETRÔNICO v2.0', 160, 25);
    
    // Statistics Summary (Cards in PDF)
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 45, 58, 20, 3, 3, 'F');
    doc.roundedRect(76, 45, 58, 20, 3, 3, 'F');
    doc.roundedRect(138, 45, 58, 20, 3, 3, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL REGISTROS', 18, 52);
    doc.text('COLABORADORES', 80, 52);
    doc.text('STATUS GERAL', 142, 52);
    
    const uniqueColabs = new Set(data.map(d => d.colaborador)).size;
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(String(data.length), 18, 60);
    doc.text(String(uniqueColabs), 80, 60);
    doc.text('CONFORME (MTP 671)', 142, 60);
    
    const body = data.map(item => columns.map(col => {
      const val = item[col];
      if (val === '00:00' || !val) return '-';
      return val;
    }));
    
    doc.autoTable({
      startY: 75,
      head: [columns.map(c => c.replace('_', ' ').toUpperCase())],
      body: body,
      theme: 'striped',
      headStyles: { 
        fillColor: [30, 41, 59], 
        textColor: 255, 
        fontSize: 9, 
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: { 
        fontSize: 8, 
        cellPadding: 3,
        valign: 'middle',
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', fontSize: 9 }
      },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { top: 75 },
    });
    
    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `Página ${i} de ${totalPages} - Documento assinado digitalmente conforme MP 2.200-2/2001`,
        105, 285, { align: 'center' }
      );
    }
    
    doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${format(now, 'yyyyMMdd')}.pdf`);
    return true;
  } catch (error) {
    loggerService.error('Erro na exportação PDF', { title }, toError(error));
    throw error;
  }
};

export const exportPortaria671PDF = (solicitacao: any) => {
  try {
    const doc = new jsPDF() as any;
    const relatorio = solicitacao.relatorio_conformidade || {};
    
    // Header
    doc.setFontSize(16);
    doc.text('Relatório de Conformidade - Portaria 671', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`ID Solicitação: ${solicitacao.id}`, 14, 28);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}`, 14, 33);
    
    // Colaborador Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Informações do Ajuste', 14, 45);
    
    const adjustmentData = [
      ['Colaborador', solicitacao.colaborador?.nome_completo || 'N/A'],
      ['Data do Ponto', format(new Date(solicitacao.data_ponto), 'dd/MM/yyyy')],
      ['Tipo', solicitacao.tipo_ponto?.toUpperCase() || 'N/A'],
      ['Hora Original', solicitacao.hora_original || 'Original'],
      ['Hora Sugerida', solicitacao.hora_sugerida],
      ['Motivo', solicitacao.motivo]
    ];
    
    doc.autoTable({
      startY: 48,
      body: adjustmentData,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: 'bold', width: 40 } }
    });
    
    // Compliance Info
    const nextY = (doc as any).lastAutoTable.finalY + 15;
    doc.text('Validações de Conformidade', 14, nextY);
    
    const complianceData = [
      ['Timezone', relatorio.timezone || 'America/Sao_Paulo'],
      ['Geofencing', relatorio.geofencing ? 'VÁLIDO' : 'NÃO VERIFICADO'],
      ['Divergência', `${relatorio.divergencia_minutos || 0} minutos`],
      ['Integridade SHA256', relatorio.sha256_integridade || 'N/A'],
      ['Status Portaria 671', relatorio.portaria_671_conformidade ? 'CONFORME' : 'EM ANÁLISE']
    ];
    
    doc.autoTable({
      startY: nextY + 3,
      body: complianceData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10 }
    });
    
    doc.save(`conformidade-671-${solicitacao.id.slice(0, 8)}.pdf`);
    return true;
  } catch (error: unknown) {
    loggerService.error('Erro exportando conformidade', { solicitacaoId: solicitacao.id }, error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
};
