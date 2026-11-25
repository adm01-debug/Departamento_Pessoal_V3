/**
 * ============================================================================
 * DIÁLOGO "DETALHES COMPLETOS" DA CENTRAL DE AJUSTES.
 *
 * O painel lateral resolve a decisão do dia a dia; este diálogo guarda o que só
 * cabe numa superfície maior e continua sendo necessário para auditar:
 *   · Informações — colaborador, data, horas e motivo, em cartões;
 *   · Auditoria — trilha de `trilha_auditoria_ponto` do registro;
 *   · Conformidade 671 — timezone, geofencing, divergência, SHA256 e o botão de
 *     exportar o relatório em PDF (`exportPortaria671PDF`).
 *
 * Foi preservado do modal antigo (a tela passou a mostrar os detalhes correntes
 * no painel ao lado), com a MESMA consulta de auditoria e o MESMO fluxo de
 * aprovação/rejeição — nada de comportamento foi perdido na troca de layout.
 * ============================================================================
 */
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { CheckCircle2, Download, FileText, History, MapPin, Shield, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { auditoriaService } from '@/services/auditoriaService';
import { exportPortaria671PDF } from '@/services/exportService';
import { registrarAcessoPII } from '@/services/piiAccessLogService';
import {
  RISCOS_AJUSTE,
  STATUS_AJUSTE,
  dataBR,
  horaAjuste,
  metaTipoAjuste,
  minutosAjuste,
  riscoDoAjuste,
  statusAjuste,
  type SolicitacaoAjustePonto,
} from './centralAjustes';

/** Linha da trilha do registro como o diálogo a exibe (mesmos campos de `audit_log`). */
interface TrilhaAuditoriaPonto {
  id: string;
  acao: string;
  created_at: string;
  user_email?: string | null;
}

interface CentralAjustesDetalhesDialogProps {
  /** Solicitação aberta; `null` mantém o diálogo fechado. */
  solicitacao: SolicitacaoAjustePonto | null;
  onFechar: () => void;
  onAprovar: (id: string) => void;
  onRejeitar: (id: string) => void;
  /** Empresa atual — exigida pelo registro de acesso a PII na exportação. */
  empresaId?: string;
  processando?: boolean;
}

export function CentralAjustesDetalhesDialog({
  solicitacao,
  onFechar,
  onAprovar,
  onRejeitar,
  empresaId,
  processando = false,
}: CentralAjustesDetalhesDialogProps) {
  const { data: logsAuditoria = [] } = useQuery({
    queryKey: ['trilha-auditoria-ponto', solicitacao?.id],
    enabled: Boolean(solicitacao?.id),
    queryFn: async () => {
      if (!solicitacao?.id) return [];
      // A trilha do registro vive na RPC da trilha (`get_audit_trail`), a MESMA
      // fonte da Central de Auditoria. `trilha_auditoria_ponto` não tem
      // `registro_id` (vincula por `ponto_id`) nem `user_email`, então a
      // consulta anterior voltava 400 e a aba ficava sempre no estado vazio;
      // `audit_log` direto pelo cliente é recusado pelo contrato do bridge.
      const trilha = await auditoriaService.listarTrilha({
        empresa_id: empresaId ?? null,
        tabela: 'solicitacoes_ajuste_ponto',
        registro_id: solicitacao.id,
        limite: 50,
      });
      return trilha.map((item) => ({
        id: item.id,
        acao: item.acao ?? 'evento',
        created_at: item.created_at,
        user_email: item.user_email,
      })) as TrilhaAuditoriaPonto[];
    },
  });

  if (!solicitacao) return null;

  const estado = statusAjuste(solicitacao.status);
  const risco = riscoDoAjuste(solicitacao);
  const tipo = metaTipoAjuste(solicitacao.tipo_ponto);
  const conformidade = solicitacao.relatorio_conformidade;
  const pendente = estado === 'pendente';

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b p-5">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Detalhes da Solicitação
          </DialogTitle>
          <DialogDescription>Informações completas, trilha de auditoria e conformidade legal.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto bg-muted/5 p-5">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="mb-4 grid w-full grid-cols-3">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="audit">Auditoria</TabsTrigger>
              <TabsTrigger value="conformidade">Conformidade 671</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-0 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-card p-3">
                  <p className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase">Colaborador</p>
                  <p className="text-sm font-medium">{solicitacao.colaborador?.nome_completo ?? '—'}</p>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <p className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase">Data do Ponto</p>
                  <p className="text-sm font-medium">
                    {solicitacao.data_ponto ? format(parseISO(solicitacao.data_ponto), 'dd/MM/yyyy') : '—'}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <p className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase">Hora Original</p>
                  <p className="text-numeric text-sm">
                    {solicitacao.hora_original ? horaAjuste(solicitacao.hora_original) : 'Original'}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-3">
                  <p className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase">Hora Sugerida</p>
                  <p className="text-numeric text-sm text-primary">{horaAjuste(solicitacao.hora_sugerida)}</p>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-3">
                <p className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase">Tipo e status</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" size="sm">
                    {tipo.rotulo}
                  </Badge>
                  <Badge variant={STATUS_AJUSTE[estado].badge} size="sm">
                    {STATUS_AJUSTE[estado].rotulo}
                  </Badge>
                  {risco && (
                    <Badge variant={RISCOS_AJUSTE[risco.nivel].badge} size="sm">
                      Risco {RISCOS_AJUSTE[risco.nivel].rotulo.toLowerCase()}
                    </Badge>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    Divergência: {minutosAjuste(conformidade?.divergencia_minutos)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-3">
                <p className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase">Motivo do Ajuste</p>
                <p className="text-sm">{solicitacao.motivo}</p>
              </div>

              {solicitacao.observacoes_gestor && (
                <div className="rounded-xl border bg-card p-3">
                  <p className="mb-1.5 text-[10px] font-medium text-muted-foreground uppercase">
                    Observações do gestor
                  </p>
                  <p className="text-sm text-muted-foreground">{solicitacao.observacoes_gestor}</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="audit" className="mt-0">
              <ScrollArea className="h-[300px] pr-4">
                <div className="relative space-y-4 before:absolute before:inset-0 before:left-2 before:w-0.5 before:bg-muted">
                  {logsAuditoria.length > 0 ? (
                    logsAuditoria.map((log) => (
                      <div key={log.id} className="relative pl-8">
                        <div className="absolute top-1.5 left-0 z-10 h-4 w-4 rounded-full border-2 border-primary bg-background" />
                        <div className="rounded-xl border bg-card p-3 shadow-xs">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-xs font-medium text-primary capitalize">{log.acao}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(log.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{log.user_email || 'Sistema'}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <History className="mb-2 h-8 w-8 opacity-20" />
                      <p className="text-sm">Nenhum log histórico encontrado.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="conformidade" className="mt-0 space-y-3">
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="h-6 w-6 text-success" />
                    <div>
                      <h4 className="text-sm font-medium">Validação Portaria 671</h4>
                      <p className="text-xs text-muted-foreground">
                        Integridade e rastreabilidade garantidas por SHA256.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      // Registro de acesso a PII herdado do componente anterior:
                      // o PDF leva nome do colaborador — a leitura sensível é
                      // auditada antes da exportação (fire-and-forget).
                      void registrarAcessoPII('ponto_registros', 'export', {
                        empresaId,
                        registroId: solicitacao.id,
                      });
                      exportPortaria671PDF(solicitacao);
                    }}
                  >
                    <Download className="h-4 w-4" /> Exportar PDF
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Timezone</p>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-primary">
                        {conformidade?.timezone || 'America/Sao_Paulo'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Geofencing</p>
                    <span
                      className={`text-sm font-medium ${conformidade?.geofencing ? 'text-success' : 'text-warning'}`}
                    >
                      {conformidade?.geofencing ? 'VÁLIDO' : 'NÃO VERIFICADO'}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Divergência de tempo</p>
                    <p className="text-sm font-medium">
                      {minutosAjuste(conformidade?.divergencia_minutos)} em relação ao horário original (
                      {horaAjuste(solicitacao.hora_original)})
                    </p>
                  </div>
                  <div className="col-span-2 space-y-1 border-t pt-2">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">
                      Assinatura digital de integridade (SHA256)
                    </p>
                    <p className="rounded-lg border bg-muted p-2 font-mono text-[10px] break-all">
                      {conformidade?.sha256_integridade || 'Aguardando processamento'}
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex items-center justify-between border-t bg-muted/5 p-5">
          <div className="flex gap-2">
            {pendente && (
              <>
                <Button
                  size="sm"
                  variant="gradient-success"
                  className="gap-2"
                  onClick={() => onAprovar(solicitacao.id)}
                  disabled={processando}
                >
                  <CheckCircle2 className="h-4 w-4" /> Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-2"
                  onClick={() => onRejeitar(solicitacao.id)}
                  disabled={processando}
                >
                  <XCircle className="h-4 w-4" /> Rejeitar
                </Button>
              </>
            )}
          </div>
          <Button size="sm" variant="outline" onClick={onFechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
