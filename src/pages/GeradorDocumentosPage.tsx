import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresa } from '@/contexts';
import { FileText, Download, Eye, Printer, FileSignature, ScrollText, Shield, UserCheck, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import jsPDF from 'jspdf';

const TEMPLATES = [
  { id: 'contrato_trabalho', title: 'Contrato de Trabalho', description: 'Contrato CLT padrão com todas as cláusulas obrigatórias', icon: FileSignature, gradient: 'from-primary to-primary-glow', category: 'Admissão' },
  { id: 'termo_responsabilidade', title: 'Termo de Responsabilidade', description: 'Termo para equipamentos e bens da empresa', icon: Shield, gradient: 'from-info to-info/70', category: 'Operacional' },
  { id: 'declaracao_vinculo', title: 'Declaração de Vínculo', description: 'Declaração de vínculo empregatício ativo', icon: ScrollText, gradient: 'from-success to-success/70', category: 'Declarações' },
  { id: 'termo_confidencialidade', title: 'Termo de Confidencialidade', description: 'NDA - Acordo de não divulgação', icon: Shield, gradient: 'from-warning to-warning/70', category: 'Compliance' },
  { id: 'aviso_ferias', title: 'Aviso de Férias', description: 'Comunicado oficial de período de férias', icon: FileText, gradient: 'from-primary-glow to-primary', category: 'Férias' },
  { id: 'recibo_entrega_doc', title: 'Recibo de Entrega', description: 'Comprovante de entrega de documentos', icon: UserCheck, gradient: 'from-destructive to-destructive/70', category: 'Operacional' },
  { id: 'advertencia', title: 'Advertência', description: 'Documento de advertência disciplinar', icon: FileText, gradient: 'from-destructive to-warning', category: 'Disciplinar' },
  { id: 'termo_rescisao', title: 'Termo de Rescisão', description: 'TRCT - Termo de rescisão do contrato', icon: FileSignature, gradient: 'from-muted-foreground to-muted-foreground/70', category: 'Desligamento' },
];

function gerarPDF(template: string, colaborador: any, empresa: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 25;

  // Header
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(empresa?.razao_social || 'Empresa', margin, y);
  doc.text(`CNPJ: ${empresa?.cnpj || '—'}`, margin, y + 5);
  y += 20;

  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  const nome = colaborador?.nome_completo || '____________________';
  const cpf = colaborador?.cpf || '____________________';
  const cargo = colaborador?.cargo || '____________________';
  const salario = colaborador?.salario_base ? `R$ ${Number(colaborador.salario_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '____________________';
  const admissao = colaborador?.data_admissao ? new Date(colaborador.data_admissao).toLocaleDateString('pt-BR') : '____________________';
  const hoje = new Date().toLocaleDateString('pt-BR');

  doc.setTextColor(0);

  switch (template) {
    case 'contrato_trabalho': {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTRATO INDIVIDUAL DE TRABALHO', pageWidth / 2, y, { align: 'center' });
      y += 15;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const contratoText = [
        `Pelo presente instrumento particular de contrato individual de trabalho, de um lado ${empresa?.razao_social || '____'}, inscrita no CNPJ sob nº ${empresa?.cnpj || '____'}, doravante denominada EMPREGADORA, e de outro lado ${nome}, portador(a) do CPF nº ${cpf}, doravante denominado(a) EMPREGADO(A), celebram o presente contrato de trabalho, regido pela CLT e legislação complementar, mediante as seguintes cláusulas:`,
        '',
        'CLÁUSULA 1ª - DA FUNÇÃO',
        `O(A) EMPREGADO(A) exercerá a função de ${cargo}, comprometendo-se a executar as atividades inerentes ao cargo com zelo e dedicação.`,
        '',
        'CLÁUSULA 2ª - DA REMUNERAÇÃO',
        `O(A) EMPREGADO(A) receberá a título de salário mensal o valor de ${salario}, pagável até o 5º dia útil do mês subsequente ao trabalhado.`,
        '',
        'CLÁUSULA 3ª - DA JORNADA DE TRABALHO',
        'A jornada de trabalho será de 44 (quarenta e quatro) horas semanais, de segunda a sexta-feira, com intervalo para repouso e alimentação conforme legislação vigente.',
        '',
        'CLÁUSULA 4ª - DO PERÍODO DE EXPERIÊNCIA',
        'O presente contrato terá período de experiência de 45 (quarenta e cinco) dias, prorrogável por igual período, totalizando 90 (noventa) dias.',
        '',
        'CLÁUSULA 5ª - DAS OBRIGAÇÕES',
        'O(A) EMPREGADO(A) obriga-se a cumprir o regulamento interno da empresa, manter sigilo sobre informações confidenciais e zelar pelo patrimônio da EMPREGADORA.',
      ];
      contratoText.forEach(line => {
        if (y > 270) { doc.addPage(); y = 25; }
        if (line === '') { y += 4; return; }
        if (line.startsWith('CLÁUSULA')) { doc.setFont('helvetica', 'bold'); }
        const lines = doc.splitTextToSize(line, pageWidth - 2 * margin);
        doc.text(lines, margin, y);
        y += lines.length * 5.5;
        doc.setFont('helvetica', 'normal');
      });
      break;
    }

    case 'declaracao_vinculo': {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('DECLARAÇÃO DE VÍNCULO EMPREGATÍCIO', pageWidth / 2, y, { align: 'center' });
      y += 20;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const declText = `Declaramos para os devidos fins que ${nome}, portador(a) do CPF nº ${cpf}, é funcionário(a) desta empresa desde ${admissao}, exercendo a função de ${cargo}, com remuneração mensal de ${salario}.\n\nDeclaramos ainda que o(a) referido(a) funcionário(a) encontra-se em pleno exercício de suas funções nesta data.\n\nPor ser expressão da verdade, firmamos a presente declaração.`;
      const declLines = doc.splitTextToSize(declText, pageWidth - 2 * margin);
      doc.text(declLines, margin, y);
      break;
    }

    case 'aviso_ferias': {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('AVISO DE FÉRIAS', pageWidth / 2, y, { align: 'center' });
      y += 20;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const feriasText = `Comunicamos ao(à) Sr(a). ${nome}, CPF ${cpf}, ocupante do cargo de ${cargo}, que suas férias foram programadas conforme abaixo:\n\nPeríodo Aquisitivo: ____/____/____ a ____/____/____\nPeríodo de Gozo: ____/____/____ a ____/____/____\nDias de Férias: 30 dias\nAbono Pecuniário: ( ) Sim  ( ) Não\n\nSolicitamos que tome ciência e assine este documento.`;
      const feriasLines = doc.splitTextToSize(feriasText, pageWidth - 2 * margin);
      doc.text(feriasLines, margin, y);
      break;
    }

    default: {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const titles: Record<string, string> = {
        termo_responsabilidade: 'TERMO DE RESPONSABILIDADE',
        termo_confidencialidade: 'TERMO DE CONFIDENCIALIDADE E NÃO DIVULGAÇÃO',
        recibo_entrega_doc: 'RECIBO DE ENTREGA DE DOCUMENTOS',
        advertencia: 'ADVERTÊNCIA DISCIPLINAR',
        termo_rescisao: 'TERMO DE RESCISÃO DO CONTRATO DE TRABALHO',
      };
      doc.text(titles[template] || 'DOCUMENTO', pageWidth / 2, y, { align: 'center' });
      y += 20;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Colaborador: ${nome}`, margin, y); y += 7;
      doc.text(`CPF: ${cpf}`, margin, y); y += 7;
      doc.text(`Cargo: ${cargo}`, margin, y); y += 7;
      doc.text(`Salário: ${salario}`, margin, y); y += 7;
      doc.text(`Data de Admissão: ${admissao}`, margin, y); y += 15;
      const genericText = doc.splitTextToSize(
        'O presente documento tem por finalidade formalizar os termos e condições abaixo descritos, conforme legislação trabalhista vigente. As partes declaram ciência e concordância com todos os itens constantes neste instrumento.',
        pageWidth - 2 * margin
      );
      doc.text(genericText, margin, y);
      break;
    }
  }

  // Footer with signatures
  y = 240;
  if (y > 250) { doc.addPage(); y = 200; }
  doc.setFontSize(10);
  doc.text(`${empresa?.cidade || '____'}, ${hoje}`, pageWidth / 2, y, { align: 'center' });
  y += 25;
  doc.line(margin, y, margin + 70, y);
  doc.line(pageWidth - margin - 70, y, pageWidth - margin, y);
  y += 5;
  doc.setFontSize(9);
  doc.text('EMPREGADOR', margin + 35, y, { align: 'center' });
  doc.text('EMPREGADO(A)', pageWidth - margin - 35, y, { align: 'center' });

  return doc;
}

