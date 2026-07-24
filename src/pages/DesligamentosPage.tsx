import { PageTitle } from '@/components/PageTitle';
import { useState, useMemo } from 'react';
import { useDesligamentos } from '@/hooks/useDesligamentos';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { EmptyList } from '@/components/ui/empty-state';
import { UserMinus, Plus, Eye, MoreHorizontal, Download, Calculator, FileSpreadsheet, Trash2, History, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { desligamentoService } from '@/services/desligamentoService';
import { useQueryClient } from '@tanstack/react-query';
import { useDataAccessLog } from '@/hooks/useDataAccessLog';
import { useEmpresas } from '@/hooks/useEmpresas';
import { exportarDesligamentosExcel } from '@/utils/desligamentoExcel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PontoAuditTimeline } from '@/components/ponto/PontoAuditTimeline';
import {
  DesligamentoKPIs,
  DesligamentoFilters,
  StatusBadge,
  TipoBadge,
  DesligamentoDetailSheet,
  NovoDesligamentoDialog,
  TurnoverChart,
} from '@/components/desligamentos';
import type { LooseRow } from '@/types/db';
export default function DesligamentosPage() {
  const { desligamentos, isLoading } = useDesligamentos();
  const { empresaAtual } = useEmpresas();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useDataAccessLog('desligamentos', empresaAtual?.id, empresaAtual?.id);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [selectedDesligamento, setSelectedDesligamento] = useState<LooseRow<'desligamentos'> | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showNovo, setShowNovo] = useState(false);
  const [showChart, setShowChart] = useState(true);

  const filtered = useMemo(() => {
    return (desligamentos || []).filter((d: any) => {
      const matchSearch = !search || 
        (d.colaborador?.nome_completo || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.motivo || '').toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'todos' || d.status === statusFilter;
      const matchTipo = tipoFilter === 'todos' || d.tipo === tipoFilter;
      return matchSearch && matchStatus && matchTipo;
    });
  }, [desligamentos, search, statusFilter, tipoFilter]);

  const openDetail = (d: any) => {
    setSelectedDesligamento(d);
    setShowDetail(true);
  };

  const handleExcluir = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este desligamento?')) return;
    try {
      await desligamentoService.excluir(id, empresaAtual?.id);
      queryClient.invalidateQueries({ queryKey: ['desligamentos'] });
      toast.success('Desligamento excluído');
    } catch (err) {
      console.error('Erro ao excluir desligamento:', err);
      toast.error('Erro ao excluir desligamento');
    }
  };

  return (
    <>
    <PageTitle title="Desligamentos" description="Gestão de desligamentos" />
    <PageLayout
      title="Desligamentos"
      description="Controle completo de desligamentos e rescisões"
      icon={<UserMinus className="h-5 w-5 text-primary-foreground" />}
      gradient="from-destructive to-destructive/70"
      actions={
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportarDesligamentosExcel(filtered)}
            className="rounded-xl font-body"
            disabled={filtered.length === 0}
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/calculadora-rescisao')}
            className="rounded-xl font-body"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Calculadora
          </Button>
          <Button
            size="sm"
            onClick={() => setShowNovo(true)}
            className="rounded-xl bg-gradient-to-r from-destructive to-destructive/70 hover:opacity-90 shadow-lg font-body"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Desligamento
          </Button>
        </div>
      }
    >
      <Tabs defaultValue="lista" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="lista" className="rounded-lg gap-2">
            <List className="h-4 w-4" /> Gestão de Desligamentos
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="rounded-lg gap-2">
            <History className="h-4 w-4" /> Trilha de Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-6">
          <div className="space-y-6">
            {/* KPIs */}
            <AnimatePresence>
              {!isLoading && Array.isArray(desligamentos) && (desligamentos?.length || 0) > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <DesligamentoKPIs desligamentos={desligamentos as any[]} />

                </motion.div>
              )}
            </AnimatePresence>

            {/* Turnover Chart */}
            {!isLoading && Array.isArray(desligamentos) && (desligamentos?.length || 0) > 0 && showChart && (
              <TurnoverChart desligamentos={desligamentos as any[]} />

            )}

            {/* Filters */}
            <DesligamentoFilters
              search={search}
              onSearchChange={setSearch}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              tipoFilter={tipoFilter}
              onTipoChange={setTipoFilter}
            />

            {/* Content */}
            {isLoading ? (
              <div className="flex justify-center p-8"><Spinner size="lg" /></div>
            ) : filtered.length === 0 ? (
              <EmptyList entityName="desligamento" onCreate={() => setShowNovo(true)} />
            ) : (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/30 rounded-2xl overflow-hidden">
                  <CardContent className="p-0">
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border/30 bg-muted/30">
                            <th className="text-left text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Colaborador</th>
                            <th className="text-left text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Data</th>
                            <th className="text-left text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Tipo</th>
                            <th className="text-left text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                            <th className="text-left text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Valor Líquido</th>
                            <th className="text-left text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Motivo</th>
                            <th className="text-right text-[10px] font-display font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((d: any, i: number) => (
                            <motion.tr
                              key={d.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.02 }}
                              onClick={() => openDetail(d)}
                              className="border-b border-border/20 hover:bg-muted/20 cursor-pointer transition-colors group"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-display font-bold text-destructive">
                                      {(d.colaborador?.nome_completo || 'C')[0]}
                                    </span>
                                  </div>
                                  <span className="text-sm font-body font-medium">{d.colaborador?.nome_completo || '—'}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm font-body text-muted-foreground">
                                {d.data_desligamento ? new Date(d.data_desligamento).toLocaleDateString('pt-BR') : '—'}
                              </td>
                              <td className="px-4 py-3"><TipoBadge tipo={d.tipo} /></td>
                              <td className="px-4 py-3"><StatusBadge status={d.status} /></td>
                              <td className="px-4 py-3 text-sm font-body font-medium">
                                {d.valor_liquido ? `R$ ${d.valor_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                              </td>
                              <td className="px-4 py-3 text-sm font-body text-muted-foreground truncate max-w-[200px]">
                                {d.motivo || '—'}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" aria-label="Mais opções" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(d); }}>
                                      <Eye className="h-3.5 w-3.5 mr-2" />Ver Detalhes
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate('/calculadora-rescisao'); }}>
                                      <Calculator className="h-3.5 w-3.5 mr-2" />Calcular Rescisão
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={(e) => handleExcluir(d.id, e)} className="text-destructive focus:text-destructive">
                                      <Trash2 className="h-3.5 w-3.5 mr-2" />Excluir
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile card list */}
                    <div className="md:hidden divide-y divide-border/20">
                      {filtered.map((d: any, i: number) => (
                        <motion.div
                          key={d.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}
                          onClick={() => openDetail(d)}
                          className="p-4 hover:bg-muted/20 cursor-pointer transition-colors active:bg-muted/30"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                                <span className="text-sm font-display font-bold text-destructive">
                                  {(d.colaborador?.nome_completo || 'C')[0]}
                                </span>
                              </div>
                              <div>
                                <p className="text-sm font-body font-semibold">{d.colaborador?.nome_completo || '—'}</p>
                                <p className="text-[11px] font-body text-muted-foreground">
                                  {d.data_desligamento ? new Date(d.data_desligamento).toLocaleDateString('pt-BR') : '—'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-display font-bold">
                                {d.valor_liquido ? `R$ ${d.valor_liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <TipoBadge tipo={d.tipo} />
                            <StatusBadge status={d.status} />
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* Pagination info */}
                    <div className="px-4 py-3 border-t border-border/20 text-xs font-body text-muted-foreground">
                      Exibindo {filtered.length} de {(desligamentos || [])?.length} desligamentos
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="auditoria">
           <PontoAuditTimeline filterTabela="desligamentos" />
        </TabsContent>
      </Tabs>


      {/* Detail Sheet */}
      <DesligamentoDetailSheet
        desligamento={selectedDesligamento}
        open={showDetail}
        onClose={() => setShowDetail(false)}
      />

      {/* Novo Dialog */}
      <NovoDesligamentoDialog
        open={showNovo}
        onClose={() => setShowNovo(false)}
      />
    </PageLayout>
    </>
  );
}
