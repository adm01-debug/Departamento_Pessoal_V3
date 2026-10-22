/**
 * ============================================================================
 * ABA PAGAMENTOS — TABELA DE PAGAMENTOS (IMAGEM 4).
 *
 * Colunas: seleção · Colaborador · Campanha · Valor Calculado · Valor Aprovado ·
 * Valor Pago · Status/Etapa · Ações, com rodapé de contagem + paginação.
 *
 * REGRAS
 *  · Só apresentação: quem filtra, ordena e pagina é `PagamentosTab` (via
 *    `pagamentosComum`); as escritas (avançar cadeia, rejeitar, conciliar,
 *    reiniciar) pertencem ao dono da tela — aqui só se emite o pedido.
 *  · A LINHA é a unidade da cascata de entrada (nunca a célula), preservando o
 *    alinhamento das colunas — mesma régua da tabela de Campanhas.
 *  · Ação principal = a AÇÃO REAL daquele status (`acaoPrincipalPagamento`): o
 *    rótulo nunca é decorativo. O menu de três pontos concentra as demais ações
 *    que já existiam no quadro de aprovação (rejeitar, conciliar manual,
 *    conciliar automático, reiniciar fluxo) — nenhuma foi removida.
 *  · Seleção é FUNCIONAL: as caixas marcam pagamentos reais e habilitam a barra
 *    de "Aprovar selecionados", que avança um passo cada item elegível.
 * ============================================================================
 */
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  Eye,
  MoreVertical,
  RefreshCw,
  Search,
  Trophy,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppPagination } from '@/components/ui/app-pagination';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/ui/user-avatar';
import { entradaCard, linhaEntradaHubVariants } from './premiacoesEntrada';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/format';
import { indiceEntrada, tempoRelativo, type PagamentoHub } from './premiacoesComum';
import {
  acaoPrincipalPagamento,
  divergenciaDoPagamento,
  etapaDoPagamento,
  podeConciliarPagamento,
  podeRejeitarPagamento,
  proximoStatusPagamento,
  rotuloStatusPagamento,
  ultimoComentario,
  valorDoPagamento,
  type OrdenacaoPagamento,
  type TipoAcaoPagamento,
} from './pagamentosComum';

/**
 * COR POR STATUS REAL (não por etapa do fluxo). Cada estado carrega a cor do que
 * SIGNIFICA na cadeia de aprovação, sempre com fundo translúcido + texto na cor
 * cheia do token (nada de superfície neon):
 *
 *   · Aguardando gestor / Em revisão ......... âmbar  (depende de alguém)
 *   · Aguardando RH .......................... azul   (`info`)
 *   · Aguardando financeiro .................. azul-ciano (`level`)
 *   · Em conciliação ......................... roxo   (`xp`)
 *   · Pago ................................... verde  (`success`)
 *   · Rejeitado / Divergência em revisão ..... vermelho na variante VÍVIDA
 *                                              (`destructive-vivid`, legível no navy)
 */
const TOM_STATUS: Record<string, string> = {
  calculado: 'bg-warning/15 text-warning',
  revisando: 'bg-warning/15 text-warning',
  aprovado_gestor: 'bg-info/15 text-info',
  aprovado_rh: 'bg-level/15 text-level',
  aprovado_financeiro: 'bg-xp/15 text-xp',
  pago: 'bg-success/15 text-success',
  rejeitado: 'bg-destructive-vivid/15 text-destructive-vivid',
  divergente_em_revisao: 'bg-destructive-vivid/15 text-destructive-vivid',
  cancelado: 'bg-muted/60 text-muted-foreground',
};
const TOM_STATUS_PADRAO = 'bg-muted/60 text-muted-foreground';

/** Bolinha do status — sempre a MESMA cor do selo (o texto acompanha a cor). */
const PONTO_STATUS: Record<string, string> = {
  calculado: 'bg-warning',
  revisando: 'bg-warning',
  aprovado_gestor: 'bg-info',
  aprovado_rh: 'bg-level',
  aprovado_financeiro: 'bg-xp',
  pago: 'bg-success',
  rejeitado: 'bg-destructive-vivid',
  divergente_em_revisao: 'bg-destructive-vivid',
  cancelado: 'bg-muted-foreground',
};
const PONTO_STATUS_PADRAO = 'bg-muted-foreground';

