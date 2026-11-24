import { toast } from 'sonner';
import { RescisaoResult, fmt } from './rescisaoCalc';
import { supabase } from '@/integrations/supabase/client';

export async function gerarPDFRescisao(form: any, result: RescisaoResult, auditoriaParam?: any) {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');

  // Buscar trilha de auditoria se não fornecida
  let auditoria = auditoriaParam;
  if (!auditoria && form.id) {
    const { data } = await supabase
      .from('audit_log')
      .select('*')
      .eq('registro_id', form.id)
      .eq('tabela', 'desligamentos')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    auditoria = data;
  }

  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  let y = 20;


  // Header com selo de auditoria se disponível
  if (auditoria) {
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text(`Doc ID: ${auditoria.id || 'N/A'} | Assinado digitalmente pela trilha de auditoria`, 14, 10);
    doc.setTextColor(0);
  }

  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('TERMO DE RESCISÃO DO CONTRATO DE TRABALHO', pw / 2, y, { align: 'center' }); y += 12;

  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`Colaborador: ${form.nomeColaborador || '—'}`, 14, y); y += 6;
  doc.text(`CPF: ${form.cpf || '—'}`, 14, y); y += 6;
  doc.text(`Cargo: ${form.cargo || '—'}`, 14, y); y += 6;
  doc.text(`Admissão: ${form.dataAdmissao ? new Date(form.dataAdmissao).toLocaleDateString('pt-BR') : '—'}`, 14, y);
  doc.text(`Desligamento: ${form.dataDesligamento ? new Date(form.dataDesligamento).toLocaleDateString('pt-BR') : '—'}`, 110, y); y += 6;
  doc.text(`Tipo: ${form.tipo === 'sem_justa_causa' ? 'Sem Justa Causa' : form.tipo === 'justa_causa' ? 'Justa Causa' : 'Pedido de Demissão'}`, 14, y); y += 10;

  (doc as any).autoTable({
    startY: y,
    head: [['Verba', 'Referência', 'Valor (R$)']],
    body: [
      ['Saldo de Salário', `${result.diasTrabalhados} dias`, fmt(result.saldoSalario)],
      ['Aviso Prévio Indenizado', `${result.diasAviso} dias`, fmt(result.avisoIndenizado)],
      ['Férias Vencidas', result.feriasVencidas > 0 ? '30 dias' : '—', fmt(result.feriasVencidas)],
      ['Férias Proporcionais', `${result.mesesFerias}/12 avos`, fmt(result.feriasProporcionais)],
      ['1/3 Constitucional', '', fmt(result.tercoFerias)],
      ['13º Proporcional', `${result.meses13}/12 avos`, fmt(result.decimoTerceiro)],
      ['', 'TOTAL PROVENTOS', fmt(result.totalProventos)],
      ['INSS', '', `(${fmt(result.inss)})`],
      ['IRRF', '', `(${fmt(result.irrf)})`],
      ['', 'TOTAL DESCONTOS', `(${fmt(result.totalDescontos)})`],
      ['Multa FGTS (40%)', '', fmt(result.multaFGTS)],
      ['FGTS s/ Rescisão', '', fmt(result.fgtsRescisao)],
      ['', 'VALOR LÍQUIDO', fmt(result.totalLiquido)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });

  y = (doc as any).lastAutoTable.finalY + 15;
  
  // Checklist de Homologação se disponível no form (desligamento object)
  if (form.checklist_homologacao !== undefined) {
    doc.setFont('helvetica', 'bold');
    doc.text('CHECKLIST DE HOMOLOGAÇÃO', 14, y); y += 8;
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
      doc.text(`${label}: ${status}`, 20, y); y += 5;
    });
    y += 5;
  }

  const hoje = new Date().toLocaleDateString('pt-BR');
  doc.text(`Data: ${hoje}`, pw / 2, y, { align: 'center' }); y += 20;
  doc.line(14, y, 90, y); doc.line(pw - 90, y, pw - 14, y); y += 5;
  doc.setFontSize(9);
  doc.text('EMPREGADOR', 52, y, { align: 'center' });
  doc.text('EMPREGADO(A)', pw - 52, y, { align: 'center' });

  if (auditoria) {
     y += 10;
     doc.setFontSize(7); doc.setTextColor(180);
     doc.text(`Hash de Integridade: ${auditoria.hash || 'N/A'}`, 14, y);
  }

  doc.save(`TRCT_${(form.nomeColaborador || form.nome || 'rescisao').replace(/\s/g, '_')}.pdf`);
  toast.success('TRCT gerado com sucesso!');
}

