import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recrutamentoService } from '@/services/recrutamentoService';
import { useEmpresas } from '@/hooks';
import { UserSearch, Plus, Briefcase, Users, Filter, BarChart3, ChevronRight, Mail, Phone, Calendar, Star, Trash2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from '@/components/ui/spinner';
import { useState } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { CandidatoTimeline } from '@/components/recrutamento/CandidatoTimeline';
const ETAPAS = [
  { id: 'triagem', label: 'Triagem', color: 'bg-slate-100 border-slate-200' },
  { id: 'entrevista', label: 'Entrevista', color: 'bg-blue-50 border-blue-200' },
  { id: 'teste', label: 'Teste Técnico', color: 'bg-purple-50 border-purple-200' },
  { id: 'proposta', label: 'Proposta', color: 'bg-warning-foreground/10 border-warning' },
  { id: 'contratado', label: 'Contratado', color: 'bg-success-foreground/10 border-success' },
];

export default function RecrutamentoPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('pipeline');
  const [selectedVagaId, setSelectedVagaId] = useState<string>('all');
  const [selectedCandidatura, setSelectedCandidatura] = useState<Record<string, any> | null>(null);

  const { data: vagas = [], isLoading: loadVagas } = useQuery({
    queryKey: ['vagas', empresaAtual?.id],
    queryFn: () => recrutamentoService.listarVagas(empresaAtual!.id),
    enabled: !!empresaAtual?.id
  });

  const { data: candidaturas = [], isLoading: loadCandidaturas } = useQuery({
    queryKey: ['candidaturas', selectedVagaId],
    queryFn: () => recrutamentoService.listarCandidaturas(empresaAtual!.id, selectedVagaId === 'all' ? undefined : selectedVagaId),
    enabled: !!empresaAtual?.id
  });

  const { data: candidatos = [], isLoading: loadCandidatos } = useQuery({
    queryKey: ['candidatos', empresaAtual?.id],
    queryFn: () => recrutamentoService.listarCandidatos(empresaAtual!.id),
    enabled: !!empresaAtual?.id
  });

  const updateEtapa = useMutation({
    mutationFn: ({ id, etapa }: { id: string, etapa: string }) => recrutamentoService.atualizarCandidatura(id, { etapa }, empresaAtual!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidaturas'] });
      toast.success('Etapa atualizada!');
    }
  });

  const isLoading = loadVagas || loadCandidaturas || loadCandidatos;

  return (
    <>
      <PageTitle title="Recrutamento" description="Gestão de talentos e processos seletivos" />
      <PageLayout
        title="Recrutamento & Seleção"
        description="Gestão de vagas, candidatos e pipeline 10/10"
        icon={<UserSearch className="h-5 w-5 text-primary-foreground" />}
        gradient="from-success to-info"
        actions={
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="rounded-xl shadow-lg"><Plus className="h-4 w-4 mr-2" />Nova Vaga</Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader><DialogTitle>Anunciar Nova Vaga</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="grid gap-1"><Label>Título da Vaga</Label><Input placeholder="Ex: Desenvolvedor Senior" /></div>
                  <div className="grid gap-1"><Label>Departamento</Label><Input placeholder="Ex: Tecnologia" /></div>
                  <div className="grid gap-1"><Label>Modalidade</Label><Input placeholder="Remoto, Híbrido, Presencial" /></div>
                  <div className="grid gap-1"><Label>Quantidade</Label><Input type="number" defaultValue={1} /></div>
                  <div className="grid gap-1 col-span-2"><Label>Requisitos (separados por vírgula)</Label><Input placeholder="React, TypeScript, Node.js..." /></div>
                  <Button className="col-span-2 mt-2">Publicar Vaga</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <TabsList className="bg-muted/50 p-1 rounded-xl">
              <TabsTrigger value="pipeline" className="rounded-lg">Pipeline</TabsTrigger>
              <TabsTrigger value="vagas" className="rounded-lg">Vagas</TabsTrigger>
              <TabsTrigger value="candidatos" className="rounded-lg">Candidatos</TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-lg">Analytics</TabsTrigger>
            </TabsList>

            {activeTab === 'pipeline' && (
              <div className="flex items-center gap-2 w-full md:w-64">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedVagaId} onValueChange={setSelectedVagaId}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Filtrar por Vaga" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Vagas</SelectItem>
                    {vagas.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.titulo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <div className="flex justify-center py-20"><Spinner size="lg" /></div>
            ) : (
              <>
                {/* PIPELINE KANBAN */}
                <TabsContent value="pipeline" className="mt-0">
                  <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-[600px] select-none">
                    {ETAPAS.map((etapa) => (
                      <div key={etapa.id} className="shrink-0 w-72 flex flex-col gap-3">
                        <div className="flex items-center justify-between px-2">
                          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
                            {etapa.label}
                            <Badge variant="secondary" className="rounded-full h-5 px-1.5 text-[10px] bg-muted/80">
                              {candidaturas.filter((c: any) => (c.etapa || 'triagem') === etapa.id).length}
                            </Badge>
                          </h3>
                        </div>
                        
                        <div className={cn("flex-1 rounded-2xl border-2 border-dashed p-3 space-y-3 transition-colors duration-300", etapa.color)}>
                          {candidaturas
                            .filter((c: any) => (c.etapa || 'triagem') === etapa.id)
                            .map((cand: any) => (
                              <motion.div 
                                key={cand.id}
                                layoutId={cand.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white p-4 rounded-xl shadow-xs border border-border/40 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group relative"
                                onClick={() => setSelectedCandidatura(cand)}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h4 className="font-semibold text-sm truncate max-w-[180px]">{cand.candidato?.nome}</h4>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{cand.vaga?.titulo}</p>
                                  </div>
                                  <Badge variant="outline" className="text-[9px] h-4 px-1 bg-muted/30">{cand.candidato?.origem || 'Direto'}</Badge>
                                </div>
                                
                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-4">
                                  <span className="flex items-center gap-1">
                                    <Star className={cn("h-3 w-3", (cand.nota_geral || 0) > 0 ? "text-warning fill-warning" : "text-slate-300")} /> 
                                    {cand.nota_geral || 'S/N'}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> 
                                    {new Date(cand.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex -space-x-2">
                                    <div className="h-6 w-6 rounded-full bg-primary/10 border-2 border-white flex items-center justify-center text-[10px] font-bold text-primary">
                                      {cand.candidato?.nome?.charAt(0)}
                                    </div>
                                  </div>
                                  
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-blue-50 hover:text-blue-600" aria-label="Contatar candidato">
                                      <Mail className="h-3.5 w-3.5" />
                                    </Button>
                                    <Select 
                                      onValueChange={(val) => updateEtapa.mutate({ id: cand.id, etapa: val })}
                                      defaultValue={etapa.id}
                                    >
                                      <SelectTrigger className="h-7 text-[9px] w-28 rounded-lg border-primary/20 bg-primary/5">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ETAPAS.map(e => <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          {candidaturas.filter((c: any) => (c.etapa || 'triagem') === etapa.id).length === 0 && (
                            <div className="h-32 flex flex-col items-center justify-center border border-dashed rounded-xl opacity-20 gap-2">
                              <Users className="h-6 w-6" />
                              <span className="text-xs font-medium">Sem candidatos</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* VAGAS */}
                <TabsContent value="vagas" className="mt-0">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {vagas.map((vaga: any) => (
                      <Card key={vaga.id} className="rounded-2xl border-border/40 hover:border-primary/30 hover:shadow-xl transition-all group overflow-hidden bg-card/50 backdrop-blur-xs">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start mb-2">
                            <Badge 
                              className={cn(
                                "rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                vaga.status === 'aberta' ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"
                              )}
                            >
                              {vaga.status}
                            </Badge>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/5" aria-label="Ver análises"><BarChart3 className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5" aria-label="Excluir vaga"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                          <CardTitle className="text-xl font-display font-bold leading-tight group-hover:text-primary transition-colors">{vaga.titulo}</CardTitle>
                          <CardDescription className="flex items-center gap-2 text-xs font-medium mt-1">
                            <Briefcase className="h-3 w-3" /> {vaga.departamento} 
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                            {vaga.modalidade}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex flex-wrap gap-1.5">
                              {(vaga.requisitos?.split(',') || []).slice(0, 3).map((req: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-[9px] bg-slate-100/50 text-slate-600 font-normal">{req.trim()}</Badge>
                              ))}
                              {(vaga.requisitos?.split(',').length > 3) && (
                                <Badge variant="secondary" className="text-[9px] bg-slate-100/50 text-slate-600 font-normal">+{vaga.requisitos.split(',').length - 3}</Badge>
                              )}
                            </div>

                            <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Candidatos</span>
                                <span className="text-lg font-display font-bold text-primary">
                                  {candidaturas.filter((c: any) => c.vaga_id === vaga.id).length}
                                </span>
                              </div>
                              <Button className="rounded-xl h-9 px-4 text-xs font-bold shadow-xs group-hover:shadow-md transition-all">
                                Gerenciar Vaga
                                <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <button className="border-2 border-dashed border-border/60 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all group min-h-[250px]">
                      <div className="h-12 w-12 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                        <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-sm">Criar Nova Vaga</p>
                        <p className="text-xs text-muted-foreground">Inicie um novo processo seletivo</p>
                      </div>
                    </button>
                  </div>
                </TabsContent>

                {/* CANDIDATOS */}
                <TabsContent value="candidatos" className="mt-0">
                   <Card className="rounded-3xl border-border/40 overflow-hidden shadow-xs">
                     <CardContent className="p-0">
                       <div className="overflow-x-auto">
                         <table className="w-full text-sm">
                           <thead>
                             <tr className="bg-muted/30 border-b">
                               <th className="px-6 py-4 text-left font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Candidato</th>
                               <th className="px-6 py-4 text-left font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Contato</th>
                               <th className="px-6 py-4 text-left font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Experiência</th>
                               <th className="px-6 py-4 text-left font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Pretensão</th>
                               <th className="px-6 py-4 text-right font-bold text-[11px] uppercase tracking-wider text-muted-foreground">Ações</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-border/30">
                             {candidatos.map((cand: any) => (
                               <tr key={cand.id} className="hover:bg-primary/[0.02] transition-colors group">
                                 <td className="px-6 py-4">
                                   <div className="flex items-center gap-3">
                                     <div className="h-9 w-9 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-bold">
                                       {cand.nome?.charAt(0)}
                                     </div>
                                     <div>
                                       <p className="font-bold text-sm text-foreground">{cand.nome}</p>
                                       <p className="text-[10px] text-muted-foreground">{cand.origem || 'Website'}</p>
                                     </div>
                                   </div>
                                 </td>
                                 <td className="px-6 py-4">
                                   <div className="flex flex-col gap-0.5">
                                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="h-3 w-3" /> {cand.email}</span>
                                      {cand.telefone && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Phone className="h-3 w-3" /> {cand.telefone}</span>}
                                   </div>
                                 </td>
                                 <td className="px-6 py-4">
                                   <Badge variant="secondary" className="rounded-lg bg-slate-100 font-medium">{cand.experiencia_anos} anos</Badge>
                                 </td>
                                 <td className="px-6 py-4 font-display font-bold text-success">
                                   {cand.pretensao_salarial ? `R$ ${cand.pretensao_salarial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'N/D'}
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                   <Button variant="ghost" size="icon" aria-label="Adicionar" className="rounded-xl hover:bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-all"><Plus className="h-4 w-4" /></Button>
                                 </td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>
                     </CardContent>
                   </Card>
                </TabsContent>

                {/* ANALYTICS */}
                <TabsContent value="analytics" className="mt-0">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    {[
                      { label: 'Vagas Abertas', value: vagas.length, icon: Briefcase, color: 'text-success' },
                      { label: 'Total Candidatos', value: candidatos.length, icon: Users, color: 'text-info' },
                      { label: 'Processos Ativos', value: candidaturas.length, icon: UserSearch, color: 'text-primary' },
                      { label: 'Taxa de Conversão', value: '4.2%', icon: BarChart3, color: 'text-warning' },
                    ].map((stat, i) => (
                      <Card key={i} className="rounded-2xl border-border/40 shadow-xs">
                        <CardContent className="p-6 flex items-center gap-4">
                          <div className={cn("h-12 w-12 rounded-xl bg-muted/30 flex items-center justify-center", stat.color)}>
                            <stat.icon className="h-6 w-6" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{stat.label}</p>
                            <p className="text-2xl font-display font-bold">{stat.value}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <Card className="rounded-3xl border-border/40 overflow-hidden shadow-xs h-64">
                    <CardHeader className="pb-0"><CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Distribuição por Etapa</CardTitle></CardHeader>
                    <CardContent className="h-full flex items-end gap-2 px-8 pb-8 pt-4">
                      {ETAPAS.map(e => {
                        const count = candidaturas.filter((c: any) => (c.etapa || 'triagem') === e.id).length;
                        const height = (count / (candidaturas.length || 1)) * 100 + 10;
                        return (
                          <div key={e.id} className="flex-1 flex flex-col items-center gap-2">
                            <div 
                              className={cn("w-full rounded-t-lg transition-all duration-500 bg-primary/20 hover:bg-primary/40")} 
                              style={{ height: `${height}%` }}
                            />
                            <span className="text-[10px] uppercase font-bold opacity-60">{e.label}</span>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </AnimatePresence>
        </Tabs>

        {/* Detalhes do Candidato */}
        <Dialog open={!!selectedCandidatura} onOpenChange={(o) => { if(!o) setSelectedCandidatura(null); }}>
          <DialogContent className="max-w-2xl rounded-3xl h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-elevated">
            {selectedCandidatura && (
              <>
                <DialogHeader className="p-6 border-b bg-muted/20">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                      {selectedCandidatura.candidato?.nome?.charAt(0)}
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-display font-bold">{selectedCandidatura.candidato?.nome}</DialogTitle>
                      <p className="text-sm text-muted-foreground font-medium">{selectedCandidatura.vaga?.titulo} • {selectedCandidatura.vaga?.departamento}</p>
                    </div>
                  </div>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-border/40 bg-muted/10 shadow-none">
                      <CardContent className="p-4 flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Contato</span>
                        <p className="text-sm flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {selectedCandidatura.candidato?.email}</p>
                        <p className="text-sm flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {selectedCandidatura.candidato?.telefone || 'N/A'}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-border/40 bg-muted/10 shadow-none">
                      <CardContent className="p-4 flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Status Atual</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="rounded-lg px-2 bg-primary/10 text-primary border-primary/20 capitalize font-bold">
                            {ETAPAS.find(e => e.id === (selectedCandidatura.etapa || 'triagem'))?.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-bold">Score: {selectedCandidatura.nota_geral || 'N/D'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" /> Timeline do Processo Seletivo
                    </h3>
                    <CandidatoTimeline candidaturaId={selectedCandidatura.id} />
                  </div>
                </div>
                <div className="p-6 border-t bg-muted/10 flex justify-end gap-3">
                  <Button variant="outline" className="rounded-xl font-bold" onClick={() => setSelectedCandidatura(null)}>Fechar Janela</Button>
                  <Button className="rounded-xl bg-gradient-to-r from-primary to-primary-glow font-bold shadow-lg">Avançar para Próxima Etapa</Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </PageLayout>
    </>
  );
}
