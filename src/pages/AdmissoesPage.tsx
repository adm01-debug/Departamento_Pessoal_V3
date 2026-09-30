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
import { Tabs, TabsContent } from '@/components/ui/tabs';
// A tablist de Admissões tem a MESMA aparência da área de Colaboradores: em vez
// de recriar as classes, consome a skin exportada por `AnimatedDossieTabs`
// (fonte única da tablist do app) — container `bg-muted/50 rounded-xl p-1
// border border-border/30`, indicador `rounded-lg bg-background shadow-xs` e
// trigger transparente (`data-[state=active]:bg-transparent text-primary`),
// tudo por cima do mecanismo de `ui/animated-tabs` (indicador persistente
// movido por mola, o mesmo das duas áreas).
import {
  AnimatedDossieTabsList as AnimatedTabsList,
  AnimatedDossieTabsTrigger as AnimatedTabsTrigger,
} from '@/components/colaboradores/AnimatedDossieTabs';
import { OnboardingDashboard } from '@/components/admissoes/OnboardingDashboard';
import OnboardingPageContent from '@/components/admissoes/OnboardingPageContent';
import type { LooseRow } from '@/types/db';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// MOCK VISUAL — ver src/mocks/admissoesMock.ts
import { isAdmissoesMockEnabled, isMockId, getMockAuditoria } from '@/mocks/admissoesMock';


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

/**
 * Abas internas do módulo. A ordem é a mesma da navegação: visão geral →
 * operação (candidatos/kanban) → jornada (onboarding) → conformidade.
 */
