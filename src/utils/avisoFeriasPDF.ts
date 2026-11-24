import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Aviso de Férias (padrão MTE / CLT arts. 135 e 145)
 * Gera o PDF em memória e retorna o Blob + SHA-256 hex do conteúdo binário.
 * A assinatura é ELETRÔNICA (MP 2.200-2/2001 §2º) — trilha probatória: hash + timestamp + IP + UA.
 */
export interface AvisoFeriasInput {
  ferias: any;
  colaborador: any;
  empresa: any;
  assinatura?: {
    hash?: string;
    assinadoEm?: string;
    assinadoPor?: string;
    ip?: string;
    userAgent?: string;
  };
}

export interface AvisoFeriasResult {
  blob: Blob;
  bytes: Uint8Array;
  hash: string;
  filename: string;
}

const fmtDate = (d?: string | Date | null) =>
  d ? format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }) : '—';

const fmtCurrency = (v?: number | null) =>
  (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function gerarAvisoFeriasPDF(input: AvisoFeriasInput): Promise<AvisoFeriasResult> {
  const { ferias, colaborador, empresa, assinatura } = input;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Cabeçalho empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text((empresa?.razao_social || empresa?.nome_fantasia || 'EMPRESA').toUpperCase(), 14, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`CNPJ: ${empresa?.cnpj || '—'}`, 14, 21);
  const endereco = [empresa?.endereco, empresa?.numero, empresa?.bairro, empresa?.cidade, empresa?.uf]
    .filter(Boolean)
    .join(', ');
  if (endereco) doc.text(endereco, 14, 26);

  // Título
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('AVISO DE FÉRIAS', pageWidth / 2, 38, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('CLT arts. 135 e 145 · Padrão MTE', pageWidth / 2, 43, { align: 'center' });

  // Identificação do colaborador
  autoTable(doc, {
    startY: 50,
    theme: 'grid',
    head: [['IDENTIFICAÇÃO DO EMPREGADO', '']],
    body: [
      ['Nome', colaborador?.nome_completo || '—'],
      ['CPF', colaborador?.cpf || '—'],
      ['CTPS / Série', `${colaborador?.ctps || '—'} / ${colaborador?.ctps_serie || '—'}`],
      ['PIS/PASEP', colaborador?.pis || '—'],
      ['Cargo', colaborador?.cargo?.nome || colaborador?.cargo_nome || '—'],
      ['Departamento', colaborador?.departamento?.nome || colaborador?.departamento_nome || '—'],
      ['Data de admissão', fmtDate(colaborador?.data_admissao)],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [44, 62, 80], textColor: 255 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
  });

  // Período e valores
  const dataPagamento = ferias?.data_pagamento
    ? new Date(ferias.data_pagamento)
    : subDays(new Date(ferias.data_inicio), 2); // CLT art. 145: até 2 dias antes

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 4,
    theme: 'grid',
    head: [['PERÍODO DE FÉRIAS', '']],
    body: [
      [
        'Período aquisitivo',
        `${fmtDate(ferias?.periodo_aquisitivo_inicio)} a ${fmtDate(ferias?.periodo_aquisitivo_fim)}`,
      ],
      [
        'Período de gozo',
        `${fmtDate(ferias?.data_inicio)} a ${fmtDate(ferias?.data_fim)}`,
      ],
      ['Dias de gozo', String(ferias?.dias_gozo ?? '—')],
      [
        'Abono pecuniário (art. 143)',
        ferias?.abono_pecuniario || (ferias?.dias_abono ?? 0) > 0
          ? `Sim — ${ferias?.dias_abono ?? 10} dias`
          : 'Não',
      ],
      ['Adiantamento 13º (art. 7º Lei 4.749/65)', ferias?.adiantamento_13 || ferias?.adiantamento_13o ? 'Sim' : 'Não'],
      ['Data de pagamento (art. 145)', fmtDate(dataPagamento)],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [44, 62, 80], textColor: 255 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
  });

  // Valores
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 4,
    theme: 'grid',
    head: [['DEMONSTRATIVO', 'VALOR']],
    body: [
      ['Salário base', fmtCurrency(ferias?.salario_base)],
      ['Férias', fmtCurrency(ferias?.valor_ferias)],
      ['1/3 constitucional', fmtCurrency(ferias?.valor_terco)],
      ['Abono pecuniário', fmtCurrency(ferias?.valor_abono)],
      ['1/3 sobre abono', fmtCurrency(ferias?.valor_terco_abono)],
      ['Adiantamento 13º', fmtCurrency(ferias?.valor_adiantamento_13)],
      ['(-) INSS', fmtCurrency(ferias?.descontos_inss)],
      ['(-) IRRF', fmtCurrency(ferias?.descontos_irrf)],
      ['TOTAL LÍQUIDO', fmtCurrency(ferias?.valor_liquido)],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [44, 62, 80], textColor: 255 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 90 },
      1: { halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.row.index === 8 && data.section === 'body') {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [232, 245, 233];
      }
    },
  });

  // Texto legal
  const yTexto = (doc as any).lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const texto =
    'Comunico a V.Sa. que, nos termos dos arts. 135 e 145 da CLT, o período de férias acima ' +
    'discriminado foi concedido e o pagamento correspondente será efetuado até 2 (dois) dias antes ' +
    'do início do gozo. Este documento serve como aviso prévio de férias e recibo de ciência.';
  doc.text(doc.splitTextToSize(texto, pageWidth - 28), 14, yTexto);

  // Assinaturas manuscritas
  const ySig = yTexto + 30;
  doc.setDrawColor(80);
  doc.line(20, ySig, 90, ySig);
  doc.line(pageWidth - 90, ySig, pageWidth - 20, ySig);
  doc.setFontSize(9);
  doc.text('Assinatura da Empresa', 30, ySig + 5);
  doc.text('Ciência do Colaborador', pageWidth - 80, ySig + 5);

  // Bloco de Assinatura Eletrônica (rodapé em todas as páginas)
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setDrawColor(200);
    doc.line(14, h - 22, pageWidth - 14, h - 22);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('ASSINATURA ELETRÔNICA — MP 2.200-2/2001 §2º', 14, h - 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const linhas = [
      `SHA-256: ${assinatura?.hash || '(será gerado após clique em Assinar)'}`,
      `Assinado por: ${assinatura?.assinadoPor || '—'}   Em: ${assinatura?.assinadoEm ? format(new Date(assinatura.assinadoEm), 'dd/MM/yyyy HH:mm:ss') : '—'}`,
      `IP: ${assinatura?.ip || '—'}   UA: ${(assinatura?.userAgent || '—').substring(0, 90)}`,
      `Página ${i} de ${total} · Documento com validade jurídica conforme MP 2.200-2/2001`,
    ];
    linhas.forEach((l, idx) => doc.text(l, 14, h - 14 + idx * 3));
  }

  const arrayBuf = doc.output('arraybuffer');
  const bytes = new Uint8Array(arrayBuf);
  const hash = await sha256Hex(bytes);
  const blob = new Blob([arrayBuf], { type: 'application/pdf' });
  const filename = `aviso_ferias_${(colaborador?.nome_completo || 'colaborador').replace(/\s+/g, '_')}_${ferias?.id?.slice(0, 8) || ''}.pdf`;
  return { blob, bytes, hash, filename };
}
