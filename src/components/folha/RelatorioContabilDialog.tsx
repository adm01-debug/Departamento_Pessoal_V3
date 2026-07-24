import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FileSpreadsheet, Download, Loader2, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

interface RelatorioContabilDialogProps {
  folhaId: string;
}

export function RelatorioContabilDialog({ folhaId }: RelatorioContabilDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Fetch folha items (detailed)
      const { data: itens, error: hError } = await supabase
        .from('folha_itens')
        .select(`
          *,
          colaborador:colaboradores(nome_completo, departamento, centro_custo)
        `)
        .eq('folha_id', folhaId);
      
      if (hError) throw hError;
      if (!itens || itens.length === 0) throw new Error('Nenhum dado encontrado para esta folha.');

      // Header para Reconciliação Contábil Analítica (Padrão SPED/ERP)
      const csvLines = ['Data;Conta Contabil;Centro de Custo;Debito;Credito;Descricao;Colaborador;CPF'];
      const dataHoje = new Date().toLocaleDateString('pt-BR');
      
      itens.forEach(item => {
        const colab = item.colaborador as any;
        const detalhes = item.detalhes as any;
        const eventos = detalhes?.detalheEventos || [];
        const cc = colab.centro_custo || 'GERAL';

        eventos.forEach((ev: any) => {
          const isProvento = ev.tipo === 'provento';
          // Lançamento de Provento (D: Despesa Salarial, C: Salários a Pagar)
          if (isProvento) {
            csvLines.push(`${dataHoje};DESPESA_SALARIAL;${cc};${ev.valor.toFixed(2)};0;${ev.descricao};${colab.nome_completo};${colab.cpf || ''}`);
            csvLines.push(`${dataHoje};SALARIOS_A_PAGAR;${cc};0;${ev.valor.toFixed(2)};${ev.descricao};${colab.nome_completo};${colab.cpf || ''}`);
          } else {
            // Lançamento de Desconto (D: Salários a Pagar, C: Conta de Passivo/Desconto)
            csvLines.push(`${dataHoje};SALARIOS_A_PAGAR;${cc};${ev.valor.toFixed(2)};0;${ev.descricao};${colab.nome_completo};${colab.cpf || ''}`);
            csvLines.push(`${dataHoje};PASSIVO_${ev.descricao.toUpperCase().replace(/\s/g, '_')};${cc};0;${ev.valor.toFixed(2)};Retencao ${ev.descricao};${colab.nome_completo};${colab.cpf || ''}`);
          }
        });

        // Provisão de FGTS (Encargo Patronal)
        const fgts = Number(item.fgts_mes);
        if (fgts > 0) {
          csvLines.push(`${dataHoje};DESPESA_FGTS;${cc};${fgts.toFixed(2)};0;Provisao FGTS;${colab.nome_completo};${colab.cpf || ''}`);
          csvLines.push(`${dataHoje};FGTS_A_RECOLHER;${cc};0;${fgts.toFixed(2)};FGTS Mes;${colab.nome_completo};${colab.cpf || ''}`);
        }
      });

      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CONCILIACAO_CONTABIL_ANALITICA_${folhaId.substring(0, 8)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Relatório analítico para reconciliação contábil gerado!');
      setOpen(false);
    } catch (err: any) {
      toast.error(safeErrorMessage(err, 'Erro ao exportar relatório contábil.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-xl gap-1.5 font-body border-primary/30 hover:bg-primary/5">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Conciliação Contábil</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <BookOpen className="h-5 w-5 text-primary" />
            Exportar para Contabilidade (Analítico)
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Gere o arquivo de lançamentos contábeis analíticos por evento para importação no seu ERP (Domínio, Alterdata, Totvs, etc).
          </p>
          <Card className="border border-border/30 bg-muted/20">
            <CardContent className="p-4 text-xs space-y-2">
              <p>• Lançamentos detalhados por Rubrica/Evento</p>
              <p>• Rateio por Centro de Custo/Departamento</p>
              <p>• Identificação por Colaborador (Auditável)</p>
              <p>• Encargos Patronais (FGTS/INSS)</p>
            </CardContent>
          </Card>
          <Button onClick={handleExport} className="w-full rounded-xl gap-2 h-11" disabled={loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            Gerar Lançamentos Contábeis
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
