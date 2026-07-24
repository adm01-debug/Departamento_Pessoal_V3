import { useState, useMemo } from 'react';
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
import {
  ArrowLeft, Users, Briefcase, ShieldCheck,
  Landmark, FileText, Info, Edit, MoreHorizontal, History as HistoryIcon,
  MapPin, Calendar, Stethoscope, User as UserIcon, Gift
} from 'lucide-react';
import {
  DependentesTab, EmergenciaTab, HistoricoSalarialTab, ExperienciaTab,
  ASOTab, FormacaoTab, EstrangeiroTab, PCDTab, AquisitivosTab, AnotacoesTab,
  ContasBancariasTab, DocumentosPessoaisTab, EstagiarioTab, HistoricoContratosTab,
  ColaboradorHistory, BeneficiosTab, ColaboradorDocuments
} from '@/components/colaborador-detalhes';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ColaboradorDetalhesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeMainTab, setActiveMainTab] = useState('geral');
  const [activePessoalTab, setActivePessoalTab] = useState('dependentes');
  const [activeProfissionalTab, setActiveProfissionalTab] = useState('historico');
  const [activeFinanceiroTab, setActiveFinanceiroTab] = useState('contas');
  const [activeDocumentosTab, setActiveDocumentosTab] = useState('pessoais');

  const { data: colaborador, isLoading } = useQuery({
    queryKey: ['colaborador', id],
    queryFn: () => (colaboradorService as any).buscarPorId(id!),
    enabled: !!id,
  });

  useDataAccessLog('colaboradores', id, colaborador?.empresa_id);

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
              <Users className="h-4 w-4" /> Pessoal
            </TabsTrigger>
            <TabsTrigger value="profissional" className="rounded-lg font-body px-6 gap-2">
              <Briefcase className="h-4 w-4" /> Carreira
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
                          <p className="font-semibold text-sm truncate">{colaborador.email || 'Não informado'}</p>
                        </div>
                        <div className="p-4 bg-muted/20 rounded-2xl border border-border/30">
                          <p className="text-xs text-muted-foreground mb-1">Gestor Direto</p>
                          <p className="font-semibold">Nenhum associado</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                      <p className="text-xs text-primary font-bold uppercase tracking-wider mb-2">Observações Internas</p>
                      <p className="text-sm text-muted-foreground italic">"{colaborador.observacoes || 'Nenhuma observação registrada para este colaborador.'}"</p>
                    </div>
                  </CardContent>
                </Card>

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
                <TabsTrigger value="dependentes" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Dependentes</TabsTrigger>
                <TabsTrigger value="emergencia" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Contatos de Emergência</TabsTrigger>
                <TabsTrigger value="pcd" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">PCD</TabsTrigger>
                <TabsTrigger value="estrangeiro" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Estrangeiro</TabsTrigger>
              </TabsList>
              <TabsContent value="dependentes">{activePessoalTab === 'dependentes' && <DependentesTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="emergencia">{activePessoalTab === 'emergencia' && <EmergenciaTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="pcd">{activePessoalTab === 'pcd' && <PCDTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="estrangeiro">{activePessoalTab === 'estrangeiro' && <EstrangeiroTab colaboradorId={id!} />}</TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="profissional">
            <Tabs value={activeProfissionalTab} onValueChange={setActiveProfissionalTab} className="space-y-4">
              <TabsList className="bg-transparent h-auto p-0 gap-4 border-b border-border/20 rounded-none w-full justify-start overflow-x-auto no-scrollbar">
                <TabsTrigger value="historico" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Histórico Salarial</TabsTrigger>
                <TabsTrigger value="contratos" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Contratos</TabsTrigger>
                <TabsTrigger value="experiencia" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Experiência Anterior</TabsTrigger>
                <TabsTrigger value="formacao" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Formação</TabsTrigger>
                <TabsTrigger value="aso" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">ASO / Exames</TabsTrigger>
              </TabsList>
              <TabsContent value="historico">{activeProfissionalTab === 'historico' && <HistoricoSalarialTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="contratos">{activeProfissionalTab === 'contratos' && <HistoricoContratosTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="experiencia">{activeProfissionalTab === 'experiencia' && <ExperienciaTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="formacao">{activeProfissionalTab === 'formacao' && <FormacaoTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="aso">{activeProfissionalTab === 'aso' && <ASOTab colaboradorId={id!} />}</TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="financeiro">
            <Tabs value={activeFinanceiroTab} onValueChange={setActiveFinanceiroTab} className="space-y-4">
              <TabsList className="bg-transparent h-auto p-0 gap-4 border-b border-border/20 rounded-none w-full justify-start">
                <TabsTrigger value="contas" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Contas Bancárias</TabsTrigger>
                <TabsTrigger value="aquisitivos" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Períodos Aquisitivos</TabsTrigger>
              </TabsList>
              <TabsContent value="contas">{activeFinanceiroTab === 'contas' && <ContasBancariasTab colaboradorId={id!} />}</TabsContent>
              <TabsContent value="aquisitivos">{activeFinanceiroTab === 'aquisitivos' && <AquisitivosTab colaboradorId={id!} />}</TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="documentos">
            <Tabs value={activeDocumentosTab} onValueChange={setActiveDocumentosTab} className="space-y-4">
              <TabsList className="bg-transparent h-auto p-0 gap-4 border-b border-border/20 rounded-none w-full justify-start">
                <TabsTrigger value="pessoais" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Documentos Pessoais</TabsTrigger>
                <TabsTrigger value="anotacoes" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Anotações Internas</TabsTrigger>
                <TabsTrigger value="estagiario" className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none px-1 pb-2 shadow-none bg-transparent">Dados Estagiário</TabsTrigger>
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
            </Tabs>
          </TabsContent>

          <TabsContent value="beneficios">
            {activeMainTab === 'beneficios' && <BeneficiosTab colaboradorId={id!} />}
          </TabsContent>

          <TabsContent value="historico">
            {activeMainTab === 'historico' && <ColaboradorHistory colaboradorId={id!} />}
          </TabsContent>
        </Tabs>
      </PageLayout>
    </>
  );
}