export default function GeradorDocumentosPage() {
  const { empresaAtual } = useEmpresa();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedColaborador, setSelectedColaborador] = useState<string>('');
  const [generating, setGenerating] = useState(false);

  const { data: colaboradores = [], isLoading } = useQuery({
    queryKey: ['colaboradores_ativos', empresaAtual?.id],
    enabled: !!empresaAtual?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from('colaboradores')
        .select('id, nome_completo, cpf, cargo, departamento, salario_base, data_admissao')
        .eq('empresa_id', empresaAtual!.id)
        .eq('status', 'ativo')
        .order('nome_completo');
      if (error) throw error;
      return data || [];
    },
  });

  const handleGenerate = async (action: 'download' | 'preview') => {
    if (!selectedColaborador) { toast.error('Selecione um colaborador'); return; }
    setGenerating(true);
    try {
      const colaborador = colaboradores.find((c: any) => c.id === selectedColaborador);
      const pdf = gerarPDF(selectedTemplate!, colaborador, empresaAtual);
      const templateName = TEMPLATES.find(t => t.id === selectedTemplate)?.title || 'documento';

      if (action === 'download') {
        pdf.save(`${templateName.replace(/\s/g, '_')}_${colaborador?.nome_completo?.replace(/\s/g, '_') || 'doc'}.pdf`);
        toast.success('Documento gerado com sucesso!');
      } else {
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
      }
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro ao gerar documento.'));
    } finally {
      setGenerating(false);
    }
  };

  const template = TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <>
    <PageTitle title="Gerador de Documentos" description="Geração automática de documentos" />
    <PageLayout
      title="Gerador de Documentos"
      description="Gere contratos, declarações e termos automaticamente"
      icon={<Sparkles className="h-5 w-5 text-primary-foreground" />}
      gradient="from-primary to-primary-glow"
    >
      {/* Category badges */}
      <div className="flex gap-2 flex-wrap mb-6">
        {['Todos', ...new Set(TEMPLATES.map(t => t.category))].map(cat => (
          <Badge key={cat} variant="outline" className="cursor-pointer hover:bg-primary/10 transition-colors font-body">
            {cat}
          </Badge>
        ))}
      </div>

      {/* Templates grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {TEMPLATES.map(({ id, title, description, icon: Icon, gradient, category }, i) => (
          <motion.div key={id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card
              className="group border border-border/30 hover:border-primary/40 shadow-elevated hover:shadow-glow transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer"
              onClick={() => setSelectedTemplate(id)}
            >
              <div className={cn("h-[2px] bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity", gradient)} />
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shadow-lg group-hover:scale-110 transition-transform", gradient)}>
                    <Icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <Badge variant="outline" className="text-[10px] font-body">{category}</Badge>
                </div>
                <CardTitle className="text-sm font-display mt-3">{title}</CardTitle>
                <CardDescription className="text-xs font-body">{description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button variant="ghost" size="sm" className="w-full rounded-xl text-xs font-body hover:bg-primary/5">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />Gerar Documento
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Generation Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {template && <div className={cn("p-2 rounded-xl bg-gradient-to-br", template.gradient)}>
                <template.icon className="h-4 w-4 text-primary-foreground" />
              </div>}
              {template?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body font-medium">Colaborador</Label>
              {isLoading ? <Spinner /> : (
                <Select value={selectedColaborador} onValueChange={setSelectedColaborador}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecione o colaborador" /></SelectTrigger>
                  <SelectContent>
                    {colaboradores.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome_completo} — {c.cargo || 'Sem cargo'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {selectedColaborador && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-muted/30 rounded-xl p-3 space-y-1">
                {(() => {
                  const c = colaboradores.find((c: any) => c.id === selectedColaborador);
                  return c ? (
                    <>
                      <p className="text-xs font-body"><span className="text-muted-foreground">CPF:</span> {c.cpf || '—'}</p>
                      <p className="text-xs font-body"><span className="text-muted-foreground">Cargo:</span> {c.cargo || '—'}</p>
                      <p className="text-xs font-body"><span className="text-muted-foreground">Salário:</span> {c.salario_base ? `R$ ${Number(c.salario_base).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</p>
                      <p className="text-xs font-body"><span className="text-muted-foreground">Admissão:</span> {c.data_admissao ? new Date(c.data_admissao).toLocaleDateString('pt-BR') : '—'}</p>
                    </>
                  ) : null;
                })()}
              </motion.div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleGenerate('preview')} disabled={generating || !selectedColaborador} className="rounded-xl font-body">
              <Eye className="h-4 w-4 mr-2" />Visualizar
            </Button>
            <Button onClick={() => handleGenerate('download')} disabled={generating || !selectedColaborador} className="rounded-xl bg-gradient-to-r from-primary to-primary-glow font-body">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
    </>
  );
}
