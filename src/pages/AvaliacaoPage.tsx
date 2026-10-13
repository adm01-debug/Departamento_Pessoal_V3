import { PageTitle } from '@/components/PageTitle';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageLayout } from '@/components/layout';
import { CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { AnimatedTabsList, AnimatedTabsTrigger } from '@/components/ui/animated-tabs';
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
import { EntradaPresenca, MotionCard, entradaCard } from '@/components/avaliacao/entradaCards';
import { BarraProgresso } from '@/components/avaliacao/barraProgresso';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { cn } from '@/lib/utils';
import { formatarPeriodo, gradienteProgresso, limitarPercentual } from '@/components/avaliacao/desempenhoComum';
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

/**
 * Navegação da área — mesma ordem, rótulos e ícones de antes (nada de conteúdo
 * novo). Fica numa lista única só para os SEIS triggers compartilharem a mesma
 * pele e o layout de 6 colunas iguais do desktop.
 */
const ABAS = [
  { valor: 'ciclos', rotulo: 'Ciclos', icone: BarChart2 },
  { valor: 'metas', rotulo: 'Metas & OKRs', icone: Target },
  { valor: 'feedbacks', rotulo: 'Feedbacks', icone: Users },
  { valor: 'pdis', rotulo: 'PDI', icone: TrendingUp },
  { valor: 'ninebox', rotulo: 'Nine-Box', icone: LayoutGrid },
  { valor: 'auditoria', rotulo: 'Auditoria', icone: History },
] as const;

/**
 * Pele do trigger da TabList. Como o botão deixa de vir do `ui/tabs.tsx` (que
 * pintava a aba ativa com `bg-background` + `shadow-xs` de forma INSTANTÂNEA),
 * a string traz aqui a mesma base neutra — `inline-flex`, centralização,
 * `font-medium`, foco (`ring`) — acrescida do layout do módulo:
 *   • `h-8` — cabe no box de 34px do strip de 44px sem gerar rolagem;
 *   • `lg:w-full` — cada aba ocupa 1/6 do grid;
 *   • `group` + `data-[state=active]` — os filhos (`CLASSE_ABA_ICONE` e
 *     `CLASSE_ABA_TEXTO`) reagem à seleção.
 * NÃO há mais `::after` (a linha lime) nem fundo no estado ativo: quem pinta a
 * aba selecionada é o indicador deslizante do `ui/animated-tabs` — o MESMO de
 * Admissões. Manter o sublinhado estático aqui somaria um segundo indicador
 * "saltando" enquanto a pílula desliza.
 */
const CLASSE_ABA =
  'group relative inline-flex h-8 shrink-0 items-center justify-center whitespace-nowrap gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50 lg:w-full';
const CLASSE_ABA_ICONE =
  'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-data-[state=active]:text-primary';
const CLASSE_ABA_TEXTO =
  'min-w-0 truncate text-muted-foreground transition-colors group-data-[state=active]:text-foreground';

export default function AvaliacaoPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  // Movimento reduzido (fonte única do app) — repassado às barras de progresso
  // do módulo, que assim nascem já cheias quando a preferência está ligada.
  const reduzirMovimento = useMovimentoReduzido();
  const [tab, setTab] = useState('ciclos');
  // Ciclo em destaque no painel; `undefined` = usuário ainda não escolheu
  // (o padrão passa a ser o ciclo ativo detectado nos dados reais).
  const [cicloSelecionadoId, setCicloSelecionadoId] = useState<string | undefined>(undefined);

  // === Queries ===
  // MOCK VISUAL — ver src/mocks/desempenhoMock.ts. Com o mock ligado, cada
  // leitura curto-circuita a chamada ao Supabase; `enabled` também passa a
  // valer sem empresa ativa (a área mostra os dados fictícios de demonstração).
  const mockAtivo = isDesempenhoMockEnabled();
  const { data: ciclos = [], isLoading: loadCiclos } = useQuery({
    queryKey: ['ciclos_avaliacao', empresaAtual?.id],
    queryFn: async (): Promise<any[]> => getMockCiclos() ?? (await avaliacaoService.listarCiclos(empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: metas = [], isLoading: loadMetas } = useQuery({
    queryKey: ['metas_okrs', empresaAtual?.id],
    queryFn: async (): Promise<any[]> => getMockMetas() ?? (await avaliacaoService.listarMetas(empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: feedbacks = [], isLoading: loadFeedbacks } = useQuery({
    queryKey: ['feedbacks_360', empresaAtual?.id],
    queryFn: async (): Promise<any[]> =>
      getMockFeedbacks() ?? (await avaliacaoService.listarFeedbacks(empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: pdis = [], isLoading: loadPDIs } = useQuery({
    queryKey: ['pdis', empresaAtual?.id],
    queryFn: async (): Promise<any[]> => getMockPdis() ?? (await avaliacaoService.listarPDIs(empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: competencias = [], isLoading: loadComp } = useQuery({
    queryKey: ['competencias', empresaAtual?.id],
    queryFn: async (): Promise<any[]> =>
      getMockCompetencias() ?? (await avaliacaoService.listarCompetencias(empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo,
  });
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', empresaAtual?.id],
    queryFn: () => colaboradorService.list(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  // === Mutations ===
  // MOCK VISUAL — ver src/mocks/desempenhoMock.ts. Cada escrita é abortada com
  // um toast de demonstração quando o mock está ligado (os `colaborador_id`
  // fictícios não existem no banco); o `throw` evita o toast de sucesso.
  const criarCiclo = useMutation({
    mutationFn: (d: any) => {
      if (bloquearEscritaDesempenho('Criar ciclo de avaliação')) return Promise.reject(new Error('mock'));
      return avaliacaoService.criarCiclo({ ...d, empresa_id: empresaAtual?.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ciclos_avaliacao'] });
      toast.success('Ciclo criado!');
    },
  });

  const criarMeta = useMutation({
    mutationFn: (d: any) => {
      if (bloquearEscritaDesempenho('Criar meta/OKR')) return Promise.reject(new Error('mock'));
      return avaliacaoService.criarMeta({ ...d, empresa_id: empresaAtual?.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metas_okrs'] });
      toast.success('Meta criada!');
    },
  });

  const criarPDI = useMutation({
    mutationFn: (d: any) => {
      if (bloquearEscritaDesempenho('Criar PDI')) return Promise.reject(new Error('mock'));
      return avaliacaoService.criarPDI({ ...d, empresa_id: empresaAtual?.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pdis'] });
      toast.success('PDI criado!');
    },
  });

  const excluirCiclo = useMutation({
    mutationFn: (c: any) => {
      if (bloquearEscritaDesempenho('Excluir ciclo de avaliação')) return Promise.reject(new Error('mock'));
      return avaliacaoService.excluirCiclo(c.id, empresaAtual!.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ciclos_avaliacao'] });
      toast.success('Ciclo excluído!');
    },
  });

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
    [ciclos]
  );

  const cicloSelecionado = useMemo(
    () => ciclos.find((c: any) => c.id === cicloSelecionadoId) ?? cicloAtivo,
    [ciclos, cicloSelecionadoId, cicloAtivo]
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
        {/* Presença de entrada: devolve o keyframe `hidden` a todo card do módulo
            (o `<AnimatePresence initial={false}>` do PageTransition o suprime). */}
        <EntradaPresenca>
        <Tabs value={tab} onValueChange={setTab} className="space-y-5">
          {/* Faixa de navegação compacta + seletor de ciclo + ação principal.
              Os TRÊS controles compartilham a MESMA altura externa (`h-11` = 44px)
              e ficam centrados na mesma linha, com gaps de 12px. Só a LARGURA
              difere: a TabList flexiona, o seletor e a ação ficam no tamanho do
              próprio conteúdo. */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* TabList — mecanismo de seleção IDÊNTICO ao de Admissões:
                `AnimatedTabsList` (ui/animated-tabs → `TabsHighlight mode="parent"`)
                mantém UM único indicador persistente, medido no trigger ativo e
                movido pela mola `ANIMATED_TABS_SPRING` (stiffness 220 / damping 24
                / mass 0.7) — nunca desmonta entre trocas, então a interpolação é
                sempre real e não há piscada.

                `highlightClassName` repete a MESMA pele do indicador de Admissões
                (`rounded-lg bg-background shadow-xs`) e os triggers ficam
                transparentes: quem pinta a aba ativa é o indicador, nunca o botão.

                O LAYOUT não muda — as classes de antes foram só redistribuídas:
                as de caixa (borda/fundo/`p-1`/`h-11`/rolagem) vão no container e
                as de trilha (`flex`/`grid` de 6 colunas/`gap`/`items-center`) na
                lista interna. No desktop o grid de 6 colunas iguais + `h-8` dos
                botões continua igual; abaixo de `lg` a faixa rola na horizontal. */}
            {/* ⚠️ O wrapper abaixo é o ITEM FLEX da linha — e existe por um
                detalhe do `AnimatedTabsList` (componente compartilhado, não
                alterado): ele renderiza um `div` por fora das classes de
                `containerClassName`, então o `lg:flex-1`/`lg:min-w-0` que estão
                lá dentro não alcançam o item flex. Sem este wrapper, a faixa de
                abas fica com a largura do próprio conteúdo e a linha sobra
                vazia à direita do botão "Novo Ciclo". Com ele, quem flexiona é
                o item flex de verdade e o botão encosta na borda direita da
                área útil (a mesma dos cards abaixo). */}
            <div className="min-w-0 lg:flex-1">
              <AnimatedTabsList
                value={tab}
                onValueChange={setTab}
                containerClassName="h-11 w-full rounded-xl border border-border/30 bg-card/50 p-1 overflow-x-auto lg:min-w-0 lg:flex-1 lg:overflow-visible"
                highlightClassName="rounded-lg bg-background shadow-xs"
                listClassName="flex h-full w-full items-center justify-start gap-1 text-muted-foreground lg:grid lg:grid-cols-6"
              >
                {ABAS.map(({ valor, rotulo, icone: Icone }) => (
                  <AnimatedTabsTrigger key={valor} value={valor} className={CLASSE_ABA}>
                    <Icone className={CLASSE_ABA_ICONE} />
                    <span className={CLASSE_ABA_TEXTO}>{rotulo}</span>
                  </AnimatedTabsTrigger>
                ))}
              </AnimatedTabsList>
            </div>

            <div className="flex items-center gap-3 lg:shrink-0">
              <Select value={cicloSelecionado?.id ?? ''} onValueChange={setCicloSelecionadoId}>
                <SelectTrigger className="h-11 w-full gap-2 rounded-xl sm:w-[230px]">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  {/* Duas linhas (nome + período do ciclo SELECIONADO, dado
                      real): mesma informação que a área já mostrava, só
                      reorganizada — o `Select`/`SelectItem` seguem intocados. */}
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left leading-tight">
                    <SelectValue
                      className="max-w-full truncate text-[13px] font-medium"
                      placeholder="Selecionar ciclo"
                    />
                    <span className="max-w-full truncate font-mono text-[10px] text-muted-foreground">
                      {cicloSelecionado
                        ? formatarPeriodo(cicloSelecionado.data_inicio, cicloSelecionado.data_fim)
                        : 'Sem período definido'}
                    </span>
                  </div>
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
              indice={5}
            />
          </TabsContent>

          <TabsContent value="metas" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {metas.map((m: any, i: number) => {
                // Mesmo percentual exibido na tela (atual ÷ objetivo), normalizado
                // para a barra: `limitarPercentual` ignora objetivo ausente/zerado e
                // trava em 0–100, exatamente como o `Progress` fazia.
                const pctMeta = limitarPercentual((m.valor_atual / m.valor_objetivo) * 100);
                return (
                  <MotionCard
                    key={m.id}
                    {...entradaCard(i)}
                    className="border-border/30 hover:shadow-md transition-shadow rounded-2xl overflow-hidden"
                  >
                    <div className="h-1 bg-primary/20" />
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <Badge variant="outline" className="text-[10px] font-medium uppercase tracking-wide">
                          {m.tipo}
                        </Badge>
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
                        {/* Barra com a MESMA animação/degradê das demais barras da
                            área (padrão "Amplitude de Liderança"). */}
                        <BarraProgresso
                          percentual={pctMeta}
                          indice={i}
                          cor={gradienteProgresso(pctMeta)}
                          reduzirMovimento={reduzirMovimento}
                          trilhoClassName="h-1.5 w-full bg-secondary"
                        />
                      </div>

                      <div className="mt-4 pt-4 border-t border-border/10 flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
                          {m.colaborador?.nome_completo?.charAt(0)}
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground">
                          {m.colaborador?.nome_completo}
                        </span>
                      </div>
                    </CardContent>
                  </MotionCard>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="feedbacks" className="space-y-6">
            <motion.div
              {...entradaCard(0)}
              className="rounded-2xl border border-border/30 overflow-hidden bg-card"
            >
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
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] uppercase font-medium">
                          {f.tipo}
                        </Badge>
                      </TableCell>
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
            </motion.div>
          </TabsContent>

          <TabsContent value="pdis" className="space-y-6">
            <div className="grid gap-4">
              {pdis.map((p: any, i: number) => (
                <MotionCard key={p.id} {...entradaCard(i)} className="border-border/30 hover:border-primary/20 transition-all rounded-2xl">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-xl bg-success/10 text-success">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{p.titulo}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-medium">
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
                        <p className="text-[10px] text-muted-foreground uppercase font-medium tracking-wide">Prazo</p>
                        <p className="text-xs font-mono font-medium">{new Date(p.prazo).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <Badge
                        className={cn(
                          'text-[10px] font-medium uppercase',
                          p.status === 'concluido'
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-warning/10 text-warning border-warning/20'
                        )}
                      >
                        {p.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardContent>
                </MotionCard>
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
        </EntradaPresenca>
      </PageLayout>
    </>
  );
}
