import { PageTitle } from '@/components/PageTitle';
import { useState, useMemo } from 'react';
import { useAdmissoes } from '@/hooks/useAdmissoes';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { EmptyList, EmptySearch } from '@/components/ui/empty-state';
import { NovaAdmissaoDialog } from '@/components/admissoes/NovaAdmissaoDialog';
import { DetalhesAdmissaoDialog } from '@/components/admissoes/DetalhesAdmissaoDialog';
import { UserPlus, Search, ExternalLink, Mail, MessageSquare, Send, LayoutDashboard, List, History, Rocket, Kanban } from 'lucide-react';
import { AdmissoesKanban } from '@/components/admissoes/AdmissoesKanban';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { contratacaoService } from '@/services/contratacaoService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OnboardingDashboard } from '@/components/admissoes/OnboardingDashboard';
import OnboardingPageContent from '@/components/admissoes/OnboardingPageContent';
import type { LooseRow } from '@/types/db';


const etapaLabels: Record<string, string> = {
  solicitacao: 'Solicitação',
  documentos: 'Docs Pendentes',
  validacao: 'Em Validação',
  exame: 'Aguardando Exame',
  contrato: 'Contrato Gerado',
  assinatura: 'Assinatura',
  esocial: 'eSocial',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

const etapaGradients: Record<string, string> = {
  documentos: 'bg-warning/15 text-warning border-0',
  validacao: 'bg-info/15 text-info border-0',
  exame: 'bg-warning/15 text-warning border-0',
  contrato: 'bg-info/15 text-info border-0',
  concluida: 'bg-success/15 text-success border-0',
  cancelada: 'bg-destructive/15 text-destructive border-0',
  esocial: 'bg-primary/15 text-primary border-0',
};

const etapaFilters = ['todos', ...Object.keys(etapaLabels)] as const;

export default function AdmissoesPage() {
  const navigate = useNavigate();

  const { admissoes, isLoading } = useAdmissoes();
  const [search, setSearch] = useState('');
  const [etapaFilter, setEtapaFilter] = useState('todos');
  const [sendingLink, setSendingLink] = useState<string | null>(null);
  const [selectedAdmissao, setSelectedAdmissao] = useState<LooseRow<'admissoes'> | null>(null);

  const handleEnviarLink = async (admissao: any) => {
    if (!admissao.email) {
      toast.error('Candidato sem e-mail cadastrado');
      return;
    }
    setSendingLink(admissao.id);
    try {
      await contratacaoService.enviarLinkCandidato(admissao.id, admissao.email);
      toast.success('Link de contratação enviado com sucesso!');
    } catch (error: any) {
      toast.error(safeErrorMessage(error, 'Erro ao enviar link.'));
    } finally {
      setSendingLink(null);
    }
  };
  
  const handleEnviarWhatsApp = async (admissao: any) => {
    if (!admissao.telefone) {
      toast.error('Candidato sem telefone cadastrado');
      return;
    }
    setSendingLink(admissao.id);
    try {
      const tokenDataRes = await contratacaoService.enviarLinkCandidato(admissao.id, admissao.email || '');
      if (!tokenDataRes.ok) throw new Error(tokenDataRes.error.message);
      const tokenData = tokenDataRes.value;
      await contratacaoService.enviarWhatsApp(admissao.id, admissao.telefone, tokenData.token);

      toast.success('Link gerado para WhatsApp!');
    } catch (error: any) {
      toast.error(safeErrorMessage(error, 'Erro ao gerar link.'));
    } finally {
      setSendingLink(null);
    }
  };

  const filtered = useMemo(() => {
    let result = (admissoes as any[]) || [];
    if (etapaFilter !== 'todos') {
      result = result.filter((a: any) => a.etapa === etapaFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((a: any) =>
        a.nome?.toLowerCase().includes(q) ||
        a.cargo?.toLowerCase().includes(q) ||
        a.departamento?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [admissoes, search, etapaFilter]);

  const etapaCounts = useMemo(() => {
    const counts: Record<string, number> = { todos: (admissoes as any[])?.length || 0 };
    (admissoes as any[])?.forEach((a: any) => {
      counts[a.etapa] = (counts[a.etapa] || 0) + 1;
    });
    return counts;
  }, [admissoes]);

  return (
    <>
    <PageTitle title="Admissões" description="Gestão de processos admissionais" />
    <PageLayout
      title="Admissões"
      description="Gerencie o processo de admissão de colaboradores"
      icon={<UserPlus className="h-5 w-5 text-primary-foreground" />}
      gradient="from-primary to-primary-glow"
      actions={<NovaAdmissaoDialog />}
    >
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="dashboard" className="rounded-lg gap-2">
            <LayoutDashboard className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="gestao" className="rounded-lg gap-2">
            <List className="h-4 w-4" /> Gestão de Candidatos
          </TabsTrigger>
          <TabsTrigger value="kanban" className="rounded-lg gap-2">
            <Kanban className="h-4 w-4" /> Kanban
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="rounded-lg gap-2">
            <Rocket className="h-4 w-4" /> Onboarding
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="rounded-lg gap-2">
            <History className="h-4 w-4" /> Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-12"><Spinner size="lg" /></div>
          ) : (
            <AdmissoesKanban admissoes={(admissoes as any[]) || []} />
          )}
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center p-12"><Spinner size="lg" /></div>
          ) : (
            <OnboardingDashboard admissoes={admissoes || []} />
          )}
        </TabsContent>

        <TabsContent value="onboarding" className="space-y-6">
          <OnboardingPageContent />
        </TabsContent>

        <TabsContent value="gestao" className="space-y-6">
          <div className="space-y-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, cargo ou departamento..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 rounded-xl border-border/30 bg-card"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {etapaFilters.map(etapa => {
                const count = etapaCounts[etapa] || 0;
                const isActive = etapaFilter === etapa;
                return (
                  <button
                    key={etapa}
                    onClick={() => setEtapaFilter(etapa)}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-body font-medium transition-all',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-glow-sm'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {etapa === 'todos' ? 'Todos' : etapaLabels[etapa] || etapa}
                    {count > 0 && (
                      <span className={cn(
                        'min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold',
                        isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted-foreground/15 text-muted-foreground'
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8"><Spinner size="lg" /></div>
          ) : (admissoes?.length || 0) === 0 ? (
            <EmptyList entityName="admissão" />
          ) : filtered.length === 0 ? (
            <EmptySearch search={search} onClear={() => { setSearch(''); setEtapaFilter('todos'); }} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((admissao: any, i: number) => (
                <motion.div key={admissao.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="group border border-border/30 hover:border-border/60 shadow-elevated hover:shadow-glow transition-all duration-300 rounded-2xl overflow-hidden">
                    <div className="h-[2px] bg-gradient-to-r from-primary to-primary-glow opacity-60 group-hover:opacity-100 transition-opacity" />
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-display">{admissao.nome}</CardTitle>
                        <Badge className={etapaGradients[admissao.etapa] || 'bg-muted text-muted-foreground border-0'}>
                          {etapaLabels[admissao.etapa] || admissao.etapa}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground space-y-1 font-body">
                      <p><strong className="text-foreground">Cargo:</strong> {admissao.cargo}</p>
                      <p><strong className="text-foreground">Departamento:</strong> {admissao.departamento}</p>
                      <p><strong className="text-foreground">Data prevista:</strong> {new Date(admissao.data_prevista).toLocaleDateString('pt-BR')}</p>
                      <p><strong className="text-foreground">Salário:</strong> {Number(admissao.salario_proposto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </CardContent>
                    <CardFooter className="pt-2 flex gap-2 border-t border-border/10 bg-muted/5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="flex-1 text-xs rounded-xl hover:bg-primary/10 hover:text-primary"
                            disabled={sendingLink === admissao.id}
                          >
                            {sendingLink === admissao.id ? (
                              <Spinner size="sm" className="mr-2" />
                            ) : (
                              <Send className="w-3 h-3 mr-2" />
                            )}
                            Enviar Link
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl">
                          <DropdownMenuItem onClick={() => handleEnviarLink(admissao)} className="gap-2 cursor-pointer">
                            <Mail className="w-4 h-4 text-primary" />
                            Enviar por E-mail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEnviarWhatsApp(admissao)} className="gap-2 cursor-pointer">
                            <MessageSquare className="w-4 h-4 text-success" />
                            Enviar por WhatsApp
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="flex-1 text-xs rounded-xl hover:bg-info/10 hover:text-info"
                        onClick={() => setSelectedAdmissao(admissao)}
                      >
                        <ExternalLink className="w-3 h-3 mr-2" />
                        Detalhes
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="auditoria">
           <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-xs">
             <CardHeader className="bg-muted/30">
               <CardTitle className="text-sm font-display flex items-center gap-2">
                 <History className="h-4 w-4 text-primary" /> Histórico de Auditoria - Admissões
               </CardTitle>
             </CardHeader>
             <CardContent className="py-8 text-center">
                <History className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">O monitoramento de auditoria eSocial e admissão digital está ativo.</p>
                <Button variant="link" className="text-xs text-primary mt-2" onClick={() => navigate('/configuracoes/logs')}>
                  Ver Logs Globais
                </Button>
             </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

    </PageLayout>
    
    <DetalhesAdmissaoDialog 
      admissao={selectedAdmissao} 
      open={!!selectedAdmissao} 
      onOpenChange={(open) => !open && setSelectedAdmissao(null)} 
    />
    </>
  );
}