/**
 * Ícone da campanha — paleta controlada e ESTÁVEL (tom derivado do NOME, mesma
 * ideia do avatar): o dado da campanha não traz cor própria, então campanhas
 * diferentes deixam de parecer o mesmo selo verde, sem nada aleatório entre
 * renderizações.
 */
const TONS_CAMPANHA = [
  'bg-primary/15 text-primary',
  'bg-info/15 text-info',
  'bg-success/15 text-success',
  'bg-xp/15 text-xp',
  'bg-warning/15 text-warning',
  'bg-level/15 text-level',
] as const;

function tomDaCampanha(nome: string): string {
  const hash = nome.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return TONS_CAMPANHA[hash % TONS_CAMPANHA.length];
}

/**
 * Botões de ação em variante SOFT (fundo translúcido + texto na cor do token,
 * sem virar bloco sólido). O TOM vem do significado da ação e do estado real do
 * pagamento — nunca do rótulo:
 *   · Revisar (calculado) ........ âmbar
 *   · Aprovar (avançar) .......... verde
 *   · Conciliar .................. roxo
 *   · Resolver divergência ....... âmbar (atenção)
 *   · Ver detalhes ............... azul informativo
 *   · Reiniciar fluxo ............ âmbar
 */
const TOM_BOTAO_REVISAR = 'border-warning/40 bg-warning/10 text-warning hover:bg-warning/20 hover:text-warning';
const TOM_BOTAO_APROVAR = 'border-success/40 bg-success/10 text-success hover:bg-success/20 hover:text-success';
const TOM_BOTAO_CONCILIAR = 'border-xp/40 bg-xp/10 text-xp hover:bg-xp/20 hover:text-xp';
const TOM_BOTAO_DETALHES = 'border-info/40 bg-info/10 text-info hover:bg-info/20 hover:text-info';

function tomDoBotao(status: string, tipo: TipoAcaoPagamento): string {
  if (tipo === 'reiniciar') return TOM_BOTAO_REVISAR;
  if (tipo === 'conciliar') {
    return status === 'divergente_em_revisao' ? TOM_BOTAO_REVISAR : TOM_BOTAO_CONCILIAR;
  }
  if (tipo === 'detalhes') return TOM_BOTAO_DETALHES;
  return status === 'calculado' ? TOM_BOTAO_REVISAR : TOM_BOTAO_APROVAR;
}

/** Colunas da tabela (nome + se ordena + se o título pode quebrar em 2 linhas).
 *  As financeiras quebram: o título de 11px é mais largo que o valor, e a coluna
 *  fica do tamanho do VALOR (que nunca pode truncar) — a quebra mantém a mesma
 *  altura de cabeçalho (2 linhas de 15px cabem nos 48px da faixa). */
const COLUNAS = [
  { id: 'colaborador', label: 'Colaborador', ordenavel: true, classe: '', quebra: false },
  { id: 'campanha', label: 'Campanha', ordenavel: true, classe: '', quebra: false },
  { id: 'valor_calculado', label: 'Valor Calculado', ordenavel: false, classe: '', quebra: true },
  { id: 'valor_aprovado', label: 'Valor Aprovado', ordenavel: true, classe: '', quebra: true },
  { id: 'valor_pago', label: 'Valor Pago', ordenavel: true, classe: '', quebra: true },
  { id: 'status', label: 'Status / Etapa', ordenavel: false, classe: '', quebra: false },
  { id: 'acoes', label: 'Ações', ordenavel: false, classe: 'text-left', quebra: false },
] as const;

/**
 * Padding HORIZONTAL das células (corpo e cabeçalho usam o MESMO valor, senão o
 * texto da linha não fica sob o título da coluna). Vertical = `PAD_CELULA`.
 */
const PAD_CELULA_X = 'px-2';

/**
 * Template ÚNICO das colunas — usado pelo CABEÇALHO e por CADA LINHA (mesmo
 * grid). As proporções de partida (3/17/19/11/11/10/17/12) valem quando há
 * largura sobrando; os mínimos vêm do conteúdo REAL e impedem compressão:
 *   Seleção 34 · Colaborador 146 · Campanha 160 · Calculado 97 ·
 *   Aprovado 97 · Pago 96 · Status/Etapa 140 · Ações 123.
 * A soma dos mínimos (893px) é o piso do grid: abaixo disso ele rola POR DENTRO
 * do card, sem espremer nomes, valores ou o conjunto de botões.
 */
