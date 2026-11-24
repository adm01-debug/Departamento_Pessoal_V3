import { toast } from 'sonner';

export async function gerarPDIPDF(colaborador: string, pdi: any) {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('PLANO DE DESENVOLVIMENTO INDIVIDUAL (PDI)', pw / 2, y, { align: 'center' }); y += 12;

  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`Colaborador: ${colaborador}`, 14, y); y += 6;
  doc.text(`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`, 14, y); y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('OBJETIVO DO DESENVOLVIMENTO', 14, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(pdi.titulo || '—', 14, y, { maxWidth: pw - 28 }); y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('COMPETÊNCIA A SER DESENVOLVIDA', 14, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(pdi.competencia || '—', 14, y); y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('PLANO DE AÇÃO', 14, y); y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(pdi.acao || '—', 14, y, { maxWidth: pw - 28 }); y += 20;

  (doc as any).autoTable({
    startY: y,
    head: [['Ação', 'Prazo', 'Status']],
    body: [
      [pdi.acao || 'Ação principal', pdi.prazo ? new Date(pdi.prazo).toLocaleDateString('pt-BR') : '—', pdi.status || 'Pendente'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] },
  });

  y = (doc as any).lastAutoTable.finalY + 30;
  doc.line(14, y, 90, y); doc.line(pw - 90, y, pw - 14, y); y += 5;
  doc.setFontSize(9);
  doc.text('ASSINATURA GESTOR', 52, y, { align: 'center' });
  doc.text('ASSINATURA COLABORADOR', pw - 52, y, { align: 'center' });

  doc.save(`PDI_${colaborador.replace(/\s/g, '_')}.pdf`);
  toast.success('PDI gerado com sucesso!');
}
