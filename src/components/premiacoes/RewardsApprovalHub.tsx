import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  AlertCircle, 
  MessageSquare, 
  Search,
  Check,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { premiacoesService } from '@/services/premiacoesService';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { useQueryClient } from '@tanstack/react-query';
import { useEmpresas } from '@/hooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
interface ApprovalHubProps {
  pagamentos: any[];
}

export function RewardsApprovalHub({ pagamentos }: ApprovalHubProps) {
  const queryClient = useQueryClient();
  const { empresaAtual } = useEmpresas();
  const [selectedPagamento, setSelectedPagamento] = React.useState<Record<string, any> | null>(null);
  const [comentario, setComentario] = React.useState('');
  const [isReconcileOpen, setIsReconcileOpen] = React.useState(false);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<{id: string, nextStatus: string, valor: number} | null>(null);
  const [valorFolha, setValorFolha] = React.useState('');

  const handleApprove = async (id: string, nextStatus: string, valor: number) => {
    setSelectedPagamento(pagamentos.find(p => p.id === id));
    setPendingAction({ id, nextStatus, valor });
    setIsApprovalDialogOpen(true);
  };

  const confirmApproval = async () => {
    if (!pendingAction) return;
    try {
      await premiacoesService.atualizarStatusPagamento(
        pendingAction.id,
        pendingAction.nextStatus,
        empresaAtual!.id,
        pendingAction.valor,
        comentario || (pendingAction.nextStatus === 'rejeitado' ? 'Rejeitado via Hub' : 'Aprovado via Hub')
      );
      queryClient.invalidateQueries({ queryKey: ['premiacoes_pagamentos'] });
      toast.success(pendingAction.nextStatus === 'rejeitado' ? "Rejeição registrada." : "Aprovação registrada.");
      setIsApprovalDialogOpen(false);
      setPendingAction(null);
      setComentario('');
    } catch (e) {
      toast.error("Erro ao processar ação.");
    }
  };

  const handleReconcile = async () => {
    if (!selectedPagamento) return;
    try {
      await premiacoesService.reconciliarFolha(selectedPagamento.id, Number(valorFolha), empresaAtual!.id, comentario);
      queryClient.invalidateQueries({ queryKey: ['premiacoes_pagamentos'] });
      toast.success("Conciliação registrada.");
      setIsReconcileOpen(false);
      setValorFolha('');
      setComentario('');
    } catch (e) {
      toast.error("Erro na conciliação.");
    }
  };

  const stages = [
    { id: 'calculado', label: 'Aguardando Gestor', icon: User },
    { id: 'revisando', label: 'Em Revisão', icon: MessageSquare },
    { id: 'aprovado_gestor', label: 'Aguardando RH', icon: ShieldCheck },
    { id: 'aprovado_rh', label: 'Aguardando Financeiro', icon: Clock },
    { id: 'aprovado_financeiro', label: 'Conciliação (Folha)', icon: Search }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stages.map((stage) => (
          <Card key={stage.id} className="border-border/30 rounded-2xl shadow-xs bg-card/50 backdrop-blur-xs">
            <CardHeader className="py-4 border-b border-border/10">
              <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-tighter text-muted-foreground">
                <stage.icon className="h-4 w-4 text-primary" />
                {stage.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              {pagamentos
                .filter(p => p.status !== 'rejeitado' && (stage.id === 'aprovado_financeiro' ? (p.status === stage.id || p.status === 'pago') : p.status === stage.id))
                .map(p => {
                  const hasDivergence = p.valor_folha_real && p.valor_folha_real !== p.valor_aprovado;
                  return (
                    <div key={p.id} className={`p-3 border rounded-xl transition-all ${hasDivergence ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/20 hover:bg-muted/5'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[11px] font-bold truncate max-w-[120px]">{p.colaborador?.nome_completo}</span>
                        <Badge variant="secondary" className="text-[9px] font-mono">R$ {p.valor_aprovado || p.valor_calculado}</Badge>
                      </div>
                      
                      {stage.id === 'aprovado_financeiro' && p.status_conciliacao === 'divergente' && (
                        <div className="flex items-center gap-1 mt-1 text-[9px] text-amber-600 font-bold">
                          <AlertTriangle className="h-3 w-3" /> Divergência Detectada
                        </div>
                      )}

                      <div className="flex flex-col gap-2 mt-3">
                        {stage.id === 'aprovado_financeiro' ? (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="flex-1 h-7 text-[10px] rounded-lg"
                              onClick={() => {
                                setSelectedPagamento(p);
                                setValorFolha(p.valor_folha_real?.toString() || '');
                                setIsReconcileOpen(true);
                              }}
                            >
                              <Search className="h-3 w-3 mr-1" /> Manual
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1 h-7 text-[10px] bg-primary/10 text-primary hover:bg-primary/20 rounded-lg border border-primary/20"
                              onClick={async () => {
                                try {
                                  await premiacoesService.autoConciliarComFolha(p.id);
                                  queryClient.invalidateQueries({ queryKey: ['premiacoes_pagamentos'] });
                                  toast.success("Auto-conciliação concluída com sucesso!");
                                } catch (e: any) {
                                  toast.error(safeErrorMessage(e, "Falha na conciliação automática."));
                                }
                              }}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" /> Auto
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button 
                              size="sm" 
                              className="flex-1 h-7 text-[10px] bg-success hover:bg-success/90 rounded-lg"
                              onClick={() => {
                                setSelectedPagamento(p);
                                const nextStageMap: Record<string, string> = {
                                  'calculado': 'revisando',
                                  'revisando': 'aprovado_gestor',
                                  'aprovado_gestor': 'aprovado_rh',
                                  'aprovado_rh': 'aprovado_financeiro'
                                };
                                handleApprove(p.id, nextStageMap[stage.id], p.valor_aprovado || p.valor_calculado);
                              }}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 w-7 p-0 rounded-lg text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setSelectedPagamento(p);
                                handleApprove(p.id, 'rejeitado', 0);
                              }}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                      
                      {p.historico_mudancas && p.historico_mudancas.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/10">
                          <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">Último Comentário</p>
                          <p className="text-[9px] text-muted-foreground italic truncate">
                            {p.historico_mudancas[p.historico_mudancas.length - 1].comentario}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              {pagamentos.filter(p => stage.id === 'aprovado_financeiro' ? (p.status === stage.id || p.status === 'pago') : p.status === stage.id).length === 0 && (
                <div className="text-center py-8 text-[10px] text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed border-border/50">
                  Fila vazia
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {pagamentos.some(p => p.status === 'rejeitado') && (
        <Card className="border-destructive/20 bg-destructive/5 rounded-2xl">
          <CardHeader className="py-3 px-4 border-b border-destructive/10">
            <CardTitle className="text-[10px] font-bold uppercase text-destructive flex items-center gap-2">
              <XCircle className="h-3 w-3" /> Pagamentos Rejeitados (Auditoria Necessária)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 flex flex-wrap gap-3">
            {pagamentos.filter(p => p.status === 'rejeitado').map(p => (
              <div key={p.id} className="p-2 bg-background border border-destructive/20 rounded-xl text-[10px] flex items-center gap-3">
                <span className="font-bold">{p.colaborador?.nome_completo}</span>
                <span className="text-muted-foreground">R$ {p.valor_calculado}</span>
                <Button variant="ghost" size="sm" className="h-6 text-[8px] text-primary" onClick={() => {
                  setSelectedPagamento(p);
                  setPendingAction({ id: p.id, nextStatus: 'calculado', valor: p.valor_calculado });
                  setIsApprovalDialogOpen(true);
                }}>
                  Reiniciar Fluxo
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={isReconcileOpen} onOpenChange={setIsReconcileOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Conciliação Bancária / Folha
            </DialogTitle>
            <DialogDescription>
              Compare o valor aprovado com o lançamento real na folha de pagamento.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="p-4 bg-muted/30 rounded-2xl border border-border/10 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Valor Aprovado:</span>
                <span className="font-bold font-mono">R$ {selectedPagamento?.valor_aprovado}</span>
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Valor Real na Folha</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">R$</span>
                <input 
                  type="number"
                  className="w-full pl-8 pr-4 py-2 bg-background border border-border/50 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-hidden"
                  placeholder="0,00"
                  value={valorFolha}
                  onChange={(e) => setValorFolha(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Justificativa (Obrigatório se houver divergência)</label>
              <Textarea 
                placeholder="Ex: Diferença de impostos retidos..."
                className="rounded-xl resize-none text-xs"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReconcileOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleReconcile} className="rounded-xl px-8">Salvar Conciliação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingAction?.nextStatus === 'rejeitado' ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-success" />
              )}
              {pendingAction?.nextStatus === 'rejeitado' ? 'Confirmar Rejeição' : 'Confirmar Aprovação'}
            </DialogTitle>
            <DialogDescription>
              {pendingAction?.nextStatus === 'rejeitado' 
                ? 'Justifique o motivo da rejeição deste pagamento.' 
                : 'Adicione um comentário opcional para este estágio da aprovação.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted/30 rounded-2xl mb-4">
              <p className="text-xs font-bold">{selectedPagamento?.colaborador?.nome_completo}</p>
              <p className="text-[10px] text-muted-foreground">{selectedPagamento?.campanha?.nome}</p>
              <p className="text-sm font-bold mt-2 text-primary">R$ {selectedPagamento?.valor_aprovado || selectedPagamento?.valor_calculado}</p>
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-bold uppercase text-muted-foreground">Comentário / Justificativa</label>
              <Textarea 
                placeholder="Escreva aqui..."
                className="rounded-xl resize-none text-xs h-24"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button 
              onClick={confirmApproval} 
              className={`rounded-xl px-8 ${pendingAction?.nextStatus === 'rejeitado' ? 'bg-destructive hover:bg-destructive/90' : 'bg-success hover:bg-success/90'}`}
            >
              {pendingAction?.nextStatus === 'rejeitado' ? 'Rejeitar Pagamento' : 'Aprovar e Avançar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}