const abasAdmissoes = [
  { value: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { value: 'gestao', label: 'Gestão de Candidatos', icon: List },
  { value: 'kanban', label: 'Kanban', icon: Kanban },
  { value: 'onboarding', label: 'Onboarding', icon: Rocket },
  { value: 'auditoria', label: 'Auditoria', icon: History },
] as const;


/** Cores de status usadas na trilha de auditoria (MOCK VISUAL). */
const auditoriaStatusClasses: Record<string, string> = {
  sucesso: 'bg-success/15 text-success',
  pendente: 'bg-warning/15 text-warning',
  falha: 'bg-destructive/15 text-destructive',
};

export default function AdmissoesPage() {
  const navigate = useNavigate();

  const { admissoes, isLoading } = useAdmissoes();
  const [search, setSearch] = useState('');
  const [etapaFilter, setEtapaFilter] = useState('todos');
  // Aba ativa em estado próprio: a tablist animada (AnimatedTabsList) e o
  // `<Tabs>` do Radix que controla o conteúdo leem o MESMO valor — é assim que
  // o Dossiê de Colaboradores mantém lista e painel em sincronia.
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sendingLink, setSendingLink] = useState<string | null>(null);
  const [selectedAdmissao, setSelectedAdmissao] = useState<LooseRow<'admissoes'> | null>(null);

  // MOCK VISUAL — ver src/mocks/admissoesMock.ts (dev + VITE_ADMISSOES_MOCK=true).
  const [auditoriaBusca, setAuditoriaBusca] = useState('');
  const auditoria = useMemo(() => (isAdmissoesMockEnabled() ? getMockAuditoria() : []), []);
  const auditoriaFiltrada = useMemo(() => {
    const termo = auditoriaBusca.trim().toLowerCase();
    if (!termo) return auditoria;
    return auditoria.filter((evento) =>
      [evento.candidato, evento.cargo, evento.departamento, evento.acao, evento.responsavel, evento.protocolo]
        .filter(Boolean)
        .some((valor) => String(valor).toLowerCase().includes(termo))
    );
  }, [auditoria, auditoriaBusca]);
  const auditoriaResumo = useMemo(
    () => ({
      total: auditoria.length,
      sucesso: auditoria.filter((evento) => evento.status === 'sucesso').length,
      pendente: auditoria.filter((evento) => evento.status === 'pendente').length,
      falha: auditoria.filter((evento) => evento.status === 'falha').length,
    }),
    [auditoria]
  );

  const handleEnviarLink = async (admissao: any) => {
    if (!admissao.email) {
      toast.error('Candidato sem e-mail cadastrado');
      return;
    }
    // MOCK VISUAL — candidato fictício: simula o envio sem disparar e-mail real.
    if (isMockId(admissao.id)) {
      toast.success(`Link de contratação gerado para ${admissao.email} (demonstração).`);
      return;
    }
    setSendingLink(admissao.id);
    try {
      await contratacaoService.enviarLinkCandidato(admissao.id, admissao.email);
      toast.success('Link de contratação enviado com sucesso!');
    } catch (error) {
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
    // MOCK VISUAL — candidato fictício: simula o link sem gerar token/abrir WhatsApp.
    if (isMockId(admissao.id)) {
      toast.success(`Link de contratação preparado para ${admissao.telefone} (demonstração).`);
      return;
    }
    setSendingLink(admissao.id);
    try {
      const tokenDataRes = await contratacaoService.enviarLinkCandidato(admissao.id, admissao.email || '');
      if (!tokenDataRes.ok) throw new Error(tokenDataRes.error.message);
      const tokenData = tokenDataRes.value;
      await contratacaoService.enviarWhatsApp(admissao.id, admissao.telefone, tokenData.token);

      toast.success('Link gerado para WhatsApp!');
    } catch (error) {
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Tablist com a MESMA aparência da área de Colaboradores: a skin vem
            de `AnimatedDossieTabs` (container `bg-muted/50 rounded-xl p-1 border
            border-border/30`, indicador `rounded-lg bg-background shadow-xs`,
            trigger transparente com `text-primary` no estado ativo) e o
            mecanismo vem de `ui/animated-tabs` — indicador único e persistente,
            medido no trigger ativo e movido pela mola
            (`stiffness 220 / damping 24 / mass 0.7`). Quem pinta a aba ativa é
            o indicador, nunca o botão: nenhum fundo/borda instantâneo em
            `data-state=active` cobre o slide.

            LAYOUT (só desta área — cores, ícones, fonte, altura e labels não
            mudam): a tablist é `flex w-full` e cada trigger é `flex-1`, então
            as 5 abas dividem 100% da barra em partes iguais e o conteúdo de
            cada uma fica centralizado dentro da própria célula. Nada é
            dimensionado pelo texto (`w-fit`/`max-content`) — era isso que
            deixava as abas amontoadas à esquerda com sobra à direita em telas
            largas.
            `flex-1` (= `flex: 1 1 0%`) mantém o `min-width: auto` do flex:
            quando a célula igual não couber o rótulo (abaixo de ~1270px de
            viewport, onde "Gestão de Candidatos" já pede 190px), a aba para no
            tamanho natural do conteúdo em vez de cortar/apagar texto, e o
            `overflow-x-auto` do container assume com scroll — mesma leitura de
            hoje no mobile, sem nenhuma altura nova. */}
        <AnimatedTabsList value={activeTab} onValueChange={setActiveTab} listClassName="flex w-full items-stretch">
          {abasAdmissoes.map(({ value, label, icon: Icon }) => (
            <AnimatedTabsTrigger key={value} value={value} className="flex-1">
              <Icon className="h-3.5 w-3.5" /> {label}
            </AnimatedTabsTrigger>
          ))}
        </AnimatedTabsList>

        <TabsContent value="kanban" className="mt-6 space-y-4">
          {isLoading ? (
            <div className="flex justify-center p-12"><Spinner size="lg" /></div>
          ) : (
            <AdmissoesKanban admissoes={(admissoes as any[]) || []} />
          )}
        </TabsContent>

        <TabsContent value="dashboard" className="mt-6 space-y-6">
          {isLoading ? (
            <div className="flex justify-center p-12"><Spinner size="lg" /></div>
          ) : (
            <OnboardingDashboard admissoes={admissoes || []} />
          )}
        </TabsContent>

        <TabsContent value="onboarding" className="mt-6 space-y-6">
          <OnboardingPageContent />
        </TabsContent>

        <TabsContent value="gestao" className="mt-6 space-y-6">
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
                        'min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-medium',
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
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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

        <TabsContent value="auditoria" className="mt-6">
          {/* MOCK VISUAL — com o modo demonstrativo ligado exibe a trilha de auditoria fictícia completa. */}
          {auditoria.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por candidato, ação, responsável ou protocolo..."
                    value={auditoriaBusca}
                    onChange={e => setAuditoriaBusca(e.target.value)}
                    className="pl-9 rounded-xl border-border/30 bg-card"
                  />
                </div>
                {[
                  { label: 'Eventos', value: auditoriaResumo.total, className: 'bg-muted/50 text-foreground' },
                  { label: 'Sucesso', value: auditoriaResumo.sucesso, className: 'bg-success/15 text-success' },
                  { label: 'Pendentes', value: auditoriaResumo.pendente, className: 'bg-warning/15 text-warning' },
                  { label: 'Falhas', value: auditoriaResumo.falha, className: 'bg-destructive/15 text-destructive' },
                ].map(item => (
                  <span
                    key={item.label}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-caption font-body font-medium',
                      item.className
                    )}
                  >
                    {item.label}
                    <span className="font-semibold">{item.value}</span>
                  </span>
                ))}
              </div>

              <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-xs">
                <CardHeader className="bg-muted/30">
                  <CardTitle className="text-sm font-display flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" /> Histórico de Auditoria - Admissões
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[560px] overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px]">Data/Hora</TableHead>
                          <TableHead>Candidato</TableHead>
                          <TableHead>Ação</TableHead>
                          <TableHead className="w-[130px]">Etapa</TableHead>
                          <TableHead className="w-[150px]">eSocial</TableHead>
                          <TableHead className="w-[110px]">Status</TableHead>
                          <TableHead className="w-[160px]">Responsável</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditoriaFiltrada.map(evento => (
                          <TableRow key={evento.id}>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(evento.data_hora).toLocaleString('pt-BR')}
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className="font-medium text-foreground">{evento.candidato}</span>
                              <span className="block text-muted-foreground">
                                {evento.cargo} • {evento.departamento}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs">
                              <span className="font-medium text-foreground">{evento.acao}</span>
                              <span className="block text-muted-foreground">{evento.detalhe}</span>
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge
                                variant="outline"
                                className={cn('border-0', etapaGradients[evento.etapa] || 'bg-muted/50 text-muted-foreground')}
                              >
                                {etapaLabels[evento.etapa] || evento.etapa}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {evento.evento_esocial ? (
                                <>
                                  <span className="font-medium text-foreground">{evento.evento_esocial}</span>
                                  <span className="block text-muted-foreground">{evento.protocolo || 'aguardando recibo'}</span>
                                </>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">
                              <span
                                className={cn(
                                  'inline-flex items-center px-2 py-0.5 rounded-md text-overline font-body font-medium uppercase',
                                  auditoriaStatusClasses[evento.status] || 'bg-muted/50 text-muted-foreground'
                                )}
                              >
                                {evento.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{evento.responsavel}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {auditoriaFiltrada.length === 0 && (
                      <p className="text-caption font-body text-muted-foreground text-center py-8">
                        Nenhum evento encontrado para a busca informada.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
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
          )}
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
