/**
 * ============================================================================
 * CENTRAL DE AJUSTES — conteúdo da aba **Registros** do Controle de Ponto
 * (Gestão da Equipe → Registros).
 *
 * A tela NÃO tem rota própria e NÃO convive com seletor nenhum: ela é o corpo
 * direto da aba Registros, que passou a ser uma área ÚNICA. Não existe mais
 * sub-aba e não existe aba "Ajustes" na navegação principal (são quatro abas:
 * Visão Geral, Geofencing, Registros e Auditoria). O painel de batidas
 * (`GestaoRegistrosPonto`) não é montado aqui nem em outra aba.
 *
 * ── ESTRUTURA: UM GRID DE DUAS COLUNAS (~70/30) ────────────────────────────
 * A composição é um único CSS Grid com cinco linhas explícitas; nada aqui usa
 * `position: absolute`, altura fixa ou margem compensatória:
 *
 *   LINHA 1   cabeçalho ("Central de Ajustes")        busca + botão "Filtros"
 *   LINHA 2   quatro KPIs compactos                  ┌──────────────────┐
 *   LINHA 3   chips de status + período              │  Detalhes da     │
 *   LINHA 4   tabela de solicitações (`1fr`)         │  Solicitação     │
 *   LINHA 5   barra de paginação (card próprio)      └──────────────────┘
 *
 *  · COLUNA ESQUERDA (~70%): cabeçalho, KPIs, chips, tabela e paginação;
 *  · COLUNA DIREITA (~30%): busca/"Filtros" na linha 1 e o painel de detalhes
 *    ocupando as linhas 2–5 (`row-span-4`), de modo que o TOPO do painel fica
 *    na altura do topo dos KPIs e a BASE dele fecha na base da paginação;
 *  · abaixo de 1400px o grid vira uma coluna (ordem do DOM) e o painel passa a
 *    ser DRAWER (`Sheet`), aberto pelo clique na linha.
 *
 * As duas colunas nascem na MESMA linha de base porque a faixa do título e a
 * faixa da busca declaram a mesma altura mínima (36px) — é o grid alinhando,
 * não um `mt-*` calculado à mão.
 *
 * ── UMA ÚNICA FONTE DE VERDADE ─────────────────────────────────────────────
 * A query devolve `solicitacoes_ajuste_ponto` uma vez. Tudo o que a tela afirma
 * sai dela, pelo módulo puro `centralAjustes`:
 *
 *     período  → `filtrarAjustes(intervalo)`  → base de KPIs e da tabela
 *     busca    → `filtrarAjustes(busca)`      → tabela + contagem dos chips
 *     risco    → `filtrarAjustes(risco)`      → tabela + contagem dos chips
 *     status   → `filtrarAjustes(status)`     → tabela
 *     períodos → `resumoAjustes` (atual e anterior) → KPIs + variação
 *
 * Não existe contador paralelo: aprovar uma solicitação invalida a query, a
 * lista volta do banco e KPI, chip, tabela e painel acompanham juntos.
 *
 * ── DECISÕES PEDEM CONFIRMAÇÃO ─────────────────────────────────────────────
 * Aprovar e rejeitar — no painel, no diálogo de detalhes completos e nas ações
 * em lote — passam por um `AlertDialog` que diz QUEM (ou QUANTAS) será
 * decidido. Nenhuma escrita acontece sem esse "confirmar": o clique na linha
 * apenas abre os detalhes.
 *
 * ── O QUE FOI PRESERVADO DO COMPONENTE ANTERIOR ────────────────────────────
 *  · consulta com join do colaborador e ordenação por `created_at` desc;
 *  · aprovação com a RPC `processar_ajuste_aprovado` (e a tradução
 *    `rejeitado → recusado` do ENUM) e as mensagens de erro seguras;
 *  · aprovação/rejeição em LOTE, com resumo de sucesso/falha por item;
 *  · seleção múltipla por checkbox (agora convivendo com a linha ativa);
 *  · o diálogo com trilha de auditoria, conformidade 671 e exportação em PDF
 *    (`CentralAjustesDetalhesDialog`), aberto pelo painel de detalhes;
 *  · busca por nome e filtro de período (agora com contagem por status).
 * ============================================================================
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useEmpresas } from '@/hooks';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { validateTablePayload } from '@/schemas/validate';
import { intervaloAnterior, intervaloDoPeriodo } from '@/utils/pontoGeofencing';
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
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { CentralAjustesCabecalho } from './CentralAjustesCabecalho';
import { CentralAjustesBuscaFiltros } from './CentralAjustesBuscaFiltros';
import { CentralAjustesKpis } from './CentralAjustesKpis';
import { CentralAjustesFiltros } from './CentralAjustesFiltros';
import { CentralAjustesTabela } from './CentralAjustesTabela';
import { CentralAjustesPaginacao } from './CentralAjustesPaginacao';
import { CentralAjustesPainel } from './CentralAjustesPainel';
import { CentralAjustesDetalhesDialog } from './CentralAjustesDetalhesDialog';
import {
  PERIODOS_AJUSTES,
  TAMANHO_PAGINA_AJUSTES,
  contarAjustes,
  filtrarAjustes,
  paginarAjustes,
  resumoAjustes,
  totalPaginasAjustes,
  variacoesAjustes,
  type FiltroRiscoAjuste,
  type FiltroStatusAjuste,
  type PeriodoAjustes,
  type SolicitacaoAjustePonto,
} from './centralAjustes';

/** Resultado por item de uma decisão em lote. */
interface BatchMutationResult {
  id: string;
  success: boolean;
  error?: string;
}

