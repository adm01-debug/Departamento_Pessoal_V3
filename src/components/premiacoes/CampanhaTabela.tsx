/**
 * ============================================================================
 * HUB DE PREMIAÇÕES — TABELA DE CAMPANHAS.
 *
 * Substitui os cards grandes da versão anterior: as campanhas passam a ser
 * LINHAS compactas (Campanha · Período · Desempenho · Orçamento · Participantes
 * · Status · Ações), cabeçalho discreto e rodapé com o resumo + paginação.
 *
 * REGRAS
 *  · Só apresentação: recebe as métricas já calculadas (`MetricasCampanha`) e as
 *    ações de cada linha; quem filtra, ordena e pagina é a página.
 *  · Nenhum dado fictício: avatar é o FALLBACK de iniciais do nome real do
 *    colaborador (o embed de pagamentos não traz foto), barras usam as métricas
 *    reais e as datas vêm de `data_inicio`/`data_fim`.
 *  · Sem sombras nem cards por linha — divisórias horizontais discretas, hover
 *    sutil e rolagem horizontal LOCALIZADA quando a largura não basta.
 *  · Botão de ação único por linha + menu de três pontos com ações que já
 *    existem no hub (ver pagamentos da campanha / exportar relatório).
 * ============================================================================
 */
import {
  ArrowRight,
  ArrowUpDown,
  ChevronRight,
  DollarSign,
  Download,
  Lightbulb,
  MoreVertical,
  Rocket,
  Sparkles,
  Target,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { AppPagination } from '@/components/ui/app-pagination';
import { Button } from '@/components/ui/button';
import { CascadeTableRow } from '@/components/ui/cascade-table';
import { tomDoAvatar } from '@/lib/avatarTons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { entradaCard } from './premiacoesEntrada';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/utils/format';
import {
  ORDENACAO_POR_COLUNA,
  aparenciaStatus,
  indiceEntrada,
  iniciaisDe,
  type MetricasCampanha,
  type OrdenacaoCampanha,
} from './premiacoesComum';

interface CampanhaTabelaProps {
  /** Linhas da página atual (já filtradas e ordenadas). */
  linhas: MetricasCampanha[];
  /** Total do conjunto filtrado (alimenta o rodapé e a paginação). */
  total: number;
  pagina: number;
  porPagina: number;
  onPaginaChange: (pagina: number) => void;
  ordenacaoAtual: OrdenacaoCampanha;
  onAbrirDetalhes: (linha: MetricasCampanha) => void;
  onVerPagamentos: () => void;
  onExportar: () => void;
  /** Texto do estado vazio (muda quando há filtros ativos). */
  mensagemVazia: string;
}

/** Blocos de ícone por campanha — paleta do design system, estável por id. */
const PALETA_ICONE: { caixa: string; Icone: LucideIcon }[] = [
  { caixa: 'bg-primary/15 text-primary', Icone: Rocket },
  { caixa: 'bg-info/15 text-info', Icone: Target },
  { caixa: 'bg-xp/15 text-xp', Icone: Users },
  { caixa: 'bg-warning/15 text-warning', Icone: Lightbulb },
  { caixa: 'bg-success/15 text-success', Icone: Sparkles },
];

/** Índice estável derivado do id (mesma campanha mantém cor e ícone). */
function indicePaleta(id: string): number {
  let soma = 0;
  for (let i = 0; i < id.length; i += 1) soma = (soma + id.charCodeAt(i) * (i + 1)) % 997;
  return soma % PALETA_ICONE.length;
}

/** Rótulo e ícone do botão principal conforme o status REAL da campanha. */
function acaoPrincipal(status: string): { label: string; Icone: LucideIcon } {
  if (status === 'ativo') return { label: 'Ver campanha', Icone: ArrowRight };
  if (status === 'finalizado') return { label: 'Ver resultados', Icone: ChevronRight };
  if (status === 'suspenso') return { label: 'Ver campanha', Icone: ArrowRight };
  return { label: 'Revisar campanha', Icone: ChevronRight };
}

/**
 * IDENTIDADE ÚNICA dos botões da coluna Ações: azul-ciano do Design System
 * (`--info` = `hsl(199 89% 50%)` ≈ `#0EA5E9`), com fundo translúcido, borda
 * discreta e texto/ícone na mesma cor. Vale para TODAS as ações principais da
 * coluna (Revisar campanha, Ver campanha, Ver resultados, Continuar edição…),
 * independentemente do status da campanha — o que muda de um botão para outro é
 * só o texto e o ícone.
 *
 * Hover: fundo um passo mais intenso e borda com mais contraste, com transição
 * de cor de 200ms `ease-in-out`, sem deslocar nem alterar dimensões. O estado
 * desabilitado continua com o tratamento neutro do próprio `Button` do DS
 * (`disabled:opacity-50` + `pointer-events-none`), preservando as permissões.
 */
const TOM_BOTAO_ACOES =
  'border-info/40 bg-info/10 text-info transition-colors duration-200 ease-in-out hover:border-info/60 hover:bg-info/20 hover:text-info';

/**
 * Situação temporal da coluna Período — sempre calculada das datas reais.
 * Texto curto ("restam N dias") para caber na coluna sem truncar; campanha
 * encerrada não ganha contagem regressiva.
 */
function situacaoTexto(linha: MetricasCampanha): { texto: string; classe: string } {
  if (linha.situacaoTemporal === 'vigente' && linha.diasRestantes !== null) {
    return {
      texto: linha.diasRestantes === 1 ? 'resta 1 dia' : `restam ${linha.diasRestantes} dias`,
      classe: 'text-primary',
    };
  }
  if (linha.situacaoTemporal === 'futura' && linha.diasRestantes !== null) {
    return { texto: `inicia em ${linha.diasRestantes} dias`, classe: 'text-info' };
  }
  return { texto: 'Encerrada', classe: 'text-muted-foreground' };
}

/** Indicador secundário do status: atenção, dia, configuração… (só com dado real). */
function indicadorSecundario(linha: MetricasCampanha): { texto: string; ponto: string } | null {
  const { campanha } = linha;
  if (campanha.status === 'ativo') {
    if (linha.divergencias > 0) return { texto: 'Em atenção', ponto: 'bg-warning' };
    return { texto: 'Em dia', ponto: 'bg-success' };
  }
  if (campanha.status === 'finalizado') return { texto: 'Encerrada', ponto: 'bg-info' };
  if (campanha.status === 'suspenso') return { texto: 'Pausada', ponto: 'bg-muted-foreground' };
  if (campanha.status_aprovacao === 'revisando') return { texto: 'Em revisão', ponto: 'bg-warning' };
  return { texto: 'Configuração', ponto: 'bg-muted-foreground' };
}

/** Cabeçalhos na ordem da referência; `coluna` casa com `ORDENACAO_POR_COLUNA`. */
const COLUNAS: { id: string; label: string; className: string; ordenavel?: boolean }[] = [
  { id: 'campanha', label: 'Campanha', className: 'text-left', ordenavel: true },
  { id: 'periodo', label: 'Período', className: 'text-left', ordenavel: true },
  { id: 'desempenho', label: 'Desempenho', className: 'text-left', ordenavel: true },
  { id: 'orcamento', label: 'Orçamento', className: 'text-left', ordenavel: true },
  { id: 'participantes', label: 'Participantes', className: 'text-left', ordenavel: true },
  { id: 'status', label: 'Status', className: 'text-left' },
  { id: 'acoes', label: 'Ações', className: 'text-right' },
];

/** Barra horizontal compacta de percentual (null = sem dado: trilho vazio). */
function BarraValor({ percentual, cor }: { percentual: number | null; cor: string }) {
  const largura = percentual === null ? 0 : Math.max(0, Math.min(100, percentual));
  return (
    <span className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
      <span className={cn('block h-full rounded-full transition-[width]', cor)} style={{ width: `${largura}%` }} />
    </span>
  );
}

/** Percentual formatado no padrão pt-BR, sem casas quando é inteiro. */
function textoPercentual(percentual: number | null): string {
  if (percentual === null) return '—';
  const arredondado = Math.round(percentual * 10) / 10;
  return `${String(arredondado).replace('.', ',')}%`;
}

/**
 * Avatares sobrepostos com FALLBACK DE INICIAIS (não há foto no embed de
 * pagamentos). Mostra no máximo 5 e agrega o restante em "+N".
 */
function PilhaAvatares({ nomes, total }: { nomes: string[]; total: number }) {
  if (total === 0) {
    return (
      <span className="whitespace-nowrap text-[10px] text-muted-foreground" title="Sem participantes registrados">
        Sem dados
      </span>
    );
  }
  const visiveis = nomes.slice(0, 4);
  const restantes = total - visiveis.length;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex -space-x-[6px]">
        {visiveis.map((nome, indice) => (
          /* Mesma paleta estável do UserAvatar (`tomDoAvatar`): a mesma pessoa
             tem a mesma cor em qualquer lugar do sistema, com iniciais legíveis
             no navy — antes todas eram cinza sobre cinza. */
          <span
            key={`${nome}-${indice}`}
            title={nome}
            className={cn(
              'flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border-2 border-card text-[9px] font-semibold',
              tomDoAvatar(nome),
            )}
          >
            {iniciaisDe(nome)}
          </span>
        ))}
        {restantes > 0 && (
          <span
            title={`${total} participantes`}
            className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border-2 border-card bg-primary/15 text-[9px] font-semibold text-primary"
          >
            +{restantes}
          </span>
        )}
      </div>
      <span className="whitespace-nowrap text-[10px] text-muted-foreground">
        {total === 1 ? '1 participante' : `${total} participantes`}
      </span>
    </div>
  );
}

