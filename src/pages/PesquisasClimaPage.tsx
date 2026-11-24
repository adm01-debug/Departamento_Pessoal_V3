/**
 * ============================================================================
 * PESQUISAS DE CLIMA & eNPS — página do módulo (rota `/pesquisas-clima`).
 *
 * ESTRUTURA (de cima para baixo), na ordem da referência aprovada:
 *   1. cabeçalho: título + subtítulo à esquerda, sino de notificações e
 *      "+ Nova Pesquisa" à direita;
 *   2. faixa horizontal e densa de MÉTRICAS: os 4 indicadores ocupando 100% da
 *      largura útil (grid de 4 colunas iguais, sem coluna reservada);
 *   3. barra de FILTROS: busca (com o atalho ⌘K) + tipo · status · período ·
 *      ordenação numa MESMA linha, a busca absorvendo o espaço restante;
 *   4. pílulas de navegação por STATUS, com contagem real em cada uma;
 *   5. grade de cartões (ativa/encerrada/rascunho) — termina no último cartão
 *      real; a criação mora SÓ no "+ Nova Pesquisa" do cabeçalho (o slot vazio
 *      tracejado que fechava a grade foi removido por ser ação redundante).
 *
 * O que é CALCULADO e o que é VITRINE está separado em `pesquisasComum`:
 * contagens, adesão e participação média saem dos dados da tela; a variação
 * percentual dos indicadores ainda não tem histórico no backend e é
 * documentada lá (ver `VARIACAO_INDICADORES`).
 *
 * MOCK VISUAL — ver src/mocks/pesquisasClimaMock.ts. Com o mock ligado, a
 * leitura curto-circuita o Supabase e `enabled` também vale sem empresa ativa;
 * TODA escrita (criar, editar, publicar, encerrar, excluir) passa por
 * `bloquearEscritaPesquisas()` e não chega ao banco.
 * ============================================================================
 */
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MotionConfig, motion } from 'framer-motion';
import { ArrowUpDown, ClipboardList, Gauge, HeartPulse, Plus, Search, SearchX, UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';

import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { NotificationCenter } from '@/components/ui/notification-center';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EntradaPresenca } from '@/components/ui/entrada-cards';
import { PALETAS_CHIP, TEMA_TODOS } from '@/components/avaliacao/chipFiltroComum';
import { BarraAdesao } from '@/components/pesquisas/BarraAdesao';
import { CardPesquisa } from '@/components/pesquisas/CardPesquisa';
import { IndicadorPesquisa } from '@/components/pesquisas/IndicadorPesquisa';
import { PilulaFiltroPesquisa } from '@/components/pesquisas/PilulaFiltroPesquisa';
import {
  OPCOES_ORDENACAO,
  OPCOES_PERIODO,
  OPCOES_STATUS,
  OPCOES_TIPO,
  VARIACAO_INDICADORES,
  adesaoDe,
  calcularMetricas,
  filtrarPesquisas,
  formatarAtualizacao,
  formatarPeriodo,
  temaStatus,
  temaTipo,
  type AbaFiltro,
  type FiltrosPesquisas,
  type Ordenacao,
  type PeriodoFiltro,
  type PesquisaListada,
  type StatusPesquisa,
  type TipoPesquisa,
} from '@/components/pesquisas/pesquisasComum';

import { pesquisaService } from '@/services/pesquisaService';
import { useEmpresas } from '@/hooks';
import { MOTION_REDUCED_MODE } from '@/lib/motionMode';
// MOCK VISUAL — ver src/mocks/pesquisasClimaMock.ts.
import { bloquearEscritaPesquisas, getMockPesquisas, isPesquisasMockEnabled } from '@/mocks/pesquisasClimaMock';

/* ─── Coreografia das janelas (a MESMA do popup “Pendências”) ───────────────── */

/**
 * Quantos blocos cascateiam em cada janela deste módulo: cabeçalho + corpo +
 * rodapé. É o número que `cascadeShellVariants`/`cascadeOverlayVariants` usam
 * (`ui/cascade-motion.ts`) para saber por quanto tempo o conteúdo ainda some
 * antes de a caixa começar a encolher no fechamento — nenhuma janela daqui
 * inventa uma coreografia própria.
 */
