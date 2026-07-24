import jsPDF from 'jspdf';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Comunicado de Férias Coletivas — padrão MTE (CLT arts. 139 a 141)
 * e ofício ao Sindicato profissional (CLT art. 139 §2º).
 *
 * O empregador deve comunicar, com antecedência mínima de 15 dias:
 *  (I) ao órgão local do MTE (SRTE);
 *  (II) ao sindicato representativo da categoria profissional;
 *  (III) por edital afixado nos locais de trabalho.
 */

export interface ComunicadoColetivasInput {
  coletiva: {
    id: string;
    data_inicio: string;
    data_fim: string;
    dias: number;
    departamentos?: string[] | null;
    justificativa?: string | null;
  };
  empresa: {
    razao_social?: string | null;
    nome?: string | null;
    cnpj?: string | null;
    endereco?: string | null;
    cidade?: string | null;
    uf?: string | null;
  };
  sindicato: {
    nome: string;
    endereco?: string | null;
    cnpj?: string | null;
  };
  totalColaboradores: number;
}

export interface ComunicadoResult {
  blob: Blob;
  bytes: Uint8Array;
  hash: string;
  filename: string;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const fmtDate = (d: string | Date) => format(new Date(d), "dd/MM/yyyy", { locale: ptBR });
const empresaNome = (e: ComunicadoColetivasInput['empresa']) =>
  e.razao_social || e.nome || '—';

function baseDoc() {
  return new jsPDF({ unit: 'mm', format: 'a4' });
}

function cabecalhoEmpresa(doc: jsPDF, empresa: ComunicadoColetivasInput['empresa']) {
  doc.setFont('helvetica', 'bold').setFontSize(11);
  doc.text(empresaNome(empresa).toUpperCase(), 20, 20);
  doc.setFont('helvetica', 'normal').setFontSize(9);
  if (empresa.cnpj) doc.text(`CNPJ: ${empresa.cnpj}`, 20, 25);
  const end = [empresa.endereco, empresa.cidade, empresa.uf].filter(Boolean).join(' — ');
  if (end) doc.text(end, 20, 30);
  doc.setLineWidth(0.3);
  doc.line(20, 33, 190, 33);
}

async function finalize(doc: jsPDF, filename: string): Promise<ComunicadoResult> {
  const ab = doc.output('arraybuffer');
  const bytes = new Uint8Array(ab);
  const hash = await sha256Hex(bytes);
  const blob = new Blob([ab], { type: 'application/pdf' });
  return { blob, bytes, hash, filename };
}

/** Ofício ao MTE / SRTE */
export async function gerarComunicadoMTE(input: ComunicadoColetivasInput): Promise<ComunicadoResult> {
  const { coletiva, empresa, totalColaboradores } = input;
  const doc = baseDoc();
  cabecalhoEmpresa(doc, empresa);

  const cidade = empresa.cidade || '__________';
  const uf = empresa.uf || '__';

  doc.setFont('helvetica', 'bold').setFontSize(12);
  doc.text('COMUNICADO DE FÉRIAS COLETIVAS — MTE/SRTE', 105, 45, { align: 'center' });
  doc.setFont('helvetica', 'normal').setFontSize(9);
  doc.text('Fundamento legal: CLT arts. 139 a 141 (Decreto-Lei nº 5.452/1943)', 105, 50, {
    align: 'center',
  });

  doc.setFontSize(10);
  doc.text(`${cidade}/${uf}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 20, 62);

  doc.setFont('helvetica', 'bold').text('Ao', 20, 72);
  doc.text('Ministério do Trabalho e Emprego — Superintendência Regional do Trabalho', 20, 77);
  doc.setFont('helvetica', 'normal');

  doc.setFont('helvetica', 'bold').text('Assunto:', 20, 87);
  doc.setFont('helvetica', 'normal').text('Comunicação de concessão de férias coletivas', 42, 87);

  const corpo = [
    `Prezados Senhores,`,
    ``,
    `A empresa ${empresaNome(empresa)}, inscrita no CNPJ nº ${empresa.cnpj || '__________'}, ` +
      `em cumprimento ao disposto no art. 139, §2º da CLT, vem COMUNICAR, com antecedência ` +
      `mínima de 15 (quinze) dias, a concessão de FÉRIAS COLETIVAS a seus empregados, ` +
      `nas seguintes condições:`,
    ``,
    `• Período de gozo: de ${fmtDate(coletiva.data_inicio)} a ${fmtDate(coletiva.data_fim)} (${coletiva.dias} dias corridos).`,
    `• Total de empregados abrangidos: ${totalColaboradores}.`,
    coletiva.departamentos && coletiva.departamentos.length
      ? `• Setores/estabelecimentos: ${coletiva.departamentos.join(', ')}.`
      : `• Abrangência: todos os setores da empresa.`,
    coletiva.justificativa
      ? `• Justificativa: ${coletiva.justificativa}.`
      : '',
    ``,
    `Informamos que, nos termos do art. 141 da CLT, os empregados serão notificados ` +
      `por escrito com antecedência mínima de 30 (trinta) dias e o pagamento das férias ` +
      `e do respectivo terço constitucional (art. 7º, XVII, CF/88) será efetuado em até ` +
      `2 (dois) dias antes do início do período (art. 145 da CLT).`,
    ``,
    `Cópia deste comunicado será encaminhada ao sindicato representativo da categoria ` +
      `profissional e afixada nos locais de trabalho.`,
    ``,
    `Atenciosamente,`,
  ];

  doc.setFontSize(10);
  let y = 97;
  corpo.forEach((linha) => {
    const wrapped = doc.splitTextToSize(linha, 170);
    doc.text(wrapped, 20, y);
    y += wrapped.length * 5 + 1;
  });

  // Assinatura
  y = Math.max(y + 15, 235);
  doc.line(60, y, 150, y);
  doc.setFontSize(9);
  doc.text(empresaNome(empresa), 105, y + 5, { align: 'center' });
  doc.text(`CNPJ ${empresa.cnpj || '—'}`, 105, y + 10, { align: 'center' });

  // Rodapé de integridade
  doc.setFontSize(7).setTextColor(120);
  doc.text(
    `Documento gerado eletronicamente em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — coletiva #${coletiva.id.slice(0, 8)}`,
    105,
    287,
    { align: 'center' },
  );

  const filename = `mte_${coletiva.id}_${format(new Date(), 'yyyyMMddHHmm')}.pdf`;
  return finalize(doc, filename);
}

/** Ofício ao Sindicato profissional */
export async function gerarComunicadoSindicato(input: ComunicadoColetivasInput): Promise<ComunicadoResult> {
  const { coletiva, empresa, sindicato, totalColaboradores } = input;
  const doc = baseDoc();
  cabecalhoEmpresa(doc, empresa);

  const cidade = empresa.cidade || '__________';
  const uf = empresa.uf || '__';

  doc.setFont('helvetica', 'bold').setFontSize(12);
  doc.text('COMUNICADO DE FÉRIAS COLETIVAS — SINDICATO', 105, 45, { align: 'center' });
  doc.setFont('helvetica', 'normal').setFontSize(9);
  doc.text('Fundamento legal: CLT art. 139, §2º', 105, 50, { align: 'center' });

  doc.setFontSize(10);
  doc.text(`${cidade}/${uf}, ${format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 20, 62);

  doc.setFont('helvetica', 'bold').text('Ao', 20, 72);
  doc.text(sindicato.nome, 20, 77);
  doc.setFont('helvetica', 'normal');
  if (sindicato.endereco) doc.text(sindicato.endereco, 20, 82);
  if (sindicato.cnpj) doc.text(`CNPJ: ${sindicato.cnpj}`, 20, 87);

  doc.setFont('helvetica', 'bold').text('Assunto:', 20, 97);
  doc.setFont('helvetica', 'normal').text(
    'Comunicação de concessão de férias coletivas aos empregados representados',
    42,
    97,
  );

  const dataLimite = subDays(new Date(coletiva.data_inicio), 15);

  const corpo = [
    `Prezados Senhores,`,
    ``,
    `A empresa ${empresaNome(empresa)}, CNPJ ${empresa.cnpj || '__________'}, vem, ` +
      `em observância ao art. 139, §2º da CLT, COMUNICAR a esse d. Sindicato a concessão ` +
      `de FÉRIAS COLETIVAS aos seus empregados representados pela categoria, ` +
      `nas seguintes condições:`,
    ``,
    `• Período: ${fmtDate(coletiva.data_inicio)} a ${fmtDate(coletiva.data_fim)} (${coletiva.dias} dias).`,
    `• Empregados abrangidos: ${totalColaboradores}.`,
    coletiva.departamentos && coletiva.departamentos.length
      ? `• Setores: ${coletiva.departamentos.join(', ')}.`
      : `• Abrangência: integralidade do quadro.`,
    ``,
    `Esta comunicação é feita com antecedência mínima de 15 (quinze) dias em relação ` +
      `ao início do gozo (prazo-limite: ${fmtDate(dataLimite)}), conforme exigido pela ` +
      `legislação vigente. O pagamento das férias e do terço constitucional será ` +
      `realizado até 2 (dois) dias antes do início do período (art. 145 da CLT).`,
    ``,
    `Solicitamos o de acordo dessa entidade sindical e nos colocamos à disposição ` +
      `para eventuais esclarecimentos.`,
    ``,
    `Atenciosamente,`,
  ];

  doc.setFontSize(10);
  let y = 107;
  corpo.forEach((linha) => {
    const wrapped = doc.splitTextToSize(linha, 170);
    doc.text(wrapped, 20, y);
    y += wrapped.length * 5 + 1;
  });

  y = Math.max(y + 15, 235);
  doc.line(60, y, 150, y);
  doc.setFontSize(9);
  doc.text(empresaNome(empresa), 105, y + 5, { align: 'center' });
  doc.text(`CNPJ ${empresa.cnpj || '—'}`, 105, y + 10, { align: 'center' });

  // Ciência do sindicato
  y += 25;
  doc.setFontSize(9).setFont('helvetica', 'bold').text('Ciência do Sindicato', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.line(20, y + 15, 100, y + 15);
  doc.text('Assinatura / Carimbo', 60, y + 20, { align: 'center' });
  doc.line(115, y + 15, 190, y + 15);
  doc.text('Data', 152, y + 20, { align: 'center' });

  doc.setFontSize(7).setTextColor(120);
  doc.text(
    `Documento gerado eletronicamente em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — coletiva #${coletiva.id.slice(0, 8)}`,
    105,
    287,
    { align: 'center' },
  );

  const filename = `sindicato_${coletiva.id}_${format(new Date(), 'yyyyMMddHHmm')}.pdf`;
  return finalize(doc, filename);
}