/** Uma linha da tabela — todos os valores vêm das métricas reais da campanha. */
function LinhaCampanha({
  linha,
  onAbrirDetalhes,
  onVerPagamentos,
  onExportar,
  indice,
}: {
  linha: MetricasCampanha;
  onAbrirDetalhes: (linha: MetricasCampanha) => void;
  onVerPagamentos: () => void;
  onExportar: () => void;
  /** Índice da linha na cascata de entrada (a LINHA inteira anima, nunca a célula). */
  indice: number;
}) {
  const { campanha } = linha;
  const paleta = PALETA_ICONE[indicePaleta(campanha.id)];
  const aparencia = aparenciaStatus(campanha.status);
  const situacao = situacaoTexto(linha);
  const secundario = indicadorSecundario(linha);
  const acao = acaoPrincipal(campanha.status);
  const corBarraDesempenho =
    linha.pctAprovado === null ? 'bg-muted' : linha.pctAprovado >= 100 ? 'bg-success' : 'bg-primary';
  const corBarraOrcamento =
    linha.pctOrcamento === null ? 'bg-muted' : linha.pctOrcamento > 100 ? 'bg-warning' : 'bg-info';

  return (
    /* Linha da cascata compartilhada (`ui/cascade-table`) — a MESMA animação da
       lista de Processos de Desligamentos: opacity + y(10px) + scaleX(0.94→1)
       abrindo do centro, 0,8s, atraso `0,52s + índice × 0,04s`, ease
       [0.22, 1, 0.36, 1]. O hover da linha (fundo escurecendo) continua igual. */
    <CascadeTableRow
      index={indice}
      className="align-middle transition-colors duration-200 ease-in-out hover:bg-background"
    >
      {/* Campanha */}
      <td className="px-2 py-[26px]">
        <div className="flex items-center gap-2.5">
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', paleta.caixa)}>
            <paleta.Icone className="h-[18px] w-[18px]" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-[10.5px] font-semibold leading-5" title={campanha.nome}>
              {campanha.nome}
            </p>
            <p className="line-clamp-2 text-[10.5px] leading-[17px] text-muted-foreground">
              {campanha.descricao || 'Sem descrição cadastrada'}
            </p>
          </div>
        </div>
      </td>

      {/* Período */}
      <td className="px-2 py-[26px]">
        <div className="flex flex-col gap-1">
          <span className="text-[10.5px] leading-[18px] font-medium tabular-nums">{formatDate(campanha.data_inicio)}</span>
          <span className="text-[10.5px] leading-[18px] tabular-nums text-muted-foreground">{formatDate(campanha.data_fim)}</span>
          <span className={cn('whitespace-nowrap text-[10.5px] leading-[18px] font-medium', situacao.classe)}>{situacao.texto}</span>
        </div>
      </td>

      {/* Desempenho — % de LIQUIDAÇÃO do cálculo (não é o orçamento) */}
      <td className="px-2 py-[26px]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate text-[11px] font-semibold leading-5">
            {linha.pctAprovado === null ? (
              '—'
            ) : (
              <>
                {textoPercentual(linha.pctAprovado)}{' '}
                <span className="text-[9.5px] font-normal text-muted-foreground">aprovado</span>
              </>
            )}
          </span>
          <BarraValor percentual={linha.pctAprovado} cor={corBarraDesempenho} />
          <span
            className="truncate text-[8.5px] leading-5 text-muted-foreground"
            title={
              linha.valorCalculado > 0
                ? `${formatCurrency(linha.valorAprovado)} de ${formatCurrency(linha.valorCalculado)}`
                : undefined
            }
          >
            {linha.valorCalculado > 0
              ? `${formatCurrency(linha.valorAprovado)} / ${formatCurrency(linha.valorCalculado)}`
              : 'Sem cálculo'}
          </span>
        </div>
      </td>

      {/* Orçamento */}
      <td className="px-2 py-[26px]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate text-[11px] font-semibold leading-5">
            {linha.orcamentoIndisponivel ? (
              '—'
            ) : (
              <>
                {textoPercentual(linha.pctOrcamento)}{' '}
                <span className="text-[9.5px] font-normal text-muted-foreground">utilizado</span>
              </>
            )}
          </span>
          <BarraValor percentual={linha.pctOrcamento} cor={corBarraOrcamento} />
          <span
            className="truncate text-[8.5px] leading-5 text-muted-foreground"
            title={
              linha.orcamentoIndisponivel
                ? undefined
                : `${formatCurrency(linha.valorComprometido)} de ${formatCurrency(linha.orcamentoTotal)}`
            }
          >
            {linha.orcamentoIndisponivel
              ? 'Orçamento não cadastrado'
              : `${formatCurrency(linha.valorComprometido)} / ${formatCurrency(linha.orcamentoTotal)}`}
          </span>
        </div>
      </td>

      {/* Participantes */}
      <td className="px-2 py-[26px]">
        <PilhaAvatares nomes={linha.participantes.nomes} total={linha.participantes.total} />
      </td>

      {/* Status */}
      <td className="px-2 py-[26px]">
        <div className="flex flex-col items-start gap-1.5">
          <span
            className={cn(
              'inline-flex h-6 items-center whitespace-nowrap rounded-full border px-1.5 text-[9.5px] font-semibold uppercase tracking-wide',
              aparencia.badge,
            )}
          >
            {aparencia.label}
          </span>
          {secundario && (
            <span className="flex items-center gap-2 whitespace-nowrap text-[10.5px] text-muted-foreground">
              <span className={cn('h-2 w-2 rounded-full', secundario.ponto)} />
              {secundario.texto}
            </span>
          )}
        </div>
      </td>

      {/* Ações — grupo alinhado à DIREITA, na MESMA borda do cabeçalho "AÇÕES"
          (`w-full` + `justify-end`): botão principal e menu de três pontos ficam
          colados à extremidade da tabela, com o espaçamento já existente entre
          eles. */}
      <td className="px-2 py-[26px]">
        <div className="flex w-full items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAbrirDetalhes(linha)}
            className={cn(
              'h-9 gap-1 whitespace-nowrap rounded-xl px-1 text-[10px] font-medium',
              TOM_BOTAO_ACOES,
            )}
          >
            {acao.label}
            <acao.Icone className="h-3 w-3" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Mais ações de ${campanha.nome}`}
                className="h-6 w-6 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onVerPagamentos} className="gap-2 text-xs">
                <DollarSign className="h-3.5 w-3.5" /> Ver pagamentos da campanha
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExportar} className="gap-2 text-xs">
                <Download className="h-3.5 w-3.5" /> Exportar relatório
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </CascadeTableRow>
  );
}

/**
 * Larguras das colunas — proporções da REFERÊNCIA (1122px): Campanha larga com o
 * nome inteiro, Participantes e Status com espaço para avatares/selos grandes e
 * Ações enxuta (botão + menu). Com `table-fixed` as porcentagens são respeitadas:
 * cada célula trunca o próprio conteúdo em vez de esticar a coluna.
 */
const LARGURAS = ['24%', '9.8%', '13.6%', '13.6%', '12.2%', '9.8%', '17%'];

/** Piso de largura da tabela: abaixo disso ela rola POR DENTRO do próprio card. */
const LARGURA_MINIMA_TABELA = 'min-w-[900px]';

export function CampanhaTabela({
  linhas,
  total,
  pagina,
  porPagina,
  onPaginaChange,
  ordenacaoAtual,
  onAbrirDetalhes,
  onVerPagamentos,
  onExportar,
  mensagemVazia,
}: CampanhaTabelaProps) {
  const colunaOrdenada = ORDENACAO_POR_COLUNA[ordenacaoAtual];
  const exibidos = linhas.length;

  /**
   * Identidade da lista visível (página + ordenação + registros): é a `key` do
   * `<tbody>`. Quando o conjunto/ordem muda a cascata toca de novo; hover,
   * clique e re-render não mudam a chave, então a animação não reinicia à toa —
   * o MESMO mecanismo da lista de Processos de Desligamentos.
   */
  const chaveCascata = [pagina, ordenacaoAtual, ...linhas.map((l) => l.campanha.id)].join('|');

  return (
    <motion.section
      {...entradaCard(indiceEntrada('tabela', 0))}
      className="flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-border/50 bg-card/60"
    >
      {/* Rolagem horizontal LOCALIZADA: em telas estreitas a tabela rola por
          dentro em vez de esmagar as colunas; a página não rola na horizontal. */}
      <div className="overflow-x-auto">
        <table className={cn('w-full table-fixed border-collapse text-left', LARGURA_MINIMA_TABELA)}>
          <colgroup>
            {LARGURAS.map((largura, indice) => (
              <col key={COLUNAS[indice].id} style={{ width: largura }} />
            ))}
          </colgroup>
          <thead>
            {/* Cabeçalho NÃO anima (na referência só as linhas entram em cascata). */}
            <tr className="border-b border-border/40 bg-muted/20">
              {COLUNAS.map((coluna) => (
                <th
                  key={coluna.id}
                  scope="col"
                  className={cn(
                    'h-11 whitespace-nowrap px-2 text-[11px] font-medium uppercase text-muted-foreground',
                    coluna.className,
                  )}
                >
                  <span className="inline-flex items-center gap-0.5">
                    {coluna.label}
                    {coluna.ordenavel && (
                      <ArrowUpDown
                        className={cn(
                          'h-2.5 w-2.5',
                          // Na referência o indicador ⇅ aparece em todas as colunas
                          // ordenáveis; o da ordenação ATIVA fica em verde-lima.
                          coluna.id === colunaOrdenada ? 'text-primary' : 'text-muted-foreground/40',
                        )}
                        aria-label={
                          coluna.id === colunaOrdenada ? 'Coluna da ordenação atual' : 'Coluna ordenável'
                        }
                      />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          {/* Corpo em cascata — mesmo mecanismo de `CascadeTableBody`
              (Processos/Desligamentos): `AnimatePresence` local + `key` que muda
              quando a lista troca de identidade (página, ordenação, filtros). */}
          <AnimatePresence>
            <tbody key={chaveCascata} className="divide-y divide-border/25">
              {linhas.map((linha, indiceLinha) => (
                <LinhaCampanha
                  key={linha.campanha.id}
                  linha={linha}
                  indice={indiceLinha}
                  onAbrirDetalhes={onAbrirDetalhes}
                  onVerPagamentos={onVerPagamentos}
                  onExportar={onExportar}
                />
              ))}

              {exibidos === 0 && (
                <CascadeTableRow index={0}>
                  <td colSpan={COLUNAS.length} className="px-4 py-12 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-1.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground">
                        <Trophy className="h-4 w-4" />
                      </span>
                      <p className="text-xs font-medium">{mensagemVazia}</p>
                    </div>
                  </td>
                </CascadeTableRow>
              )}
            </tbody>
          </AnimatePresence>
        </table>
      </div>

      {/* Rodapé (§5.7): DUAS regiões independentes — a contagem de registros
          encosta na borda ESQUERDA e o grupo de paginação na DIREITA. O
          `w-full` é o que dá largura à raiz do `AppPagination` (que é um item
          flex e, sem ele, encolheria ao próprio conteúdo, deixando o
          `justify-between` sem efeito). */}
      <motion.footer
        {...entradaCard(linhas.length)}
        className="flex h-[56px] items-center border-t border-border/40 px-4"
      >
        <AppPagination
          className="w-full"
          page={pagina}
          total={total}
          pageSize={porPagina}
          onPageChange={onPaginaChange}
          label={`Mostrando ${exibidos} de ${total} ${total === 1 ? 'campanha' : 'campanhas'}`}
        />
      </motion.footer>
    </motion.section>
  );
}
