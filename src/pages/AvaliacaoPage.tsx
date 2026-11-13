import { PageTitle } from '@/components/PageTitle';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageLayout } from '@/components/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { avaliacaoService } from '@/services/avaliacaoService';
import { colaboradorService } from '@/services/colaboradorService';
import { gerarPDIPDF } from '@/utils/evaluationPDF';
import { useEmpresas } from '@/hooks';
import {
  Target,
  Users,
  TrendingUp,
  Star,
  LayoutGrid,
  History,
  BarChart2,
  Calendar,
  FileDown,
  Plus,
  Trash2,
} from 'lucide-react';
import { PerformanceDashboard } from '@/components/avaliacao/PerformanceDashboard';
import { NineBoxMatrix } from '@/components/avaliacao/NineBoxMatrix';
import { PerformanceAuditTimeline } from '@/components/avaliacao/PerformanceAuditTimeline';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const statusColors: Record<string, 'default' | 'secondary' | 'outline'> = {
  rascunho: 'secondary',
  ativo: 'default',
  finalizado: 'outline',
  pendente: 'secondary',
  em_andamento: 'default',
  concluido: 'outline',
};

type TipoRegistro = 'ciclo' | 'meta' | 'feedback' | 'pdi';

const titulosNovo: Record<TipoRegistro, string> = {
  ciclo: 'Novo ciclo de avaliação',
  meta: 'Nova meta',
  feedback: 'Novo feedback',
  pdi: 'Novo PDI',
};

const queryKeys: Record<TipoRegistro, string> = {
  ciclo: 'ciclos_avaliacao',
  meta: 'metas_okrs',
  feedback: 'feedbacks_360',
  pdi: 'pdis',
};

const texto = (v: string | undefined) => (v && v.trim() ? v.trim() : null);
const numero = (v: string | undefined) => (v && v.trim() ? Number(v) : null);

