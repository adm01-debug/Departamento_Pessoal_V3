import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditoriaService, feriasService } from '@/services';
import { useEmpresas } from '@/hooks/useEmpresas';
import { 
  CheckCircle2, 
  Clock, 
  User, 
  Building2, 
  Shield, 
  History,
  Loader2,
  XCircle,
  Check
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';

interface FeriasAuditTimelineProps {
  solicitacaoId: string;
}

export function FeriasAuditTimeline({ solicitacaoId }: FeriasAuditTimelineProps) {
  const [filtro, setFiltro] = React.useState<string>('all');
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id || '';

  const { data: logs, isLoading: loadingAudit } = useQuery({
    queryKey: ['ferias-audit', solicitacaoId, empresaId],
    queryFn: () => auditoriaService.listar(empresaId, {
      registro_id: solicitacaoId,
      tabela: 'ferias',
      limite: 50
    }),
    enabled: !!solicitacaoId && !!empresaId
  });

  const { data: aprovacoes, isLoading: loadingAprov } = useQuery({
    queryKey: ['ferias-aprovacoes-log', solicitacaoId],
    queryFn: () => feriasService.getAprovacoesLog(solicitacaoId),
    enabled: !!solicitacaoId
  });

  const isLoading = loadingAudit || loadingAprov;

  const filteredLogs = React.useMemo(() => {
    if (!logs) return [];
    if (filtro === 'all') return logs;
    return logs.filter((log: any) => {
      const dados = (log.dados_novos as any) || {};
      if (filtro === 'aprovacao') return dados.aprovado_rh || dados.aprovado_gestor;
      if (filtro === 'criacao') return log.acao === 'INSERT';
      if (filtro === 'alteracao') return log.acao === 'UPDATE' && !dados.aprovado_rh && !dados.aprovado_gestor;
      return true;
    });
  }, [logs, filtro]);

  if (isLoading) return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
    </div>
  );

  const getIcon = (acao: string, dados: any) => {
    if (dados?.aprovado_rh || dados?.aprovado_gestor) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (dados?.status === 'rejeitada') return <Shield className="h-4 w-4 text-destructive" />;
    switch (acao) {
      case 'INSERT': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'UPDATE': return <History className="h-4 w-4 text-primary" />;
      default: return <History className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatPayload = (log: any) => {
    try {
      const dados = (log.dados_novos as any) || {};
      if (dados.aprovado_rh) return 'Aprovação final confirmada pelo RH';
      if (dados.aprovado_gestor) return 'Solicitação aprovada pelo gestor direto';
      if (dados.enviado_contabilidade) return 'Enviado para processamento na contabilidade';
      if (dados.status === 'rejeitada') return 'Solicitação rejeitada';
      if (dados.status === 'cancelada' || dados.cancelado) return 'Solicitação cancelada';
      return log.acao === 'INSERT' ? 'Nova solicitação criada' : 'Registro atualizado';
    } catch (e) {
      return 'Alteração no registro';
    }
  };

  return (
    <div className="space-y-4">
      <Tabs value={filtro} onValueChange={setFiltro} className="w-full">
        <TabsList className="grid grid-cols-4 bg-muted/50 rounded-xl h-8 p-1">
          <TabsTrigger value="all" className="text-[10px] rounded-lg">Tudo</TabsTrigger>
          <TabsTrigger value="criacao" className="text-[10px] rounded-lg">Criação</TabsTrigger>
          <TabsTrigger value="aprovacao" className="text-[10px] rounded-lg">Aprovação</TabsTrigger>
          <TabsTrigger value="alteracao" className="text-[10px] rounded-lg">Ajustes</TabsTrigger>
        </TabsList>
      </Tabs>

      <ScrollArea className="h-[350px] pr-4 custom-scrollbar">
        {!filteredLogs.length ? (
          <div className="text-center p-12 text-muted-foreground text-xs font-body italic">
            Nenhum registro encontrado para este filtro.
          </div>
        ) : (
          <div className="space-y-6 relative ml-2 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-px before:bg-border/30">
            {/* Logs de Aprovação Real */}
            {aprovacoes?.map((aprov: any) => (
              <div key={aprov.id} className="relative pl-12">
                <div className={cn(
                  "absolute left-0 p-2 rounded-full border shadow-xs z-10 transition-transform hover:scale-110 bg-background",
                  aprov.status === 'aprovado' ? "border-green-500 text-green-500" : "border-destructive text-destructive"
                )}>
                  {aprov.status === 'aprovado' ? <Check className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                </div>
                <div className="p-3 rounded-xl border border-border/20 bg-muted/10 hover:bg-muted/20 transition-colors space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold font-display uppercase tracking-tight">
                      Aprovação {aprov.nivel}
                    </p>
                    <span className="text-[10px] text-muted-foreground font-body bg-background px-1.5 py-0.5 rounded-md border border-border/40">
                      {format(new Date(aprov.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {aprov.observacao && <p className="text-xs text-muted-foreground bg-background/50 p-2 rounded-lg italic">"{aprov.observacao}"</p>}
                </div>
              </div>
            ))}

            {/* Logs de Auditoria de Sistema */}
            {filteredLogs.map((log: any, i: number) => {
              const dados = (log.dados_novos as any) || {};
              return (
                <div key={log.id} className="relative pl-12">
                  <div className="absolute left-0 p-2 rounded-full bg-background border border-border shadow-xs z-10 transition-transform hover:scale-110">
                    {getIcon(log.acao, dados)}
                  </div>
                  <div className="p-3 rounded-xl border border-border/20 bg-muted/10 hover:bg-muted/20 transition-colors space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold font-display">{formatPayload(log)}</p>
                      <span className="text-[10px] text-muted-foreground font-body bg-background px-1.5 py-0.5 rounded-md border border-border/40">
                        {format(new Date(log.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-body">
                        <User className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{log.user_email || 'Sistema'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