const GRID_COLUNAS =
  'minmax(34px,3fr) minmax(146px,17fr) minmax(160px,19fr) minmax(97px,11fr) minmax(97px,11fr) minmax(96px,10fr) minmax(140px,17fr) minmax(123px,12fr)';

/** Piso de largura do grid: abaixo disso ele rola por dentro do próprio card. */
const LARGURA_MINIMA_GRADE = 'min-w-[893px]';

/**
 * Opções do seletor "Linhas por página". 6 é o PADRÃO da aba (`POR_PAGINA`, em
 * `PagamentosTab`) e precisa continuar na lista depois que o usuário escolher
 * outro tamanho — sem esta lista o 6 sumiria do seletor (o padrão do
 * `AppPagination` é [10, 25, 50, 100] + o valor corrente).
 */
const OPCOES_POR_PAGINA = [6, 10, 25, 50, 100] as const;

/**
 * Padding VERTICAL das células do corpo. Este é o ponto ÚNICO de calibragem da
 * densidade: `py-2` (8px) é o piso pedido na referência (8–10px) e mantém a
 * linha na faixa de 70–95px com os textos COMPLETOS (nomes/campanhas/descrições/
 * comentários quebram em 2–3 linhas, nunca em reticências). 1px por lado =
 * 6px na altura total da paginação.
 */
const PAD_CELULA = 'py-2';

interface PagamentosTabelaProps {
  linhas: PagamentoHub[];
  total: number;
  pagina: number;
  porPagina: number;
  onPaginaChange: (pagina: number) => void;
  onPageSizeChange?: (porPagina: number) => void;
  ordenacaoAtual: OrdenacaoPagamento;
  selecionados: ReadonlySet<string>;
  onAlternarSelecao: (id: string) => void;
  onAlternarTodos: (marcar: boolean) => void;
  /** Ação principal da linha (avançar / conciliar / detalhes / reiniciar). */
  onAcaoPrincipal: (pagamento: PagamentoHub, tipo: TipoAcaoPagamento) => void;
  /** Ações secundárias do menu de contexto. */
  onAcao: (pagamento: PagamentoHub, tipo: TipoAcaoPagamento | 'rejeitar' | 'auto-conciliar') => void;
  mensagemVazia: string;
}

