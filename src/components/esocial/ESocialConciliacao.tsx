import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, AlertTriangle, FileText, Download, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function ESocialConciliacao() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mockConciliacao = [
    {
      rubrica: '1000 - Salário Base',
      sistema: 12500.00,
      governo: 12500.00,
      diferenca: 0,
      status: 'ok'
    },
    {
      rubrica: '1202 - Horas Extras 50%',
      sistema: 1250.50,
      governo: 1250.50,
      diferenca: 0,
      status: 'ok'
    },
    {
      rubrica: '9201 - INSS Segurado',
      sistema: 1145.20,
      governo: 1140.00,
      diferenca: 5.20,
      status: 'divergente'
    },
    {
      rubrica: '9202 - FGTS',
      sistema: 1080.00,
      governo: 1080.00,
      diferenca: 0,
      status: 'ok'
    }
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Conciliação S-5001/S-5002 atualizada com sucesso!");
    }, 1500);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/30 shadow-xs bg-success/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">Total Sistema</span>
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <div className="text-2xl font-bold font-display">{formatCurrency(14830.50)}</div>
          </CardContent>
        </Card>
        
        <Card className="border-border/30 shadow-xs bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">Total Governo (S-5001)</span>
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold font-display">{formatCurrency(14825.30)}</div>
          </CardContent>
        </Card>

        <Card className="border-border/30 shadow-xs bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">Divergência Total</span>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div className="text-2xl font-bold font-display text-destructive">{formatCurrency(5.20)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-muted/20 border-b">
          <div>
            <CardTitle className="text-lg font-display">Conciliação de Valores</CardTitle>
            <CardDescription>Comparativo entre cálculos do sistema e retornos do Governo</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              Recalcular
            </Button>
            <Button size="sm" className="rounded-xl gap-2 bg-primary">
              <Download className="h-4 w-4" />
              Relatório PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/10">
              <TableRow>
                <TableHead>Rubrica / Verba</TableHead>
                <TableHead className="text-right">Vlr. Sistema</TableHead>
                <TableHead className="text-right">Vlr. Governo</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockConciliacao.map((item, idx) => (
                <TableRow key={idx} className="hover:bg-muted/5 transition-colors">
                  <TableCell className="font-medium text-sm">{item.rubrica}</TableCell>
                  <TableCell className="text-right text-sm font-display">{formatCurrency(item.sistema)}</TableCell>
                  <TableCell className="text-right text-sm font-display">{formatCurrency(item.governo)}</TableCell>
                  <TableCell className={cn(
                    "text-right text-sm font-bold font-display",
                    item.diferenca > 0 ? "text-destructive" : "text-success"
                  )}>
                    {formatCurrency(item.diferenca)}
                  </TableCell>
                  <TableCell className="text-center">
                    {item.status === 'ok' ? (
                      <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1.5 px-2">
                        <CheckCircle2 className="h-3 w-3" /> Conciliado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1.5 px-2">
                        <AlertTriangle className="h-3 w-3" /> Divergente
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="p-4 rounded-xl border border-warning/30 bg-warning/5 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-warning-foreground">Por que há divergências?</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            As divergências em rubricas previdenciárias geralmente ocorrem por arredondamentos na terceira casa decimal ou parametrização divergente de incidências. 
            Recomendamos revisar o cadastro de Rubricas (S-1010) e as alíquotas de RAT/FAP da empresa.
          </p>
        </div>
      </div>
    </div>
  );
}
