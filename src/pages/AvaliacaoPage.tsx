import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { avaliacaoService } from '@/services/avaliacaoService';
import { colaboradorService } from '@/services';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { Target, Plus, Users, TrendingUp, Star, Trash2, LayoutGrid, History, BarChart2, Calendar, CheckCircle2, Clock } from 'lucide-react';
import { PerformanceDashboard } from '@/components/avaliacao/PerformanceDashboard';
import { NineBoxMatrix } from '@/components/avaliacao/NineBoxMatrix';
import { PerformanceAuditTimeline } from '@/components/avaliacao/PerformanceAuditTimeline';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = { 
  rascunho: 'secondary', 
  ativo: 'default', 
  finalizado: 'outline', 
  pendente: 'secondary', 
  em_andamento: 'default', 
  concluido: 'outline' 
};

export default function AvaliacaoPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const [tab, setTab] = useState('ciclos');

  // === Queries ===
  const { data: ciclos = [], isLoading: loadCiclos } = useQuery({ queryKey: ['ciclos_avaliacao', empresaAtual?.id], queryFn: () => avaliacaoService.listarCiclos(empresaAtual!.id), enabled: !!empresaAtual?.id });
  const { data: metas = [], isLoading: loadMetas } = useQuery({ queryKey: ['metas_okrs', empresaAtual?.id], queryFn: () => avaliacaoService.listarMetas(empresaAtual!.id), enabled: !!empresaAtual?.id });
  const { data: feedbacks = [], isLoading: loadFeedbacks } = useQuery({ queryKey: ['feedbacks_360', empresaAtual?.id], queryFn: () => avaliacaoService.listarFeedbacks(empresaAtual!.id), enabled: !!empresaAtual?.id });
  const { data: pdis = [], isLoading: loadPDIs } = useQuery({ queryKey: ['pdis', empresaAtual?.id], queryFn: () => avaliacaoService.listarPDIs(empresaAtual!.id), enabled: !!empresaAtual?.id });
  const { data: competencias = [], isLoading: loadComp } = useQuery({ queryKey: ['competencias', empresaAtual?.id], queryFn: () => avaliacaoService.listarCompetencias(empresaAtual!.id), enabled: !!empresaAtual?.id });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores', empresaAtual?.id], queryFn: () => colaboradorService.list(empresaAtual!.id), enabled: !!empresaAtual?.id });

  // === Mutations ===
  const criarCiclo = useMutation({
    mutationFn: (d: any) => avaliacaoService.criarCiclo({ ...d, empresa_id: empresaAtual?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ciclos_avaliacao'] }); toast.success('Ciclo criado!'); },
  });

  const criarMeta = useMutation({
    mutationFn: (d: any) => avaliacaoService.criarMeta({ ...d, empresa_id: empresaAtual?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['metas_okrs'] }); toast.success('Meta criada!'); },
  });

  const criarPDI = useMutation({
    mutationFn: (d: any) => avaliacaoService.criarPDI({ ...d, empresa_id: empresaAtual?.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pdis'] }); toast.success('PDI criado!'); },
  });

  const isLoading = loadCiclos || loadMetas || loadFeedbacks || loadPDIs || loadComp;

  return (
    <>
      <PageTitle title="Performance & Gestão 10/10" description="Acompanhamento estratégico de talentos" />
      <PageLayout 
        title="Gestão de Desempenho" 
        description="Ciclos, Metas, Feedbacks e PDI integrados" 
        icon={<Target className="h-5 w-5 text-primary-foreground" />} 
        gradient="from-warning to-primary"
      >
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="ciclos" className="rounded-lg gap-2"><BarChart2 className="h-4 w-4" /> Ciclos</TabsTrigger>
            <TabsTrigger value="metas" className="rounded-lg gap-2"><Target className="h-4 w-4" /> Metas & OKRs</TabsTrigger>
            <TabsTrigger value="feedbacks" className="rounded-lg gap-2"><Users className="h-4 w-4" /> Feedbacks</TabsTrigger>
            <TabsTrigger value="pdis" className="rounded-lg gap-2"><TrendingUp className="h-4 w-4" /> PDI</TabsTrigger>
          <TabsTrigger value="ninebox" className="rounded-lg gap-2"><LayoutGrid className="h-4 w-4" /> Nine-Box</TabsTrigger>
          <TabsTrigger value="auditoria" className="rounded-lg gap-2"><History className="h-4 w-4" /> Auditoria</TabsTrigger>
        </TabsList>

          <TabsContent value="ciclos" className="space-y-6">
            <PerformanceDashboard 
               stats={{ ciclos: ciclos.length, metas: metas.length, feedbacks: feedbacks.length, pdis: pdis.length, competencias: competencias.length }}
               feedbacks={feedbacks}
               metas={metas}
            />

            <div className="rounded-2xl border border-border/30 overflow-hidden shadow-elevated bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-display font-semibold">Ciclo de Avaliação</TableHead>
                    <TableHead className="font-display font-semibold">Tipo</TableHead>
                    <TableHead className="font-display font-semibold">Período</TableHead>
                    <TableHead className="font-display font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ciclos.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Nenhum ciclo cadastrado</TableCell></TableRow> :
                    ciclos.map((c: any) => (
                      <TableRow key={c.id} className="hover:bg-accent/20 transition-colors">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{c.nome}</span>
                            <span className="text-[10px] text-muted-foreground">{c.descricao}</span>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize text-xs">{c.tipo}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(c.data_inicio).toLocaleDateString('pt-BR')} - {new Date(c.data_fim).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell><Badge variant={(statusColors[c.status] || 'secondary') as any}>{c.status}</Badge></TableCell>
                      </TableRow>
                    ))
                  }
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="metas" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {metas.map((m: any) => (
                <Card key={m.id} className="border-border/30 hover:shadow-md transition-shadow rounded-2xl overflow-hidden">
                  <div className="h-1 bg-primary/20" />
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter">{m.tipo}</Badge>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                        <Calendar className="h-3 w-3" /> {new Date(m.data_limite).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-sm mb-2">{m.titulo}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{m.descricao}</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span>Progresso</span>
                        <span>{Math.round((m.valor_atual / m.valor_objetivo) * 100)}%</span>
                      </div>
                      <Progress value={(m.valor_atual / m.valor_objetivo) * 100} className="h-1.5" />
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/10 flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
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
                      <TableCell><Badge variant="outline" className="text-[10px] uppercase font-bold">{f.tipo}</Badge></TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-3 w-3 text-warning fill-warning" />
                          <span className="font-bold text-sm">{f.nota_geral}</span>
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
                        <h4 className="font-bold text-sm">{p.titulo}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">{p.competencia_foco}</span>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                          <span className="text-[10px] text-muted-foreground font-medium">{p.colaborador?.nome_completo}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Prazo</p>
                        <p className="text-xs font-mono font-bold">{new Date(p.prazo).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <Badge className={cn(
                        "text-[10px] font-bold uppercase",
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