export function PagamentosTabela({
  linhas,
  total,
  pagina,
  porPagina,
  onPaginaChange,
  onPageSizeChange,
  ordenacaoAtual,
  selecionados,
  onAlternarSelecao,
  onAlternarTodos,
  onAcaoPrincipal,
  onAcao,
  mensagemVazia,
}: PagamentosTabelaProps) {
  const todosMarcados = linhas.length > 0 && linhas.every((l) => selecionados.has(l.id));

  /**
   * Identidade da LISTA visível (página + ordenação + registros). É a `key` do
   * contêiner de linhas (`rowgroup`): quando o conjunto/ordem muda — filtro,
   * ordenação, paginação — o corpo remonta e a cascata de entrada toca de novo,
   * exatamente como na lista de Processos de Desligamentos. Hover, clique e
   * re-render NÃO mudam esta chave, então a animação não reinicia à toa.
   */
  const chaveCascata = [pagina, ordenacaoAtual, ...linhas.map((l) => l.id)].join('|');

  return (
    <motion.section
      {...entradaCard(indiceEntrada('tabela', 0))}
      className="flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-border/50 bg-card/60"
    >
      <div className="overflow-x-auto">
        {/* Grid compartilhado: MESMO `gridTemplateColumns` no cabeçalho e nas
            linhas; abaixo do piso mínimo ele rola por dentro do card, sem
            empurrar a página para a horizontal. */}
        <div role="table" aria-label="Pagamentos" className={cn('w-full text-left', LARGURA_MINIMA_GRADE)}>
          <div role="rowgroup">
            <div
              role="row"
              className="grid items-center border-b border-border/40 bg-muted/20"
              style={{ gridTemplateColumns: GRID_COLUNAS }}
            >
              <div role="columnheader" className={cn('flex h-[38px] items-center', PAD_CELULA_X)}>
                <Checkbox
                  checked={todosMarcados}
                  onCheckedChange={(v) => onAlternarTodos(v === true)}
                  aria-label="Selecionar todos os pagamentos da página"
                  className="border-border/60"
                />
              </div>
              {COLUNAS.map((coluna) => (
                <div
                  key={coluna.id}
                  role="columnheader"
                  className={cn(
                    'flex h-[38px] items-center py-1 text-left text-[11px] font-medium uppercase leading-[14px] text-muted-foreground',
                    PAD_CELULA_X,
                    coluna.quebra ? 'whitespace-normal' : 'whitespace-nowrap',
                    coluna.classe
                  )}
                >
                  <span className="inline-flex min-w-0 items-center gap-0.5">
                    {coluna.label}
                    {coluna.ordenavel && (
                      <ArrowUpDown className="h-2.5 w-2.5 shrink-0 text-muted-foreground/40" aria-hidden />
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {/* Corpo da lista em cascata: `AnimatePresence` local (sem props) cria o
              contexto de presença que o `initial={false}` do `PageTransition`
              bloqueia, e a `key` remonta o corpo quando a lista troca de
              identidade — mesmo mecanismo de `CascadeTableBody`. */}
          <AnimatePresence>
            <div key={chaveCascata} role="rowgroup" className="divide-y divide-border/25">
              {linhas.map((linha, indiceLinha) => (
                <LinhaPagamento
                  key={linha.id}
                  linha={linha}
                  indice={indiceLinha}
                  marcada={selecionados.has(linha.id)}
                  onAlternarSelecao={onAlternarSelecao}
                  onAcaoPrincipal={onAcaoPrincipal}
                  onAcao={onAcao}
                />
              ))}

              {linhas.length === 0 && (
                <motion.div
                  role="row"
                  custom={0}
                  variants={linhaEntradaHubVariants}
                  initial="hidden"
                  animate="visible"
                  style={{ gridTemplateColumns: GRID_COLUNAS }}
                  className="grid origin-center"
                >
                  <div role="cell" style={{ gridColumn: '1 / -1' }} className="px-4 py-12 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-1.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                        <Trophy className="h-4 w-4" />
                      </span>
                      <p className="text-xs font-medium">{mensagemVazia}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </AnimatePresence>
        </div>
      </div>

      {/* Rodapé: contagem à esquerda, paginação à direita (padrão do sistema). */}
      <motion.footer
        {...entradaCard(linhas.length)}
        className="flex min-h-[44px] items-center border-t border-border/40 px-4"
      >
        <AppPagination
          className="w-full"
          page={pagina}
          total={total}
          pageSize={porPagina}
          pageSizeOptions={OPCOES_POR_PAGINA}
          onPageChange={onPaginaChange}
          onPageSizeChange={onPageSizeChange}
          label={`Mostrando ${linhas.length} de ${total} ${total === 1 ? 'pagamento' : 'pagamentos'}`}
        />
      </motion.footer>
    </motion.section>
  );
}

interface LinhaPagamentoProps {
  linha: PagamentoHub;
  indice: number;
  marcada: boolean;
  onAlternarSelecao: (id: string) => void;
  onAcaoPrincipal: (pagamento: PagamentoHub, tipo: TipoAcaoPagamento) => void;
  onAcao: (pagamento: PagamentoHub, tipo: TipoAcaoPagamento | 'rejeitar' | 'auto-conciliar') => void;
}

/** Ícone da ação principal (o mesmo símbolo do quadro de aprovação anterior). */
const ICONE_ACAO: Record<TipoAcaoPagamento, typeof CheckCircle2> = {
  avancar: CheckCircle2,
  conciliar: Search,
  detalhes: Eye,
  reiniciar: RefreshCw,
};

function LinhaPagamento({ linha, indice, marcada, onAlternarSelecao, onAcaoPrincipal, onAcao }: LinhaPagamentoProps) {
  const badge = TOM_STATUS[linha.status] ?? TOM_STATUS_PADRAO;
  const ponto = PONTO_STATUS[linha.status] ?? PONTO_STATUS_PADRAO;
  const tomCampanha = tomDaCampanha(linha.campanha?.nome ?? '—');
  const acao = acaoPrincipalPagamento(linha.status);
  const IconeAcao = ICONE_ACAO[acao.tipo];
  const divergencia = divergenciaDoPagamento(linha);
  const comentario = ultimoComentario(linha);
  const quando = tempoRelativo(linha.updated_at);
  const podeAvancar = !!proximoStatusPagamento(linha.status);
  const tomAcao = tomDoBotao(linha.status, acao.tipo);

  const valor = (v: number | string | null | undefined) => (v ? formatCurrency(Number(v)) : '—');

  return (
    /* Linha da cascata compartilhada (`linhaEntradaHubVariants`): MESMO movimento
       da lista de Processos de Desligamentos — opacity + y(10px) + scaleX(0.94→1)
       abrindo DO CENTRO, ease [0.22, 1, 0.36, 1]. A cadência é a do Hub
       (0,8s por linha, atraso `0,46s + índice × 0,08s`). Só opacity/transform
       animam (nenhum reflow, nenhuma mudança de altura ou de largura de coluna). */
    <motion.div
      role="row"
      custom={indice}
      variants={linhaEntradaHubVariants}
      initial="hidden"
      animate="visible"
      style={{ gridTemplateColumns: GRID_COLUNAS }}
      className={cn(
        'grid origin-center items-center transition-colors duration-200 ease-in-out hover:bg-background',
        marcada && 'bg-accent/10'
      )}
    >
      <div role="cell" className={cn(PAD_CELULA_X, PAD_CELULA)}>
        <Checkbox
          checked={marcada}
          onCheckedChange={() => onAlternarSelecao(linha.id)}
          aria-label={`Selecionar pagamento de ${linha.colaborador?.nome_completo ?? 'colaborador'}`}
          className="border-border/60"
        />
      </div>

      <div role="cell" className={cn(PAD_CELULA_X, PAD_CELULA)}>
        <div className="flex min-w-0 items-center gap-2.5">
          {/* Sem foto no embed real (`colaboradores(nome_completo, salario_base)`):
              o avatar é o fallback de INICIAIS do próprio nome — nunca foto fictícia. */}
          <UserAvatar name={linha.colaborador?.nome_completo ?? '—'} size="sm" className="shrink-0" />
          {/* Nome COMPLETO, em 13px semibold, sem reticências: quando não cabe em
              uma linha ele QUEBRA (`break-words`), e a linha da tabela cresce.
              `title` fica como complemento, não como única forma de ler o nome. */}
          <span
            className="break-words text-[13px] font-semibold leading-[16px]"
            title={linha.colaborador?.nome_completo ?? undefined}
          >
            {linha.colaborador?.nome_completo ?? '—'}
          </span>
        </div>
      </div>

      <div role="cell" className={cn(PAD_CELULA_X, PAD_CELULA)}>
        <div className="flex min-w-0 items-start gap-2.5">
          {/* Ícone da campanha com o tom estável da própria campanha (não mais um
              selo igual para todas) — ícone, tamanho e posição preservados. */}
          <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', tomCampanha)}>
            <Trophy className="h-3.5 w-3.5" />
          </span>
          {/* Nome da campanha + observação, AMBOS completos: o nome em 13px
              semibold e a descrição abaixo, com 4px de respiro, em 12px e menor
              contraste. Nenhum dos dois usa reticências — o que não couber em
              uma linha quebra e a célula cresce (§ crescimento vertical). */}
          <span className="flex min-w-0 flex-col gap-0.5">
            <span
              className="break-words text-[13px] font-semibold leading-[16px]"
              title={linha.campanha?.nome ?? undefined}
            >
              {linha.campanha?.nome ?? '—'}
            </span>
            {linha.observacoes && (
              <span className="break-words text-[11px] leading-[14px] text-muted-foreground" title={linha.observacoes}>
                {linha.observacoes}
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Colunas financeiras: mesma família tipográfica, 13px, `tabular-nums`, sem
          truncar valor. A HIERARQUIA de cor segue o significado real do número:
          · calculado = neutro legível (ainda não é dinheiro aprovado);
          · aprovado = verde SÓ quando existe valor aprovado de fato;
          · pago = verde SÓ quando há valor lançado na folha;
          · ausência de valor continua com o mesmo indicador "—".
          Divergência (logo abaixo, no status) é a única em vermelho. */}
      <div
        role="cell"
        className={cn(PAD_CELULA_X, 'text-[13px] font-medium tabular-nums text-foreground/70', PAD_CELULA)}
      >
        {valor(linha.valor_calculado)}
      </div>
      <div
        role="cell"
        className={cn(
          PAD_CELULA_X,
          'text-[13px] font-semibold tabular-nums',
          linha.valor_aprovado ? 'text-success' : 'text-muted-foreground',
          PAD_CELULA
        )}
      >
        {valor(linha.valor_aprovado)}
      </div>
      <div
        role="cell"
        className={cn(
          PAD_CELULA_X,
          'text-[13px] font-medium tabular-nums',
          linha.valor_folha_real ? 'text-success' : 'text-muted-foreground',
          PAD_CELULA
        )}
      >
        {linha.valor_folha_real ? formatCurrency(Number(linha.valor_folha_real)) : '—'}
      </div>

      <div role="cell" className={cn(PAD_CELULA_X, PAD_CELULA)}>
        {/* Três níveis com respiro curto e constante (4px): badge, tempo e
            informação complementar (diferença ou comentário). O comentário quebra
            em quantas linhas precisar — antes ele era cortado com reticências. O
            `title` segue como complemento, nunca como a única leitura. */}
        <div className="flex min-w-0 flex-col gap-1">
          <span
            className={cn(
              'w-fit max-w-full rounded-full px-1 py-0.5 text-[10px] font-medium uppercase leading-[14px] tracking-normal',
              badge
            )}
            title={rotuloStatusPagamento(linha.status)}
          >
            {rotuloStatusPagamento(linha.status)}
          </span>
          <span className="flex items-center gap-1 text-[12px] leading-[15px] text-muted-foreground">
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', ponto)} aria-hidden />
            <span className="break-words">{quando ? `Há ${quando.replace('há ', '')}` : '—'}</span>
          </span>
          {divergencia > 0 && (
            <span className="flex items-center gap-1 text-[12px] font-medium leading-[15px] text-destructive-vivid">
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
              <span className="break-words">Diferença: {formatCurrency(divergencia)}</span>
            </span>
          )}
          {divergencia === 0 && comentario && (
            <span className="break-words text-[12px] italic leading-[15px] text-muted-foreground" title={comentario}>
              {comentario}
            </span>
          )}
        </div>
      </div>

      <div role="cell" className={cn(PAD_CELULA_X, PAD_CELULA)}>
        {/* Botões e menu alinhados ao INÍCIO da coluna — o título AÇÕES começa
            na mesma coordenada (nada de grupo isolado na extremidade direita). */}
        <div className="flex items-center justify-start gap-1.5">
          <Button
            size="sm"
            variant="outline"
            className={cn('h-7 min-w-0 gap-1.5 rounded-lg px-1.5 text-[12px] font-medium', tomAcao)}
            title={acao.label}
            onClick={() => onAcaoPrincipal(linha, acao.tipo)}
          >
            <IconeAcao className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{acao.label}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-6 shrink-0 rounded-lg text-muted-foreground"
                aria-label={`Mais ações para ${linha.colaborador?.nome_completo ?? 'o pagamento'}`}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => onAcao(linha, 'detalhes')} className="gap-2 text-xs">
                <Eye className="h-3.5 w-3.5" /> Ver detalhes
              </DropdownMenuItem>
              {podeAvancar && acao.tipo !== 'avancar' && (
                <DropdownMenuItem onClick={() => onAcao(linha, 'avancar')} className="gap-2 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Avançar aprovação
                </DropdownMenuItem>
              )}
              {podeConciliarPagamento(linha.status) && (
                <>
                  <DropdownMenuItem onClick={() => onAcao(linha, 'conciliar')} className="gap-2 text-xs">
                    <Search className="h-3.5 w-3.5" /> Conciliar manualmente
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAcao(linha, 'auto-conciliar')} className="gap-2 text-xs">
                    <RefreshCw className="h-3.5 w-3.5" /> Conciliação automática
                  </DropdownMenuItem>
                </>
              )}
              {linha.status === 'rejeitado' && (
                <DropdownMenuItem onClick={() => onAcao(linha, 'reiniciar')} className="gap-2 text-xs">
                  <RefreshCw className="h-3.5 w-3.5" /> Reiniciar fluxo
                </DropdownMenuItem>
              )}
              {podeRejeitarPagamento(linha.status) && (
                <DropdownMenuItem
                  onClick={() => onAcao(linha, 'rejeitar')}
                  className="gap-2 text-xs text-destructive focus:text-destructive"
                >
                  <XCircle className="h-3.5 w-3.5" /> Rejeitar pagamento
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}
