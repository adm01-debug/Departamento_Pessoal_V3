/**
 * ============================================================================
 * HUB DE PREMIAÇÕES — ABA PAGAMENTOS (IMAGEM 4).
 *
 * Nova composição da aba, em DUAS COLUNAS no desktop — sem cabeçalho próprio:
 * a faixa de título/período/ciclo que existia aqui foi REMOVIDA (a tablist do hub
 * já identifica a seção), então os indicadores ficam imediatamente abaixo dela.
 *
 *   PRINCIPAL (~80%)                        LATERAL (~20%)
 *   1 · Quatro indicadores financeiros      1 · Resumo Financeiro
 *   2 · Fluxo de pagamento (horizontal)     2 · Próximas ações
 *   3 · Barra de filtros                    3 · Atividade recente
 *   4 · Tabela de pagamentos + rodapé
 *
 * O que mudou é a APRESENTAÇÃO. Nada de funcionalidade saiu:
 *  · aprovar / avançar a cadeia, rejeitar e REINICIAR FLUXO (o antigo quadro de
 *    quatro colunas virou as ações da tabela + o fluxo horizontal filtrável);
 *  · conciliação MANUAL e AUTOMÁTICA com a folha (diálogo + item de menu);
 *  · os MESMOS serviços (`atualizarStatusPagamento`, `reconciliarFolha`,
 *    `autoConciliarComFolha`) e o MESMO `nextStageMap` da cadeia de estados;
 *  · o filtro de período continua sendo LIDO dos pagamentos (nunca um mês fixo) e
 *    segue valendo para indicadores, fluxo, resumo e tabela — apenas o controle de
 *    seleção saiu junto do cabeçalho, com o período em "Todos os períodos";
 *  · o guard do modo demonstração (`bloquearEscritaPremiacoes`) continua na
 *    frente de toda escrita.
 * ============================================================================
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, FilterX, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { EntradaPresenca, entradaCard } from './premiacoesEntrada';
import { cn } from '@/lib/utils';
import { safeErrorMessage } from '@/utils/safeError';
import { premiacoesService } from '@/services/premiacoesService';
import { useEmpresas } from '@/hooks';
import { bloquearEscritaPremiacoes } from '@/mocks/premiacoesMock';
import { indiceEntrada, montarAtividadeRecente, type AuditoriaHub, type CampanhaHub, type PagamentoHub } from './premiacoesComum';
import {
  contarEtapasPagamento,
  FILTROS_PAGAMENTO_INICIAIS,
  filtrarEOrdenarPagamentos,
  montarAcoesPagamentos,
  montarKpisPagamentos,
  montarResumoFinanceiro,
  opcoesCampanha,
  opcoesStatus,
  ORDENACAO_PAGAMENTO_ROTULOS,
  paginarPagamentos,
  proximoStatusPagamento,
  rotuloPeriodo,
  STATUS_REINICIO_PAGAMENTO,
  valorDoPagamento,
  ETAPAS_FLUXO,
  ETAPA_PENDENTES,
  type AcaoPagamento,
  type FiltrosPagamento,
  type FiltroEtapaFluxo,
  type TipoAcaoPagamento,
} from './pagamentosComum';
import { PagamentosDialogs, type AcaoPendente } from './PagamentosDialogs';
import { PagamentosFluxo } from './PagamentosFluxo';
import { PagamentosKpis } from './PagamentosKpis';
import { PagamentosLateral } from './PagamentosLateral';
import { PagamentosTabela } from './PagamentosTabela';

/**
 * Pagamentos por página na tabela (paginação LOCAL — a API não pagina).
 * 6 é o padrão pedido para o Hub: deixa a tabela na altura da coluna lateral
 * (com os dois cards compactos) sem exigir esticamento artificial de nenhum card.
 */
const POR_PAGINA = 6;

interface PagamentosTabProps {
  pagamentos: PagamentoHub[];
  auditoria: AuditoriaHub[];
  campanhas: CampanhaHub[];
  /** Navega para outra aba do hub (destino do "Ver todas" da atividade). */
  onNavegar: (aba: string) => void;
}

