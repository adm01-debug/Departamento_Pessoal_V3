import { PageTitle } from '@/components/PageTitle';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyList } from '@/components/ui/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { auditoriaService } from '@/services/auditoriaService';
import { Shield, Eye, Clock, User, Database, Search, Download, FileSpreadsheet } from 'lucide-react';
import { useExcelExport } from '@/hooks/useExcelExport';
import { useEmpresas } from '@/hooks/useEmpresas';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
const acaoColors: Record<string, string> = {
  INSERT: 'bg-success/15 text-success border-0',
  UPDATE: 'bg-info/15 text-info border-0',
  DELETE: 'bg-destructive/15 text-destructive border-0',
};

export default function AuditoriaPage() {
  const [search, setSearch] = useState('');
  const [tabelaFilter, setTabelaFilter] = useState('todos');
  const [acaoFilter, setAcaoFilter] = useState('todos');
  const [selectedLog, setSelectedLog] = useState<Record<string, any> | null>(null);
  const { exportarExcel } = useExcelExport();
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id || '';

  const { data: logs, isLoading } = useQuery({
    queryKey: ['auditoria', empresaId],
    queryFn: () => auditoriaService.listar(empresaId, { limite: 500 }),
    enabled: !!empresaId,
  });

  const uniqueTables = useMemo((): string[] => {
    if (!logs) return [];
    return (Array.from(new Set(logs.map((l: any) => l.tabela))) as string[]).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    return logs?.filter((l: any) => {
      const matchSearch = !search || 
        (l.user_email || '').toLowerCase().includes(search.toLowerCase()) ||
        (l.registro_id || '').toLowerCase().includes(search.toLowerCase());
      const matchTabela = tabelaFilter === 'todos' || l.tabela === tabelaFilter;
      const matchAcao = acaoFilter === 'todos' || l.acao === acaoFilter;
      return matchSearch && matchTabela && matchAcao;
    });
  }, [logs, search, tabelaFilter, acaoFilter]);

  const handleExport = () => {
    if (!filtered?.length) return;
    exportarExcel(
      'Log de Auditoria',
      filtered.map((l: any) => ({
        ...l,
        data: new Date(l.created_at).toLocaleString('pt-BR'),
        dados_anteriores: JSON.stringify(l.dados_anteriores),
        dados_novos: JSON.stringify(l.dados_novos)
      })),
      ['data', 'tabela', 'acao', 'user_email', 'ip_address', 'dados_anteriores', 'dados_novos']
    );
  };
  const renderJson = (json: any) => {
    if (!json) return <span className="text-muted-foreground italic text-xs">Sem dados</span>;
    return (
      <pre className="text-[10px] p-2 bg-muted/50 rounded-lg overflow-x-auto font-mono text-foreground/80 border border-border/30 max-h-[200px]">
        {JSON.stringify(json, null, 2)}
      </pre>
    );
  };

  return (
    <>
    <PageTitle title="Auditoria" description="Logs e trilha de auditoria do sistema" />
    <PageLayout
      title="Auditoria"
      description="Log de auditoria do sistema"
      icon={<Shield className="h-5 w-5 text-primary-foreground" />}
      gradient="from-primary to-info"
      actions={
        <Button variant="outline" size="sm" className="rounded-xl gap-2 font-body" onClick={handleExport} disabled={!filtered?.length}>
          <FileSpreadsheet className="h-4 w-4 text-success" />
          Exportar Logs
        </Button>
      }
    >
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <DataTableToolbar 
            search={search} 
            onSearchChange={setSearch} 
            searchPlaceholder="Buscar por usuário ou ID do registro..." 
          />
        </div>
        <div className="flex gap-2">
          <Select value={tabelaFilter} onValueChange={setTabelaFilter}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <SelectValue placeholder="Tabela" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as Tabelas</SelectItem>
              {uniqueTables.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={acaoFilter} onValueChange={setAcaoFilter}>
            <SelectTrigger className="w-[150px] rounded-xl">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as Ações</SelectItem>
              <SelectItem value="INSERT">Inclusão</SelectItem>
              <SelectItem value="UPDATE">Alteração</SelectItem>
              <SelectItem value="DELETE">Exclusão</SelectItem>
              <SelectItem value="EXECUTE_CALC">Cálculo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>


      {isLoading ? (
        <div className="flex justify-center p-8"><Spinner size="lg" /></div>
      ) : !filtered?.length ? (
        <EmptyList entityName="registro de auditoria" />
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-border/30 overflow-hidden shadow-elevated">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-display font-semibold w-[180px]">Data</TableHead>
                <TableHead className="font-display font-semibold">Tabela</TableHead>
                <TableHead className="font-display font-semibold">Ação</TableHead>
                <TableHead className="font-display font-semibold">Usuário</TableHead>
                <TableHead className="font-display font-semibold w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {filtered.map((log: any, index: number) => (
                  <motion.tr 
                    key={log.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.01 }}
                    className="hover:bg-accent/30 transition-colors group cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <TableCell className="font-body text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell className="font-body font-medium">
                      <div className="flex items-center gap-2">
                        <Database className="h-3.5 w-3.5 text-primary/60" />
                        {log.tabela}
                      </div>
                    </TableCell>
                    <TableCell><Badge className={acaoColors[log.acao] || 'bg-muted text-muted-foreground border-0'}>{log.acao}</Badge></TableCell>
                    <TableCell className="font-body text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {log.user_email || 'Sistema'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Ver detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </motion.div>
      )}

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-border/30 shadow-elevated rounded-2xl">
          <DialogHeader className="p-6 pb-2">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="font-display text-xl">Detalhes do Log</DialogTitle>
                <DialogDescription className="font-body">
                  Registro de alteração na tabela <span className="font-semibold text-foreground">{selectedLog?.tabela}</span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 p-6 pt-2">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card className="bg-muted/30 border-none shadow-none">
                <CardContent className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Data e Hora</span>
                  <span className="text-sm font-medium">{selectedLog && new Date(selectedLog.created_at).toLocaleString('pt-BR')}</span>
                </CardContent>
              </Card>
              <Card className="bg-muted/30 border-none shadow-none">
                <CardContent className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Usuário</span>
                  <span className="text-sm font-medium">{selectedLog?.user_email || 'Automatizado pelo Sistema'}</span>
                </CardContent>
              </Card>
              <Card className="bg-muted/30 border-none shadow-none">
                <CardContent className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Ação</span>
                  <Badge className={cn('w-fit', acaoColors[selectedLog?.acao] || 'bg-muted')}>{selectedLog?.acao}</Badge>
                </CardContent>
              </Card>
              <Card className="bg-muted/30 border-none shadow-none">
                <CardContent className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Endereço IP</span>
                  <span className="text-sm font-medium font-mono">{selectedLog?.ip_address || 'N/A'}</span>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Dados Anteriores</Label>
                {renderJson(selectedLog?.dados_anteriores)}
              </div>
              <div>
                <Label className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Novos Dados</Label>
                {renderJson(selectedLog?.dados_novos)}
              </div>
              {selectedLog?.user_agent && (
                <div>
                  <Label className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5 block">User Agent</Label>
                  <div className="text-[10px] p-2 bg-muted/30 rounded-lg text-muted-foreground font-mono break-all border border-border/20">
                    {selectedLog.user_agent}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-4 bg-muted/20 border-t border-border/20 flex justify-end">
            <Button variant="outline" onClick={() => setSelectedLog(null)} className="rounded-xl">Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
    </>
  );
}
