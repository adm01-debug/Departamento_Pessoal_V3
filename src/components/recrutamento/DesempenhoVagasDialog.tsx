import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpDown,
  Briefcase,
  Building2,
  Eye,
  Filter,
  FilterX,
  Search,
  Timer,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { CASCADE_SHELL_OPEN_DURATION, cascadeItemVariants } from '@/components/ui/cascade-motion';
import { CARD_INTERACAO_ESTATICO, CARD_INTERACAO_ICONE_ESTATICO } from '@/components/ui/interacao-cards';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { cn } from '@/lib/utils';
import { formatarPercentual, resumirDesempenhoVagas, type DetalheVaga, type SituacaoVaga } from './analyticsComum';
import {
  FILTROS_DESEMPENHO_PADRAO,
  ORDENACOES_DESEMPENHO,
  SITUACOES_DESEMPENHO,
  filtrarDetalheVagas,
  rotuloOrdenacao,
  rotuloSituacaoFiltro,
  temFiltroDesempenho,
  type FiltroSituacao,
  type OrdenacaoDesempenho,
} from './analyticsVagasFiltros';
import {
  GRADIENTE_VAGA,
  SUPERFICIE_INTERNA,
  SUPERFICIE_SUAVE,
  TRILHA_BARRA_VAGA,
  tokenDaConversao,
} from './analyticsVisual';
import { PreenchimentoBarraAnalytics } from './barraProgressoAnalytics';
import { etapaPorId } from './pipelineEtapas';
import { variantesDetalheVaga, type VariantesDetalheVaga } from './animacaoDetalheVaga';

/**
 * ============================================================================
 * RECRUTAMENTO — JANELA "VER TODAS" DE DESEMPENHO POR VAGA
 *
 * Extensão do card de Analytics (mesma família visual, mesmos dados): quatro
 * KPIs compactos, barra de filtros, tabela de TODAS as vagas do recorte e, na
 * própria linha, o detalhamento da vaga (etapas, tempo médio) — sem abrir uma
 * segunda janela.
 *
 * ── DADOS: NADA É INVENTADO ────────────────────────────────────────────────
 * `detalhes` chega pronto de `construirDetalheVagas` (analyticsComum), que parte
 * de `construirDesempenhoVagas` — o MESMO cálculo do card. Candidatos,
 * contratações e conversão da tabela são idênticos aos do resumo; etapa, tempo
 * médio e "em processo" vêm dos registros já carregados. Quando um dado não
 * existe (tempo médio sem amostra, departamento vazio), o texto diz isso.
 *
 * ── ANIMAÇÃO: A DO SISTEMA, SEM NÚMERO NOVO ────────────────────────────────
 * A moldura é `CascadeDialogFrame` (a janela oficial: véu, cascata, X, Escape,
 * clique fora, foco preso e `prefers-reduced-motion` respeitado pelo
 * `MotionConfig` da página). Cada faixa entra com `cascadeItemVariants`
 * (opacidade 0→1 + 8px de baixo para cima) e as barras usam
 * `PreenchimentoBarraAnalytics` — a coreografia do card "Amplitude de
 * Liderança", a mesma do card de origem. O gatilho das barras é
 * `CASCADE_SHELL_OPEN_DURATION`: elas só crescem depois que a caixa terminou de
 * abrir, e não no meio da cascata.
 *
 * ── A DOBRA DO DETALHE (accordion da linha) ────────────────────────────────
 * Clicar no olho não troca a tabela de estado: a linha de detalhe CRESCE de
 * altura 0 até a altura real do conteúdo (300 ms, `--ease-standard`) e as
 * linhas de baixo descem junto, sem salto — quem anima é a célula, então o
 * alinhamento das colunas e a largura da janela não mudam. Os números e as
 * variantes moram em `animacaoDetalheVaga.ts` (fonte única): o conteúdo entra
 * em fade e as cinco etapas entram em cascata curta, 6 px acima da posição
 * final. Ao fechar, o painel recolhe e só então é desmontado
 * (`AnimatePresence`) — por isso a linha existe SEMPRE: vazia e sem borda
 * enquanto recolhida, para não sobrar filete nem altura fantasma na tabela.
 * ============================================================================
 */

/** Faixas que entram em cascata: cabeçalho, KPIs, filtros, tabela, rodapé. */
const BLOCOS_CASCATA = 5;

