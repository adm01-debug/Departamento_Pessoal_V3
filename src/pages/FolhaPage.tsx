import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { PageLayout } from '@/components/layout';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { FolhaStatus } from '@/components/ui/status-badge';
import { EmptyList } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Eye, Calculator, FileText, DollarSign, TrendingUp, TrendingDown, Banknote, Download, FileSpreadsheet, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FolhaAuditoriaTable } from '@/components/folha/FolhaAuditoriaTable';
import { CalculoFolhaWizard } from '@/components/folha/CalculoFolhaWizard';
import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { AnimatedNumber } from '@/components/dashboard/AnimatedNumber';
import { useExcelExport } from '@/hooks/useExcelExport';
import { usePDFExport } from '@/hooks/usePDFExport';
import { useFolha } from '@/hooks/useFolha';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { currentCompetenciaLocal } from '@/utils/dateLocal';


function formatCurrency(value: number): string {

  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);
}

export default function FolhaPage() {
  const [competencia, setCompetencia] = useState('');
  const navigate = useNavigate();
  const { exportarExcel } = useExcelExport();
  const { exportarPDF } = usePDFExport();
  const { folhas, isLoading } = useFolha(competencia || undefined);


  // Summary KPIs from loaded data
  const totais: any = (folhas || []).reduce(
    (acc: any, f: any) => ({
      proventos: acc.proventos + (f.total_proventos || 0),
      descontos: acc.descontos + (f.total_descontos || 0),
      liquido: acc.liquido + (f.total_liquido || 0),
      count: acc.count + 1,
    }),
    { proventos: 0, descontos: 0, liquido: 0, count: 0 }
  );
  const handleExportExcel = () => {
    if (!folhas?.length) return;
    exportarExcel(
      'Histórico de Folhas',
      folhas,
      ['competencia', 'tipo', 'total_proventos', 'total_descontos', 'total_liquido', 'status']
    );
  };

  const handleExportPDF = () => {
    if (!folhas?.length) return;
    exportarPDF(
      'Histórico de Folhas',
      folhas,
      ['competencia', 'tipo', 'total_liquido', 'status']
    );
  };
  return (
    <>
    <PageTitle title="Folha de Pagamento" description="Gestão de folha de pagamento" />
    <PageLayout
      title="Folha de Pagamento"
      description="Gestão e histórico de folhas processadas"
      icon={<Banknote className="h-5 w-5 text-primary-foreground" />}
      gradient="from-primary-glow to-primary"
      actions={
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl font-body hidden sm:flex gap-1.5"
                disabled={!folhas?.length}
              >
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={handleExportExcel} className="gap-2 cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 text-success" />
                Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="gap-2 cursor-pointer">
                <FileText className="h-4 w-4 text-destructive" />
                PDF (.pdf)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <CalculoFolhaWizard competencia={currentCompetenciaLocal()} />
        </div>

      }
    >
      {/* Summary Cards */}
      {!isLoading && folhas && folhas.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Folhas Processadas', value: totais.count, icon: FileText, gradient: 'from-primary to-primary-glow', isCurrency: false },
            { label: 'Total Proventos', value: totais.proventos, icon: TrendingUp, gradient: 'from-success to-success/70', isCurrency: true },
            { label: 'Total Descontos', value: totais.descontos, icon: TrendingDown, gradient: 'from-destructive to-destructive/70', isCurrency: true },
            { label: 'Total Líquido', value: totais.liquido, icon: DollarSign, gradient: 'from-primary-glow to-primary', isCurrency: true },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border border-border/30 rounded-2xl overflow-hidden">
                <div className={cn("h-[2px] bg-gradient-to-r", kpi.gradient)} />
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn("p-1.5 rounded-lg bg-gradient-to-br", kpi.gradient)}>
                      <kpi.icon className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                  <p className="text-lg font-display font-bold">
                    {kpi.isCurrency ? (
                      <AnimatedNumber value={kpi.value} format={formatCurrency} />
                    ) : (
                      <AnimatedNumber value={kpi.value} />
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-body">{kpi.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <DataTableToolbar search={competencia} onSearchChange={setCompetencia} searchPlaceholder="Filtrar por competência (AAAA-MM)" />

      {isLoading ? (
        <div className="flex justify-center p-8"><Spinner size="lg" /></div>
      ) : !folhas?.length ? (
        <EmptyList entityName="folha" onCreate={() => navigate('/folha/calcular')} />
      ) : (
        <>
          {/* Desktop Table */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hidden md:block rounded-2xl border border-border/30 overflow-hidden shadow-elevated">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-display font-semibold">Competência</TableHead>
                  <TableHead className="font-display font-semibold">Tipo</TableHead>
                  <TableHead className="font-display font-semibold text-right">Proventos</TableHead>
                  <TableHead className="font-display font-semibold text-right">Descontos</TableHead>
                  <TableHead className="font-display font-semibold text-right">Líquido</TableHead>
                  <TableHead className="font-display font-semibold">Status</TableHead>
                  <TableHead className="w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {folhas.map((f: any) => (
                  <TableRow key={f.id} className="hover:bg-accent/30 transition-colors group">
                    <TableCell className="font-body font-semibold">{f.competencia}</TableCell>
                    <TableCell className="capitalize font-body text-muted-foreground">{(f.tipo || '').replace('_', ' ')}</TableCell>
                    <TableCell className="text-right text-success font-body font-semibold tabular-nums">{formatCurrency(f.total_proventos || 0)}</TableCell>
                    <TableCell className="text-right text-destructive font-body font-semibold tabular-nums">{formatCurrency(f.total_descontos || 0)}</TableCell>
                    <TableCell className="text-right font-display font-bold tabular-nums">{formatCurrency(f.total_liquido || 0)}</TableCell>
                    <TableCell><FolhaStatus status={f.status} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Auditoria e Conferência" className="rounded-xl hover:bg-primary/10" title="Auditoria e Conferência">
                              <ClipboardList className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <ClipboardList className="h-5 w-5 text-primary" />
                                Auditoria e Conferência - Competência {f.competencia}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="flex-1 overflow-hidden py-4">
                              <FolhaAuditoriaTable folhaId={f.id} />
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10"
                          onClick={() => navigate('/folha/calcular')} aria-label="Visualizar detalhes">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {folhas.map((f: any, i: number) => (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border border-border/30 rounded-2xl overflow-hidden" onClick={() => navigate('/folha/calcular')}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold">{f.competencia}</span>
                      <FolhaStatus status={f.status} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-body uppercase">Proventos</p>
                        <p className="text-caption font-display font-bold text-success">{formatCurrency(f.total_proventos || 0)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-body uppercase">Descontos</p>
                        <p className="text-caption font-display font-bold text-destructive">{formatCurrency(f.total_descontos || 0)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground font-body uppercase">Líquido</p>
                        <p className="text-caption font-display font-bold">{formatCurrency(f.total_liquido || 0)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </PageLayout>
    </>
  );
}
