import { toast } from 'sonner';
import { RescisaoResult, fmt } from './rescisaoCalc';
import { auditoriaService, type TrilhaAuditoriaRegistro } from '@/services/auditoriaService';

interface RescisaoPdfForm {
  id?: string;
  empresa_id?: string;
  nome?: string | null;
  nomeColaborador?: string | null;
  cpf?: string | null;
  cargo?: string | null;
  dataAdmissao?: string | null;
  dataDesligamento?: string | null;
  tipo?: string | null;
  checklist_comunicacao?: boolean | null;
  checklist_documentacao?: boolean | null;
  checklist_calculo_rescisao?: boolean | null;
  checklist_devolucao_equipamentos?: boolean | null;
  checklist_homologacao?: boolean | null;
  checklist_pagamento?: boolean | null;
  [key: string]: unknown;
}

export type AuditoriaPdf = TrilhaAuditoriaRegistro & { hash?: string };

const TIPO_LABELS: Record<string, string> = {
  sem_justa_causa: 'Sem Justa Causa',
  justa_causa: 'Justa Causa',
  pedido_demissao: 'Pedido de Demissão',
  acordo_mutuo: 'Acordo Mútuo (Art. 484-A)',
  acordo: 'Acordo Mútuo (Art. 484-A)',
  culpa_reciproca: 'Culpa Recíproca',
  termino_contrato: 'Término de Contrato a Prazo',
  fim_contrato: 'Término de Contrato a Prazo',
  falecimento: 'Falecimento',
};

// `desligamentos` persiste as verbas decompostas em colunas snake_case (não o
// JSON do motor). Monta um RescisaoResult aproximado para o PDF — campos não
// persistidos (indenizações 479/480, desconto de aviso, multa 477 e
// informativos) saem zerados, que é o que o PDF já exibia antes.
export function mapearResultadoDeDesligamento(d: {
  saldo_salario?: number | null;
  aviso_previo?: number | null;
  ferias_vencidas?: number | null;
  ferias_proporcionais?: number | null;
  terco_constitucional?: number | null;
  decimo_terceiro?: number | null;
  multa_fgts?: number | null;
  total_proventos?: number | null;
  total_descontos?: number | null;
  valor_liquido?: number | null;
  detalhes_calculo?: { inss?: number; irrf?: number } | null;
}): RescisaoResult {
  const n = (v?: number | null) => v ?? 0;
  return {
    saldoSalario: n(d.saldo_salario),
    avisoIndenizado: n(d.aviso_previo),
    descontoAvisoPrevio: 0,
    feriasVencidas: n(d.ferias_vencidas),
    feriasProporcionais: n(d.ferias_proporcionais),
    tercoFerias: n(d.terco_constitucional),
    decimoTerceiro: n(d.decimo_terceiro),
    indenizacaoArt479: 0,
    indenizacaoArt480: 0,
    multa477: 0,
    multaFGTS: n(d.multa_fgts),
    fgtsRescisao: 0,
    fgtsSaquePercentual: 0,
    seguroDesemprego: { elegivel: false, parcelas: 0, valorParcela: 0 },
    totalProventos: n(d.total_proventos),
    inss: n(d.detalhes_calculo?.inss),
    irrf: n(d.detalhes_calculo?.irrf),
    totalDescontos: n(d.total_descontos),
    totalLiquido: n(d.valor_liquido),
    diasTrabalhados: 0,
    mesesFerias: 0,
    meses13: 0,
    diasAviso: 0,
    diasAvisoNaoCumpridos: 0,
    timestamp: '',
  };
}