/** Chip + tinta do badge de status (fundo semitransparente, como no resto da aba). */
const TOM_SITUACAO: Record<SituacaoVaga, string> = {
  aberta: 'border-success/30 bg-success/12 text-success',
  pausada: 'border-warning/30 bg-warning/12 text-warning',
  encerrada: 'border-border/60 bg-muted/40 text-muted-foreground',
  indefinida: 'border-border/60 bg-muted/40 text-muted-foreground',
};

/** Ponto de status da coluna "Vaga" — o mesmo desenho do card de origem. */
const PONTO_SITUACAO: Record<SituacaoVaga, string> = {
  aberta: 'hsl(var(--success))',
  pausada: 'hsl(var(--warning))',
  encerrada: 'hsl(var(--muted-foreground))',
  indefinida: 'hsl(var(--muted-foreground))',
};

/**
 * Skin dos três controles da barra de filtros: `h-8` (mesma altura dos botões
 * da janela), superfície da camada 3 (`foreground/4,5%`, ver `analyticsVisual`)
 * e tipografia um degrau abaixo do corpo do modal. Overrides vencem o padrão do
 * `SelectTrigger` (`h-9`/`text-control`) porque vêm depois na string.
 */
const CAMPO_FILTRO =
  'h-8 w-auto min-w-[136px] justify-between gap-1.5 rounded-lg border-border/50 bg-[hsl(var(--foreground)/0.045)] px-2.5 py-0 text-[11.5px] text-foreground/85 transition-colors hover:border-border hover:bg-[hsl(var(--foreground)/0.075)] focus:ring-2 focus:ring-ring/50';

/** Célula numérica: alinhada à direita e com números tabulares em todas as linhas. */
const CELULA_NUMERO = 'px-2 py-2.5 text-right align-middle text-[12px] tabular-nums';

/**
 * KPI compacto — o MESMO desenho dos indicadores do Analytics (ícone à
 * esquerda em chip de 40px reais, rótulo em uma linha, valor em destaque e
 * apoio discreto embaixo). Nada de gráfico decorativo: o card é leitura.
 */
function KpiDesempenho({
  icone: Icone,
  tom,
  label,
  valor,
  apoio,
  dica,
}: {
  icone: LucideIcon;
  tom: string;
  label: string;
  valor: ReactNode;
  apoio: string;
  dica: string;
}) {
  return (
    <div
      title={dica}
      className={cn(
        'flex min-h-[60px] min-w-0 items-center gap-2 rounded-xl px-2 py-1.5',
        CARD_INTERACAO_ESTATICO,
        SUPERFICIE_INTERNA
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border',
          CARD_INTERACAO_ICONE_ESTATICO,
          tom
        )}
      >
        <Icone className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[9.5px] leading-tight text-muted-foreground" title={label}>
          {label}
        </p>
        <p className="mt-0.5 font-display text-[18px] font-semibold leading-none tabular-nums text-foreground">
          {valor}
        </p>
        <p className="mt-0.5 truncate text-[8px] leading-tight text-muted-foreground/80" title={apoio}>
          {apoio}
        </p>
      </div>
    </div>
  );
}

/**
 * PAINEL INTERNO da linha — o detalhamento da vaga sem abrir outra janela:
 * identificação completa, os números que não cabem na tabela (candidaturas, em
 * processo, contratações, conversão e tempo médio) e a foto das etapas
 * CONFIGURADAS, cada uma com o token do pipeline (`ETAPAS`).
 *
 * Tempo médio sem amostra aparece como "Não disponível" — nenhum número é
 * estimado para preencher o espaço.
 *
 * ANIMAÇÃO: este componente não decide nada. Ele só ESPALHA as variantes de
 * `animacaoDetalheVaga.ts` (fade da superfície e cascata das cinco etapas) e
 * recebe os rótulos `aberto`/`recolhido` do contêiner que está dobrando — o
 * mesmo objeto serve para abrir e para recolher, então nunca existem dois
 * ritmos na mesma linha.
 */
