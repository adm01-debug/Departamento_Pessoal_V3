import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CardSkeleton } from '@/components/ui/module-skeleton';
import {
  Search,
  X,
  Check,
  Eye,
  Forward,
  MoreHorizontal,
  History,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Shield,
  Download,
  ListChecks,
  CheckCircle,
  AlertOctagon,
  FileJson,
  Activity,
  Calendar,
  Clock,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';
import { exportPortaria671PDF, exportPontoCSV, type Portaria671Solicitacao } from '@/services/exportService';
import type { Pendencia } from '@/hooks/usePendencias';

export type PendenciaListItem = Pendencia & { source: 'db' | 'ponto'; raw?: Portaria671Solicitacao };

type BatchStatus = 'aprovado' | 'recusado' | 'em_analise' | 'concluido';

interface PendenciasDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  filterType: string;
  onFilterTypeChange: (value: string) => void;
  items: PendenciaListItem[];
  filteredCount: number;
  isLoading: boolean;
  page: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onBatchAction: (status: BatchStatus) => void;
  onPontoRespond: (vars: { id: string; status: 'aprovado' | 'recusado'; observacoes?: string }) => void;
  onPendenciaStatus: (vars: { id: string; status: 'em_analise' | 'concluido' }) => void;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'alta':
      return 'text-destructive bg-destructive/10 border-destructive/20';
    case 'media':
      return 'text-warning bg-warning/10 border-warning/20';
    case 'baixa':
      return 'text-info bg-info/10 border-info/20';
    default:
      return 'text-muted-foreground bg-muted';
  }
};

