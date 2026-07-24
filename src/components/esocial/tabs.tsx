/**
 * Sub-componentes de abas do ESocialPage.
 *
 * Extraídos do arquivo principal (`src/pages/ESocialPage.tsx`, 921 LOC) para
 * reduzir tamanho, isolar responsabilidades e permitir testes/reuso.
 * Nenhuma lógica alterada — apenas movimentação estrutural.
 */
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  RefreshCw, Key, Plus, ShieldCheck, Globe, Info, FileCheck, AlertCircle, Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatDateTime } from '@/utils/format';
import { toast } from 'sonner';
import { ESocialEventViewer } from '@/components/esocial/ESocialEventViewer';

/* ============================ Logs de Transmissão ============================ */

export interface ESocialLogsTabProps {
  logs: any[];
  eventos: any[];
  refreshLogs: () => void;
}

export function ESocialLogsTab({ logs, eventos, refreshLogs }: ESocialLogsTabProps) {
  return (
    <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden">
      <div className="h-[2px] bg-gradient-to-r from-success to-primary-glow" />
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Histórico de Transmissão Real</CardTitle>
          <CardDescription>Logs técnicos de comunicação com o servidor do eSocial</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={refreshLogs} className="rounded-xl">
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Nenhum log de transmissão encontrado.</div>
          ) : (
            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Data/Hora</th>
                    <th className="px-4 py-3 text-left font-medium">Evento</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">Duração</th>
                    <th className="px-4 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logs.map((log: any) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{formatDateTime(log.created_at)}</td>
                      <td className="px-4 py-3 font-bold">{eventos.find((e) => e.id === log.evento_id)?.tipo_evento || 'S-XXXX'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={log.status === 'enviado' ? 'default' : 'destructive'} className="rounded-md">
                          {log.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{log.duracao_ms}ms</td>
                      <td className="px-4 py-3 text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 rounded-lg">Ver Detalhes</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Detalhes da Transmissão</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6 pt-4">
                              <div>
                                <h4 className="text-sm font-bold mb-2">Request XML (Envio)</h4>
                                <pre className="p-3 bg-muted rounded-lg text-[10px] overflow-x-auto border">{log.request_xml}</pre>
                              </div>
                              <div>
                                <h4 className="text-sm font-bold mb-2">Response XML (Retorno Governo)</h4>
                                <pre className="p-3 bg-muted rounded-lg text-[10px] overflow-x-auto border">{log.response_xml}</pre>
                              </div>
                              {log.error_details && (
                                <div>
                                  <h4 className="text-sm font-bold text-destructive mb-2">Detalhes do Erro</h4>
                                  <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20 text-xs">
                                    {JSON.stringify(log.error_details, null, 2)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ================================ Config Tab ================================ */

export interface ESocialConfigTabProps {
  certificados: any[];
  config: any;
  empresaAtual: any;
  salvarConfig: (payload: { empresa_id: string; ambiente: string; certificado_id?: string }) => void;
  adicionarCertificado: (payload: any) => void;
}

export function ESocialConfigTab({
  certificados, config, empresaAtual, salvarConfig, adicionarCertificado,
}: ESocialConfigTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="border border-border/30 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" /> Certificado Digital (A1)
          </CardTitle>
          <CardDescription>Gestão de certificados ICP-Brasil para assinatura</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {certificados.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground italic text-sm">
              Nenhum certificado cadastrado
            </div>
          ) : (
            certificados.map((c: any) => (
              <div
                key={c.id}
                className={cn(
                  'p-4 rounded-xl border flex items-center justify-between transition-all',
                  config?.certificado_id === c.id ? 'border-primary bg-primary/5 shadow-xs' : 'border-border/20',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', c.ativo ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{c.subject}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Expira em: {formatDate(c.valid_to)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {config?.certificado_id === c.id ? (
                    <Badge className="bg-primary text-primary-foreground">Padrão</Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 px-2 rounded-lg"
                      onClick={() =>
                        empresaAtual?.id &&
                        salvarConfig({ empresa_id: empresaAtual.id, ambiente: config?.ambiente || '2', certificado_id: c.id })
                      }
                    >
                      Usar este
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full rounded-xl border-dashed">
                <Plus className="h-4 w-4 mr-2" /> Novo Certificado (.p12 / .pfx)
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload de Certificado A1</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const file = formData.get('file') as File;
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    if (empresaAtual?.id) {
                      adicionarCertificado({
                        empresa_id: empresaAtual.id,
                        subject: (formData.get('subject') as string) || file.name,
                        issuer: 'Autoridade Certificadora',
                        valid_from: new Date().toISOString(),
                        valid_to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                        arquivo_base64: base64,
                        senha_encriptada: formData.get('password') as string,
                        cnpj_cpf: empresaAtual.cnpj || '',
                      });
                    }
                  };
                  reader.readAsDataURL(file);
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Arquivo (.pfx / .p12)</Label>
                  <Input name="file" type="file" accept=".pfx,.p12" required />
                </div>
                <div className="space-y-2">
                  <Label>Senha do Certificado</Label>
                  <Input name="password" type="password" autoComplete="off" placeholder="Sua senha" required />
                </div>
                <div className="space-y-2">
                  <Label>Identificação (Ex: e-CNPJ Empresa)</Label>
                  <Input name="subject" placeholder="Nome para o certificado" required />
                </div>
                <Button type="submit" className="w-full rounded-xl bg-gradient-to-r from-primary to-primary-glow">
                  Salvar Certificado
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card className="border border-border/30 rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Ambiente de Transmissão
          </CardTitle>
          <CardDescription>Defina para onde os eventos serão enviados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup
            value={config?.ambiente || '2'}
            onValueChange={(v) =>
              empresaAtual?.id &&
              salvarConfig({ empresa_id: empresaAtual.id, ambiente: v, certificado_id: config?.certificado_id ?? undefined })
            }
            className="grid gap-4"
          >
            <div
              className={cn(
                'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer',
                config?.ambiente === '2' ? 'border-info bg-info/5' : 'border-border/20',
              )}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="2" id="amb-2" />
                <Label htmlFor="amb-2" className="cursor-pointer">
                  <p className="font-bold">Produção Restrita (Homologação)</p>
                  <p className="text-xs text-muted-foreground">Ambiente de testes sem valor fiscal</p>
                </Label>
              </div>
              <Badge variant="outline" className="text-info border-info/30">Recomendado</Badge>
            </div>

            <div
              className={cn(
                'flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer',
                config?.ambiente === '1' ? 'border-warning bg-warning/5' : 'border-border/20',
              )}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value="1" id="amb-1" />
                <Label htmlFor="amb-1" className="cursor-pointer">
                  <p className="font-bold">Produção Real</p>
                  <p className="text-xs text-muted-foreground">Envio oficial ao Governo Federal</p>
                </Label>
              </div>
              <Badge variant="outline" className="text-warning border-warning/30">Oficial</Badge>
            </div>
          </RadioGroup>

          <div className="p-4 rounded-xl bg-muted/30 border border-border/10 flex gap-3 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 text-primary" />
            <p>
              A alteração para Produção Real requer que todos os eventos anteriores (S-1000) tenham sido enviados e aceitos no
              ambiente oficial.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* =========================== Event Details Dialog =========================== */

export interface ESocialEventDetailsDialogProps {
  selectedEvento: any | null;
  onClose: () => void;
  statusVariant: (s: string) => string;
  onExportXML: (evento: any) => void;
  onValidar: (evento: any) => void;
}

export function ESocialEventDetailsDialog({
  selectedEvento, onClose, statusVariant, onExportXML, onValidar,
}: ESocialEventDetailsDialogProps) {
  return (
    <Dialog open={!!selectedEvento} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-border/30 shadow-elevated rounded-2xl">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-xl">
              <FileCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="font-display text-xl">{selectedEvento?.tipo_evento} - Detalhes da Transmissão</DialogTitle>
              <DialogDescription className="font-body">Histórico de envio e retorno do eSocial</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6 pt-2">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-muted/30 border-none shadow-none">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Status</span>
                <StatusBadge status={selectedEvento?.status || 'pendente'} variant={statusVariant(selectedEvento?.status || 'pendente') as any} />
              </CardContent>
            </Card>
            <Card className="bg-muted/30 border-none shadow-none">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Data de Envio</span>
                <span className="text-sm font-medium">{formatDate(selectedEvento?.data_envio || selectedEvento?.created_at)}</span>
              </CardContent>
            </Card>
            <Card className="bg-muted/30 border-none shadow-none">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Recibo / Protocolo</span>
                <span className="text-sm font-mono">{selectedEvento?.protocolo || 'Aguardando transmissão'}</span>
              </CardContent>
            </Card>
            <Card className="bg-muted/30 border-none shadow-none">
              <CardContent className="p-4 flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Ambiente</span>
                <Badge variant="outline" className="w-fit flex gap-1 items-center"><Globe className="h-3 w-3" /> Produção</Badge>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-background rounded-xl border shadow-xs">
              <Label className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3 block">Conteúdo Estruturado</Label>
              <ESocialEventViewer
                tipo={selectedEvento?.tipo_evento}
                dados={selectedEvento?.dados_evento || selectedEvento?.dados || {}}
              />
            </div>

            {selectedEvento?.mensagem_erro && (
              <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm font-body">
                <p className="font-bold flex items-center gap-1.5 mb-1"><AlertCircle className="h-4 w-4" /> Erro na Transmissão:</p>
                {selectedEvento.mensagem_erro}
              </div>
            )}

            <div>
              <Label className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1.5 block">Dados do Evento (JSON)</Label>
              <div className="relative group/json">
                <pre className="text-[10px] p-4 bg-muted rounded-xl border font-mono max-h-[300px] overflow-auto">
                  {JSON.stringify(selectedEvento?.dados_evento || selectedEvento?.dados || {}, null, 2)}
                </pre>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Copiar"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover/json:opacity-100 transition-opacity"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      JSON.stringify(selectedEvento?.dados_evento || selectedEvento?.dados || {}, null, 2),
                    );
                    toast.success('JSON copiado');
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {selectedEvento?.xml && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-[11px] uppercase tracking-widest text-muted-foreground block">Conteúdo XML Assinado</Label>
                  <Badge variant="outline" className="text-[9px] h-4 gap-1 border-primary/20 bg-primary/5 text-primary">
                    <ShieldCheck className="h-2.5 w-2.5" /> SHA-256 Assinado
                  </Badge>
                </div>
                <pre className="text-[10px] p-4 bg-primary/5 rounded-xl border border-primary/10 font-mono max-h-[300px] overflow-auto text-primary/80">
                  {selectedEvento.xml}
                </pre>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 bg-muted/20 border-t border-border/20 flex justify-between items-center">
          <div className="flex gap-2">
            {selectedEvento?.xml && (
              <Button variant="outline" size="sm" onClick={() => onExportXML(selectedEvento)} className="rounded-xl h-9 gap-2">
                <Download className="h-4 w-4" /> Exportar XML
              </Button>
            )}
            {selectedEvento?.status === 'pendente' && (
              <Button variant="outline" size="sm" onClick={() => onValidar(selectedEvento)} className="rounded-xl h-9 gap-2">
                <ShieldCheck className="h-4 w-4" /> Validar Agora
              </Button>
            )}
          </div>
          <Button variant="default" onClick={onClose} className="rounded-xl h-9 px-6">Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