function PainelDetalheVaga({ vaga, variantes }: { vaga: DetalheVaga; variantes: VariantesDetalheVaga }) {
  const tempo = vaga.tempoMedioDias;

  return (
    <motion.div variants={variantes.conteudo} className={cn('rounded-xl px-3.5 py-3', SUPERFICIE_INTERNA)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="font-display text-[13px] font-semibold leading-tight text-foreground">{vaga.titulo}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted-foreground">
            <span className="inline-flex min-w-0 items-center gap-1">
              <Building2 className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{vaga.departamento ?? 'Departamento não informado'}</span>
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[9.5px] font-medium leading-none',
                TOM_SITUACAO[vaga.situacao]
              )}
            >
              {vaga.statusRotulo}
            </span>
          </p>
        </div>

        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10.5px]">
          <div className="flex items-center gap-1.5">
            <dt className="text-muted-foreground">Candidaturas</dt>
            <dd className="font-semibold tabular-nums text-foreground">{vaga.candidatos}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="text-muted-foreground">Em processo</dt>
            <dd className="font-semibold tabular-nums text-foreground">{vaga.emProcesso}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="text-muted-foreground">Contratações</dt>
            <dd className="font-semibold tabular-nums text-foreground">{vaga.contratados}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <dt className="text-muted-foreground">Conversão</dt>
            <dd
              className="font-semibold tabular-nums"
              style={{ color: `hsl(var(--${tokenDaConversao(vaga.conversao)}))` }}
            >
              {formatarPercentual(vaga.conversao, 1)}
            </dd>
          </div>
          <div
            className="flex items-center gap-1.5"
            title="Média de dias entre a entrada na base e a última movimentação de cada candidatura."
          >
            <Timer className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
            <dt className="text-muted-foreground">Tempo médio</dt>
            <dd className="font-semibold tabular-nums text-foreground">
              {tempo === null ? 'Não disponível' : `${tempo} ${tempo === 1 ? 'dia' : 'dias'}`}
            </dd>
          </div>
        </dl>
      </div>

      <motion.ol
        variants={variantes.etapas}
        className="mt-2.5 grid grid-cols-2 gap-1.5 sm:grid-cols-5"
        aria-label={`Candidatos por etapa — ${vaga.titulo}`}
      >
        {vaga.porEtapa.map((etapa) => {
          const token = etapaPorId(etapa.id).token;
          return (
            <motion.li
              key={etapa.id}
              variants={variantes.etapa}
              className="rounded-lg border border-border/40 bg-[hsl(var(--foreground)/0.025)] px-2 py-1.5"
            >
              <span
                aria-hidden
                className="block h-0.5 rounded-full"
                style={{ background: `hsl(var(--${token}) / 0.6)` }}
              />
              <p className="mt-1 truncate text-[9.5px] leading-tight text-muted-foreground" title={etapa.label}>
                {etapa.label}
              </p>
              <p
                className="mt-0.5 font-display text-[15px] font-semibold leading-none tabular-nums"
                style={etapa.total > 0 ? { color: `hsl(var(--${token}))` } : undefined}
              >
                {etapa.total}
              </p>
            </motion.li>
          );
        })}
      </motion.ol>
    </motion.div>
  );
}

export interface DesempenhoVagasDialogProps {
  /** Controla a janela. Os dados continuam montados durante a saída animada. */
  open: boolean;
  /** Lista completa do recorte (`construirDetalheVagas`). */
  detalhes: DetalheVaga[];
  onClose: () => void;
  /**
   * Hook de foco ao fechar (Radix `onCloseAutoFocus`). O card usa para devolver
   * o foco ao botão "Ver todas", que não é um `Dialog.Trigger` do Radix.
   */
  onCloseAutoFocus?: (event: Event) => void;
}