export function PontoAdjustmentRequests() {
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;
  const queryClient = useQueryClient();
  /**
   * O painel de detalhes só é COLUNA a partir de 1400px — a mesma quebra do
   * grid da tela dividida. Abaixo disso ele é um DRAWER (`Sheet`), aberto pelo
   * clique na linha: a tabela fica com a largura inteira e os detalhes não
   * viram uma faixa espremida embaixo dela.
   */
  const painelLateral = useMediaQuery('(min-width: 1400px)');

  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<FiltroStatusAjuste>('todos');
  const [risco, setRisco] = useState<FiltroRiscoAjuste>('todos');
  const [periodo, setPeriodo] = useState<PeriodoAjustes>('30d');
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(TAMANHO_PAGINA_AJUSTES);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [idAtiva, setIdAtiva] = useState<string | null>(null);
  const [painelVisivel, setPainelVisivel] = useState(true);
  const [drawerAberto, setDrawerAberto] = useState(false);
  /** Decisão aguardando confirmação — `null` quando não há diálogo aberto. */
  const [confirmacao, setConfirmacao] = useState<{ ids: string[]; status: 'aprovado' | 'recusado' } | null>(null);
  const [detalhesCompletos, setDetalhesCompletos] = useState<SolicitacaoAjustePonto | null>(null);

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['solicitacoes-ajuste-ponto', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      const { data, error } = await supabase
        .from('solicitacoes_ajuste_ponto')
        .select('*, colaborador:colaboradores(nome_completo)')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as SolicitacaoAjustePonto[];
    },
    enabled: !!empresaId,
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status: novoStatus }: { id: string; status: string }) => {
      // O ENUM da tabela usa `recusado`: `rejeitado` (nome de tela) é traduzido
      // aqui para não gravar um valor que a RPC não reconhece.
      const finalStatus = novoStatus === 'rejeitado' ? 'recusado' : novoStatus;

      const { error: updateError } = await supabase
        .from('solicitacoes_ajuste_ponto')
        // Validação de payload herdada do componente anterior: o mesmo
        // `validateTablePayload` gateia o UPDATE de `status` que a main já fazia
        // antes do redesign — sem ele, um status fora do ENUM iria ao banco.
        .update(
          validateTablePayload(
            'solicitacoes_ajuste_ponto',
            { status: finalStatus, updated_at: new Date().toISOString() },
            'PontoAdjustmentRequests:solicitacoes_ajuste_ponto'
          )
        )
        .eq('id', id);

      if (updateError) throw updateError;

      if (finalStatus === 'aprovado') {
        const { error: applyError } = await supabase.rpc('processar_ajuste_aprovado', {
          p_solicitacao_id: id,
        });
        if (applyError) throw applyError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-ajuste-ponto'] });
      // O card "Pendências de Ponto" e o contexto de jornada do painel leem os
      // mesmos dados — sem estas invalidações continuariam com o número anterior
      // à decisão.
      queryClient.invalidateQueries({ queryKey: ['ponto-ajustes-pendentes'] });
      queryClient.invalidateQueries({ queryKey: ['ajuste-jornada-contexto'] });
      toast.success('Solicitação processada com sucesso!');
    },
    onError: (error: unknown) => {
      toast.error(safeErrorMessage(error, 'Erro ao processar solicitação de ajuste.'));
    },
  });

  const batchMutation = useMutation({
    mutationFn: async ({ ids, status: novoStatus }: { ids: string[]; status: 'aprovado' | 'recusado' }) => {
      const results: BatchMutationResult[] = await Promise.all(
        ids.map(async (id) => {
          try {
            await mutation.mutateAsync({ id, status: novoStatus });
            return { id, success: true };
          } catch (e: unknown) {
            return { id, success: false, error: e instanceof Error ? e.message : String(e) };
          }
        })
      );
      return results;
    },
    onSuccess: (results: BatchMutationResult[]) => {
      const successful = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;

      if (failed === 0) {
        toast.success(`${successful} solicitações processadas em lote.`);
      } else {
        toast.warning(`${successful} sucesso, ${failed} falhas. Verifique os itens individuais.`);
      }
      setSelecionadas([]);
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-ajuste-ponto'] });
    },
  });

  /** Janela do período ativo e a janela imediatamente anterior (mesma duração). */
  const janela = useMemo(() => intervaloDoPeriodo(periodo), [periodo]);
  const janelaAnterior = useMemo(() => intervaloAnterior(janela), [janela]);

  /** Base de KPIs e da listagem: tudo o que caiu no período selecionado. */
  const doPeriodo = useMemo(() => filtrarAjustes(solicitacoes, { intervalo: janela }), [solicitacoes, janela]);
  const doPeriodoAnterior = useMemo(
    () => filtrarAjustes(solicitacoes, { intervalo: janelaAnterior }),
    [solicitacoes, janelaAnterior]
  );

  /** Números dos chips: período + busca + risco ativos (o que o clique vai mostrar). */
  const contagem = useMemo(() => contarAjustes(filtrarAjustes(doPeriodo, { busca, risco })), [doPeriodo, busca, risco]);

  const indicadores = useMemo(() => resumoAjustes(doPeriodo), [doPeriodo]);
  const indicadoresAnteriores = useMemo(() => resumoAjustes(doPeriodoAnterior), [doPeriodoAnterior]);
  const variacoes = useMemo(
    () => variacoesAjustes(indicadores, indicadoresAnteriores),
    [indicadores, indicadoresAnteriores]
  );

  /** Linhas da tabela: período + busca + risco + chip de status. */
  const filtradas = useMemo(
    () => filtrarAjustes(doPeriodo, { busca, status, risco }),
    [doPeriodo, busca, status, risco]
  );

  const totalPaginas = totalPaginasAjustes(filtradas.length, tamanhoPagina);
  const paginaAtual = Math.min(pagina, totalPaginas);
  const linhasDaPagina = useMemo(
    () => paginarAjustes(filtradas, paginaAtual, tamanhoPagina),
    [filtradas, paginaAtual, tamanhoPagina]
  );

  /**
   * Solicitação do painel: a última clicada (se ainda estiver na lista filtrada)
   * ou, na coluna do desktop, a primeira da página atual — assim o painel nunca
   * abre vazio à direita. No drawer (telas menores) ele só abre por clique.
   */
  const ativa = useMemo(() => {
    const escolhida = idAtiva ? filtradas.find((s) => s.id === idAtiva) : undefined;
    if (escolhida) return escolhida;
    if (!painelLateral || !painelVisivel) return null;
    return linhasDaPagina[0] ?? filtradas[0] ?? null;
  }, [painelLateral, painelVisivel, idAtiva, filtradas, linhasDaPagina]);

  const rotuloPeriodo = PERIODOS_AJUSTES.find((opcao) => opcao.valor === periodo)?.rotulo ?? 'Últimos 30 dias';
  const processando = mutation.isPending || batchMutation.isPending;

  /** Quantos filtros estão fora do padrão — contador do botão "Filtros". */
  const filtrosAtivos = (busca.trim() ? 1 : 0) + (status !== 'todos' ? 1 : 0) + (risco !== 'todos' ? 1 : 0);

  /**
   * Troca de filtro sempre volta para a primeira página e limpa a seleção: a
   * seleção é um conjunto de linhas VISÍVEIS, e manter marcadas linhas que a
   * busca/status escondeu faria o "Aprovar em lote" decidir sobre o que não está
   * na tela.
   */
  const trocarBusca = (valor: string) => {
    setBusca(valor);
    setPagina(1);
  };

  const trocarStatus = (novo: FiltroStatusAjuste) => {
    setStatus(novo);
    setPagina(1);
    setSelecionadas([]);
  };

  const trocarRisco = (novo: FiltroRiscoAjuste) => {
    setRisco(novo);
    setPagina(1);
    setSelecionadas([]);
  };

  const trocarPeriodo = (novo: PeriodoAjustes) => {
    setPeriodo(novo);
    setPagina(1);
    setSelecionadas([]);
  };

  /** "Limpar filtros" do popover: busca, status e risco voltam ao padrão. */
  const limparFiltros = () => {
    setBusca('');
    setStatus('todos');
    setRisco('todos');
    setPagina(1);
    setSelecionadas([]);
  };

  const trocarTamanhoPagina = (novo: number) => {
    setTamanhoPagina(novo);
    setPagina(1);
  };

  const alternarSelecao = (id: string) => {
    setSelecionadas((anterior) => (anterior.includes(id) ? anterior.filter((item) => item !== id) : [...anterior, id]));
  };

  const alternarSelecaoDaPagina = () => {
    const idsDaPagina = linhasDaPagina.map((s) => s.id);
    const todasMarcadas = idsDaPagina.length > 0 && idsDaPagina.every((id) => selecionadas.includes(id));
    setSelecionadas((anterior) =>
      todasMarcadas ? anterior.filter((id) => !idsDaPagina.includes(id)) : [...new Set([...anterior, ...idsDaPagina])]
    );
  };

  /**
   * Abre a solicitação no painel: coluna à direita (>= 1400px) ou drawer —
   * que é o único caminho de detalhe nas telas menores.
   */
  const ativarSolicitacao = (id: string) => {
    setIdAtiva(id);
    setPainelVisivel(true);
    if (!painelLateral) setDrawerAberto(true);
  };

  /** Nome de quem pede o ajuste — usado na mensagem de confirmação. */
  const nomeDaSolicitacao = (id: string) =>
    solicitacoes.find((s) => s.id === id)?.colaborador?.nome_completo ?? 'o colaborador';

  /**
   * Pede confirmação antes de qualquer escrita: aprovar/rejeitar muda o status
   * da solicitação e, na aprovação, aplica o ajuste na jornada (RPC).
   */
  const pedirDecisao = (ids: string[], novoStatus: 'aprovado' | 'recusado') => {
    if (ids.length === 0 || processando) return;
    setConfirmacao({ ids, status: novoStatus });
  };

  const decidir = (id: string, novoStatus: 'aprovado' | 'recusado') => pedirDecisao([id], novoStatus);

  /** Confirmado: uma solicitação vai na mutation simples, várias vão no lote. */
  const confirmarDecisao = () => {
    if (!confirmacao) return;
    const { ids, status: novoStatus } = confirmacao;
    setConfirmacao(null);
    if (ids.length === 1) {
      mutation.mutate({ id: ids[0], status: novoStatus });
      return;
    }
    batchMutation.mutate({ ids, status: novoStatus });
  };

  /**
   * Texto da confirmação: o nome de quem pede (uma solicitação) ou a
   * quantidade selecionada (lote), mais o efeito da decisão.
   */
  const descricaoConfirmacao = (() => {
    if (!confirmacao) return '';
    const verbo = confirmacao.status === 'aprovado' ? 'Aprovar' : 'Rejeitar';
    const efeito =
      confirmacao.status === 'aprovado'
        ? 'O ajuste será aplicado na jornada do colaborador.'
        : 'O ajuste será negado e a batida registrada continua valendo.';
    if (confirmacao.ids.length === 1) {
      return `${verbo} a solicitação de ajuste de ${nomeDaSolicitacao(confirmacao.ids[0])}? ${efeito}`;
    }
    return `${verbo} ${confirmacao.ids.length} solicitações selecionadas? ${efeito}`;
  })();

  const aprovarLote = () => pedirDecisao(selecionadas, 'aprovado');
  const rejeitarLote = () => pedirDecisao(selecionadas, 'recusado');

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-4 py-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Carregando solicitações de ajuste…
      </div>
    );
  }

  return (
    // ── GRID DA TELA ───────────────────────────────────────────────────────
    // Coluna direita: `clamp(320px, 30%, 400px)`. Medido no navegador (Chromium)
    // com conteúdo real: a coluna acompanha os ~30% (414px de 1380 e 500px de
    // 1860) — na prática entre 27% e 30% da largura útil, com piso de 320px. O
    // teto de 400px do `clamp` não é aplicado na resolução de faixa do grid, e é
    // por isso que o encaixe da coluna é descrito em % e não em px.
    <div className="grid gap-x-4 gap-y-3 min-[1400px]:grid-cols-[minmax(0,1fr)_clamp(320px,30%,400px)] min-[1400px]:grid-rows-[auto_auto_auto_minmax(0,1fr)_auto]">
      {/* 1 · LINHA 1 / COLUNA ESQUERDA — identificação do módulo. */}
      <div className="min-w-0 min-[1400px]:col-start-1 min-[1400px]:row-start-1">
        <CentralAjustesCabecalho index={0} />
      </div>

      {/* 2 · LINHA 1 / COLUNA DIREITA — busca e "Filtros", acima do painel. */}
      <div className="min-w-0 min-[1400px]:col-start-2 min-[1400px]:row-start-1 min-[1400px]:self-center">
        <CentralAjustesBuscaFiltros
          busca={busca}
          onBusca={trocarBusca}
          periodo={periodo}
          onPeriodo={trocarPeriodo}
          risco={risco}
          onRisco={trocarRisco}
          filtrosAtivos={filtrosAtivos}
          onLimpar={limparFiltros}
          index={1}
        />
      </div>

      {/* 3 · LINHA 2 — os quatro KPIs, SÓ na largura da coluna esquerda. */}
      <div className="min-w-0 min-[1400px]:col-start-1 min-[1400px]:row-start-2">
        <CentralAjustesKpis indicadores={indicadores} variacoes={variacoes} rotuloPeriodo={rotuloPeriodo} />
      </div>

      {/* 4 · LINHA 3 — chips de status + seletor de período. */}
      <div className="min-w-0 min-[1400px]:col-start-1 min-[1400px]:row-start-3">
        <CentralAjustesFiltros
          contagem={contagem}
          status={status}
          onStatus={trocarStatus}
          periodo={periodo}
          onPeriodo={trocarPeriodo}
        />
      </div>

      {/* 5 · LINHA 4 (`minmax(0,1fr)`) — a tabela ocupa a altura que sobra. */}
      <div className="min-h-0 min-w-0 min-[1400px]:col-start-1 min-[1400px]:row-start-4">
        <CentralAjustesTabela
          solicitacoes={linhasDaPagina}
          selecionadas={selecionadas}
          onAlternarSelecao={alternarSelecao}
          onAlternarSelecaoDaPagina={alternarSelecaoDaPagina}
          idAtiva={ativa?.id ?? null}
          onAtivar={ativarSolicitacao}
        />
      </div>

      {/* 6 · LINHA 5 — paginação em CARD INDEPENDENTE, abaixo da tabela. */}
      <div className="min-w-0 min-[1400px]:col-start-1 min-[1400px]:row-start-5">
        <CentralAjustesPaginacao
          selecionadas={selecionadas}
          total={filtradas.length}
          pagina={paginaAtual}
          tamanhoPagina={tamanhoPagina}
          onPagina={setPagina}
          onTamanhoPagina={trocarTamanhoPagina}
          onAprovarLote={aprovarLote}
          onRejeitarLote={rejeitarLote}
          onLimparSelecao={() => setSelecionadas([])}
          processando={processando}
        />
      </div>

      {/* 7 · COLUNA DIREITA / LINHAS 2–5 — o painel de detalhes começa no TOPO
          dos KPIs e termina na BASE da paginação. `row-span-4` + `row-start-2`
          é o que garante esse alinhamento: nenhuma altura fixa, nenhum
          `absolute`, nenhuma margem compensatória. Abaixo de 1400 px o painel
          não caberia como coluna, então ele vira DRAWER (mais abaixo). */}
      {painelLateral && (
        <div className="flex min-h-0 min-w-0 flex-col min-[1400px]:col-start-2 min-[1400px]:row-span-4 min-[1400px]:row-start-2">
          <CentralAjustesPainel
            solicitacao={ativa}
            empresaId={empresaId}
            onFechar={() => {
              setPainelVisivel(false);
              setIdAtiva(null);
            }}
            onAprovar={(id) => decidir(id, 'aprovado')}
            onRejeitar={(id) => decidir(id, 'recusado')}
            onVerCompleto={setDetalhesCompletos}
            processando={processando}
          />
        </div>
      )}

      {/* DRAWER dos detalhes — abaixo de 1400px o painel só cabe assim: a
          tabela fica com a largura inteira e os detalhes deslizam da direita. */}
      {!painelLateral && (
        <Sheet open={drawerAberto} onOpenChange={setDrawerAberto}>
          <SheetContent
            side="right"
            aria-describedby={undefined}
            className="w-[min(92vw,360px)] gap-0 border-border/50 p-0 [&>button]:hidden"
          >
            <CentralAjustesPainel
              solicitacao={ativa}
              empresaId={empresaId}
              onFechar={() => {
                setDrawerAberto(false);
                setPainelVisivel(false);
                setIdAtiva(null);
              }}
              onAprovar={(id) => decidir(id, 'aprovado')}
              onRejeitar={(id) => decidir(id, 'recusado')}
              onVerCompleto={setDetalhesCompletos}
              processando={processando}
            />
          </SheetContent>
        </Sheet>
      )}

      <CentralAjustesDetalhesDialog
        solicitacao={detalhesCompletos}
        empresaId={empresaId}
        onFechar={() => setDetalhesCompletos(null)}
        onAprovar={(id) => decidir(id, 'aprovado')}
        onRejeitar={(id) => decidir(id, 'recusado')}
        processando={processando}
      />

      {/* CONFIRMAÇÃO — nenhuma decisão chega ao banco sem este "confirmar". */}
      <AlertDialog
        open={confirmacao !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setConfirmacao(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmacao?.status === 'aprovado' ? 'Aprovar ajuste' : 'Rejeitar solicitação'}
            </AlertDialogTitle>
            <AlertDialogDescription>{descricaoConfirmacao}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarDecisao}
              className={
                confirmacao?.status === 'aprovado'
                  ? 'bg-primary font-semibold text-primary-foreground hover:bg-primary-glow hover:text-primary-foreground'
                  : 'border border-danger/45 bg-danger/10 text-danger hover:bg-danger/20 hover:text-danger-hover'
              }
            >
              {confirmacao?.status === 'aprovado' ? 'Aprovar' : 'Rejeitar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
