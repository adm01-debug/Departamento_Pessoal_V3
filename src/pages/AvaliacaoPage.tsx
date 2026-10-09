import { PageTitle } from '@/components/PageTitle';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { avaliacaoService } from '@/services/avaliacaoService';
import { colaboradorService } from '@/services';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { Target, Users, TrendingUp, Star, LayoutGrid, History, BarChart2, Calendar } from 'lucide-react';
import { PerformanceDashboard } from '@/components/avaliacao/PerformanceDashboard';
import { TodosCiclosTable } from '@/components/avaliacao/TodosCiclosTable';
import { NovoCicloDialog } from '@/components/avaliacao/NovoCicloDialog';
import { NineBoxMatrix } from '@/components/avaliacao/NineBoxMatrix';
import { PerformanceAuditTimeline } from '@/components/avaliacao/PerformanceAuditTimeline';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
// MOCK VISUAL — ver src/mocks/desempenhoMock.ts.
import {
  bloquearEscritaDesempenho,
  getMockCiclos,
  getMockCompetencias,
  getMockFeedbacks,
  getMockMetas,
  getMockPdis,
  isDesempenhoMockEnabled,
} from '@/mocks/desempenhoMock';

export default function AvaliacaoPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [tab, setTab] = useState('ciclos');
  // Ciclo em destaque no painel; `undefined` = usuário ainda não escolheu
  // (o padrão passa a ser o ciclo ativo detectado nos dados reais).
  const [cicloSelecionadoId, setCicloSelecionadoId] = useState<string | undefined>(undefined);

  // === Queries ===
  // MOCK VISUAL — ver src/mocks/desempenhoMock.ts. Com o mock ligado, cada
  // leitura curto-circuita a chamada ao Supabase; `enabled` também passa a
  // valer sem empresa ativa (a área mostra os dados fictícios de demonstração).
  const mockAtivo = isDesempenhoMockEnabled();
  const { data: ciclos = [], isLoading: loadCiclos } = useQuery({ queryKey: ['ciclos_avaliacao', empresaAtual?.id], queryFn: async (): Promise<any[]> => getMockCiclos() ?? (await avaliacaoService.listarCiclos(empresaAtual!.id)), enabled: !!empresaAtual?.id || mockAtivo });
  const { data: metas = [], isLoading: loadMetas } = useQuery({ queryKey: ['metas_okrs', empresaAtual?.id], queryFn: async (): Promise<any[]> => getMockMetas() ?? (await avaliacaoService.listarMetas(empresaAtual!.id)), enabled: !!empresaAtual?.id || mockAtivo });
  const { data: feedbacks = [], isLoading: loadFeedbacks } = useQuery({ queryKey: ['feedbacks_360', empresaAtual?.id], queryFn: async (): Promise<any[]> => getMockFeedbacks() ?? (await avaliacaoService.listarFeedbacks(empresaAtual!.id)), enabled: !!empresaAtual?.id || mockAtivo });
  const { data: pdis = [], isLoading: loadPDIs } = useQuery({ queryKey: ['pdis', empresaAtual?.id], queryFn: async (): Promise<any[]> => getMockPdis() ?? (await avaliacaoService.listarPDIs(empresaAtual!.id)), enabled: !!empresaAtual?.id || mockAtivo });
  const { data: competencias = [], isLoading: loadComp } = useQuery({ queryKey: ['competencias', empresaAtual?.id], queryFn: async (): Promise<any[]> => getMockCompetencias() ?? (await avaliacaoService.listarCompetencias(empresaAtual!.id)), enabled: !!empresaAtual?.id || mockAtivo });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores', empresaAtual?.id], queryFn: () => colaboradorService.list(empresaAtual!.id), enabled: !!empresaAtual?.id });

  // === Mutations ===
  // MOCK VISUAL — ver src/mocks/desempenhoMock.ts. Cada escrita é abortada com
  // um toast de demonstração quando o mock está ligado (os `colaborador_id`
  // fictícios não existem no banco); o `throw` evita o toast de sucesso.
  const criarCiclo = useMutation({
    mutationFn: (d: any) => {
      if (bloquearEscritaDesempenho('Criar ciclo de avaliação')) return Promise.reject(new Error('mock'));
      return avaliacaoService.criarCiclo({ ...d, empresa_id: empresaAtual?.id });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ciclos_avaliacao'] }); toast.success('Ciclo criado!'); }});

  const criarMeta = useMutation({
    mutationFn: (d: any) => {
      if (bloquearEscritaDesempenho('Criar meta/OKR')) return Promise.reject(new Error('mock'));
      return avaliacaoService.criarMeta({ ...d, empresa_id: empresaAtual?.id });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metas_okrs'] }); toast.success('Meta criada!'); }});

  const criarPDI = useMutation({
    mutationFn: (d: any) => {
      if (bloquearEscritaDesempenho('Criar PDI')) return Promise.reject(new Error('mock'));
      return avaliacaoService.criarPDI({ ...d, empresa_id: empresaAtual?.id });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pdis'] }); toast.success('PDI criado!'); }});

  const excluirCiclo = useMutation({
    mutationFn: (c: any) => {
      if (bloquearEscritaDesempenho('Excluir ciclo de avaliação')) return Promise.reject(new Error('mock'));
      return avaliacaoService.excluirCiclo(c.id, empresaAtual!.id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ciclos_avaliacao'] }); toast.success('Ciclo excluído!'); }});

  const isLoading = loadCiclos || loadMetas || loadFeedbacks || loadPDIs || loadComp;

  // === Derivados ===
  // Ciclo em destaque: prioriza o ATIVO real (`status='ativo'`), depois o que
  // está `em_andamento` e, por fim, o mais recente — sem inventar seleção.
  const cicloAtivo = useMemo(
    () =>
      ciclos.find((c: any) => c.status === 'ativo') ??
      ciclos.find((c: any) => c.status === 'em_andamento') ??
      ciclos[0] ??
      null,
    [ciclos],
  );

  const cicloSelecionado = useMemo(
    () => ciclos.find((c: any) => c.id === cicloSelecionadoId) ?? cicloAtivo,
    [ciclos, cicloSelecionadoId, cicloAtivo],
  );

  return (
    <>
      <PageTitle title="Performance & Gestão 10/10" description="Acompanhamento estratégico de talentos" />
      <PageLayout
        title="Gestão de Desempenho"
        description="Ciclos, Metas, Feedbacks e PDI integrados"
        icon={<Target className="h-5 w-5 text-primary-foreground" />}
        gradient="from-primary to-primary-glow"
      >
        <Tabs value={tab} onValueChange={setTab} className="space-y-5">
          {/* Faixa de navegação compacta + seletor de ciclo + ação principal */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <TabsList className="h-11 w-full justify-start gap-1 overflow-x-auto rounded-xl border border-border/30 bg-card/50 p-1 lg:min-w-0 lg:flex-1">
              <TabsTrigger value="ciclos" className="group h-9 shrink-0 gap-1.5 rounded-lg px-3 text-xs lg:flex-1">
                <BarChart2 className="h-3.5 w-3.5 text-muted-foreground transition-colors group-data-[state=active]:text-primary" />
                <span className="text-muted-foreground transition-colors group-data-[state=active]:text-primary">Ciclos</span>
              </TabsTrigger>
              <TabsTrigger value="metas" className="group h-9 shrink-0 gap-1.5 rounded-lg px-3 text-xs lg:flex-1">
                <Target className="h-3.5 w-3.5 text-muted-foreground transition-colors group-data-[state=active]:text-primary" />
                <span className="text-muted-foreground transition-colors group-data-[state=active]:text-primary">Metas & OKRs</span>
              </TabsTrigger>
              <TabsTrigger value="feedbacks" className="group h-9 shrink-0 gap-1.5 rounded-lg px-3 text-xs lg:flex-1">
                <Users className="h-3.5 w-3.5 text-muted-foreground transition-colors group-data-[state=active]:text-primary" />
                <span className="text-muted-foreground transition-colors group-data-[state=active]:text-primary">Feedbacks</span>
              </TabsTrigger>
              <TabsTrigger value="pdis" className="group h-9 shrink-0 gap-1.5 rounded-lg px-3 text-xs lg:flex-1">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground transition-colors group-data-[state=active]:text-primary" />
                <span className="text-muted-foreground transition-colors group-data-[state=active]:text-primary">PDI</span>
              </TabsTrigger>
              <TabsTrigger value="ninebox" className="group h-9 shrink-0 gap-1.5 rounded-lg px-3 text-xs lg:flex-1">
                <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground transition-colors group-data-[state=active]:text-primary" />
                <span className="text-muted-foreground transition-colors group-data-[state=active]:text-primary">Nine-Box</span>
              </TabsTrigger>
              <TabsTrigger value="auditoria" className="group h-9 shrink-0 gap-1.5 rounded-lg px-3 text-xs lg:flex-1">
                <History className="h-3.5 w-3.5 text-muted-foreground transition-colors group-data-[state=active]:text-primary" />
                <span className="text-muted-foreground transition-colors group-data-[state=active]:text-primary">Auditoria</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2 lg:shrink-0">
              <Select value={cicloSelecionado?.id ?? ''} onValueChange={setCicloSelecionadoId}>
                <SelectTrigger className="h-10 w-full gap-2 sm:w-[240px]">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="Selecionar ciclo" />
                </SelectTrigger>
                <SelectContent>
                  {ciclos.length === 0 ? (
                    <SelectItem value="__vazio" disabled>
                      Nenhum ciclo cadastrado
                    </SelectItem>
                  ) : (
                    ciclos.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <NovoCicloDialog onSubmit={(dados) => criarCiclo.mutate(dados)} salvando={criarCiclo.isPending} />
            </div>
          </div>

          <TabsContent value="ciclos" className="space-y-5">
            <PerformanceDashboard
              stats={{ ciclos: ciclos.length, metas: metas.length, feedbacks: feedbacks.length, pdis: pdis.length, competencias: competencias.length }}
              feedbacks={feedbacks}
              metas={metas}
              pdis={pdis}
              ciclo={cicloSelecionado}
              onNavigate={setTab}
            />

            <TodosCiclosTable
              ciclos={ciclos}
              metas={metas}
              cicloSelecionadoId={cicloSelecionado?.id}
              onSelecionar={(c: any) => setCicloSelecionadoId(c.id)}
              onExcluir={(c: any) => excluirCiclo.mutate(c)}
              excluindo={excluirCiclo.isPending}
            />
          </TabsContent>

          <TabsContent value="metas" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {metas.map((m: any) => (
                <Card key={m.id} className="border-border/30 hover:shadow-md transition-shadow rounded-2xl overflow-hidden">
                  <div className="h-1 bg-primary/20" />
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wide">{m.tipo}</Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                        <Calendar className="h-3 w-3" /> {new Date(m.data_limite).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h3 className="font-display font-medium text-sm mb-2">{m.titulo}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{m.descricao}</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-medium">
                        <span>Progresso</span>
                        <span>{Math.round((m.valor_atual / m.valor_objetivo) * 100)}%</span>
                      </div>
                      <Progress value={(m.valor_atual / m.valor_objetivo) * 100} className="h-1.5" />
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/10 flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
                        {m.colaborador?.nome_completo?.charAt(0)}
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">{m.colaborador?.nome_completo}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="feedbacks" className="space-y-6">
            <div className="rounded-2xl border border-border/30 overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-display font-semibold text-xs">Avaliado</TableHead>
                    <TableHead className="font-display font-semibold text-xs">Avaliador</TableHead>
                    <TableHead className="font-display font-semibold text-xs">Tipo</TableHead>
                    <TableHead className="font-display font-semibold text-xs text-center">Nota</TableHead>
                    <TableHead className="font-display font-semibold text-xs">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbacks.map((f: any) => (
                    <TableRow key={f.id} className="hover:bg-accent/10 transition-colors">
                      <TableCell className="font-medium text-sm">{f.avaliado?.nome_completo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{f.avaliador?.nome_completo}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px] uppercase font-medium">{f.tipo}</Badge></TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-3 w-3 text-warning fill-warning" />
                          <span className="font-medium text-sm">{f.nota_geral}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground font-mono">
                        {new Date(f.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="pdis" className="space-y-6">
            <div className="grid gap-4">
              {pdis.map((p: any) => (
                <Card key={p.id} className="border-border/30 hover:border-primary/20 transition-all rounded-2xl">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-xl bg-success/10 text-success">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{p.titulo}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">{p.competencia_foco}</span>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                          <span className="text-[10px] text-muted-foreground font-medium">{p.colaborador?.nome_completo}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide">Prazo</p>
                        <p className="text-xs font-mono font-medium">{new Date(p.prazo).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <Badge className={cn(
                        "text-[10px] font-medium uppercase",
                        p.status === 'concluido' ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20"
                      )}>
                        {p.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="ninebox" className="space-y-6">
            <NineBoxMatrix data={feedbacks} />
          </TabsContent>

          <TabsContent value="auditoria" className="space-y-6">
            <PerformanceAuditTimeline />
          </TabsContent>
        </Tabs>
      </PageLayout>
    </>
  );
}
