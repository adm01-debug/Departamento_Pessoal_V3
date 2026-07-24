import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface ReciboAssinaturaData {
  hash: string;
  assinadoEm: string; // ISO
  contratoId?: string;
  origin: string;
}

/**
 * Gera um "Recibo de Assinatura Eletrônica" em PDF A4, com QR Code apontando
 * para a URL pública de verificação. Cumpre MP 2.200-2/2001 (evidência digital).
 */
export async function gerarReciboAssinaturaPDF(data: ReciboAssinaturaData): Promise<void> {
  const url = `${data.origin}/verificar-contrato/${data.hash}`;
  const qrDataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 320,
  });

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Recibo de Assinatura Eletrônica', pageW / 2, 12, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Documento com validade jurídica — MP 2.200-2/2001', pageW / 2, 19, { align: 'center' });
  doc.text('ICP-Brasil equivalente para assinatura eletrônica avançada', pageW / 2, 24, {
    align: 'center',
  });

  // Corpo
  doc.setTextColor(20, 20, 20);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Comprovante de Ciência e Aceite', 15, 42);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const dataFmt = new Date(data.assinadoEm).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  let y = 52;
  const line = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(value, 110);
    doc.text(wrapped, 55, y);
    y += 6 * Math.max(1, wrapped.length);
  };

  line('Data/Hora:', dataFmt);
  line('Fuso:', 'America/Sao_Paulo (BRT/BRST)');
  if (data.contratoId) line('Contrato ID:', data.contratoId);
  line('Algoritmo:', 'SHA-256');
  line('Hash:', data.hash);
  line('URL pública:', url);

  // QR Code
  doc.addImage(qrDataUrl, 'PNG', pageW - 55, 42, 40, 40);
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text('Escaneie para verificar', pageW - 55, 86, { maxWidth: 40 });

  // Aviso jurídico
  y = Math.max(y + 8, 100);
  doc.setDrawColor(200);
  doc.line(15, y, pageW - 15, y);
  y += 6;
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);
  const aviso =
    'Este recibo atesta que o(a) signatário(a) manifestou aceite formal ao contrato acima ' +
    'referenciado. A integridade do documento é garantida pelo hash SHA-256, calculado no ato ' +
    'da assinatura. Qualquer alteração posterior invalida o hash e, consequentemente, a ' +
    'assinatura. A validação pode ser realizada a qualquer momento, por qualquer pessoa, ' +
    'através da URL pública ou do QR Code acima. Recomenda-se o arquivamento deste comprovante ' +
    'pelo prazo mínimo previsto na legislação aplicável (CLT: 5 anos após rescisão).';
  const wrap = doc.splitTextToSize(aviso, pageW - 30);
  doc.text(wrap, 15, y);

  // Rodapé
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Gerado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    15,
    doc.internal.pageSize.getHeight() - 10,
  );
  doc.text('Página 1 de 1', pageW - 15, doc.internal.pageSize.getHeight() - 10, {
    align: 'right',
  });

  doc.save(`recibo-assinatura-${data.hash.substring(0, 12)}.pdf`);
}
