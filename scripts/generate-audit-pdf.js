import { jsPDF } from 'jspdf';
import fs from 'fs';

const generatePDF = () => {
  try {
    const mdContent = fs.readFileSync('AUDIT_REPORT.md', 'utf8');
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Auditoria Enterprise e Inventário de Funcionalidades', 10, 20);

    doc.setFontSize(10);
    const lines = doc.splitTextToSize(mdContent, 180);
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomMargin = 10;
    const lineHeight = 5;
    let y = 30;

    for (const line of lines) {
      if (y + lineHeight > pageHeight - bottomMargin) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, 10, y);
      y += lineHeight;
    }

    const pdfOutput = doc.output('arraybuffer');
    fs.writeFileSync('AUDIT_REPORT.pdf', Buffer.from(pdfOutput));
    console.log('AUDIT_REPORT.pdf gerado com sucesso!');
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    process.exit(1);
  }
};

generatePDF();