export function DesempenhoVagasDialog({ open, detalhes, onClose, onCloseAutoFocus }: DesempenhoVagasDialogProps) {
  const reduzirMovimento = useMovimentoReduzido();

  const [busca, setBusca] = useState(FILTROS_DESEMPENHO_PADRAO.busca);
  const [situacao, setSituacao] = useState<FiltroSituacao>(FILTROS_DESEMPENHO_PADRAO.situacao);
  const [ordenacao, setOrdenacao] = useState<OrdenacaoDesempenho>(FILTROS_DESEMPENHO_PADRAO.ordenacao);
  const [vagaAberta, setVagaAberta] = useState<string | null>(null);
  const [animarAposAbertura, setAnimarAposAbertura] = useState(false);

  const filtros = useMemo(() => ({ busca, situacao, ordenacao }), [busca, situacao, ordenacao]);
  const visiveis = useMemo(() => filtrarDetalheVagas(detalhes, filtros), [detalhes, filtros]);
  const resumo = useMemo(() => resumirDesempenhoVagas(detalhes), [detalhes]);
  const abertas = useMemo(() => detalhes.filter((vaga) => vaga.situacao === 'aberta').length, [detalhes]);
  const filtrando = temFiltroDesempenho(filtros);

  /** Variantes da dobra do detalhe (fonte única: `animacaoDetalheVaga.ts`). */
  const variantesDetalhe = useMemo(() => variantesDetalheVaga(reduzirMovimento), [reduzirMovimento]);

  /**
   * BARRAS — a coreografia do card "Amplitude de Liderança" roda UMA vez, na
   * primeira abertura da janela, e só depois que a caixa terminou de abrir
   * (`CASCADE_SHELL_OPEN_DURATION`, já que a moldura não expõe
   * `onAnimationComplete` — é o equivalente ao `useEntradaCardConcluida` do
   * card). O `setState` mora no callback do temporizador, não no corpo do
   * efeito, para não disparar render em cascata. Com movimento reduzido o
   * atraso é zero e as barras nascem no comprimento final.
   */
  useEffect(() => {
    if (!open) return;
    const atraso = reduzirMovimento ? 0 : Math.round(CASCADE_SHELL_OPEN_DURATION * 1000);
    const id = window.setTimeout(() => setAnimarAposAbertura(true), atraso);
    return () => window.clearTimeout(id);
  }, [open, reduzirMovimento]);

  const animarBarras = reduzirMovimento || animarAposAbertura;

  const limparFiltros = () => {
    setBusca(FILTROS_DESEMPENHO_PADRAO.busca);
    setSituacao(FILTROS_DESEMPENHO_PADRAO.situacao);
    setOrdenacao(FILTROS_DESEMPENHO_PADRAO.ordenacao);
  };

  /** O olho da última coluna abre/fecha o painel da PRÓPRIA linha. */
  const alternarDetalhe = (id: string) => setVagaAberta((atual) => (atual === id ? null : id));

  return (
    <CascadeDialogFrame
      open={open}
      onOpenChange={(aberto) => {
        if (!aberto) onClose();
      }}
      blocks={BLOCOS_CASCATA}
      onCloseAutoFocus={onCloseAutoFocus}
      /* Largura máxima de 1000px e altura de 85dvh (a régua pedida). O casco é
         `flex-col`: cabeçalho, KPIs, filtros e rodapé são `shrink-0` e só a
         faixa da tabela rola. `bg-card` é o navy dos containers do sistema e a
         borda fica discreta (`border-border/40`), sem brilho nem sombra colorida. */
      className="flex max-h-[85dvh] w-[calc(100vw-1.25rem)] max-w-[1000px] flex-col rounded-2xl border-border/40 bg-card shadow-2xl"
      contentClassName="flex min-h-0 flex-col"
    >
      <div data-desempenho-vagas className="flex min-h-0 flex-col">
        {/* 1 · CABEÇALHO — título e contexto à esquerda; o X da moldura fica à
            direita (daí o `pr-12`/`pr-14`, para o texto nunca correr por baixo). */}
        <motion.div
          variants={cascadeItemVariants}
          data-modal-faixa="cabecalho"
          className="flex shrink-0 items-start gap-2.5 border-b border-border/40 px-5 pb-3.5 pr-12 pt-4 sm:px-6 sm:pr-14"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] border border-success/25 bg-success/10 text-success">
            <Briefcase className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <DialogPrimitive.Title className="truncate font-display text-[15px] font-semibold leading-tight tracking-tight text-foreground">
              Desempenho por vaga
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-1 text-[11.5px] leading-snug text-muted-foreground">
              Analise o volume de candidaturas, as conversões e os resultados de cada vaga.
            </DialogPrimitive.Description>
          </div>
        </motion.div>

        {/* 2 · INDICADORES GERAIS — quatro KPIs compactos sobre a base INTEIRA
            do recorte (o filtro da tabela não mexe neles). Duas colunas em telas
            menores, quatro a partir de `xl`. Sem gráfico decorativo. */}
        <motion.div
          variants={cascadeItemVariants}
          data-modal-faixa="indicadores"
          className="shrink-0 border-b border-border/30 px-5 py-3 sm:px-6"
        >
          <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
            <KpiDesempenho
              icone={Briefcase}
              tom="border-success/25 bg-success/10 text-success"
              label="Total de vagas"
              valor={resumo.vagas}
              apoio={`${abertas} aberta${abertas === 1 ? '' : 's'} no recorte`}
              dica="Vagas consideradas no recorte atual da Analytics."
            />
            <KpiDesempenho
              icone={Users}
              tom="border-info/25 bg-info/10 text-info"
              label="Total de candidatos"
              valor={resumo.candidatos}
              apoio={`${resumo.emProcesso} ainda em processo`}
              dica="Candidaturas somadas das vagas consideradas — a mesma contagem que cada linha do card exibe."
            />
            <KpiDesempenho
              icone={UserCheck}
              tom="border-[hsl(var(--chart-4)/0.28)] bg-[hsl(var(--chart-4)/0.12)] text-[hsl(var(--chart-4))]"
              label="Total de contratações"
              valor={resumo.contratacoes}
              apoio={resumo.contratacoes === 1 ? 'processo concluído' : 'processos concluídos'}
              dica="Candidaturas na etapa Contratado (ou com status de contratação)."
            />
            <KpiDesempenho
              icone={Filter}
              tom="border-warning/25 bg-warning/10 text-warning"
              label="Taxa de conversão geral"
              valor={formatarPercentual(resumo.conversao, 0)}
              apoio={`${resumo.contratacoes} de ${resumo.candidatos} candidaturas`}
              dica="Contratações concluídas divididas pelo total de candidaturas das vagas consideradas."
            />
          </div>
        </motion.div>

        {/* 3 · FILTROS — busca, status e ordenação na mesma régua de 32px.
            "Limpar filtros" fica neutro em repouso e assume o verde-lime do
            tema (`--primary`) quando QUALQUER filtro está ativo. */}
        <motion.div
          variants={cascadeItemVariants}
          data-modal-faixa="filtros"
          className="shrink-0 border-b border-border/30 px-5 py-2.5 sm:px-6"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Buscar por vaga ou departamento..."
                aria-label="Buscar vaga"
                className="h-8 rounded-lg border-border/50 bg-[hsl(var(--foreground)/0.045)] pl-9 pr-3 text-[11.5px]"
              />
            </div>

            <Select value={situacao} onValueChange={(valor) => setSituacao(valor as FiltroSituacao)}>
              <SelectTrigger
                className={CAMPO_FILTRO}
                aria-label="Filtrar por status da vaga"
                title={`Status · ${rotuloSituacaoFiltro(situacao)}`}
              >
                {/* `div` (e não `span`) como grupo do rótulo: o `[&>span]:line-clamp-1`
                    do trigger troca o `display` de span filho direto e desmonta o flex. */}
                <div className="flex min-w-0 items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">
                    <SelectValue />
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent align="end">
                {SITUACOES_DESEMPENHO.map((opcao) => (
                  <SelectItem key={opcao.value} value={opcao.value} className="text-[12.5px]">
                    {opcao.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={ordenacao} onValueChange={(valor) => setOrdenacao(valor as OrdenacaoDesempenho)}>
              <SelectTrigger
                className={CAMPO_FILTRO}
                aria-label="Ordenar vagas"
                title={`Ordenar por · ${rotuloOrdenacao(ordenacao)}`}
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="truncate">
                    <SelectValue />
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent align="end">
                {ORDENACOES_DESEMPENHO.map((opcao) => (
                  <SelectItem key={opcao.value} value={opcao.value} className="text-[12.5px]">
                    {opcao.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={limparFiltros}
              disabled={!filtrando}
              // Espelho do estado no DOM (não pinta nada): permite conferir no
              // DevTools qual ramo da condição foi renderizado.
              data-filtro-ativo={filtrando ? 'true' : 'false'}
              className={cn(
                'h-8 shrink-0 gap-1.5 rounded-lg border px-2.5 text-[11px]',
                filtrando
                  ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground'
                  : 'border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground disabled:border-border/30 disabled:bg-muted/20 disabled:text-muted-foreground/70'
              )}
            >
              <FilterX className="h-3.5 w-3.5" aria-hidden />
              Limpar filtros
            </Button>
          </div>
        </motion.div>

        {/* 4 · TABELA — única faixa rolável: rola na vertical dentro do modal e
            na horizontal quando a janela fica estreita (`overflow-auto` +
            `min-w` na tabela), sem cortar texto nem sobrepor colunas. O
            cabeçalho é `sticky` para as sete colunas seguirem legíveis. */}
        <motion.div
          variants={cascadeItemVariants}
          data-modal-faixa="tabela"
          className="min-h-0 flex-1 overflow-auto px-5 py-3 sm:px-6"
        >
          {visiveis.length === 0 ? (
            <div
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-xl px-4 py-10 text-center',
                SUPERFICIE_SUAVE
              )}
            >
              <Search className="h-5 w-5 text-muted-foreground/40" aria-hidden />
              <p className="text-[12.5px] font-medium text-foreground/80">
                {detalhes.length === 0 ? 'Nenhuma vaga no recorte' : 'Nenhuma vaga encontrada'}
              </p>
              <p className="max-w-[280px] text-[11px] leading-relaxed text-muted-foreground">
                {detalhes.length === 0
                  ? 'Publique uma vaga para acompanhar o desempenho por processo.'
                  : 'Ajuste a busca, o status ou a ordenação para ver outras vagas.'}
              </p>
              {filtrando && detalhes.length > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={limparFiltros}
                  className="mt-1 h-8 rounded-lg text-[11px]"
                >
                  Limpar filtros
                </Button>
              ) : null}
            </div>
          ) : (
            <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
              <caption className="sr-only">Desempenho das vagas do recorte atual</caption>
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="text-[9.5px] uppercase tracking-widest text-muted-foreground">
                  <th
                    scope="col"
                    className="whitespace-nowrap border-b border-border/40 px-2 py-2 text-left font-semibold"
                  >
                    Vaga
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap border-b border-border/40 px-2 py-2 text-left font-semibold"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap border-b border-border/40 px-2 py-2 text-right font-semibold"
                  >
                    Candidatos
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap border-b border-border/40 px-2 py-2 text-right font-semibold"
                  >
                    Em processo
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap border-b border-border/40 px-2 py-2 text-right font-semibold"
                  >
                    Contratados
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap border-b border-border/40 px-2 py-2 text-left font-semibold"
                  >
                    Conversão
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap border-b border-border/40 px-2 py-2 text-right font-semibold"
                  >
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((vaga, indice) => {
                  const aberto = vagaAberta === vaga.id;
                  const token = tokenDaConversao(vaga.conversao);
                  return (
                    <Fragment key={vaga.id}>
                      <tr className="border-b border-border/25 transition-colors duration-200 hover:bg-[hsl(var(--background)/0.45)]">
                        {/* 1 · VAGA — nome + departamento (o texto completo vive
                            no `title`; nenhuma linha é cortada em duas colunas). */}
                        <td className="px-2 py-2.5 align-middle">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              aria-hidden
                              title={vaga.statusRotulo}
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: PONTO_SITUACAO[vaga.situacao] }}
                            />
                            <div className="min-w-0">
                              <p
                                className="truncate text-[12px] font-medium leading-tight text-foreground/90"
                                title={vaga.titulo}
                              >
                                {vaga.titulo}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1 text-[10px] leading-tight text-muted-foreground">
                                <Building2 className="h-3 w-3 shrink-0" aria-hidden />
                                <span className="truncate" title={vaga.departamento ?? 'Departamento não informado'}>
                                  {vaga.departamento ?? 'Departamento não informado'}
                                </span>
                              </p>
                            </div>
                          </div>
                        </td>
                        {/* 2 · STATUS — badge semitransparente. */}
                        <td className="px-2 py-2.5 align-middle">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none',
                              TOM_SITUACAO[vaga.situacao]
                            )}
                          >
                            {vaga.statusRotulo}
                          </span>
                        </td>
                        {/* 3 a 5 · CONTAGENS — colunas numéricas alinhadas à direita. */}
                        <td className={CELULA_NUMERO}>{vaga.candidatos}</td>
                        <td className={cn(CELULA_NUMERO, 'text-muted-foreground')}>{vaga.emProcesso}</td>
                        <td className={CELULA_NUMERO}>{vaga.contratados}</td>
                        {/* 6 · CONVERSÃO — barra (mesmo degradê e mesma coreografia
                            do card) + percentual com a cor semântica. O piso de 6%
                            mantém visível a barra de quem converteu pouco. */}
                        <td className="px-2 py-2.5 align-middle">
                          <div className="flex items-center gap-2">
                            <span aria-hidden className="block w-[88px] shrink-0">
                              <span className={TRILHA_BARRA_VAGA}>
                                <PreenchimentoBarraAnalytics
                                  percentual={vaga.conversao > 0 ? Math.max(6, Math.min(100, vaga.conversao)) : 0}
                                  indice={indice}
                                  gradiente={GRADIENTE_VAGA}
                                  animar={animarBarras}
                                  reduzirMovimento={reduzirMovimento}
                                />
                              </span>
                            </span>
                            <span
                              className="w-[42px] shrink-0 text-right text-[12px] font-semibold tabular-nums"
                              style={{ color: `hsl(var(--${token}))` }}
                            >
                              {formatarPercentual(vaga.conversao, 0)}
                            </span>
                          </div>
                        </td>
                        {/* 7 · AÇÕES — abre o painel da PRÓPRIA linha. */}
                        <td className="px-2 py-2.5 text-right align-middle">
                          <button
                            type="button"
                            onClick={() => alternarDetalhe(vaga.id)}
                            aria-expanded={aberto}
                            aria-controls={`detalhe-vaga-${vaga.id}`}
                            aria-label={`${aberto ? 'Ocultar' : 'Ver'} detalhes de ${vaga.titulo}`}
                            title={aberto ? 'Ocultar detalhes' : 'Ver detalhes'}
                            className={cn(
                              'inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 hover:bg-primary/10 hover:text-primary focus:outline-hidden focus:ring-2 focus:ring-ring/50',
                              aberto && 'bg-primary/10 text-primary'
                            )}
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </td>
                      </tr>
                      {/*
                        DOBRA — a linha existe SEMPRE (vazia quando recolhida):
                        é ela que permite ao `AnimatePresence` terminar a saída
                        antes de o painel sair do DOM. Quem anima é o `div`
                        interno (`height: 0 ↔ auto` com `overflow: hidden`), não
                        o `<tr>`: assim a célula encolhe, a linha acompanha e as
                        linhas de baixo deslizam — sem mexer em coluna, largura
                        ou no `<table>`. O `pb-3` que separa o painel da próxima
                        vaga vive DENTRO do recorte, então ele também encolhe
                        junto (nenhum salto de 12px no primeiro/último quadro).
                        Recolhida, a linha sai da árvore de acessibilidade
                        (`aria-hidden`), para o leitor de tela não anunciar uma
                        linha vazia por vaga.
                      */}
                      <tr id={`detalhe-vaga-${vaga.id}`} aria-hidden={aberto ? undefined : true}>
                        <td colSpan={7} className="px-2 pt-0 align-top">
                          <AnimatePresence initial={false}>
                            {aberto && (
                              <motion.div
                                key={vaga.id}
                                variants={variantesDetalhe.dobra}
                                initial="recolhido"
                                animate="aberto"
                                exit="recolhido"
                                data-dobra="detalhe-vaga"
                                className="overflow-hidden"
                              >
                                <div className="pb-3">
                                  <PainelDetalheVaga vaga={vaga} variantes={variantesDetalhe} />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </motion.div>

        {/* 5 · RODAPÉ — fixo. Contagem do que está na tela e o fechamento; sem
            `mt-auto` (ele vem logo depois do conteúdo, como no resto do sistema). */}
        <motion.div
          variants={cascadeItemVariants}
          data-modal-faixa="rodape"
          className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border/40 bg-muted/20 px-5 py-2.5 sm:px-6"
        >
          <p className="text-[10.5px] tabular-nums text-muted-foreground" aria-live="polite">
            {visiveis.length === detalhes.length
              ? `${detalhes.length} ${detalhes.length === 1 ? 'vaga' : 'vagas'} no recorte`
              : `${visiveis.length} de ${detalhes.length} vagas`}
          </p>
          <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 font-medium" onClick={onClose}>
            Fechar
          </Button>
        </motion.div>
      </div>
    </CascadeDialogFrame>
  );
}