export default function AvaliacaoPage() {
  const { empresaAtual } = useEmpresas();
  const [tab, setTab] = useState('ciclos');

  // === Queries ===
  const { data: ciclos = [], isLoading: loadCiclos } = useQuery({
    queryKey: ['ciclos_avaliacao', empresaAtual?.id],
    queryFn: () => avaliacaoService.listarCiclos(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });
  const { data: metas = [], isLoading: loadMetas } = useQuery({
    queryKey: ['metas_okrs', empresaAtual?.id],
    queryFn: () => avaliacaoService.listarMetas(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });
  const { data: feedbacks = [], isLoading: loadFeedbacks } = useQuery({
    queryKey: ['feedbacks_360', empresaAtual?.id],
    queryFn: () => avaliacaoService.listarFeedbacks(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });
  const { data: pdis = [], isLoading: loadPDIs } = useQuery({
    queryKey: ['pdis', empresaAtual?.id],
    queryFn: () => avaliacaoService.listarPDIs(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });
  const { data: competencias = [], isLoading: loadComp } = useQuery({
    queryKey: ['competencias', empresaAtual?.id],
    queryFn: () => avaliacaoService.listarCompetencias(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', empresaAtual?.id],
    queryFn: () => colaboradorService.list(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  // === Mutations ===
  const queryClient = useQueryClient();
  const [novo, setNovo] = useState<TipoRegistro | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [excluir, setExcluir] = useState<{
    tipo: Exclude<TipoRegistro, 'feedback'>;
    id: string;
    nome: string;
  } | null>(null);
  const campo = (k: string) => form[k] ?? '';
  const setCampo = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const abrirNovo = (tipo: TipoRegistro) => {
    setForm({});
    setNovo(tipo);
  };

  const criar = useMutation({
    mutationFn: async (tipo: TipoRegistro) => {
      const empresa_id = empresaAtual!.id;
      if (tipo === 'ciclo') {
        await avaliacaoService.criarCiclo({
          empresa_id,
          nome: campo('nome').trim(),
          descricao: texto(form.descricao),
          tipo: form.tipo || 'anual',
          data_inicio: campo('data_inicio'),
          data_fim: campo('data_fim'),
        });
      } else if (tipo === 'meta') {
        await avaliacaoService.criarMeta({
          empresa_id,
          titulo: campo('titulo').trim(),
          descricao: texto(form.descricao),
          tipo: form.tipo || 'individual',
          colaborador_id: texto(form.colaborador_id),
          ciclo_id: texto(form.ciclo_id),
          meta_valor: numero(form.meta_valor),
          valor_atual: numero(form.valor_atual) ?? 0,
          data_limite: texto(form.data_limite),
        });
      } else if (tipo === 'feedback') {
        await avaliacaoService.criarFeedback({
          empresa_id,
          avaliado_id: campo('avaliado_id'),
          avaliador_id: campo('avaliador_id'),
          ciclo_id: texto(form.ciclo_id),
          tipo: form.tipo || 'par',
          nota_geral: numero(form.nota_geral),
          comentarios: texto(form.comentarios),
        });
      } else {
        await avaliacaoService.criarPDI({
          empresa_id,
          titulo: campo('titulo').trim(),
          colaborador_id: campo('colaborador_id'),
          competencia_foco: texto(form.competencia_foco),
          acao_desenvolvimento: texto(form.acao_desenvolvimento),
          prazo: texto(form.prazo),
        });
      }
      return tipo;
    },
    onSuccess: (tipo) => {
      queryClient.invalidateQueries({ queryKey: [queryKeys[tipo], empresaAtual?.id] });
      toast.success('Registro criado com sucesso');
      setNovo(null);
    },
    onError: (e: Error) => toast.error(`Erro ao salvar: ${e.message}`),
  });

  const remover = useMutation({
    mutationFn: async (alvo: NonNullable<typeof excluir>) => {
      const empresaId = empresaAtual!.id;
      if (alvo.tipo === 'ciclo') await avaliacaoService.excluirCiclo(alvo.id, empresaId);
      else if (alvo.tipo === 'meta') await avaliacaoService.excluirMeta(alvo.id, empresaId);
      else await avaliacaoService.excluirPDI(alvo.id, empresaId);
      return alvo.tipo;
    },
    onSuccess: (tipo) => {
      queryClient.invalidateQueries({ queryKey: [queryKeys[tipo], empresaAtual?.id] });
      toast.success('Registro excluído');
      setExcluir(null);
    },
    onError: (e: Error) => toast.error(`Erro ao excluir: ${e.message}`),
  });

  const formValido = (() => {
    if (novo === 'ciclo')
      return !!campo('nome').trim() && !!form.data_inicio && !!form.data_fim && form.data_fim >= form.data_inicio;
    if (novo === 'meta') return !!campo('titulo').trim();
    if (novo === 'feedback') return !!form.avaliado_id && !!form.avaliador_id;
    if (novo === 'pdi') return !!campo('titulo').trim() && !!form.colaborador_id;
    return false;
  })();

  const selectColaborador = (k: string, label: string) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={campo(k)} onValueChange={(v) => setCampo(k, v)}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione o colaborador" />
        </SelectTrigger>
        <SelectContent>
          {colaboradores.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome_completo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const selectCiclo = () => (
    <div className="space-y-2">
      <Label>Ciclo (opcional)</Label>
      <Select value={campo('ciclo_id')} onValueChange={(v) => setCampo('ciclo_id', v)}>
        <SelectTrigger>
          <SelectValue placeholder="Sem ciclo" />
        </SelectTrigger>
        <SelectContent>
          {ciclos.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const botaoNovo = (tipo: TipoRegistro, label: string) => (
    <div className="flex justify-end">
      <Button className="rounded-xl gap-1.5" onClick={() => abrirNovo(tipo)} disabled={!empresaAtual?.id}>
        <Plus className="h-4 w-4" /> {label}
      </Button>
    </div>
  );

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
            <TabsTrigger value="ciclos" className="rounded-lg gap-2">
              <BarChart2 className="h-4 w-4" /> Ciclos
            </TabsTrigger>
            <TabsTrigger value="metas" className="rounded-lg gap-2">
              <Target className="h-4 w-4" /> Metas & OKRs
            </TabsTrigger>
            <TabsTrigger value="feedbacks" className="rounded-lg gap-2">
              <Users className="h-4 w-4" /> Feedbacks
            </TabsTrigger>
            <TabsTrigger value="pdis" className="rounded-lg gap-2">
              <TrendingUp className="h-4 w-4" /> PDI
            </TabsTrigger>
            <TabsTrigger value="ninebox" className="rounded-lg gap-2">
              <LayoutGrid className="h-4 w-4" /> Nine-Box
            </TabsTrigger>
            <TabsTrigger value="auditoria" className="rounded-lg gap-2">
              <History className="h-4 w-4" /> Auditoria
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ciclos" className="space-y-6">
            <PerformanceDashboard
              stats={{
                ciclos: ciclos.length,
                metas: metas.length,
                feedbacks: feedbacks.length,
                pdis: pdis.length,
                competencias: competencias.length,
              }}
              feedbacks={feedbacks}
              metas={metas}
            />

            {botaoNovo('ciclo', 'Novo ciclo')}

            <div className="rounded-2xl border border-border/30 overflow-hidden shadow-elevated bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-display font-semibold">Ciclo de Avaliação</TableHead>
                    <TableHead className="font-display font-semibold">Tipo</TableHead>
                    <TableHead className="font-display font-semibold">Período</TableHead>
                    <TableHead className="font-display font-semibold">Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ciclos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        Nenhum ciclo cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    ciclos.map((c) => (
                      <TableRow key={c.id} className="hover:bg-accent/20 transition-colors">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm">{c.nome}</span>
                            <span className="text-[10px] text-muted-foreground">{c.descricao}</span>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize text-xs">{c.tipo}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(c.data_inicio).toLocaleDateString('pt-BR')} -{' '}
                          {new Date(c.data_fim).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={(c.status && statusColors[c.status]) || 'secondary'}>{c.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Excluir ciclo"
                            onClick={() => setExcluir({ tipo: 'ciclo', id: c.id, nome: c.nome })}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="metas" className="space-y-6">
            {botaoNovo('meta', 'Nova meta')}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {metas.map((m) => (
                <Card
                  key={m.id}
                  className="border-border/30 hover:shadow-md transition-shadow rounded-2xl overflow-hidden"
                >
                  <div className="h-1 bg-primary/20" />
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-tighter">
                        {m.tipo}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                          <Calendar className="h-3 w-3" />{' '}
                          {m.data_limite ? new Date(m.data_limite).toLocaleDateString('pt-BR') : '—'}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="Excluir meta"
                          onClick={() => setExcluir({ tipo: 'meta', id: m.id, nome: m.titulo })}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-display font-bold text-sm mb-2">{m.titulo}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-4">{m.descricao}</p>

                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span>Progresso</span>
                        <span>{m.meta_valor ? Math.round(((m.valor_atual ?? 0) / m.meta_valor) * 100) : 0}%</span>
                      </div>
                      <Progress
                        value={m.meta_valor ? ((m.valor_atual ?? 0) / m.meta_valor) * 100 : 0}
                        className="h-1.5"
                      />
                    </div>

                    <div className="mt-4 pt-4 border-t border-border/10 flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {m.colaborador?.nome_completo?.charAt(0)}
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {m.colaborador?.nome_completo}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="feedbacks" className="space-y-6">
            {botaoNovo('feedback', 'Novo feedback')}
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
                  {feedbacks.map((f) => (
                    <TableRow key={f.id} className="hover:bg-accent/10 transition-colors">
                      <TableCell className="font-medium text-sm">{f.avaliado?.nome_completo}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{f.avaliador?.nome_completo}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                          {f.tipo}
                        </Badge>
                      </TableCell>
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
            {botaoNovo('pdi', 'Novo PDI')}
            <div className="grid gap-4">
              {pdis.map((p) => (
                <Card key={p.id} className="border-border/30 hover:border-primary/20 transition-all rounded-2xl">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-xl bg-success/10 text-success">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">{p.titulo}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            {p.competencia_foco}
                          </span>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {p.colaborador?.nome_completo}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Prazo</p>
                        <p className="text-xs font-mono font-bold">
                          {p.prazo ? new Date(p.prazo).toLocaleDateString('pt-BR') : '—'}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          'text-[10px] font-bold uppercase',
                          p.status === 'concluido'
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-warning/10 text-warning border-warning/20'
                        )}
                      >
                        {(p.status || 'em_andamento').replace('_', ' ')}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-xl gap-1.5"
                        onClick={() =>
                          gerarPDIPDF(p.colaborador?.nome_completo ?? 'Colaborador', {
                            titulo: p.titulo,
                            competencia: p.competencia_foco,
                            acao: p.acao_desenvolvimento,
                            prazo: p.prazo,
                            status: p.status,
                          })
                        }
                      >
                        <FileDown className="h-4 w-4" /> PDF
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir PDI"
                        onClick={() => setExcluir({ tipo: 'pdi', id: p.id, nome: p.titulo })}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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

        <Dialog open={novo !== null} onOpenChange={(o) => !o && setNovo(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{novo ? titulosNovo[novo] : ''}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (novo && formValido) criar.mutate(novo);
              }}
            >
              {novo === 'ciclo' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="ciclo-nome">Nome *</Label>
                    <Input id="ciclo-nome" value={campo('nome')} onChange={(e) => setCampo('nome', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={campo('tipo') || 'anual'} onValueChange={(v) => setCampo('tipo', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="anual">Anual</SelectItem>
                        <SelectItem value="semestral">Semestral</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="desempenho">Desempenho</SelectItem>
                        <SelectItem value="360">360°</SelectItem>
                        <SelectItem value="competencias">Competências</SelectItem>
                        <SelectItem value="okr">OKR</SelectItem>
                        <SelectItem value="experiencia">Experiência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ciclo-inicio">Início *</Label>
                      <Input
                        id="ciclo-inicio"
                        type="date"
                        value={campo('data_inicio')}
                        onChange={(e) => setCampo('data_inicio', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ciclo-fim">Fim *</Label>
                      <Input
                        id="ciclo-fim"
                        type="date"
                        value={campo('data_fim')}
                        onChange={(e) => setCampo('data_fim', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ciclo-descricao">Descrição</Label>
                    <Textarea
                      id="ciclo-descricao"
                      value={campo('descricao')}
                      onChange={(e) => setCampo('descricao', e.target.value)}
                    />
                  </div>
                </>
              )}

              {novo === 'meta' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="meta-titulo">Título *</Label>
                    <Input
                      id="meta-titulo"
                      value={campo('titulo')}
                      onChange={(e) => setCampo('titulo', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={campo('tipo') || 'individual'} onValueChange={(v) => setCampo('tipo', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="equipe">Equipe</SelectItem>
                        <SelectItem value="empresa">Empresa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectColaborador('colaborador_id', 'Responsável')}
                  {selectCiclo()}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="meta-valor">Meta</Label>
                      <Input
                        id="meta-valor"
                        type="number"
                        value={campo('meta_valor')}
                        onChange={(e) => setCampo('meta_valor', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meta-atual">Valor atual</Label>
                      <Input
                        id="meta-atual"
                        type="number"
                        value={campo('valor_atual')}
                        onChange={(e) => setCampo('valor_atual', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meta-limite">Prazo</Label>
                      <Input
                        id="meta-limite"
                        type="date"
                        value={campo('data_limite')}
                        onChange={(e) => setCampo('data_limite', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meta-descricao">Descrição</Label>
                    <Textarea
                      id="meta-descricao"
                      value={campo('descricao')}
                      onChange={(e) => setCampo('descricao', e.target.value)}
                    />
                  </div>
                </>
              )}

              {novo === 'feedback' && (
                <>
                  {selectColaborador('avaliado_id', 'Avaliado *')}
                  {selectColaborador('avaliador_id', 'Avaliador *')}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select value={campo('tipo') || 'par'} onValueChange={(v) => setCampo('tipo', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="par">Par</SelectItem>
                          <SelectItem value="gestor">Gestor</SelectItem>
                          <SelectItem value="subordinado">Subordinado</SelectItem>
                          <SelectItem value="autoavaliacao">Autoavaliação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="feedback-nota">Nota (1 a 5)</Label>
                      <Input
                        id="feedback-nota"
                        type="number"
                        min={1}
                        max={5}
                        step={0.5}
                        value={campo('nota_geral')}
                        onChange={(e) => setCampo('nota_geral', e.target.value)}
                      />
                    </div>
                  </div>
                  {selectCiclo()}
                  <div className="space-y-2">
                    <Label htmlFor="feedback-comentarios">Comentários</Label>
                    <Textarea
                      id="feedback-comentarios"
                      value={campo('comentarios')}
                      onChange={(e) => setCampo('comentarios', e.target.value)}
                    />
                  </div>
                </>
              )}

              {novo === 'pdi' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="pdi-titulo">Título *</Label>
                    <Input
                      id="pdi-titulo"
                      value={campo('titulo')}
                      onChange={(e) => setCampo('titulo', e.target.value)}
                    />
                  </div>
                  {selectColaborador('colaborador_id', 'Colaborador *')}
                  <div className="space-y-2">
                    <Label htmlFor="pdi-competencia">Competência foco</Label>
                    <Input
                      id="pdi-competencia"
                      value={campo('competencia_foco')}
                      onChange={(e) => setCampo('competencia_foco', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pdi-acao">Ação de desenvolvimento</Label>
                    <Textarea
                      id="pdi-acao"
                      value={campo('acao_desenvolvimento')}
                      onChange={(e) => setCampo('acao_desenvolvimento', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pdi-prazo">Prazo</Label>
                    <Input
                      id="pdi-prazo"
                      type="date"
                      value={campo('prazo')}
                      onChange={(e) => setCampo('prazo', e.target.value)}
                    />
                  </div>
                </>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setNovo(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!formValido || criar.isPending}>
                  {criar.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={excluir !== null} onOpenChange={(o) => !o && setExcluir(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
              <AlertDialogDescription>
                "{excluir?.nome}" será excluído permanentemente. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={remover.isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={remover.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  if (excluir) remover.mutate(excluir);
                }}
              >
                {remover.isPending ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageLayout>
    </>
  );
}
