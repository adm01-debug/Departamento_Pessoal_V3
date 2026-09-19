import { useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataAccessLog } from '@/hooks/useDataAccessLog';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { colaboradorService } from '@/services';
import { cargoService } from '@/services/cargoService';
import { localTrabalhoService } from '@/services/localTrabalhoService';
import { useAuth } from '@/hooks/useAuth';
import { useProximosEventos } from '@/hooks/useProximosEventos';
import {
  Users, ShieldCheck, Briefcase,
  Landmark, FileText, Info, Edit, MoreHorizontal, History as HistoryIcon,
  MapPin, Calendar, Stethoscope, User as UserIcon, GraduationCap, HeartPulse, Clock, UserPlus
} from 'lucide-react';
import { RecontratarColaboradorDialog } from '@/components/colaboradores/RecontratarColaboradorDialog';
import {
  DependentesTab, EmergenciaTab, HistoricoSalarialTab, ExperienciaTab,
  ASOTab, FormacaoTab, EstrangeiroTab, PCDTab, AquisitivosTab, AnotacoesTab,
  ContasBancariasTab, DocumentosPessoaisTab, EstagiarioTab, HistoricoContratosTab,
  ColaboradorHistory, BeneficiosTab, ColaboradorDocuments, CamposCustomizadosTab,
  TrabalhoHierarquiaTab, JornadaPontoTab, FeriasResumoTab, AfastamentosTab, HoleritesTab,
  DesenvolvimentoResumoTab, SSTResumoTab, ComplianceTab, TimelineFuncionalTab
} from '@/components/colaborador-detalhes';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger} from '@/components/ui/dropdown-menu';

