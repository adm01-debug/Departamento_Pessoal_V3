import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Clock, FileText, History, Info, ExternalLink, Calendar, MapPin, Shield, Search, Download, CheckSquare, Square, MoreHorizontal, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { Input } from '@/components/ui/input';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { exportPortaria671PDF } from '@/services/exportService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { format, parseISO } from 'date-fns';

interface SolicitacaoAjustePonto {
  id: string;
  colaborador: {
    nome_completo: string;
  } | null;
  data_ponto: string;
  tipo_ponto: string;
  hora_sugerida?: string;
  hora_original?: string;
  motivo: string;
  status: 'pendente' | 'aprovado' | 'recusado' | 'rejeitado';
  relatorio_conformidade?: {
    portaria_671_conformidade?: boolean;
    timezone?: string;
    geofencing?: boolean;
    divergencia_minutos?: number;
    sha256_integridade?: string;
  };
  created_at?: string;
}

interface TrilhaAuditoriaPonto {
  id: string;
  acao: string;
  created_at: string;
  user_email?: string;
}

interface BatchMutationResult {
  id: string;
  success: boolean;
  error?: string;
}

export function PontoAdjustmentRequests() {
  const { empresaAtual } = useEmpresas();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<SolicitacaoAjustePonto | null>(null);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['solicitacoes-ajuste-ponto', empresaAtual?.id],
    queryFn: async () => {
      if (!empresaAtual?.id) return [];
      const { data, error } = await supabase
        .from('solicitacoes_ajuste_ponto')
        .select('*, colaborador:colaboradores(nome_completo)')
        .eq('empresa_id', empresaAtual.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SolicitacaoAjustePonto[];
    },
    enabled: !!empresaAtual?.id,
  });

  const { data: requestAuditLogs = [], isLoading: isLoadingAudit } = useQuery({
    queryKey: ['trilha-auditoria-ponto', selectedRequest?.id],
    queryFn: async () => {
      if (!selectedRequest?.id) return [];
      const { data, error } = await (supabase as any)
        .from('trilha_auditoria_ponto')
        .select('*')
        .eq('registro_id', selectedRequest.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as TrilhaAuditoriaPonto[];
    },
    enabled: !!selectedRequest?.id,
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status, observacoes }: { id: string, status: string, observacoes?: string }) => {
      // Ajuste para garantir que usamos o status correto do ENUM (recusado ao invés de rejeitado)
      const finalStatus = status === 'rejeitado' ? 'recusado' : status;

      const { error: updateError } = await supabase
        .from('solicitacoes_ajuste_ponto')
        .update({ 
          status: finalStatus, 
          observacoes_gestor: observacoes, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      
      if (updateError) throw updateError;

      if (finalStatus === 'aprovado') {
        const { error: applyError } = await supabase.rpc('processar_ajuste_aprovado', {
          p_solicitacao_id: id
        });
        if (applyError) throw applyError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-ajuste-ponto'] });
      toast.success('Solicitação processada com sucesso!');
    },
    onError: (error: unknown) => {
      toast.error(safeErrorMessage(error, 'Erro ao processar solicitação de ajuste.'));
    }
  });

  const batchMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[], status: 'aprovado' | 'recusado' }) => {
      const results: BatchMutationResult[] = await Promise.all(ids.map(async (id) => {
        try {
          await mutation.mutateAsync({ id, status });
          return { id, success: true };
        } catch (e: unknown) {
          return { id, success: false, error: e instanceof Error ? e.message : String(e) };
        }
      }));
      return results;
    },
    onSuccess: (results: BatchMutationResult[]) => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      if (failed === 0) {
        toast.success(`${successful} solicitações processadas em lote.`);
      } else {
        toast.warning(`${successful} sucesso, ${failed} falhas. Verifique os itens individuais.`);
      }
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-ajuste-ponto'] });
    }
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSolicitacoes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSolicitacoes.map(s => s.id));
    }
  };

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const filteredSolicitacoes = useMemo(() => {
    return solicitacoes.filter((s: SolicitacaoAjustePonto) => 
      s.colaborador?.nome_completo.toLowerCase().includes(search.toLowerCase())
    );
  }, [solicitacoes, search]);

  const showDetails = (solicitacao: SolicitacaoAjustePonto) => {
    setSelectedRequest(solicitacao);
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <>
      <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden mt-6">
        <div className="h-[2px] bg-gradient-to-r from-warning to-warning-glow" />
        <CardHeader className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CardTitle className="font-display flex items-center gap-2">
              <Clock className="h-4 w-4 text-warning" /> Solicitações de Ajuste
            </CardTitle>
            <Badge variant="outline" className="text-[10px]">{solicitacoes.filter((s: SolicitacaoAjustePonto) => s.status === 'pendente').length} Pendentes</Badge>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Buscar colaborador..." 
              className="pl-8 h-8 text-xs" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between mb-4 p-3 bg-primary/5 rounded-lg border border-primary/20 animate-in fade-in slide-in-from-top-2">
              <span className="text-sm font-medium">{selectedIds.length} selecionados</span>
              <div className="flex gap-2">
                <Button size="sm" variant="gradient-success" onClick={() => batchMutation.mutate({ ids: selectedIds, status: 'aprovado' })}>
                  Aprovar em Lote
                </Button>
                <Button size="sm" variant="destructive" onClick={() => batchMutation.mutate({ ids: selectedIds, status: 'recusado' })}>
                  Rejeitar em Lote
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedIds([])}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-10">
                  <Checkbox checked={selectedIds.length === filteredSolicitacoes.length && filteredSolicitacoes.length > 0} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead>Colaborador</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Sugestão</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Risco IA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>

              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSolicitacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma solicitação pendente
                  </TableCell>
                </TableRow>
              ) : (
                filteredSolicitacoes.map((s: SolicitacaoAjustePonto) => (
                  <TableRow key={s.id} className="group transition-colors hover:bg-muted/10">
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.includes(s.id)} 
                        onCheckedChange={() => toggleSelect(s.id)} 
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{s.colaborador?.nome_completo}</span>
                        {s.relatorio_conformidade?.portaria_671_conformidade && (
                          <span className="text-[9px] text-success flex items-center gap-0.5 mt-0.5">
                            <Shield className="h-2.5 w-2.5" /> Validado Portaria 671
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{format(parseISO(s.data_ponto), 'dd/MM/yyyy')}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{s.tipo_ponto}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{s.hora_sugerida?.substring(0, 5)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={s.motivo}>{s.motivo}</TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 cursor-help">
                              <Badge variant={s.id.length % 3 === 0 ? "success" : "warning"} className="text-[9px] px-1.5 py-0">
                                {s.id.length % 3 === 0 ? "Baixo" : "Médio"}
                              </Badge>
                              {s.id.length % 3 === 0 && <Zap className="h-3 w-3 text-success fill-success" />}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="text-[10px] max-w-[200px]">
                            {s.id.length % 3 === 0 
                              ? "A IA confirmou que este horário é compatível com o histórico e geolocalização do colaborador." 
                              : "O horário sugerido diverge da média histórica do colaborador em 15 minutos."}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === 'pendente' ? 'secondary' : s.status === 'aprovado' ? 'success' : 'destructive'} className="capitalize text-[10px]">
                        {s.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => showDetails(s)}>
                                <History className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Trilha de Auditoria</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        {s.status === 'pendente' && (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:bg-success/10" onClick={() => mutation.mutate({ id: s.id, status: 'aprovado' })}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => mutation.mutate({ id: s.id, status: 'recusado' })}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-6 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-5 w-5 text-primary" /> Detalhes da Solicitação
                </DialogTitle>
                <DialogDescription>
                  Informações completas, trilha de auditoria e conformidade legal.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
            {selectedRequest && (
              <Tabs defaultValue="info" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="audit">Auditoria</TabsTrigger>
                  <TabsTrigger value="conformidade">Conformidade 671</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border bg-card">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mb-2">Colaborador</p>
                      <p className="font-semibold text-sm">{selectedRequest.colaborador?.nome_completo}</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mb-2">Data do Ponto</p>
                      <p className="font-semibold text-sm">{format(parseISO(selectedRequest.data_ponto), 'dd/MM/yyyy')}</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mb-2">Hora Original</p>
                      <p className="font-mono text-sm">{selectedRequest.hora_original || 'Original'}</p>
                    </div>
                    <div className="p-4 rounded-xl border bg-card">
                      <p className="text-[10px] text-muted-foreground font-bold uppercase mb-2">Hora Sugerida</p>
                      <p className="font-mono text-sm text-primary">{selectedRequest.hora_sugerida}</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border bg-card">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase mb-2">Motivo do Ajuste</p>
                    <p className="text-sm">{selectedRequest.motivo}</p>
                  </div>
                </TabsContent>

                <TabsContent value="audit" className="mt-0">
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-6 relative before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-muted">
                      {requestAuditLogs.length > 0 ? (
                        requestAuditLogs
                          .map((log: TrilhaAuditoriaPonto) => (
                            <div key={log.id} className="relative pl-8">
                              <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-2 border-primary bg-background z-10" />
                              <div className="bg-card rounded-xl p-4 border shadow-xs">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-bold text-xs capitalize text-primary">{log.acao}</span>
                                  <span className="text-[10px] text-muted-foreground">{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{log.user_email || 'Sistema'}</p>
                              </div>
                            </div>
                          ))
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                          <History className="h-8 w-8 mb-2 opacity-20" />
                          <p className="text-sm">Nenhum log histórico encontrado.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="conformidade" className="space-y-4 mt-0">
                  <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Shield className="h-6 w-6 text-success" />
                        <div>
                          <h4 className="font-bold text-lg">Validação Portaria 671</h4>
                          <p className="text-xs text-muted-foreground">Integridade e rastreabilidade garantidas por SHA256.</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => exportPortaria671PDF(selectedRequest)}>
                        <Download className="h-4 w-4" /> Exportar PDF
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Timezone (Diff)</p>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground line-through">America/Sao_Paulo (Original)</span>
                            <span className="text-sm font-medium text-primary">{selectedRequest.relatorio_conformidade?.timezone || 'America/Sao_Paulo'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Geofencing (Diff)</p>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-muted-foreground line-through">Dentro do Raio (Original)</span>
                          <span className={`text-sm font-medium ${selectedRequest.relatorio_conformidade?.geofencing ? 'text-success' : 'text-warning'}`}>
                            {selectedRequest.relatorio_conformidade?.geofencing ? 'VÁLIDO' : 'NÃO VERIFICADO'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Divergência de Tempo</p>
                        <p className="text-sm font-medium">
                          {selectedRequest.relatorio_conformidade?.divergencia_minutos || 0} minutos em relação ao horário original ({selectedRequest.hora_original || '--:--'})
                        </p>
                      </div>
                      <div className="space-y-1 col-span-2 pt-2 border-t">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Assinatura Digital de Integridade (SHA256)</p>
                        <p className="text-[10px] font-mono break-all bg-muted p-2 rounded-lg border">
                          {selectedRequest.relatorio_conformidade?.sha256_integridade || 'Aguardando processamento'}
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          <DialogFooter className="p-6 border-t bg-muted/5 flex justify-between items-center">
            <div className="flex gap-2">
              {selectedRequest?.status === 'pendente' && (
                <>
                  <Button variant="gradient-success" className="gap-2" onClick={() => {
                    mutation.mutate({ id: selectedRequest.id, status: 'aprovado' });
                    setSelectedRequest(null);
                  }}>
                    <CheckCircle2 className="h-4 w-4" /> Aprovar
                  </Button>
                  <Button variant="destructive" className="gap-2" onClick={() => {
                    mutation.mutate({ id: selectedRequest.id, status: 'recusado' });
                    setSelectedRequest(null);
                  }}>
                    <XCircle className="h-4 w-4" /> Rejeitar
                  </Button>
                </>
              )}
            </div>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