const BLOCOS_CASCATA_JANELA = 3;

/* ─── Configuração das pílulas de status ────────────────────────────────────── */

/**
 * Cada aba usa a pílula do módulo (`PilulaFiltroPesquisa`) com a paleta da SUA
 * categoria: lime para o agregador "Todas", verde para Ativas, azul para
 * Encerradas e âmbar para Rascunhos — as mesmas quatro cores da referência,
 * sem nenhuma tinta nova.
 */
const ABAS: Array<{ valor: AbaFiltro; rotulo: string; tema: (typeof PALETAS_CHIP)[keyof typeof PALETAS_CHIP] }> = [
  { valor: 'todas', rotulo: 'Todas', tema: TEMA_TODOS },
  { valor: 'ativa', rotulo: 'Ativas', tema: PALETAS_CHIP.emerald },
  { valor: 'encerrada', rotulo: 'Encerradas', tema: PALETAS_CHIP.blue },
  { valor: 'rascunho', rotulo: 'Rascunhos', tema: PALETAS_CHIP.amber },
];

interface FormPesquisa {
  titulo: string;
  descricao: string;
  tipo: TipoPesquisa;
  anonima: boolean;
  data_inicio: string;
  data_fim: string;
}

const FORM_VAZIO: FormPesquisa = {
  titulo: '',
  descricao: '',
  tipo: 'clima',
  anonima: true,
  data_inicio: '',
  data_fim: '',
};

/** eNPS sempre com sinal explícito ("+42" / "-12"), como na referência. */
function formatarEnps(valor: number): string {
  return valor > 0 ? `+${valor}` : String(valor);
}

