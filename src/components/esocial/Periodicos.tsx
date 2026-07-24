import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Banknote, User, Calendar, Hash, FileText, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { maskCpfDisplay } from '@/utils/piiMask';

export function S1200Remuneracao({ dados }: { dados: any }) {
  const dmDev = dados.dmDev || [];
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };
  
  return (
    <div className="space-y-4 font-body">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-border/30 shadow-xs bg-muted/5">
          <CardContent className="p-3 flex items-center gap-3">
            <User className="h-4 w-4 text-primary" />
            <div>
              <Label className="text-[9px] uppercase text-muted-foreground font-bold">Trabalhador</Label>
              <p className="text-xs font-bold">CPF: {maskCpfDisplay(dados.cpfTrab)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/30 shadow-xs bg-muted/5">
          <CardContent className="p-3 flex items-center gap-3">
            <Calendar className="h-4 w-4 text-primary" />
            <div>
              <Label className="text-[9px] uppercase text-muted-foreground font-bold">Período Apuração</Label>
              <p className="text-xs font-bold">{dados.perApur}</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {dmDev.map((dm: any, idx: number) => (
        <div key={idx} className="space-y-2 border rounded-xl overflow-hidden shadow-xs">
          <div className="bg-muted/50 px-4 py-2 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hash className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Demonstrativo: {dm.ideDmDev}</span>
            </div>
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          </div>
          
          <div className="p-2">
            <Table>
              <TableHeader className="bg-muted/20">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-7 text-[9px] font-bold uppercase tracking-wider">Cód. Rubrica</TableHead>
                  <TableHead className="h-7 text-[9px] font-bold uppercase tracking-wider text-right">Valor Informado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dm.infoPerApur?.ideEstabLot?.[0]?.detVerbas?.map((v: any, vIdx: number) => (
                  <TableRow key={vIdx} className="hover:bg-muted/10 border-border/10">
                    <TableCell className="py-2 text-[11px] font-mono font-bold text-primary">{v.codRubr}</TableCell>
                    <TableCell className="py-2 text-[11px] text-right font-display font-bold">
                      {formatCurrency(v.vrRubr)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ))}
    </div>
  );
}

export function S1210Pagamentos({ dados }: { dados: any }) {
  const pgtos = dados.infoPgto || [];
  
  return (
    <div className="space-y-4 font-body">
      <div className="flex items-center gap-2 mb-2 p-2 bg-primary/5 rounded-lg border border-primary/10">
        <Banknote className="h-4 w-4 text-primary" />
        <span className="text-xs font-bold uppercase tracking-wider text-primary">Rendimentos Pagos ao Trabalhador</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {pgtos.map((p: any, idx: number) => (
          <Card key={idx} className="border-border/30 shadow-xs hover:shadow-md transition-all">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-success/10 border border-success/20">
                  <Calendar className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-bold font-display">Data de Pagamento: {p.dtPgto}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    {p.tpPgto === '1' ? 'Ajuste Salarial' : 'Remuneração Mensal / Folha'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end border-t sm:border-t-0 pt-2 sm:pt-0 border-dashed border-border/50">
                <Label className="text-[9px] uppercase text-muted-foreground font-bold">Competência Tributária</Label>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <span className="text-sm font-display font-bold text-primary">{dados.perApur}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {pgtos.length === 0 && (
          <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed">
            <p className="text-xs text-muted-foreground">Nenhum pagamento registrado neste evento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