export function PendenciasDetailDialog({
  open,
  onOpenChange,
  searchQuery,
  onSearchQueryChange,
  filterType,
  onFilterTypeChange,
  items,
  filteredCount,
  isLoading,
  page,
  totalPages,
  itemsPerPage,
  onPageChange,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onBatchAction,
  onPontoRespond,
  onPendenciaStatus,
}: PendenciasDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 rounded-2xl border-border/40 shadow-2xl glass">
        <DialogHeader className="p-6 pb-4 border-b border-border/10 bg-gradient-to-r from-primary/5 via-transparent to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Lista de Pendências
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Visualize e tome ações rápidas sobre os itens pendentes do sistema.
              </DialogDescription>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6 items-center">
            <div className="relative flex-1 group w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Buscar por título ou descrição..."
                className="pl-10 h-11 rounded-xl bg-muted/40 border-border/20 focus:bg-background transition-all"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
              {(['all', 'ferias', 'assinaturas', 'ponto', 'documentos'] as const).map((type) => (
                <Button
                  key={type}
                  variant={filterType === type ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'rounded-lg h-11 px-4 font-medium transition-all text-xs whitespace-nowrap',
                    filterType === type ? 'shadow-lg shadow-primary/20' : 'bg-muted/20 border-border/10'
                  )}
                  onClick={() => onFilterTypeChange(type)}
                >
                  {type === 'all' ? 'Todos' : type.charAt(0).toUpperCase() + type.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/20 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{selectedIds.length} selecionados</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="gradient-success"
                    className="h-9 px-4 gap-2 rounded-lg"
                    onClick={() => onBatchAction('aprovado')}
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Aprovar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-9 px-4 gap-2 rounded-lg"
                    onClick={() => onBatchAction('recusado')}
                  >
                    <AlertOctagon className="h-3.5 w-3.5" /> Recusar
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-muted/5">
          <div className="flex items-center gap-3 mb-4 p-1 px-2">
            <Checkbox
              id="select-all"
              checked={selectedIds.length === items.length && items.length > 0}
              onCheckedChange={onToggleSelectAll}
              className="rounded-md border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <label
              htmlFor="select-all"
              className="text-xs font-medium cursor-pointer text-muted-foreground select-none"
            >
              Selecionar Todos na página
            </label>
          </div>
          {isLoading ? (
            <div className="space-y-4">
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <CardSkeleton key={i} className="h-24 rounded-2xl" />
                ))}
            </div>
          ) : items.length > 0 ? (
            <div className="grid gap-4">
              <AnimatePresence mode="popLayout">
                {items.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    className="group p-5 rounded-2xl glass border border-border/30 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />

                    <div className="flex flex-col gap-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-4">
                          <div className="pt-1">
                            <Checkbox
                              checked={selectedIds.includes(item.id)}
                              onCheckedChange={() => onToggleSelect(item.id)}
                              className="rounded-md border-primary/50"
                            />
                          </div>
                          <div
                            className={cn(
                              'p-3 rounded-2xl bg-gradient-to-br shrink-0 shadow-lg',
                              item.tipo === 'ferias'
                                ? 'from-primary/80 to-primary'
                                : item.tipo === 'ponto'
                                  ? 'from-warning/80 to-warning'
                                  : item.tipo === 'assinaturas'
                                    ? 'from-success/80 to-success'
                                    : 'from-info/80 to-info'
                            )}
                          >
                            {item.tipo === 'ferias' ? (
                              <Calendar className="h-5 w-5 text-white" />
                            ) : item.tipo === 'ponto' ? (
                              <Clock className="h-5 w-5 text-white" />
                            ) : item.tipo === 'assinaturas' ? (
                              <ShieldCheck className="h-5 w-5 text-white" />
                            ) : (
                              <Briefcase className="h-5 w-5 text-white" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-display font-bold text-lg leading-tight">{item.titulo}</h4>
                              <Badge
                                className={cn(
                                  'text-[10px] font-bold uppercase tracking-wider py-0.5',
                                  getPriorityColor(item.prioridade)
                                )}
                              >
                                {item.prioridade}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] opacity-70">
                                {format(new Date(item.criado_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
                              {item.descricao}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Visualizar"
                            className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                            onClick={() =>
                              window.open(`/detalhes/${item.referencia_id || item.id}`, '_blank', 'noopener')
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Mais opções"
                                className="h-10 w-10 rounded-xl"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 rounded-xl p-1 border-border/40 shadow-xl glass"
                            >
                              <DropdownMenuItem
                                className="rounded-lg gap-2 cursor-pointer focus:bg-primary/10 focus:text-primary"
                                onClick={() => {
                                  if (item.source === 'ponto') {
                                    onPontoRespond({ id: item.id, status: 'aprovado' });
                                  } else {
                                    onPendenciaStatus({ id: item.id, status: 'concluido' });
                                  }
                                }}
                              >
                                <Check className="h-4 w-4" /> Aprovar / Concluir
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="rounded-lg gap-2 cursor-pointer focus:bg-warning/10 focus:text-warning"
                                onClick={() => {
                                  if (item.source === 'ponto') {
                                    onPontoRespond({
                                      id: item.id,
                                      status: 'recusado',
                                      observacoes: 'Necessita revisão.',
                                    });
                                  } else {
                                    onPendenciaStatus({ id: item.id, status: 'em_analise' });
                                  }
                                }}
                              >
                                <Activity className="h-4 w-4" />{' '}
                                {item.source === 'ponto' ? 'Recusar' : 'Marcar Revisão'}
                              </DropdownMenuItem>
                              <DropdownMenuItem className="rounded-lg gap-2 cursor-pointer">
                                <Forward className="h-4 w-4" /> Encaminhar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Compliance & History Highlight for Ponto */}
                      {item.source === 'ponto' && item.raw && (
                        <div className="mt-2 space-y-4">
                          <Tabs defaultValue="highlights" className="w-full">
                            <TabsList className="grid grid-cols-2 h-8 mb-3 bg-muted/50 p-1">
                              <TabsTrigger value="highlights" className="text-[10px] py-1">
                                Destaques Críticos
                              </TabsTrigger>
                              <TabsTrigger value="history" className="text-[10px] py-1">
                                Histórico de Alterações
                              </TabsTrigger>
                            </TabsList>

                            <TabsContent value="highlights" className="mt-0">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-center gap-2 group/card">
                                  <MapPin className="h-4 w-4 text-primary opacity-70 group-hover/card:scale-110 transition-transform" />
                                  <div className="text-[10px]">
                                    <p className="text-muted-foreground font-bold uppercase">Timezone</p>
                                    <p className="font-semibold text-foreground">
                                      {item.raw.relatorio_conformidade?.timezone || 'America/Sao_Paulo'}
                                    </p>
                                  </div>
                                </div>
                                <div className="p-3 rounded-xl bg-warning/5 border border-warning/10 flex items-center gap-2 group/card">
                                  <History className="h-4 w-4 text-warning opacity-70 group-hover/card:rotate-[-45deg] transition-transform" />
                                  <div className="text-[10px]">
                                    <p className="text-muted-foreground font-bold uppercase">Hora Original</p>
                                    <p className="font-semibold text-foreground">
                                      {item.raw.hora_original?.substring(0, 5) || 'Não registrada'}
                                    </p>
                                  </div>
                                </div>
                                <div className="p-3 rounded-xl bg-success/5 border border-success/10 flex items-center gap-2 group/card">
                                  <Shield className="h-4 w-4 text-success opacity-70 group-hover/card:scale-110 transition-transform" />
                                  <div className="text-[10px]">
                                    <p className="text-muted-foreground font-bold uppercase">Geofencing</p>
                                    <p
                                      className={cn(
                                        'font-semibold',
                                        item.raw.relatorio_conformidade?.geofencing
                                          ? 'text-success'
                                          : 'text-destructive'
                                      )}
                                    >
                                      {item.raw.relatorio_conformidade?.geofencing
                                        ? 'Dentro do Perímetro'
                                        : 'Fora do Perímetro'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>

                            <TabsContent value="history" className="mt-0">
                              <div className="p-4 rounded-xl bg-muted/20 border border-border/10">
                                <div className="flex items-center justify-between text-[10px] mb-3 pb-2 border-b border-border/5">
                                  <span className="font-bold text-muted-foreground uppercase">Campo</span>
                                  <span className="font-bold text-muted-foreground uppercase text-right">
                                    Comparação (De → Para)
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-muted-foreground">Hora do Ponto</span>
                                    <span className="font-medium">
                                      <span className="text-destructive line-through opacity-70 mr-2">
                                        {item.raw.hora_original?.substring(0, 5) || '--:--'}
                                      </span>
                                      <ChevronRight className="h-3 w-3 inline text-muted-foreground mx-1" />
                                      <span className="text-success font-bold ml-1">
                                        {item.raw.hora_sugerida?.substring(0, 5)}
                                      </span>
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-muted-foreground">Minutos de Divergência</span>
                                    <span className="font-medium text-warning">
                                      {item.raw.relatorio_conformidade?.divergencia_minutos || 0} min
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-[11px]">
                                    <span className="text-muted-foreground">Integridade (SHA256)</span>
                                    <span className="font-mono text-[9px] truncate max-w-[120px] text-muted-foreground">
                                      {item.raw.relatorio_conformidade?.sha256_integridade?.slice(0, 12)}...
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </TabsContent>
                          </Tabs>

                          <div className="flex justify-end gap-2 pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-[10px] gap-2 rounded-lg hover:bg-primary/5 transition-colors"
                              onClick={() => exportPortaria671PDF(item.raw!)}
                            >
                              <Download className="h-3 w-3" /> Exportar PDF (Portaria 671)
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-[10px] gap-2 rounded-lg"
                              onClick={() =>
                                exportPontoCSV(
                                  [item.raw as unknown as Record<string, unknown>],
                                  `conformidade-${item.id.slice(0, 8)}.csv`
                                )
                              }
                            >
                              <FileJson className="h-3 w-3" /> Exportar CSV
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 p-4 bg-muted/20 rounded-2xl border border-border/10">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {Math.min(filteredCount, (page - 1) * itemsPerPage + 1)}-
                    {Math.min(filteredCount, page * itemsPerPage)} de {filteredCount}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => onPageChange(Math.max(1, page - 1))}
                      className="h-9 w-9 p-0 rounded-lg"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-1 px-2">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => onPageChange(i + 1)}
                          className={cn(
                            'w-2 h-2 rounded-full transition-all',
                            page === i + 1 ? 'bg-primary w-4' : 'bg-primary/20 hover:bg-primary/40'
                          )}
                        />
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                      className="h-9 w-9 p-0 rounded-lg"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-6 rounded-3xl bg-muted/20 mb-4 border border-border/10">
                <X className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <h3 className="text-xl font-display font-bold">Nenhuma pendência</h3>
              <p className="text-muted-foreground mt-2 max-w-xs mx-auto">
                Não encontramos itens que correspondam à sua busca ou filtro.
              </p>
              <Button
                variant="outline"
                className="mt-6 rounded-xl px-8"
                onClick={() => {
                  onSearchQueryChange('');
                  onFilterTypeChange('all');
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t border-border/10 bg-muted/5">
          <Button variant="outline" className="rounded-xl px-8" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