/** Chaves invalidadas por qualquer escrita da aba (pagamento + trilha). */
const CHAVES = [['premiacoes_pagamentos'], ['premiacoes_auditoria']];

export function PagamentosTab({ pagamentos, auditoria, campanhas, onNavegar }: PagamentosTabProps) {
  const queryClient = useQueryClient();
  const { empresaAtual } = useEmpresas();

  const [filtros, setFiltros] = useState<FiltrosPagamento>(FILTROS_PAGAMENTO_INICIAIS);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(POR_PAGINA);
  const [selecionados, setSelecionados] = useState<ReadonlySet<string>>(new Set());
  const [aprovacao, setAprovacao] = useState<AcaoPendente | null>(null);
  const [conciliacao, setConciliacao] = useState<PagamentoHub | null>(null);
  const [detalhes, setDetalhes] = useState<PagamentoHub | null>(null);

  const { periodo } = filtros;

  /* ─── Derivações (funções puras de `pagamentosComum`) ───────────────────── */

  // O PERÍODO recorta tudo (indicadores, fluxo, resumo, ações e tabela); os
  // demais filtros recortam só a TABELA — é o que mantém os totais coerentes com
  // a janela escolhida no cabeçalho, como na referência.
  const noPeriodo = useMemo(
    () =>
      filtrarEOrdenarPagamentos(pagamentos, {
        ...FILTROS_PAGAMENTO_INICIAIS,
        periodo,
      }),
    [pagamentos, periodo],
  );

  const kpis = useMemo(() => montarKpisPagamentos(noPeriodo), [noPeriodo]);
  const etapas = useMemo(() => contarEtapasPagamento(noPeriodo), [noPeriodo]);
  const resumo = useMemo(() => montarResumoFinanceiro(noPeriodo), [noPeriodo]);
  const acoes = useMemo(() => montarAcoesPagamentos(noPeriodo), [noPeriodo]);

  const filtrados = useMemo(() => filtrarEOrdenarPagamentos(noPeriodo, filtros), [noPeriodo, filtros]);
  const { pagina: paginaAtual, linhas } = paginarPagamentos(filtrados, pagina, porPagina);

  const periodoLabel = periodo === 'todos' ? 'Todos os períodos' : rotuloPeriodo(periodo);
  const campanhasDisponiveis = useMemo(() => opcoesCampanha(pagamentos), [pagamentos]);
  const statusDisponiveis = useMemo(() => opcoesStatus(pagamentos), [pagamentos]);

  // A trilha de auditoria é do hub inteiro (não é recortada pelo período da aba).
  const eventos = useMemo(
    () => montarAtividadeRecente(auditoria, campanhas, pagamentos, 4),
    [auditoria, campanhas, pagamentos],
  );

  const atualizarFiltros = (patch: Partial<FiltrosPagamento>) => {
    setFiltros((atual) => ({ ...atual, ...patch }));
    setPagina(1);
  };

  /**
   * Detecta QUALQUER filtro da barra fora do padrão — fonte única usada pelo
   * botão "Limpar filtros" e pelo próprio `limparFiltros` (sem duplicar regra):
   * busca, etapa (inclui a seleção feita no Fluxo de Pagamento, que escreve no
   * MESMO `filtros.etapa`), campanha e status. Ordenação ("Mais recentes") e
   * período NÃO entram: não são filtros da barra e a limpeza os preserva.
   */
  const temFiltrosAtivos =
    filtros.busca.trim() !== FILTROS_PAGAMENTO_INICIAIS.busca ||
    filtros.etapa !== FILTROS_PAGAMENTO_INICIAIS.etapa ||
    filtros.campanha !== FILTROS_PAGAMENTO_INICIAIS.campanha ||
    filtros.status !== FILTROS_PAGAMENTO_INICIAIS.status;

  /**
   * LIMPAR FILTROS — devolve a barra ao estado inicial: busca vazia, etapa
   * "Todas as etapas" (o que também desfaz a seleção feita no Fluxo de
   * Pagamento, que compartilha o mesmo `filtros.etapa`), "Todas as campanhas" e
   * "Todos os status". Volta para a primeira página e limpa a seleção de linhas
   * (nada de aprovar pagamento que saiu da vista).
   *
   * PRESERVA: a ORDENAÇÃO escolhida (inclusive "Mais recentes"), o período em
   * análise, a quantidade de linhas por página (6), e por consequência os
   * indicadores, os contadores globais e a coluna lateral — que continuam
   * recortados pelo período, não pelos filtros da tabela.
   */
  const limparFiltros = () => {
    setFiltros((atual) => ({
      ...FILTROS_PAGAMENTO_INICIAIS,
      periodo: atual.periodo,
      ordenacao: atual.ordenacao,
    }));
    setSelecionados(new Set());
    setPagina(1);
  };

  /* ─── Escritas (MESMOS serviços do quadro de aprovação anterior) ─────────── */

  const invalidar = () => CHAVES.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));

  const atualizarStatus = useMutation({
    mutationFn: (dados: { id: string; status: string; valor: number; comentario: string }) => {
      // MOCK VISUAL — ver src/mocks/premiacoesMock.ts: aborta a escrita no modo demo.
      const rotulo =
        dados.status === 'rejeitado'
          ? 'Rejeitar pagamento'
          : dados.status === STATUS_REINICIO_PAGAMENTO
            ? 'Reiniciar fluxo do pagamento'
            : 'Aprovar pagamento';
      if (bloquearEscritaPremiacoes(rotulo)) return Promise.reject(new Error('mock'));
      return premiacoesService.atualizarStatusPagamento(
        dados.id,
        dados.status,
        empresaAtual!.id,
        dados.valor,
        dados.comentario,
      );
    },
    onSuccess: () => {
      invalidar();
      toast.success('Status atualizado e registrado na auditoria.');
    },
    onError: (e: unknown) => {
      if ((e as Error)?.message !== 'mock') toast.error(safeErrorMessage(e, 'Não foi possível atualizar o pagamento.'));
    },
  });

  const reconciliar = useMutation({
    mutationFn: (dados: { id: string; valor: number; justificativa: string }) => {
      if (bloquearEscritaPremiacoes('Salvar conciliação com a folha')) return Promise.reject(new Error('mock'));
      return premiacoesService.reconciliarFolha(dados.id, dados.valor, empresaAtual!.id, dados.justificativa);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Conciliação registrada.');
    },
    onError: (e: unknown) => {
      if ((e as Error)?.message !== 'mock') toast.error(safeErrorMessage(e, 'Erro na conciliação.'));
    },
  });

  const autoConciliar = useMutation({
    mutationFn: (id: string) => {
      if (bloquearEscritaPremiacoes('Conciliar automaticamente com a folha')) return Promise.reject(new Error('mock'));
      return premiacoesService.autoConciliarComFolha(id);
    },
    onSuccess: () => {
      invalidar();
      toast.success('Auto-conciliação concluída com sucesso!');
    },
    onError: (e: unknown) => {
      if ((e as Error)?.message !== 'mock') {
        toast.error(safeErrorMessage(e, 'Falha na conciliação automática.'));
      }
    },
  });

  /* ─── Ações da tabela e dos painéis ─────────────────────────────────────── */

  const abrirAprovacao = (pagamento: PagamentoHub, nextStatus: string) => setAprovacao({ pagamento, nextStatus });

  const executarPrincipal = (pagamento: PagamentoHub, tipo: TipoAcaoPagamento) => {
    if (tipo === 'detalhes') setDetalhes(pagamento);
    else if (tipo === 'conciliar') setConciliacao(pagamento);
    else if (tipo === 'reiniciar') abrirAprovacao(pagamento, STATUS_REINICIO_PAGAMENTO);
    else {
      const proximo = proximoStatusPagamento(pagamento.status);
      if (proximo) abrirAprovacao(pagamento, proximo);
    }
  };

  const executarAcao = (pagamento: PagamentoHub, tipo: TipoAcaoPagamento | 'rejeitar' | 'auto-conciliar') => {
    if (tipo === 'rejeitar') abrirAprovacao(pagamento, 'rejeitado');
    else if (tipo === 'auto-conciliar') autoConciliar.mutate(pagamento.id);
    else executarPrincipal(pagamento, tipo);
  };

  const confirmarAprovacao = (comentario: string) => {
    if (!aprovacao) return;
    const { pagamento, nextStatus } = aprovacao;
    const rejeitando = nextStatus === 'rejeitado';
    const comentarioPadrao = rejeitando
      ? 'Rejeitado via Hub'
      : nextStatus === STATUS_REINICIO_PAGAMENTO
        ? 'Fluxo reiniciado via Hub'
        : 'Aprovado via Hub';
    atualizarStatus.mutate({
      id: pagamento.id,
      // Rejeição zera o valor aprovado (mesma regra do quadro anterior).
      valor: rejeitando ? 0 : valorDoPagamento(pagamento),
      status: nextStatus,
      comentario: comentario || comentarioPadrao,
    });
    setAprovacao(null);
  };

  const confirmarConciliacao = (valorFolha: string, justificativa: string) => {
    if (!conciliacao) return;
    reconciliar.mutate({ id: conciliacao.id, valor: Number(valorFolha), justificativa });
    setConciliacao(null);
  };

  const alternarSelecao = (id: string) =>
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });

  const alternarTodos = (marcar: boolean) =>
    setSelecionados(marcar ? new Set(linhas.map((l) => l.id)) : new Set());

  /**
   * Aprovação em lote: avança UM passo cada pagamento selecionado que tenha
   * próximo estágio na cadeia — a MESMA escrita individual aplicada a N itens
   * (nunca um atalho que pule etapas).
   */
  const aprovarSelecionados = async () => {
    const alvos = filtrados.filter((p) => selecionados.has(p.id) && proximoStatusPagamento(p.status));
    if (alvos.length === 0 || !empresaAtual) return;
    if (bloquearEscritaPremiacoes(`Aprovar ${alvos.length} pagamento(s)`)) return;
    const resultados = await Promise.allSettled(
      alvos.map((p) =>
        premiacoesService.atualizarStatusPagamento(
          p.id,
          proximoStatusPagamento(p.status)!,
          empresaAtual.id,
          valorDoPagamento(p),
          'Aprovação em lote pelo Hub',
        ),
      ),
    );
    invalidar();
    const falhas = resultados.filter((r) => r.status === 'rejected').length;
    setSelecionados(new Set());
    if (falhas === 0) toast.success(`${alvos.length} pagamento(s) aprovados e registrados na auditoria.`);
    else toast.warning(`${alvos.length - falhas} de ${alvos.length} aprovados; ${falhas} falharam.`);
  };

  /* ─── Rótulos de apoio ──────────────────────────────────────────────────── */

  const mensagemVazia =
    pagamentos.length === 0
      ? 'Nenhum pagamento registrado ainda.'
      : 'Nenhum pagamento corresponde aos filtros aplicados.';

  return (
    <EntradaPresenca>
      {/* Grade principal: tabela e fluxo (~80%) + painéis laterais (~20%).
          Abaixo de `xl` as colunas empilham (a lateral desce inteira). */}
      <div className="grid min-w-0 grid-cols-1 items-stretch gap-3.5 xl:grid-cols-[minmax(0,4.2fr)_minmax(212px,0.82fr)]">
        {/* ─── COLUNA PRINCIPAL ─────────────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col gap-3.5">
          {/* 2 · Indicadores financeiros */}
          <PagamentosKpis kpis={kpis} />

          {/* 3 · Fluxo de pagamento (horizontal, filtrável) */}
          <PagamentosFluxo
            etapas={etapas}
            etapaSelecionada={filtros.etapa}
            onSelecionar={(etapa: FiltroEtapaFluxo) => atualizarFiltros({ etapa })}
          />

          {/* 4 · Barra de filtros */}
          <div className="flex min-h-[64px] min-w-0 flex-wrap items-center gap-3 rounded-[14px] border border-border/50 bg-card/60 px-4 py-3">
            <motion.div
              {...entradaCard(indiceEntrada('filtros', 0))}
              className="relative w-full min-w-[180px] flex-1"
            >
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filtros.busca}
                onChange={(e) => atualizarFiltros({ busca: e.target.value })}
                placeholder="Buscar por colaborador, campanha..."
                aria-label="Buscar pagamentos"
                className="h-10 rounded-xl border-border/50 bg-background pl-10 text-[13px]"
              />
            </motion.div>

            {/* Larguras FIXAS nos selects: sem isso o controle cresce com o texto
                da opção escolhida, a barra estoura a largura disponível e o botão
                cai para uma segunda linha (proibido em desktop). O rótulo longo é
                limitado a uma linha pelo próprio `SelectTrigger` do DS, e a opção
                completa continua acessível na lista suspensa. */}
            <motion.div {...entradaCard(indiceEntrada('filtros', 1))} className="w-[150px] shrink-0">
              <Select value={filtros.etapa} onValueChange={(v) => atualizarFiltros({ etapa: v as FiltroEtapaFluxo })}>
                <SelectTrigger aria-label="Etapa do fluxo" className="h-10 rounded-xl border-border/50 bg-background text-[12.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="todas" className="text-xs">
                    Todas as etapas
                  </SelectItem>
                  <SelectItem value={ETAPA_PENDENTES} className="text-xs">
                    Aguardando aprovação (todos)
                  </SelectItem>
                  {ETAPAS_FLUXO.map((etapa) => (
                    <SelectItem key={etapa.valor} value={etapa.valor} className="text-xs">
                      {etapa.numero} · {etapa.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="fora" className="text-xs">
                    Fora do fluxo (auditoria) · {etapas.foraDoFluxo}
                  </SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            <motion.div {...entradaCard(indiceEntrada('filtros', 2))} className="w-[190px] shrink-0">
              <Select value={filtros.campanha} onValueChange={(v) => atualizarFiltros({ campanha: v })}>
                <SelectTrigger aria-label="Campanha" className="h-10 rounded-xl border-border/50 bg-background text-[12.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="todas" className="text-xs">
                    Todas as campanhas
                  </SelectItem>
                  {campanhasDisponiveis.map((nome) => (
                    <SelectItem key={nome} value={nome} className="text-xs">
                      {nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            <motion.div {...entradaCard(indiceEntrada('filtros', 3))} className="w-[160px] shrink-0">
              <Select value={filtros.status} onValueChange={(v) => atualizarFiltros({ status: v })}>
                <SelectTrigger aria-label="Status" className="h-10 rounded-xl border-border/50 bg-background text-[12.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="todos" className="text-xs">
                    Todos os status
                  </SelectItem>
                  {statusDisponiveis.map((opcao) => (
                    <SelectItem key={opcao.valor} value={opcao.valor} className="text-xs">
                      {opcao.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            <motion.div {...entradaCard(indiceEntrada('filtros', 4))} className="w-[160px] shrink-0">
              <Select
                value={filtros.ordenacao}
                onValueChange={(v) => atualizarFiltros({ ordenacao: v as FiltrosPagamento['ordenacao'] })}
              >
                <SelectTrigger aria-label="Ordenar por" className="h-10 rounded-xl border-border/50 bg-background text-[12.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {ORDENACAO_PAGAMENTO_ROTULOS.map((opcao) => (
                    <SelectItem key={opcao.valor} value={opcao.valor} className="text-xs">
                      {opcao.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </motion.div>

            {/* LIMPAR FILTROS — ao lado do seletor de ordenação, com a MESMA
                altura (40px), raio e cores dos outros controles, para não criar
                segunda linha nem crescer a barra. Estado NEUTRO (desabilitado)
                quando não há filtro ativo; com QUALQUER filtro aplicado recebe o
                verde-limão oficial do Design System (`--primary`), com fundo
                translúcido, borda e ícone na mesma tinta e hover mais intenso —
                o usuário vê de imediato que existe recorte aplicado. */}
            <motion.div {...entradaCard(indiceEntrada('filtros', 5))} className="shrink-0">
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={limparFiltros}
                      disabled={!temFiltrosAtivos}
                      aria-label="Limpar filtros"
                      data-filtros-ativos={temFiltrosAtivos}
                      className={cn(
                        'h-10 w-10 rounded-xl border transition-colors duration-200 ease-in-out',
                        temFiltrosAtivos
                          ? 'border-primary/60 bg-primary/10 text-primary hover:border-primary/80 hover:bg-primary/20 hover:text-primary'
                          : 'border-border/50 bg-background text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground',
                      )}
                    >
                      <FilterX className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Limpar filtros</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          </div>

          {/* Barra de lotes: só aparece com seleção REAL (as caixas marcam
              pagamentos de verdade e a ação usa o mesmo serviço de escrita). */}
          {selecionados.size > 0 && (
            <motion.div
              {...entradaCard(indiceEntrada('filtros', 5))}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-primary/30 bg-primary/5 px-4 py-2.5"
            >
              <span className="text-[12px] font-medium">
                {selecionados.size} {selecionados.size === 1 ? 'pagamento selecionado' : 'pagamentos selecionados'}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-8 gap-1.5 rounded-lg text-[11.5px]"
                  onClick={aprovarSelecionados}
                  disabled={atualizarStatus.isPending}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar selecionados
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 rounded-lg text-[11.5px]"
                  onClick={() => setSelecionados(new Set())}
                >
                  Limpar
                </Button>
              </div>
            </motion.div>
          )}

          {/* 5 · Tabela de pagamentos + rodapé de paginação.
              Os pagamentos REJEITADOS também vivem aqui (filtro de status e
              filtro "fora do fluxo"): a linha mostra o selo "Rejeitado" e a
              ação principal "Reiniciar fluxo" — a faixa antiga
              "PAGAMENTOS REJEITADOS (AUDITORIA NECESSÁRIA)" foi REMOVIDA da
              renderização, sem perder o dado nem a operação. */}
          <PagamentosTabela
            linhas={linhas}
            total={filtrados.length}
            pagina={paginaAtual}
            porPagina={porPagina}
            onPaginaChange={setPagina}
            onPageSizeChange={(tamanho) => {
              setPorPagina(tamanho);
              setPagina(1);
            }}
            ordenacaoAtual={filtros.ordenacao}
            selecionados={selecionados}
            onAlternarSelecao={alternarSelecao}
            onAlternarTodos={alternarTodos}
            onAcaoPrincipal={executarPrincipal}
            onAcao={executarAcao}
            mensagemVazia={mensagemVazia}
          />
        </div>

        {/* ─── COLUNA LATERAL ────────────────────────────────────────────────
            Sem `contain-size`: a LINHA passa a ser o MAIOR lado (tabela ou
            lateral), então as bases coincidem tanto quando a tabela é alta
            (a lateral estica e o espaço sobra ENTRE os cards) quanto quando um
            filtro encurta a tabela (o card da tabela estica e ancora o rodapé). */}
        <div className="min-w-0">
          <PagamentosLateral
            resumo={resumo}
            periodoLabel={periodoLabel}
            acoes={acoes}
            eventos={eventos}
            onIrParaEtapa={(destino: AcaoPagamento['destino']) => atualizarFiltros({ etapa: destino })}
            onVerAtividade={() => onNavegar('auditoria')}
          />
        </div>
      </div>

      {/* Diálogos de escrita (aprovar/rejeitar/reiniciar + conciliação) e de
          leitura (detalhes). `salvando` desabilita a confirmação durante a gravação. */}
      <PagamentosDialogs
        aprovacao={aprovacao}
        onFecharAprovacao={() => setAprovacao(null)}
        onConfirmarAprovacao={confirmarAprovacao}
        conciliacao={conciliacao}
        onFecharConciliacao={() => setConciliacao(null)}
        onConfirmarConciliacao={confirmarConciliacao}
        detalhes={detalhes}
        onFecharDetalhes={() => setDetalhes(null)}
        salvando={atualizarStatus.isPending || reconciliar.isPending}
      />
    </EntradaPresenca>
  );
}