export async function gerarPDFRescisao(
  form: RescisaoPdfForm,
  result: RescisaoResult,
  auditoriaParam?: AuditoriaPdf | null
) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  // Buscar trilha de auditoria se não fornecida
  let auditoria = auditoriaParam;
  if (!auditoria && form.id && form.empresa_id) {
    try {
      const [registro] = await auditoriaService.listarTrilha({
        empresa_id: form.empresa_id,
        tabela: 'desligamentos',
        registro_id: form.id,
        limite: 1,
      });
      auditoria = registro;
    } catch {
      // Audit metadata enriches the PDF but is not required to generate an
      // unsigned draft. The PDF only displays the audit seal when a verified
      // record was actually returned.
      auditoria = null;
    }
  }

  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header com selo de auditoria se disponível
  if (auditoria) {
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Doc ID: ${auditoria.id || 'N/A'} | Assinado digitalmente pela trilha de auditoria`, 14, 10);
    doc.setTextColor(0);
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TERMO DE RESCISÃO DO CONTRATO DE TRABALHO', pw / 2, y, { align: 'center' });
  y += 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Colaborador: ${form.nomeColaborador || '—'}`, 14, y);
  y += 6;
  doc.text(`CPF: ${form.cpf || '—'}`, 14, y);
  y += 6;
  doc.text(`Cargo: ${form.cargo || '—'}`, 14, y);
  y += 6;
  doc.text(`Admissão: ${form.dataAdmissao ? new Date(form.dataAdmissao).toLocaleDateString('pt-BR') : '—'}`, 14, y);
  doc.text(
    `Desligamento: ${form.dataDesligamento ? new Date(form.dataDesligamento).toLocaleDateString('pt-BR') : '—'}`,
    110,
    y
  );
  y += 6;
  doc.text(`Tipo: ${TIPO_LABELS[form.tipo ?? ''] ?? form.tipo ?? '—'}`, 14, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['Verba', 'Referência', 'Valor (R$)']],
    body: [
      ['Saldo de Salário', `${result.diasTrabalhados} dias`, fmt(result.saldoSalario)],
      ['Aviso Prévio Indenizado', `${result.diasAviso} dias`, fmt(result.avisoIndenizado)],
      ['Férias Vencidas', result.feriasVencidas > 0 ? '30 dias' : '—', fmt(result.feriasVencidas)],
      ['Férias Proporcionais', `${result.mesesFerias}/12 avos`, fmt(result.feriasProporcionais)],
      ['1/3 Constitucional', '', fmt(result.tercoFerias)],
      ['13º Proporcional', `${result.meses13}/12 avos`, fmt(result.decimoTerceiro)],
      ...(result.indenizacaoArt479 > 0
        ? [['Indenização Art. 479 (contrato a prazo)', '', fmt(result.indenizacaoArt479)]]
        : []),
      ...(result.multa477 > 0 ? [['Multa Art. 477 §8º (pagamento em atraso)', '', fmt(result.multa477)]] : []),
      ['', 'TOTAL PROVENTOS', fmt(result.totalProventos)],
      ['INSS', '', `(${fmt(result.inss)})`],
      ['IRRF', '', `(${fmt(result.irrf)})`],
      ...(result.descontoAvisoPrevio > 0
        ? [['Aviso não cumprido (Art. 487 §2º)', '', `(${fmt(result.descontoAvisoPrevio)})`]]
        : []),
      ...(result.indenizacaoArt480 > 0
        ? [['Indenização Art. 480 (contrato a prazo)', '', `(${fmt(result.indenizacaoArt480)})`]]
        : []),
      ['', 'TOTAL DESCONTOS', `(${fmt(result.totalDescontos)})`],
      ['Multa FGTS (GRRF — fora do líquido)', '', fmt(result.multaFGTS)],
      ['FGTS s/ Rescisão', '', fmt(result.fgtsRescisao)],
      ...(result.fgtsSaquePercentual > 0
        ? [[`Saque FGTS permitido`, '', `${Math.round(result.fgtsSaquePercentual * 100)}%`]]
        : []),
      ...(result.seguroDesemprego?.elegivel
        ? [
            [
              'Seguro-desemprego (informativo)',
              `${result.seguroDesemprego.parcelas} parcelas`,
              fmt(result.seguroDesemprego.valorParcela),
            ],
          ]
        : []),
      ['', 'VALOR LÍQUIDO', fmt(result.totalLiquido)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Checklist de Homologação se disponível no form (desligamento object)
  if (form.checklist_homologacao !== undefined) {
    doc.setFont('helvetica', 'bold');
    doc.text('CHECKLIST DE HOMOLOGAÇÃO', 14, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const items = [
      ['Comunicação', form.checklist_comunicacao ? '✓ OK' : '—'],
      ['Documentação', form.checklist_documentacao ? '✓ OK' : '—'],
      ['Cálculo', form.checklist_calculo_rescisao ? '✓ OK' : '—'],
      ['Equipamentos', form.checklist_devolucao_equipamentos ? '✓ OK' : '—'],
      ['Homologação', form.checklist_homologacao ? '✓ OK' : '—'],
      ['Pagamento', form.checklist_pagamento ? '✓ OK' : '—'],
    ];
    items.forEach(([label, status]) => {
      doc.text(`${label}: ${status}`, 20, y);
      y += 5;
    });
    y += 5;
  }

  const hoje = new Date().toLocaleDateString('pt-BR');
  doc.text(`Data: ${hoje}`, pw / 2, y, { align: 'center' });
  y += 20;
  doc.line(14, y, 90, y);
  doc.line(pw - 90, y, pw - 14, y);
  y += 5;
  doc.setFontSize(9);
  doc.text('EMPREGADOR', 52, y, { align: 'center' });
  doc.text('EMPREGADO(A)', pw - 52, y, { align: 'center' });

  if (auditoria) {
    y += 10;
    doc.setFontSize(7);
    doc.setTextColor(180);
    doc.text(`Hash de Integridade: ${auditoria.hash || 'N/A'}`, 14, y);
  }

  doc.save(`TRCT_${(form.nomeColaborador || form.nome || 'rescisao').replace(/\s/g, '_')}.pdf`);
  toast.success('TRCT gerado com sucesso!');
}
