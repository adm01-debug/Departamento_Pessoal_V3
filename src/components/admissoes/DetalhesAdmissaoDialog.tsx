import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription} from "@/components/ui/dialog";
import { AdmissaoChecklist, Documento } from "@/components/admissao/AdmissaoChecklist";
import { useContratacaoDigital } from "@/hooks/useContratacaoDigital";
import { useAdmissaoWorkflow } from "@/hooks/useAdmissaoWorkflow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  FileText, 
  History, 
  CheckCircle2, 
  Clock, 
  
  ExternalLink,
  ShieldCheck,
  Send
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useESocial } from "@/hooks/useESocial";
import { useEmpresas } from "@/hooks/useEmpresas";
import { maskCpfDisplay } from "@/utils/piiMask";

interface DetalhesAdmissaoDialogProps {
  admissao: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DetalhesAdmissaoDialog({ admissao, open, onOpenChange }: DetalhesAdmissaoDialogProps) {
  const { validarDocumento } = useContratacaoDigital();
  const { workflow } = useAdmissaoWorkflow(admissao?.id);
  const { enviarEvento } = useESocial();
  const { empresaAtual } = useEmpresas();

  const handleEnvioESocial = () => {
    if (!empresaAtual?.id || !admissao) return;
    
    enviarEvento({
      eventoId: admissao.id,
      empresaId: empresaAtual.id
    });
  };

  if (!admissao) return null;

  const documentos: Documento[] = [
    { 
      id: 'doc_pessoais', 
      nome: 'Documentos Pessoais (RG/CPF)', 
      obrigatorio: true, 
      status: admissao.checklist_documentos_pessoais ? 'validado' : 'pendente',
      tipo: 'documentos_pessoais'
    },
    { 
      id: 'comprovante_res', 
      nome: 'Comprovante de Residência', 
      obrigatorio: true, 
      status: admissao.checklist_comprovante_endereco ? 'validado' : 'pendente',
      tipo: 'comprovante_endereco'
    },
    { 
      id: 'ctps', 
      nome: 'CTPS / PIS', 
      obrigatorio: false, 
      status: admissao.checklist_ctps ? 'validado' : 'pendente',
      tipo: 'ctps'
    },
    { 
      id: 'exame', 
      nome: 'Exame Admissional (ASO)', 
      obrigatorio: true, 
      status: admissao.checklist_exame_admissional ? 'validado' : 'pendente',
      tipo: 'exame_admissional'
    },
    { 
      id: 'contrato', 
      nome: 'Contrato Assinado', 
      obrigatorio: true, 
      status: admissao.checklist_contrato_assinado ? 'validado' : 'pendente',
      tipo: 'contrato_assinado'
    },
  ];

  const handleValidate = (docType: string, status: 'validado' | 'rejeitado') => {
    validarDocumento.mutate({
      admissaoId: admissao.id,
      docType,
      status
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
        <DialogHeader className="p-5 bg-gradient-to-r from-primary/10 via-background to-background border-b border-border/10">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="font-display flex items-center gap-2">
                {admissao.nome}
                <Badge variant="outline" className="text-[10px] uppercase font-medium tracking-widest bg-primary/5 text-primary border-primary/20">
                  {admissao.etapa}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Gerenciamento de admissão digital • Iniciada em {format(new Date(admissao.created_at), "dd 'de' MMMM", { locale: ptBR })}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2 h-9 text-xs">
                <ExternalLink className="w-4 h-4" /> Ver Portal
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="w-full justify-start h-12 bg-muted/30 rounded-none px-5 border-b border-border/5">
            <TabsTrigger value="geral" className="gap-2 data-[state=active]:bg-background"><User className="w-4 h-4" /> Geral</TabsTrigger>
            <TabsTrigger value="documentos" className="gap-2 data-[state=active]:bg-background"><FileText className="w-4 h-4" /> Documentos</TabsTrigger>
            <TabsTrigger value="workflow" className="gap-2 data-[state=active]:bg-background"><History className="w-4 h-4" /> Histórico</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px]">
            <div className="p-5">
              <TabsContent value="geral" className="m-0 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Informações da Vaga</h4>
                    <div className="grid gap-3 bg-muted/20 p-4 rounded-2xl border border-border/5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Cargo:</span>
                        <span className="font-medium text-foreground">{admissao.cargo}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Departamento:</span>
                        <span className="font-medium text-foreground">{admissao.departamento}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Salário Proposto:</span>
                        <span className="font-medium text-success">
                          {Number(admissao.salario_proposto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Início Previsto:</span>
                        <span className="font-medium text-foreground">
                          {format(new Date(admissao.data_prevista), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contato do Candidato</h4>
                    <div className="grid gap-3 bg-muted/20 p-4 rounded-2xl border border-border/5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">E-mail:</span>
                        <span className="font-medium text-foreground">{admissao.email || 'Não informado'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Telefone:</span>
                        <span className="font-medium text-foreground">{admissao.telefone || 'Não informado'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">CPF:</span>
                        <span className="font-medium text-foreground">{admissao.cpf ? maskCpfDisplay(admissao.cpf) : 'Não informado'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-primary">Status do Workflow</p>
                    <p className="text-[10px] text-muted-foreground">
                      {workflow?.status === 'em_andamento' ? 'Processo em andamento. Aguardando documentos.' : 'Aguardando início do processo.'}
                    </p>
                  </div>
                </div>

                <div className="bg-success/5 p-4 rounded-2xl border border-success/10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-success/20 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-4 h-4 text-success" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-success">eSocial: Admissão (S-2200)</p>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[11px] text-muted-foreground">
                          {admissao.status_esocial === 'enviado'
                            ? `Protocolo: ${admissao.protocolo_esocial || 'Sincronizado'}`
                            : 'Sincronize os dados do colaborador com o Governo Federal.'}
                        </p>
                        {admissao.data_transmissao_esocial && (
                          <p className="text-[10px] text-muted-foreground">
                            Transmitido em: {new Date(admissao.data_transmissao_esocial).toLocaleString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl border-success/30 text-success hover:bg-success/10 gap-2 font-medium"
                    onClick={handleEnvioESocial}
                    disabled={admissao.status_esocial === 'enviado'}
                  >
                    <Send className="w-3.5 h-3.5" />
                    {admissao.status_esocial === 'enviado' ? 'Transmitido' : 'Transmitir Agora'}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="documentos" className="m-0">
                <AdmissaoChecklist 
                  documentos={documentos} 
                  isAdmin={true} 
                  onValidate={handleValidate}
                />
              </TabsContent>

              <TabsContent value="workflow" className="m-0 space-y-4">
                {workflow?.historico && workflow.historico.length > 0 ? (
                  <div className="space-y-4">
                    {workflow.historico.map((h: any, i: number) => (
                      <div key={h.id} className="flex gap-4 relative">
                        {i < workflow.historico.length - 1 && (
                          <div className="absolute left-2.5 top-6 bottom-0 w-px bg-border/20" />
                        )}
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                          <CheckCircle2 className="w-3 h-3 text-primary" />
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm font-medium text-foreground">{h.acao}</p>
                          <p className="text-xs text-muted-foreground">{h.observacoes}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(h.created_at), "dd/MM/yyyy HH:mm")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mx-auto">
                      <History className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">Nenhum histórico registrado para esta admissão.</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
