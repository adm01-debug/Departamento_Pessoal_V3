import { useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { useParams, useNavigate } from 'react-router-dom';
import { useDataAccessLog } from '@/hooks/useDataAccessLog';
import { useEmpresas } from '@/hooks/useEmpresas';
import { usePiiMask } from '@/hooks/usePiiMask';
import { usePDFExport } from '@/hooks/usePDFExport';
import { useProximosEventos } from '@/hooks/useProximosEventos';
import { useQuery } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { colaboradorService } from '@/services';
import {
  Users,
  Briefcase,
  ShieldCheck,
  Landmark,
  FileText,
  Info,
  Edit,
  MoreHorizontal,
  History as HistoryIcon,
  MapPin,
  Calendar,
  Stethoscope,
  User as UserIcon,
  Gift,
  GitCommitVertical,
  Clock,
  UserPlus,
  AlertTriangle,
  GraduationCap,
  HeartPulse,
  FileWarning,
} from 'lucide-react';
import {
  DependentesTab,
  EmergenciaTab,
  HistoricoSalarialTab,
  ExperienciaTab,
  ASOTab,
  FormacaoTab,
  EstrangeiroTab,
  PCDTab,
  AquisitivosTab,
  AnotacoesTab,
  ContasBancariasTab,
  DocumentosPessoaisTab,
  EstagiarioTab,
  HistoricoContratosTab,
  ColaboradorHistory,
  HistoricoColaborador,
  BeneficiosTab,
  ColaboradorDocuments,
  TrabalhoHierarquiaTab,
  JornadaPontoTab,
  FeriasResumoTab,
  DesenvolvimentoResumoTab,
  DocumentosComplianceResumoTab,
  HoleritesTab,
  CamposCustomizadosTab,
  SSTResumoTab,
} from '@/components/colaborador-detalhes';
import { RecontratarColaboradorDialog } from '@/components/colaboradores/RecontratarColaboradorDialog';
import { PendenciasDialog, type PendenciaItem } from '@/components/colaborador-detalhes/PendenciasDialog';
import { usePendenciasColaborador } from '@/hooks/usePendenciasColaborador';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ColaboradorDetalhesPage() {
  const pii = usePiiMask();
  const { exportarPDF } = usePDFExport();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { empresaAtual } = useEmpresas();
  const [activeMainTab, setActiveMainTab] = useState('geral');
  const [activePessoalTab, setActivePessoalTab] = useState('dependentes');
  const [activeProfissionalTab, setActiveProfissionalTab] = useState('trabalho');
  const [activeFinanceiroTab, setActiveFinanceiroTab] = useState('contas');
  const [activeDocumentosTab, setActiveDocumentosTab] = useState('compliance');
  const [activeJornadaTab, setActiveJornadaTab] = useState('ponto');
  const [recontratarAberto, setRecontratarAberto] = useState(false);
  const [pendenciasAberto, setPendenciasAberto] = useState(false);

  const { data: colaborador, isLoading } = useQuery({
    queryKey: ['colaborador', id, empresaAtual?.id],
    queryFn: () => colaboradorService.buscarPorId(id!, empresaAtual!.id),
    enabled: !!id && !!empresaAtual?.id,
  });

  useDataAccessLog('colaboradores', id, colaborador?.empresa_id);

  const proximosEventos = useProximosEventos(id!, empresaAtual?.id);

  // Pendencias do dossie — resgate da branch `muri`. O hook decide O QUE e
  // pendencia; a pagina decide o ICONE e PARA ONDE o "Resolver agora" leva,
  // porque so ela conhece as abas e as rotas.
  const { pendencias } = usePendenciasColaborador(id!, empresaAtual?.id);
  const ICONE_PENDENCIA = {
    ponto: Clock,
    onboarding: GraduationCap,
    aso: HeartPulse,
    documentos: FileWarning,
  } as const;
  const pendenciasDetalhadas: PendenciaItem[] = pendencias.map((p) => ({
    icon: ICONE_PENDENCIA[p.chave],
    texto: p.texto,
    contexto: p.contexto,
    itens: p.itens,
    severidade: p.severidade,
    onClick: () => {
      if (p.chave === 'ponto') {
        setActiveMainTab('jornada');
        setActiveJornadaTab('ponto');
        return;
      }
      if (p.chave === 'onboarding') {
        setActiveMainTab('profissional');
        return;
      }
      if (p.chave === 'aso') {
        navigate('/sst');
        return;
      }
      setActiveMainTab('pessoal');
    },
  }));

  if (isLoading)
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
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
              onClick={() => navigate(`/colaboradores/editar/${id}`)}
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
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onSelect={() =>
                    void exportarPDF(
                      `Ficha - ${colaborador.nome_completo}`,
                      [
                        { Campo: 'Nome', Valor: colaborador.nome_completo },
                        { Campo: 'CPF', Valor: colaborador.cpf ? pii.cpf(colaborador.cpf) : '—' },
                        { Campo: 'Cargo', Valor: colaborador.cargo || '—' },
                        { Campo: 'Departamento', Valor: colaborador.departamento || '—' },
                        { Campo: 'Status', Valor: colaborador.status || '—' },
                        { Campo: 'Admissão', Valor: colaborador.data_admissao || '—' },
                        {
                          Campo: 'Salário Base',
                          Valor: Number(colaborador.salario_base).toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }),
                        },
                        { Campo: 'E-mail', Valor: colaborador.email ? pii.email(colaborador.email) : '—' },
                        {
                          Campo: 'Cidade/UF',
                          Valor: colaborador.cidade ? `${colaborador.cidade} - ${colaborador.uf ?? ''}` : '—',
                        },
                      ],
                      ['Campo', 'Valor']
                    )
                  }
                >
                  <FileText className="h-4 w-4" /> Exportar Ficha (PDF)
                </DropdownMenuItem>
                {colaborador.status === 'desligado' && (
                  <DropdownMenuItem className="gap-2 cursor-pointer" onSelect={() => setRecontratarAberto(true)}>
                    <UserPlus className="h-4 w-4" /> Recontratar Colaborador
                  </DropdownMenuItem>
                )}
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
                  {colaborador.foto_url && (
                    <img
                      src={colaborador.foto_url}
                      alt={colaborador.nome_completo}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-success border-2 border-card flex items-center justify-center">
                  <ShieldCheck className="h-3 w-3 text-white" />
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Status</p>
                  <Badge variant={colaborador.status === 'ativo' ? 'default' : 'secondary'} className="rounded-full">
                    {colaborador.status}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Admissão</p>
                  <p className="font-display font-semibold">{colaborador.data_admissao}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Salário Atual</p>
                  <p className="font-display font-semibold text-primary">
                    {Number(colaborador.salario_base).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Documento</p>
                  <p className="font-mono text-sm">{colaborador.cpf ? pii.cpf(colaborador.cpf) : '—'}</p>
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
              <Users className="h-4 w-4" /> Pessoal
            </TabsTrigger>
            <TabsTrigger value="profissional" className="rounded-lg font-body px-6 gap-2">
              <Briefcase className="h-4 w-4" /> Carreira
            </TabsTrigger>
            <TabsTrigger value="jornada" className="rounded-lg font-body px-6 gap-2">
              <Clock className="h-4 w-4" /> Jornada & Ponto
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="rounded-lg font-body px-6 gap-2">
              <Landmark className="h-4 w-4" /> Financeiro
            </TabsTrigger>
            <TabsTrigger value="documentos" className="rounded-lg font-body px-6 gap-2">
              <FileText className="h-4 w-4" /> Documentação
            </TabsTrigger>
            <TabsTrigger value="beneficios" className="rounded-lg font-body px-6 gap-2">
              <Gift className="h-4 w-4" /> Benefícios
            </TabsTrigger>
            <TabsTrigger value="historico" className="rounded-lg font-body px-6 gap-2">
              <HistoryIcon className="h-4 w-4" /> Histórico
            </TabsTrigger>
            <TabsTrigger value="timeline" className="rounded-lg font-body px-6 gap-2">
              <GitCommitVertical className="h-4 w-4" /> Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral">
            {activeMainTab === 'geral' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2 border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-center gap-2 font-display font-bold text-lg">
                      <Info className="h-5 w-5 text-primary" /> Perfil Executivo
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-muted/20 rounded-2xl border border-border/30">
                          <p className="text-xs text-muted-foreground mb-1">Unidade / Local</p>
                          <p className="font-semibold flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {colaborador.cidade} - {colaborador.uf}
                          </p>
                        </div>
                        <div className="p-4 bg-muted/20 rounded-2xl border border-border/30">
                          <p className="text-xs text-muted-foreground mb-1">CBO / Cargo</p>
                          <p className="font-semibold">{colaborador.cargo}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="p-4 bg-muted/20 rounded-2xl border border-border/30">
                          <p className="text-xs text-muted-foreground mb-1">Email Profissional</p>
                          <p className="font-semibold text-sm truncate">
                            {colaborador.email ? pii.email(colaborador.email) : 'Não informado'}
                          </p>
                        </div>
                        <div className="p-4 bg-muted/20 rounded-2xl border border-border/30">
                          <p className="text-xs text-muted-foreground mb-1">Gestor Direto</p>
                          <p className="font-semibold">Nenhum associado</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <p className="text-xs text-primary font-bold uppercase tracking-wider mb-2">
                        Observações Internas
                      </p>
                      <p className="text-sm text-muted-foreground italic">
                        "{colaborador.observacoes || 'Nenhuma observação registrada para este colaborador.'}"
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {pendenciasDetalhadas.length > 0 && (
                  <Card className="border border-warning/30 rounded-2xl overflow-hidden shadow-elevated">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-center gap-2 font-display font-bold text-lg">
                        <AlertTriangle className="h-5 w-5 text-warning" /> Pendências
                        <Badge variant="warning" size="sm" className="ml-auto">
                          {pendenciasDetalhadas.length}
                        </Badge>
                      </div>
                      <ul className="space-y-2">
                        {pendenciasDetalhadas.map((p) => (
                          <li key={p.texto} className="flex items-center gap-3 text-sm">
                            <p.icon
                              className={`h-4 w-4 shrink-0 ${p.severidade === 'alta' ? 'text-destructive' : 'text-warning'}`}
                            />
                            <span className="min-w-0">{p.texto}</span>
                          </li>
                        ))}
                      </ul>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setPendenciasAberto(true)}>
                        Ver detalhes
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card className="border border-border/30 rounded-2xl overflow-hidden shadow-elevated">
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-center gap-2 font-display font-bold text-lg">
                      <Calendar className="h-5 w-5 text-primary" /> Próximos Eventos
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-warning/20 bg-warning/5">
                        <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                          <Calendar className="h-4 w-4 text-warning" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">Férias</p>
                          <p className="text-[10px] text-muted-foreground">Período vence em 45 dias</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-success/20 bg-success/5">
                        <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                          <Stethoscope className="h-4 w-4 text-success" />
                        </div>
                        <div>
                          <p className="text-xs font-bold">Exame Periódico</p>
                          <p className="text-[10px] text-muted-foreground">ASO em conformidade</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pessoal">
            <Tabs value={activePessoalTab} onValueChange={setActivePessoalTab} className="space-y-4">
              <TabsList className="bg-transparent h-auto p-0 gap-4 border-b border-border/20 rounded-none w-full justify-start overflow-x-auto no-scrollbar">
                <TabsTrigger
                  value="dependentes"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Dependentes
                </TabsTrigger>
                <TabsTrigger
                  value="emergencia"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Contatos de Emergência
                </TabsTrigger>
                <TabsTrigger
                  value="pcd"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  PCD
                </TabsTrigger>
                <TabsTrigger
                  value="estrangeiro"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Estrangeiro
                </TabsTrigger>
              </TabsList>
              <TabsContent value="dependentes">
                {activePessoalTab === 'dependentes' && <DependentesTab colaboradorId={id!} />}
              </TabsContent>
              <TabsContent value="emergencia">
                {activePessoalTab === 'emergencia' && <EmergenciaTab colaboradorId={id!} />}
              </TabsContent>
              <TabsContent value="pcd">{activePessoalTab === 'pcd' && <PCDTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="estrangeiro">
                {activePessoalTab === 'estrangeiro' && <EstrangeiroTab colaboradorId={id!} />}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="profissional">
            <Tabs value={activeProfissionalTab} onValueChange={setActiveProfissionalTab} className="space-y-4">
              <TabsList className="bg-transparent h-auto p-0 gap-4 border-b border-border/20 rounded-none w-full justify-start overflow-x-auto no-scrollbar">
                <TabsTrigger
                  value="trabalho"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Trabalho &amp; Hierarquia
                </TabsTrigger>
                <TabsTrigger
                  value="historico"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Histórico Salarial
                </TabsTrigger>
                <TabsTrigger
                  value="contratos"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Contratos
                </TabsTrigger>
                <TabsTrigger
                  value="experiencia"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Experiência Anterior
                </TabsTrigger>
                <TabsTrigger
                  value="formacao"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Formação
                </TabsTrigger>
                <TabsTrigger
                  value="desenvolvimento"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Desenvolvimento
                </TabsTrigger>
                <TabsTrigger
                  value="aso"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  ASO / Exames
                </TabsTrigger>
                <TabsTrigger
                  value="sst"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  SST
                </TabsTrigger>
              </TabsList>
              <TabsContent value="trabalho">
                {activeProfissionalTab === 'trabalho' && <TrabalhoHierarquiaTab colaboradorId={id!} />}
              </TabsContent>
              <TabsContent value="historico">
                {activeProfissionalTab === 'historico' && <HistoricoSalarialTab colaboradorId={id!} />}
              </TabsContent>
              <TabsContent value="contratos">
                {activeProfissionalTab === 'contratos' && <HistoricoContratosTab colaboradorId={id!} />}
              </TabsContent>
              <TabsContent value="experiencia">
                {activeProfissionalTab === 'experiencia' && <ExperienciaTab colaboradorId={id!} />}
              </TabsContent>
              <TabsContent value="formacao">
                {activeProfissionalTab === 'formacao' && <FormacaoTab colaboradorId={id!} />}
              </TabsContent>
              <TabsContent value="desenvolvimento">
                {activeProfissionalTab === 'desenvolvimento' && <DesenvolvimentoResumoTab colaboradorId={id!} />}
              </TabsContent>
              <TabsContent value="aso">{activeProfissionalTab === 'aso' && <ASOTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="sst">
                {activeProfissionalTab === 'sst' && <SSTResumoTab colaboradorId={id!} />}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="jornada">
            <Tabs value={activeJornadaTab} onValueChange={setActiveJornadaTab} className="space-y-4">
              <TabsList className="bg-transparent h-auto p-0 gap-4 border-b border-border/20 rounded-none w-full justify-start overflow-x-auto no-scrollbar">
                <TabsTrigger
                  value="ponto"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Jornada &amp; Ponto
                </TabsTrigger>
                <TabsTrigger
                  value="ferias"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Férias &amp; Afastamentos
                </TabsTrigger>
              </TabsList>
              <TabsContent value="ponto">
                {activeJornadaTab === 'ponto' && <JornadaPontoTab colaboradorId={id!} />}
              </TabsContent>
              <TabsContent value="ferias">
                {activeJornadaTab === 'ferias' && <FeriasResumoTab colaboradorId={id!} />}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="financeiro">
            <Tabs value={activeFinanceiroTab} onValueChange={setActiveFinanceiroTab} className="space-y-4">
              <TabsList className="bg-transparent h-auto p-0 gap-4 border-b border-border/20 rounded-none w-full justify-start">
                <TabsTrigger
                  value="contas"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Contas Bancárias
                </TabsTrigger>
                <TabsTrigger
                  value="aquisitivos"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Períodos Aquisitivos
                </TabsTrigger>
                <TabsTrigger
                  value="holerites"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Holerites
                </TabsTrigger>
              </TabsList>
              <TabsContent value="contas">
                {activeFinanceiroTab === 'contas' && <ContasBancariasTab colaboradorId={id!} />}
              </TabsContent>
              <TabsContent value="aquisitivos">
                {activeFinanceiroTab === 'aquisitivos' && <AquisitivosTab colaboradorId={id!} />}
              </TabsContent>
              <TabsContent value="holerites">
                {activeFinanceiroTab === 'holerites' && <HoleritesTab colaboradorId={id!} />}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="documentos">
            <Tabs value={activeDocumentosTab} onValueChange={setActiveDocumentosTab} className="space-y-4">
              <TabsList className="bg-transparent h-auto p-0 gap-4 border-b border-border/20 rounded-none w-full justify-start">
                <TabsTrigger
                  value="compliance"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Compliance
                </TabsTrigger>
                <TabsTrigger
                  value="pessoais"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Documentos Pessoais
                </TabsTrigger>
                <TabsTrigger
                  value="anotacoes"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Anotações Internas
                </TabsTrigger>
                <TabsTrigger
                  value="estagiario"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Dados Estagiário
                </TabsTrigger>
                <TabsTrigger
                  value="customizados"
                  className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent"
                >
                  Campos Personalizados
                </TabsTrigger>
              </TabsList>
              <TabsContent value="compliance">
                {activeDocumentosTab === 'compliance' && <DocumentosComplianceResumoTab colaboradorId={id!} />}
              </TabsContent>
              <TabsContent value="pessoais">
                {activeDocumentosTab === 'pessoais' && (
                  <div className="space-y-8">
                    <DocumentosPessoaisTab colaboradorId={id!} />
                    <ColaboradorDocuments colaboradorId={id!} />
                  </div>
                )}
              </TabsContent>
              <TabsContent value="anotacoes">
                {activeDocumentosTab === 'anotacoes' && <AnotacoesTab colaboradorId={id!} />}
              </TabsContent>
              <TabsContent value="estagiario">
                {activeDocumentosTab === 'estagiario' && <EstagiarioTab colaboradorId={id!} />}
              </TabsContent>
              <TabsContent value="customizados">
                {activeDocumentosTab === 'customizados' && <CamposCustomizadosTab colaboradorId={id!} />}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="beneficios">
            {activeMainTab === 'beneficios' && <BeneficiosTab colaboradorId={id!} />}
          </TabsContent>

          <TabsContent value="historico">
            {activeMainTab === 'historico' && <ColaboradorHistory colaboradorId={id!} />}
          </TabsContent>

          <TabsContent value="timeline">
            {activeMainTab === 'timeline' && (
              <HistoricoColaborador
                colaboradorId={id!}
                proximosEventos={proximosEventos.eventos}
                proximosEventosIndisponiveis={proximosEventos.isError}
              />
            )}
          </TabsContent>
        </Tabs>
      </PageLayout>

      <RecontratarColaboradorDialog
        colaborador={colaborador}
        open={recontratarAberto}
        onOpenChange={setRecontratarAberto}
      />

      <PendenciasDialog open={pendenciasAberto} onOpenChange={setPendenciasAberto} pendencias={pendenciasDetalhadas} />
    </>
  );
}