export default function PesquisasClimaPage() {
  const { empresaAtual } = useEmpresas();
  const qc = useQueryClient();
  const buscaRef = useRef<HTMLInputElement>(null);

  /* ─── Estado da grade ────────────────────────────────────────────────────── */
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<AbaFiltro>('todas');
  const [tipo, setTipo] = useState<TipoPesquisa | 'todos'>('todos');
  const [statusDropdown, setStatusDropdown] = useState<StatusPesquisa | 'todos'>('todos');
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('qualquer');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('recentes');

  /* ─── Diálogos ───────────────────────────────────────────────────────────── */
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [editando, setEditando] = useState<PesquisaListada | null>(null);
  const [form, setForm] = useState<FormPesquisa>(FORM_VAZIO);
  const [resultados, setResultados] = useState<PesquisaListada | null>(null);

  // Atalho ⌘/Ctrl+K leva o foco à busca (o mesmo hint exibido dentro do campo).
  useEffect(() => {
    const aoTeclar = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        buscaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, []);

  /* ─── Dados ──────────────────────────────────────────────────────────────── */
  // MOCK VISUAL — ver src/mocks/pesquisasClimaMock.ts.
  const mockAtivo = isPesquisasMockEnabled();
  const { data: pesquisas = [], isLoading } = useQuery({
    queryKey: ['pesquisas', empresaAtual?.id],
    queryFn: async (): Promise<PesquisaListada[]> =>
      (getMockPesquisas() as PesquisaListada[] | undefined) ?? (await pesquisaService.listar(empresaAtual!.id)),
    enabled: !!empresaAtual?.id || mockAtivo,
  });

  const invalidar = () => qc.invalidateQueries({ queryKey: ['pesquisas'] });

  /**
   * Cria OU atualiza, conforme o diálogo: sem `editando` é uma pesquisa nova
   * (nasce como rascunho); com `editando` é o rascunho retomado pelo botão
   * "Continuar edição" — e o status NÃO é tocado no update.
   */
  const salvar = useMutation({
    mutationFn: async () => {
      const payload = {
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        tipo: form.tipo,
        anonima: form.anonima,
        data_inicio: form.data_inicio || null,
        data_fim: form.data_fim || null,
      };
      if (editando && empresaAtual?.id) {
        return pesquisaService.atualizar(editando.id, payload, empresaAtual.id);
      }
      return pesquisaService.criar({ ...payload, empresa_id: empresaAtual?.id, status: 'rascunho' });
    },
    onSuccess: () => {
      invalidar();
      toast.success(editando ? 'Rascunho atualizado!' : 'Pesquisa criada!');
      fecharDialogo();
    },
    onError: () => toast.error(editando ? 'Não foi possível atualizar o rascunho' : 'Erro ao criar pesquisa'),
  });

  const alterarStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusPesquisa }) =>
      pesquisaService.atualizar(id, { status }, empresaAtual!.id),
    onSuccess: (_dados, variaveis) => {
      invalidar();
      toast.success(variaveis.status === 'ativa' ? 'Pesquisa publicada!' : 'Pesquisa encerrada');
    },
    onError: () => toast.error('Não foi possível alterar o status da pesquisa'),
  });

  const excluir = useMutation({
    mutationFn: (id: string) => pesquisaService.excluir(id, empresaAtual!.id),
    onSuccess: () => {
      invalidar();
      toast.success('Pesquisa excluída');
    },
    onError: () => toast.error('Não foi possível excluir a pesquisa'),
  });

  /* ─── Derivados ──────────────────────────────────────────────────────────── */
  // Mesmo padrão de `PremiacoesPage`: "hoje" é fixado uma vez por render e a
  // inteligência fica em funções puras (`pesquisasComum`) — nada de cálculo
  // dentro do JSX, e com 5–50 pesquisas o custo de recalcular é irrelevante.
  const hoje = new Date();
  const metricas = calcularMetricas(pesquisas);
  const filtros: FiltrosPesquisas = { aba, tipo, status: statusDropdown, periodo, busca, ordenacao };
  const pesquisasFiltradas = filtrarPesquisas(pesquisas, filtros, hoje);

  const contagens: Record<AbaFiltro, number> = {
    todas: metricas.total,
    ativa: metricas.ativas,
    encerrada: metricas.encerradas,
    rascunho: metricas.rascunhos,
  };

  const temFiltroAtivo =
    busca.trim() !== '' || tipo !== 'todos' || statusDropdown !== 'todos' || periodo !== 'qualquer';

  /* ─── Handlers ───────────────────────────────────────────────────────────── */
  function abrirCriacao() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setDialogoAberto(true);
  }

  function abrirEdicao(pesquisa: PesquisaListada) {
    setEditando(pesquisa);
    setForm({
      titulo: pesquisa.titulo,
      descricao: pesquisa.descricao ?? '',
      tipo: (pesquisa.tipo as TipoPesquisa) ?? 'clima',
      anonima: pesquisa.anonima,
      data_inicio: pesquisa.data_inicio ?? '',
      data_fim: pesquisa.data_fim ?? '',
    });
    setDialogoAberto(true);
  }

  function fecharDialogo() {
    setDialogoAberto(false);
    setEditando(null);
    setForm(FORM_VAZIO);
  }

  function salvarPesquisa() {
    if (bloquearEscritaPesquisas(editando ? 'Editar rascunho' : 'Criar pesquisa')) return;
    salvar.mutate();
  }

  function publicar(pesquisa: PesquisaListada) {
    if (bloquearEscritaPesquisas('Publicar pesquisa')) return;
    alterarStatus.mutate({ id: pesquisa.id, status: 'ativa' });
  }

  function encerrar(pesquisa: PesquisaListada) {
    if (bloquearEscritaPesquisas('Encerrar pesquisa')) return;
    alterarStatus.mutate({ id: pesquisa.id, status: 'encerrada' });
  }

  function excluirPesquisa(pesquisa: PesquisaListada) {
    if (bloquearEscritaPesquisas('Excluir pesquisa')) return;
    excluir.mutate(pesquisa.id);
  }

  function limparFiltros() {
    setBusca('');
    setTipo('todos');
    setStatusDropdown('todos');
    setPeriodo('qualquer');
    setAba('todas');
  }

  // Estado vazio: a criação agora mora apenas no "+ Nova Pesquisa" do
  // cabeçalho, então o texto aponta para o botão do topo — e não mais para o
  // card tracejado, que não existe mais na grade.
  const mensagemVazia =
    pesquisas.length === 0
      ? 'Nenhuma pesquisa cadastrada ainda. Use “+ Nova Pesquisa”, no topo, para montar a primeira.'
      : 'Nenhuma pesquisa corresponde aos filtros aplicados.';

  // Dados do diálogo de acompanhamento, calculados fora do JSX.
  const adesaoResultados = resultados ? adesaoDe(resultados) : null;
  const temaResultados = resultados ? temaTipo(resultados.tipo) : null;
  const statusResultados = resultados ? temaStatus(resultados.status) : null;

  return (
    <MotionConfig reducedMotion={MOTION_REDUCED_MODE}>
      <>
        <PageTitle title="Pesquisas de Clima" description="Pesquisas de clima organizacional e eNPS" />
        <PageLayout
          title="Pesquisas de Clima & eNPS"
          description="Escute sua equipe, fortaleça sua cultura"
          className="max-w-none space-y-3"
          actions={
            <>
              {/* Sino REAL do Design System (o mesmo do Header): o badge vermelho
                aparece com a contagem de notificações não lidas. */}
              <NotificationCenter />
              <Button
                onClick={abrirCriacao}
                className="h-9 shrink-0 gap-2 rounded-xl px-4 text-[13px] font-semibold shadow-glow-sm"
              >
                <Plus className="h-4 w-4" aria-hidden /> Nova Pesquisa
              </Button>
            </>
          }
        >
          {/* 1 · FAIXA DE MÉTRICAS — os quatro indicadores ocupam 100% da largura
            útil em colunas IGUAIS (a busca saiu daqui e foi para a barra de
            filtros, logo abaixo). */}
          <EntradaPresenca>
            <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              <IndicadorPesquisa
                indice={0}
                titulo="Total de pesquisas"
                valor={String(metricas.total)}
                icone={ClipboardList}
                caixa="bg-primary/15 text-primary"
                variacao={VARIACAO_INDICADORES.total}
              />
              <IndicadorPesquisa
                indice={1}
                titulo="Pesquisas ativas"
                valor={String(metricas.ativas)}
                icone={UserCheck}
                caixa="bg-info/15 text-info"
                variacao={VARIACAO_INDICADORES.ativas}
              />
              <IndicadorPesquisa
                indice={2}
                titulo="Participação média"
                valor={metricas.participacaoMedia === null ? '—' : `${metricas.participacaoMedia}%`}
                icone={Gauge}
                caixa="bg-success/15 text-success"
                variacao={VARIACAO_INDICADORES.participacao}
              />
              <IndicadorPesquisa
                indice={3}
                titulo="eNPS atual"
                valor={metricas.enps === null ? '—' : formatarEnps(metricas.enps)}
                icone={HeartPulse}
                caixa="bg-warning/15 text-warning"
                variacao={VARIACAO_INDICADORES.enps}
              />
            </div>
          </EntradaPresenca>

          {/* 2 · BARRA DE FILTROS (busca + dropdowns) + 3 · PÍLULAS DE STATUS.
            A busca abre a linha ocupando o espaço restante; os dropdowns
            recortam tipo, status e período; a ordenação fica no extremo direito
            com o ícone de setas opostas, como na referência. */}
          <EntradaPresenca>
            <div className="space-y-2">
              <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1.6fr)_repeat(3,minmax(0,1fr))_minmax(180px,210px)]">
                <div className="relative min-w-0">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    ref={buscaRef}
                    value={busca}
                    onChange={(event) => setBusca(event.target.value)}
                    placeholder="Buscar pesquisas..."
                    aria-label="Buscar pesquisas"
                    className="h-9 rounded-[10px] border-border/50 bg-card/60 pl-9 pr-16 text-[12px] placeholder:text-muted-foreground focus-visible:ring-primary/40"
                  />
                  {busca ? (
                    <button
                      type="button"
                      onClick={() => setBusca('')}
                      aria-label="Limpar busca"
                      className="absolute right-11 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                  <kbd className="pointer-events-none absolute right-2 top-1/2 hidden h-5 -translate-y-1/2 items-center rounded border border-border/60 bg-muted/40 px-1.5 text-[9px] font-medium text-muted-foreground sm:flex">
                    ⌘K
                  </kbd>
                </div>

                <Select value={tipo} onValueChange={(valor) => setTipo(valor as TipoPesquisa | 'todos')}>
                  <SelectTrigger
                    aria-label="Filtrar por tipo de pesquisa"
                    className="h-9 rounded-[10px] border-border/50 bg-card/60 text-[12px]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCOES_TIPO.map((opcao) => (
                      <SelectItem key={opcao.valor} value={opcao.valor}>
                        {opcao.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={statusDropdown}
                  onValueChange={(valor) => setStatusDropdown(valor as StatusPesquisa | 'todos')}
                >
                  <SelectTrigger
                    aria-label="Filtrar por status"
                    className="h-9 rounded-[10px] border-border/50 bg-card/60 text-[12px]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCOES_STATUS.map((opcao) => (
                      <SelectItem key={opcao.valor} value={opcao.valor}>
                        {opcao.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={periodo} onValueChange={(valor) => setPeriodo(valor as PeriodoFiltro)}>
                  <SelectTrigger
                    aria-label="Filtrar por período"
                    className="h-9 rounded-[10px] border-border/50 bg-card/60 text-[12px]"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCOES_PERIODO.map((opcao) => (
                      <SelectItem key={opcao.valor} value={opcao.valor}>
                        {opcao.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative min-w-0">
                  <ArrowUpDown
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Select value={ordenacao} onValueChange={(valor) => setOrdenacao(valor as Ordenacao)}>
                    <SelectTrigger
                      aria-label="Ordenar pesquisas"
                      className="h-9 rounded-[10px] border-border/50 bg-card/60 pl-8 text-[12px]"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPCOES_ORDENACAO.map((opcao) => (
                        <SelectItem key={opcao.valor} value={opcao.valor}>
                          {opcao.rotulo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pílulas de status: contagem REAL de cada estado (as mesmas
                contagens que alimentam os indicadores do topo). Anatomia SEM a
                bolinha colorida: só o rótulo centralizado e o badge numérico na
                ponta direita, com as MESMAS cores — ver `PilulaFiltroPesquisa`. */}
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                {ABAS.map((item) => (
                  <div key={item.valor} className="flex min-w-fit flex-1">
                    <PilulaFiltroPesquisa
                      label={item.rotulo}
                      count={contagens[item.valor]}
                      tema={item.tema}
                      selected={aba === item.valor}
                      onClick={() => setAba(item.valor)}
                      ariaLabel={`Filtrar por ${item.rotulo}: ${contagens[item.valor]} pesquisa(s)`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </EntradaPresenca>

          {/* 4 · GRADE DE PESQUISAS — cada cartão carrega tipo, status, título,
            descrição, período, identificação, adesão e as ações; o ÚLTIMO slot
            é sempre o card tracejado de criação. */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : (
            <>
              {pesquisasFiltradas.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-border/50 bg-card/20 px-6 py-10 text-center">
                  <SearchX className="h-6 w-6 text-muted-foreground" aria-hidden />
                  <p className="text-[13px] font-medium text-foreground">Nenhuma pesquisa encontrada</p>
                  <p className="max-w-sm text-[11px] leading-snug text-muted-foreground">{mensagemVazia}</p>
                  {temFiltroAtivo && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={limparFiltros}
                      className="mt-1 h-7 rounded-lg text-[11px]"
                    >
                      Limpar filtros
                    </Button>
                  )}
                </div>
              )}

              <EntradaPresenca>
                <div className="grid min-w-0 grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {pesquisasFiltradas.map((pesquisa, indice) => (
                    <CardPesquisa
                      key={pesquisa.id}
                      pesquisa={pesquisa}
                      indice={indice}
                      onResultados={setResultados}
                      onEditar={abrirEdicao}
                      onPublicar={publicar}
                      onEncerrar={encerrar}
                      onExcluir={excluirPesquisa}
                    />
                  ))}
                </div>
              </EntradaPresenca>
            </>
          )}
        </PageLayout>

        {/* ── DIÁLOGO DE CRIAÇÃO / EDIÇÃO ────────────────────────────────────────
          O MESMO diálogo para as duas ações: aberto pelo "+ Nova Pesquisa" (sem
          `editando`) ou por "Continuar edição" (com o rascunho carregado).

          ANIMAÇÃO: clonada do popup "Pendências" (`ui/animated-cascade-dialog.tsx`)
          — a moldura é a `CascadeDialogFrame`, a MESMA que ele usa: `AnimatePresence`
          + `forceMount` (entrada e saída), véu `bg-black/60 backdrop-blur-sm` em
          fade, caixa que nasce pequena, estica as laterais e depois a altura
          (`cascadeShellVariants`, `transformOrigin: top center`) e conteúdo em
          cascata (`cascadeItemVariants`: cabeçalho → formulário → rodapé). Nenhum
          número é recriado aqui: tudo vem de `ui/cascade-motion.ts`.
          Fechamento (X, rodapé, Esc, clique fora) continua 100% do Radix. */}
        <CascadeDialogFrame
          open={dialogoAberto}
          onOpenChange={(aberto) => {
            if (aberto) setDialogoAberto(true);
            else fecharDialogo();
          }}
          blocks={BLOCOS_CASCATA_JANELA}
          className="max-w-lg"
        >
          <motion.div variants={cascadeItemVariants}>
            <DialogHeader>
              <DialogTitle>{editando ? 'Editar rascunho' : 'Nova Pesquisa'}</DialogTitle>
              <DialogDescription>
                {editando
                  ? 'Ajuste os dados do rascunho. Ele continua como rascunho até ser publicado.'
                  : 'A pesquisa nasce como rascunho: você publica quando estiver pronta para receber respostas.'}
              </DialogDescription>
            </DialogHeader>
          </motion.div>

          <motion.div variants={cascadeItemVariants}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="pesquisa-titulo">Título</Label>
                <Input
                  id="pesquisa-titulo"
                  value={form.titulo}
                  onChange={(event) => setForm((atual) => ({ ...atual, titulo: event.target.value }))}
                  placeholder="Ex: Pesquisa de Clima Q1 2026"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pesquisa-tipo">Tipo</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(valor) => setForm((atual) => ({ ...atual, tipo: valor as TipoPesquisa }))}
                >
                  <SelectTrigger id="pesquisa-tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCOES_TIPO.filter((opcao) => opcao.valor !== 'todos').map((opcao) => (
                      <SelectItem key={opcao.valor} value={opcao.valor}>
                        {opcao.rotulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pesquisa-descricao">Descrição</Label>
                <Textarea
                  id="pesquisa-descricao"
                  value={form.descricao}
                  onChange={(event) => setForm((atual) => ({ ...atual, descricao: event.target.value }))}
                  placeholder="Objetivo da pesquisa em uma frase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pesquisa-inicio">Data início</Label>
                  <Input
                    id="pesquisa-inicio"
                    type="date"
                    value={form.data_inicio}
                    onChange={(event) => setForm((atual) => ({ ...atual, data_inicio: event.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pesquisa-fim">Data fim</Label>
                  <Input
                    id="pesquisa-fim"
                    type="date"
                    value={form.data_fim}
                    onChange={(event) => setForm((atual) => ({ ...atual, data_fim: event.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="pesquisa-anonima"
                  checked={form.anonima}
                  onCheckedChange={(valor) => setForm((atual) => ({ ...atual, anonima: valor }))}
                />
                <Label htmlFor="pesquisa-anonima">Respostas anônimas</Label>
              </div>
            </div>
          </motion.div>

          <motion.div variants={cascadeItemVariants}>
            <DialogFooter>
              <Button variant="outline" onClick={fecharDialogo}>
                Cancelar
              </Button>
              <Button onClick={salvarPesquisa} disabled={!form.titulo.trim() || salvar.isPending}>
                {salvar.isPending ? 'Salvando...' : editando ? 'Salvar rascunho' : 'Criar pesquisa'}
              </Button>
            </DialogFooter>
          </motion.div>
        </CascadeDialogFrame>

        {/* ── DIÁLOGO DE ACOMPANHAMENTO / RESULTADOS ─────────────────────────────
          Ação principal de "Acompanhar" (ativa) e "Ver resultados" (encerrada).
          Reúne o que o módulo JÁ tem: status, período, identificação e adesão.
          O detalhamento por pergunta não é oferecido aqui — a nota no rodapé do
          painel deixa isso explícito em vez de exibir gráfico decorativo.
          MESMA moldura/clonagem da janela de criação — que é a do popup
          "Pendências" (`CascadeDialogFrame` + `cascadeItemVariants`): a janela
          emerge pequena e se abre, e o véu entra em fade junto (`backdrop-blur-sm`
          incluso), sem nenhuma animação paralela inventada aqui. */}
        <CascadeDialogFrame
          open={resultados !== null}
          onOpenChange={(aberto) => {
            if (!aberto) setResultados(null);
          }}
          blocks={BLOCOS_CASCATA_JANELA}
          className="max-w-md"
        >
          <motion.div variants={cascadeItemVariants}>
            <DialogHeader>
              <DialogTitle>Acompanhamento</DialogTitle>
              <DialogDescription>{resultados?.titulo}</DialogDescription>
            </DialogHeader>
          </motion.div>

          <motion.div variants={cascadeItemVariants}>
            {resultados && adesaoResultados && temaResultados && statusResultados && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium leading-none ${temaResultados.tag}`}
                  >
                    {temaResultados.rotulo}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-medium leading-none ${statusResultados.tag}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${statusResultados.ponto}`} aria-hidden />
                    {statusResultados.rotulo}
                  </span>
                </div>

                <div className="space-y-1 text-[12px] text-muted-foreground">
                  <p>{formatarPeriodo(resultados.data_inicio, resultados.data_fim)}</p>
                  <p>
                    {resultados.anonima ? 'Anônima' : 'Identificada'} · {formatarAtualizacao(resultados.updated_at)}
                  </p>
                </div>

                {adesaoResultados.disponivel ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Adesão</span>
                      <span className="font-semibold tabular-nums text-foreground">{adesaoResultados.percentual}%</span>
                    </div>
                    {/* Mesma barra animada dos cartões (`BarraAdesao`): cresce
                        de zero até o percentual com a régua de "Amplitude de
                        Liderança". O degradê deste painel continua o mesmo
                        (`primary` → `primary-glow`). */}
                    <BarraAdesao
                      value={adesaoResultados.percentual}
                      aria-label={`Adesão de ${adesaoResultados.percentual}%`}
                      className="h-1.5 bg-muted/50"
                      indicatorClassName="bg-gradient-to-r from-primary to-primary-glow"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {adesaoResultados.respostas} de {adesaoResultados.convidados} respostas
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    Participação ainda não calculada para esta pesquisa.
                  </p>
                )}

                <p className="text-[10px] leading-snug text-muted-foreground">
                  O detalhamento por pergunta não faz parte deste módulo — este painel reúne os dados da pesquisa.
                </p>
              </div>
            )}
          </motion.div>

          <motion.div variants={cascadeItemVariants}>
            <DialogFooter>
              {resultados?.status === 'ativa' && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const pesquisa = resultados;
                    setResultados(null);
                    encerrar(pesquisa);
                  }}
                >
                  Encerrar pesquisa
                </Button>
              )}
              <Button onClick={() => setResultados(null)}>Fechar</Button>
            </DialogFooter>
          </motion.div>
        </CascadeDialogFrame>
      </>
    </MotionConfig>
  );
}
