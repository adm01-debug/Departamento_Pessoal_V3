import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { FileDown, Eye, Loader2 } from 'lucide-react';
import { feriasPDF } from '@/utils/feriasPDF';
import { format, subMonths, isAfter } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useEmpresas } from '@/hooks/useEmpresas';

interface FeriasRelatorioDialogProps {
  stats: any;
  data: any[];
  filters?: {
    search?: string;
    status?: string;
  };
}

export function FeriasRelatorioDialog({ stats, data, filters }: FeriasRelatorioDialogProps) {
  const { empresaAtual } = useEmpresas();
  const [periodo, setPeriodo] = useState('6_meses');
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const getFilteredData = () => {
    const now = new Date();
    let filtered = [...data];

    if (periodo === '6_meses') {
      const sixMonthsAgo = subMonths(now, 6);
      filtered = data.filter(f => isAfter(new Date(f.data_inicio), sixMonthsAgo));
    } else if (periodo === 'vencidos') {
      filtered = data.filter(f => f.status === 'vencida' || (new Date(f.data_fim) < now && f.status === 'pendente'));
    } else if (periodo === 'ano_atual') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      filtered = data.filter(f => isAfter(new Date(f.data_inicio), startOfYear));
    }

    return filtered;
  };

  const handleDownload = async () => {
    setLoading(true);
    try {
      const filteredData = getFilteredData();
      const periodLabel = {
        '6_meses': 'Últimos 6 meses',
        'vencidos': 'Períodos Vencidos',
        'ano_atual': 'Ano Atual'
      }[periodo] || 'Relatório Personalizado';

      // Mock update to stats based on filtered data for the PDF
      const localStats = {
        ...stats,
        total: filteredData.length,
        periodoLabel: periodLabel
      };

      await feriasPDF.gerarRelatorioKPIs(localStats, filteredData, filters, empresaAtual);
    } finally {
      setLoading(false);
    }
  };

  const filtered = getFilteredData();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          variant="outline" 
          className="rounded-xl gap-1.5 font-body"
        >
          <FileDown className="h-4 w-4" /> Relatório PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <FileDown className="h-5 w-5 text-primary" /> Gerar Relatório de Férias
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium font-body">Selecione o Período</Label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="rounded-xl border-border/40">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="6_meses">Últimos 6 meses</SelectItem>
                <SelectItem value="ano_atual">Ano Atual ({new Date().getFullYear()})</SelectItem>
                <SelectItem value="vencidos">Períodos Vencidos / Críticos</SelectItem>
                <SelectItem value="total">Histórico Completo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-4 rounded-xl bg-muted/30 border border-border/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pré-visualização Rápida</span>
              <Badge variant="outline" className="text-[10px] h-4 font-body">{filtered.length} registros</Badge>
            </div>
            
            <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar" id="relatorio-preview-list">
              {filtered.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs border-b border-border/10 pb-2 last:border-0 last:pb-0">
                  <div className="flex flex-col">
                    <span className="font-bold">{item.colaborador?.nome_completo || 'Colaborador'}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(item.data_inicio), 'dd/MM/yy')} - {format(new Date(item.data_fim), 'dd/MM/yy')}
                    </span>
                  </div>
                  <Badge variant={item.status === 'vencida' ? 'destructive' : 'secondary'} className="text-[9px] h-4 scale-90 origin-right">
                    {item.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
              {filtered.length > 5 && (
                <p className="text-[10px] text-center text-muted-foreground pt-1">... e mais {filtered.length - 5} registros</p>
              )}
              {filtered.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-xs italic">
                  Nenhum registro encontrado para este período.
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="ghost" 
            className="rounded-xl font-body"
            onClick={() => setPreviewOpen(true)}
            disabled={filtered.length === 0}
          >
            <Eye className="h-4 w-4 mr-2" /> Visualizar
          </Button>
          <Button 
            className="rounded-xl bg-gradient-to-r from-primary-glow to-primary font-body flex-1 sm:flex-none"
            onClick={handleDownload}
            disabled={loading || filtered.length === 0}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileDown className="h-4 w-4 mr-2" />}
            Download PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