export default function ColaboradorDetalhesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, hasRole } = useAuth();
  const podeVerSalario = isAdmin || hasRole('rh' as any);

  const [activeMainTab, setActiveMainTab] = useState('geral');
  const [activePessoalTab, setActivePessoalTab] = useState('dependentes');
  const [activeFeriasTab, setActiveFeriasTab] = useState('resumo');
  const [activeFinanceiroTab, setActiveFinanceiroTab] = useState('contas');
  const [activeDesenvolvimentoTab, setActiveDesenvolvimentoTab] = useState('resumo');
  const [activeSSTTab, setActiveSSTTab] = useState('aso');
  const [activeDocumentosTab, setActiveDocumentosTab] = useState('pessoais');
  const [activeTimelineTab, setActiveTimelineTab] = useState('funcional');
  const [recontratarOpen, setRecontratarOpen] = useState(false);

  // colaboradorService.buscarPorId cai nos 12 colaboradores fictícios de
  // src/mocks/colaboradoresMock.ts quando VITE_COLABORADORES_MOCK=true (dev only).
  const { data: colaborador, isLoading } = useQuery({
    queryKey: ['colaborador', id],
    queryFn: () => (colaboradorService as any).buscarPorId(id!),
    enabled: !!id});

  useDataAccessLog('colaboradores', id, colaborador?.empresa_id);

  // Resumo: cargo (para CBO real via cargos.cbo) e local de trabalho —
  // só buscados quando o colaborador tiver de fato cargo_id/local_trabalho_id
  // preenchidos (nenhum formulário atual popula esses FKs ainda — ver PARTE 2/3).
  const { data: cargoDetalhe } = useQuery({
    queryKey: ['cargo-resumo', colaborador?.cargo_id],
    queryFn: () => cargoService.buscarPorId(colaborador.cargo_id, colaborador.empresa_id),
    enabled: !!colaborador?.cargo_id});

  const { data: localTrabalhoDetalhe } = useQuery({
    queryKey: ['local-trabalho-resumo', colaborador?.local_trabalho_id],
    queryFn: () => localTrabalhoService.buscarPorId(colaborador.local_trabalho_id, colaborador.empresa_id),
    enabled: !!colaborador?.local_trabalho_id});

  const proximosEventos = useProximosEventos(id ?? '', colaborador?.empresa_id);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  if (!colaborador) return <div className="p-6">Colaborador não encontrado</div>;

  return (
    <>
      <PageTitle title="Dossiê do Colaborador" description="Visão 360º do colaborador" />
      <PageLayout
        title={colaborador.nome_completo}
        description={`${colaborador.cargo} · ${colaborador.departamento}`}
        icon={<Users className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-primary-glow"
        actions={
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => navigate(`/colaboradores/${id}/editar`)}
            >
              <Edit className="h-4 w-4 mr-1.5" /> Editar Perfil
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem className="gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" /> Exportar Ficha (PDF)
                </DropdownMenuItem>
                {colaborador?.status === 'desligado' && (
                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setRecontratarOpen(true)}>
                    <UserPlus className="h-4 w-4" /> Recontratar Colaborador
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem className="gap-2 cursor-pointer text-destructive">
                  <MoreHorizontal className="h-4 w-4" /> Outras Ações
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      >
        {/* Profile Header Summary */}
        <Card className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              <div className="relative group">
                <div className="h-24 w-24 rounded-3xl bg-muted flex items-center justify-center border-2 border-border/30 overflow-hidden">
                  <UserIcon className="h-10 w-10 text-muted-foreground/30" />
                  {colaborador.foto_url && <img src={colaborador.foto_url} alt={colaborador.nome_completo} className="h-full w-full object-cover" />}
                </div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-success border-2 border-card flex items-center justify-center">
                  <ShieldCheck className="h-3 w-3 text-white" />
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground">Status</p>
                  <Badge variant={colaborador.status === 'ativo' ? 'default' : 'secondary'} className="rounded-full">
                    {colaborador.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground">Admissão</p>
                  <p className="font-display font-semibold">{colaborador.data_admissao}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground">Salário Atual</p>
                  <p className="font-display font-semibold text-primary">
                    {podeVerSalario
                      ? Number(colaborador.salario_base).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : 'Restrito'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest font-medium text-muted-foreground">Documento</p>
                  <p className="font-mono text-sm">{colaborador.cpf}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Master Tabs */}
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="space-y-6">
          <TabsList className="bg-muted/50 rounded-xl p-1 border border-border/30 w-full justify-start overflow-x-auto no-scrollbar">
            <TabsTrigger value="geral" className="rounded-lg font-body px-6 gap-2">
              <Info className="h-4 w-4" /> Resumo
            </TabsTrigger>
            <TabsTrigger value="pessoal" className="rounded-lg font-body px-6 gap-2">
              <Users className="h-4 w-4" /> Dados Pessoais
            </TabsTrigger>
            <TabsTrigger value="hierarquia" className="rounded-lg font-body px-6 gap-2">
              <Briefcase className="h-4 w-4" /> Trabalho &amp; Hierarquia
            </TabsTrigger>
            <TabsTrigger value="jornada" className="rounded-lg font-body px-6 gap-2">
              <Clock className="h-4 w-4" /> Jornada &amp; Ponto
            </TabsTrigger>
            <TabsTrigger value="ferias" className="rounded-lg font-body px-6 gap-2">
              <Calendar className="h-4 w-4" /> Férias &amp; Afastamentos
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="rounded-lg font-body px-6 gap-2">
              <Landmark className="h-4 w-4" /> Financeiro &amp; Benefícios
            </TabsTrigger>
            <TabsTrigger value="desenvolvimento" className="rounded-lg font-body px-6 gap-2">
              <GraduationCap className="h-4 w-4" /> Desenvolvimento
            </TabsTrigger>
            <TabsTrigger value="sst" className="rounded-lg font-body px-6 gap-2">
              <HeartPulse className="h-4 w-4" /> SST
            </TabsTrigger>
            <TabsTrigger value="documentos" className="rounded-lg font-body px-6 gap-2">
              <FileText className="h-4 w-4" /> Documentos &amp; Compliance
            </TabsTrigger>
            <TabsTrigger value="timeline" className="rounded-lg font-body px-6 gap-2">
              <HistoryIcon className="h-4 w-4" /> Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            {activeMainTab === 'geral' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-center gap-2 font-display font-medium text-lg">
                      <Info className="h-5 w-5 text-primary" /> Perfil Executivo
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-muted/20 rounded-2xl border border-border/30">
                          <p className="text-xs text-muted-foreground mb-1">Local de Trabalho</p>
                          <p className="font-semibold flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {localTrabalhoDetalhe
                              ? `${localTrabalhoDetalhe.nome}${localTrabalhoDetalhe.cidade ? ` — ${localTrabalhoDetalhe.cidade}/${localTrabalhoDetalhe.uf}` : ''}`
                              : 'Não definido'}
                          </p>
                        </div>
                        <div className="p-4 bg-muted/20 rounded-2xl border border-border/30 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Cargo</p>
                            <p className="font-semibold">{cargoDetalhe?.nome ?? colaborador.cargo}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">CBO</p>
                            <p className="font-semibold">{cargoDetalhe?.cbo ?? colaborador.cbo ?? '—'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 bg-muted/20 rounded-2xl border border-border/30">
                          <p className="text-xs text-muted-foreground mb-1">Email Profissional</p>
                          <p className="font-semibold text-sm truncate">{colaborador.email || 'Não informado'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <p className="text-xs text-primary font-medium uppercase tracking-wider mb-2">Observações Internas</p>
                      <p className="text-sm text-muted-foreground italic">"{colaborador.observacoes || 'Nenhuma observação registrada para este colaborador.'}"</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-center gap-2 font-display font-medium text-lg">
                      <Calendar className="h-5 w-5 text-primary" /> Próximos Eventos
                    </div>
                    <div className="space-y-4">
                      {proximosEventos.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhum evento futuro identificado.</p>
                      ) : proximosEventos.slice(0, 6).map((evento, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-warning/20 bg-warning/5">
                          <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                            {evento.tipo === 'aso' ? <Stethoscope className="h-4 w-4 text-warning" /> : <Calendar className="h-4 w-4 text-warning" />}
                          </div>
                          <div>
                            <p className="text-xs font-medium">{evento.titulo}</p>
                            <p className="text-[10px] text-muted-foreground">{evento.data}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pessoal">
            <Tabs value={activePessoalTab} onValueChange={setActivePessoalTab} className="space-y-4">
              <TabsList className="bg-transparent h-auto p-0 gap-4 border-b border-border/20 rounded-none w-full justify-start overflow-x-auto no-scrollbar">
                <TabsTrigger value="dependentes" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Dependentes</TabsTrigger>
                <TabsTrigger value="emergencia" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Contatos de Emergência</TabsTrigger>
                <TabsTrigger value="pcd" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">PCD</TabsTrigger>
                <TabsTrigger value="estrangeiro" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Estrangeiro</TabsTrigger>
                <TabsTrigger value="customizados" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Campos Customizados</TabsTrigger>
              </TabsList>
              <TabsContent value="dependentes">{activePessoalTab === 'dependentes' && <DependentesTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="emergencia">{activePessoalTab === 'emergencia' && <EmergenciaTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="pcd">{activePessoalTab === 'pcd' && <PCDTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="estrangeiro">{activePessoalTab === 'estrangeiro' && <EstrangeiroTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="customizados">{activePessoalTab === 'customizados' && <CamposCustomizadosTab colaboradorId={id!} />}</TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="hierarquia">
            {activeMainTab === 'hierarquia' && <TrabalhoHierarquiaTab colaboradorId={id!} />}
          </TabsContent>

          <TabsContent value="jornada">
            {activeMainTab === 'jornada' && <JornadaPontoTab colaboradorId={id!} />}
          </TabsContent>

          <TabsContent value="ferias">
            <Tabs value={activeFeriasTab} onValueChange={setActiveFeriasTab} className="space-y-4">
              <TabsList className="bg-transparent h-auto p-0 gap-4 border-b border-border/20 rounded-none w-full justify-start overflow-x-auto no-scrollbar">
                <TabsTrigger value="resumo" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Férias</TabsTrigger>
                <TabsTrigger value="aquisitivos" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Períodos Aquisitivos</TabsTrigger>
                <TabsTrigger value="afastamentos" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Afastamentos</TabsTrigger>
              </TabsList>
              <TabsContent value="resumo">{activeFeriasTab === 'resumo' && <FeriasResumoTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="aquisitivos">{activeFeriasTab === 'aquisitivos' && <AquisitivosTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="afastamentos">{activeFeriasTab === 'afastamentos' && <AfastamentosTab colaboradorId={id!} />}</TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="financeiro">
            <Tabs value={activeFinanceiroTab} onValueChange={setActiveFinanceiroTab} className="space-y-4">
              <TabsList className="bg-transparent h-auto p-0 gap-4 border-b border-border/20 rounded-none w-full justify-start overflow-x-auto no-scrollbar">
                <TabsTrigger value="contas" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Contas Bancárias</TabsTrigger>
                <TabsTrigger value="beneficios" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Benefícios</TabsTrigger>
                <TabsTrigger value="holerites" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Holerites</TabsTrigger>
              </TabsList>
              <TabsContent value="contas">{activeFinanceiroTab === 'contas' && <ContasBancariasTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="beneficios">{activeFinanceiroTab === 'beneficios' && <BeneficiosTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="holerites">{activeFinanceiroTab === 'holerites' && <HoleritesTab colaboradorId={id!} />}</TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="desenvolvimento">
            <Tabs value={activeDesenvolvimentoTab} onValueChange={setActiveDesenvolvimentoTab} className="space-y-4">
              <TabsList className="bg-transparent h-auto p-0 gap-4 border-b border-border/20 rounded-none w-full justify-start overflow-x-auto no-scrollbar">
                <TabsTrigger value="resumo" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Treinamentos &amp; Avaliação</TabsTrigger>
                <TabsTrigger value="experiencia" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Período de Experiência</TabsTrigger>
                <TabsTrigger value="formacao" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Formação</TabsTrigger>
              </TabsList>
              <TabsContent value="resumo">{activeDesenvolvimentoTab === 'resumo' && <DesenvolvimentoResumoTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="experiencia">{activeDesenvolvimentoTab === 'experiencia' && <ExperienciaTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="formacao">{activeDesenvolvimentoTab === 'formacao' && <FormacaoTab colaboradorId={id!} />}</TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="sst">
            <Tabs value={activeSSTTab} onValueChange={setActiveSSTTab} className="space-y-4">
              <TabsList className="bg-transparent h-auto p-0 gap-4 border-b border-border/20 rounded-none w-full justify-start overflow-x-auto no-scrollbar">
                <TabsTrigger value="aso" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">ASO / Exames</TabsTrigger>
                <TabsTrigger value="resumo" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">EPIs, Riscos &amp; CAT</TabsTrigger>
              </TabsList>
              <TabsContent value="aso">{activeSSTTab === 'aso' && <ASOTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="resumo">{activeSSTTab === 'resumo' && <SSTResumoTab colaboradorId={id!} />}</TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="documentos">
            <Tabs value={activeDocumentosTab} onValueChange={setActiveDocumentosTab} className="space-y-4">
              <TabsList className="bg-transparent h-auto p-0 gap-4 border-b border-border/20 rounded-none w-full justify-start">
                <TabsTrigger value="pessoais" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Documentos Pessoais</TabsTrigger>
                <TabsTrigger value="anotacoes" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Anotações Internas</TabsTrigger>
                <TabsTrigger value="estagiario" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Dados Estagiário</TabsTrigger>
                <TabsTrigger value="compliance" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Compliance</TabsTrigger>
              </TabsList>
              <TabsContent value="pessoais">
                {activeDocumentosTab === 'pessoais' && (
                  <div className="space-y-8">
                    <DocumentosPessoaisTab colaboradorId={id!} />
                    <ColaboradorDocuments colaboradorId={id!} />
                  </div>
                )}
              </TabsContent>
              <TabsContent value="anotacoes">{activeDocumentosTab === 'anotacoes' && <AnotacoesTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="estagiario">{activeDocumentosTab === 'estagiario' && <EstagiarioTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="compliance">{activeDocumentosTab === 'compliance' && <ComplianceTab colaboradorId={id!} />}</TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="timeline">
            <Tabs value={activeTimelineTab} onValueChange={setActiveTimelineTab} className="space-y-4">
              <TabsList className="bg-transparent h-auto p-0 gap-4 border-b border-border/20 rounded-none w-full justify-start overflow-x-auto no-scrollbar">
                <TabsTrigger value="funcional" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Timeline Funcional</TabsTrigger>
                <TabsTrigger value="historico-salarial" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Histórico Salarial</TabsTrigger>
                <TabsTrigger value="contratos" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Contratos</TabsTrigger>
                <TabsTrigger value="auditoria" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Auditoria</TabsTrigger>
              </TabsList>
              <TabsContent value="funcional">{activeTimelineTab === 'funcional' && <TimelineFuncionalTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="historico-salarial">{activeTimelineTab === 'historico-salarial' && <HistoricoSalarialTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="contratos">{activeTimelineTab === 'contratos' && <HistoricoContratosTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="auditoria">{activeTimelineTab === 'auditoria' && <ColaboradorHistory colaboradorId={id!} />}</TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </PageLayout>
      {colaborador && (
        <RecontratarColaboradorDialog
          colaborador={colaborador}
          open={recontratarOpen}
          onOpenChange={setRecontratarOpen}
        />
      )}
    </>
  );
}
