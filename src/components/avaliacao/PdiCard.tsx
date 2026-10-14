import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ArrowRight, BookOpen, Calendar, MoreHorizontal, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { iniciais } from './desempenhoComum';
import { BarraProgresso } from './barraProgresso';
import { MotionCard, entradaCard } from './entradaCards';
// ⚠️ TEMPORÁRIO — mock visual de progresso. Remover esta linha junto com o
// bloco marcado no corpo do componente e com `pdiProgressoMock.ts`.
import { getMockPdiProgress } from './pdiProgressoMock';
import {
  CLASSE_STATUS,
  COR_PONTO_PRAZO,
  ETIQUETA_BASE,
  PROGRESSO_PDI_DISPONIVEL,
  ROTULO_PRAZO,
  TEXTO_PROGRESSO_AUSENTE,
  TINTA_PRAZO,
  type PdiDerivado,
} from './pdiComum';

/**
 * ============================================================================
 * CARD DE PDI — aba "PDI".
 *
 * Card ANALÍTICO horizontal (nada de linha simples) com seis regiões fixas, na
 * ordem da referência:
 *
 *   A · identificação — avatar + título do PDI + colaborador + cargo ·
 *       departamento + badge da competência;
 *   B · progresso      — barra + leitura da execução;
 *   C · ação           — a ação de desenvolvimento registrada no plano;
 *   D · prazo          — data + dias restantes/em atraso;
 *   E · status         — badge do status REAL do plano + situação do prazo
 *       (informação COMPLEMENTAR, nunca no lugar do status);
 *   F · ações          — "Ver PDI" + menu com as navegações reais.
 *
 * ── PROGRESSO HONESTO ───────────────────────────────────────────────────────
 * `pdi_plano_desenvolvimento` não tem percentual nem lista de ações, então NÃO
 * existe barra preenchida: o trilho aparece vazio e a leitura diz "Progresso
 * não acompanhado". O status jamais é convertido em percentual — a região é
 * preservada visualmente sem falsificar informação (`PROGRESSO_PDI_DISPONIVEL`
 * em `pdiComum` é o interruptor único: no dia em que o dado existir, o card
 * passa a desenhar a barra com o número real lendo o mesmo lugar).
 *
 * ── AÇÃO DE DESENVOLVIMENTO ≠ "PRÓXIMA AÇÃO" ────────────────────────────────
 * O plano tem UMA descrição textual (`acao_desenvolvimento`), não uma sequência
 * de etapas: por isso o rótulo é "Ação de desenvolvimento" e o texto é exibido
 * como está — sem afirmar que é a próxima de uma fila que não existe.
 *
 * ── GEOMETRIA ───────────────────────────────────────────────────────────────
 * Desktop: grid de 6 colunas nas proporções da referência
 * (29/20/18/12/11/10), `px-4 py-3` e altura livre (nada de `h-*` fixo que
 * corte texto). Mobile/tablet: card VERTICAL — identificação em cima, os quatro
 * blocos informativos num grid de 2 colunas e as ações no rodapé; no desktop
 * esses blocos entram no grid de 6 colunas via `lg:contents` (o contêiner não
 * cria caixa, então as regiões continuam sendo itens do grid do card).
 *
 * A faixa colorida na lateral esquerda é a MESMA cor semântica da situação do
 * prazo — o card não vira uma superfície de alerta inteira.
 *
 * ENTRADA: `entradaCard(indice)` — o mesmo fade + subida de 20px dos KPI Cards
 * do Dashboard Executivo, em cascata pela ordem de leitura (o card NÃO anima
 * nada próprio no hover: só cor de fundo/borda/realce da ação).
 * ============================================================================
 */

interface PdiCardProps {
  item: PdiDerivado;
  /** Posição na cascata de entrada (mesma régua do Dashboard Executivo). */
  indice?: number;
  /** Movimento reduzido (ver `useMovimentoReduzido`). */
  reduzirMovimento?: boolean;
  /** Abre os detalhes reais do plano. */
  onVerPdi?: (item: PdiDerivado) => void;
  /** Filtra a lista pelo colaborador do plano (ação local real). */
  onFiltrarColaborador?: (item: PdiDerivado) => void;
  /** Filtra a lista pela competência foco (ação local real). */
  onFiltrarCompetencia?: (item: PdiDerivado) => void;
}

/** Avatar por categoria de status — a MESMA família do badge da região E. */
const AVATAR_CATEGORIA: Record<string, string> = {
  em_andamento: 'bg-warning/15 text-warning ring-warning/20',
  pendente: 'bg-info/15 text-info ring-info/20',
  concluido: 'bg-success/15 text-success ring-success/20',
  todos: 'bg-muted/40 text-muted-foreground ring-border/60',
};

/** Faixa lateral: cor semântica da situação do prazo, em intensidade discreta. */
const FAIXA_PRAZO: Record<string, string> = {
  vencido: 'bg-destructive-vivid/80',
  concluido: 'bg-success/80',
  em_dia: 'bg-primary/45',
};

export function PdiCard({
  item,
  indice = 0,
  reduzirMovimento = false,
  onVerPdi,
  onFiltrarColaborador,
  onFiltrarCompetencia,
}: PdiCardProps) {
  const local = [item.cargo, item.departamento].filter(Boolean).join(' · ');
  const podeFiltrar = Boolean((onFiltrarColaborador && item.colaboradorId) || (onFiltrarCompetencia && item.competencia));

  /**
   * Percentual REAL do plano. Hoje a tabela não tem o campo, então `null` —
   * o trilho fica vazio e a leitura é textual. Nada é derivado do status.
   */
  const bruto = item.pdi?.progresso;
  const percentualNumerico = Number(bruto);
  const percentual = PROGRESSO_PDI_DISPONIVEL && Number.isFinite(percentualNumerico) ? percentualNumerico : null;

  /* ⚠️ TEMPORÁRIO — MOCK VISUAL DE PROGRESSO (ver `pdiProgressoMock.ts`) ⚠️
     Só existe para avaliar a aparência das barras coloridas; não lê nem grava
     nada no banco. PARA REMOVER: apague este bloco (3 linhas), o import de
     `getMockPdiProgress` no topo e o arquivo do mock — o card volta sozinho ao
     estado honesto ("Progresso não acompanhado"). */
  const mock = getMockPdiProgress(item);
  const exibido = mock ? mock.percent : percentual;
  const corBarra = mock ? mock.tone : percentual === null ? 'bg-muted-foreground/40' : 'bg-primary';
  /* ⚠️ FIM DO BLOCO TEMPORÁRIO ⚠️ */

  return (
    <MotionCard
      {...entradaCard(indice)}
      className="group relative overflow-hidden rounded-xl border-border/60 bg-gradient-to-b from-card to-card/60 px-4 py-3 shadow-elevated transition-colors hover:border-primary/30 hover:bg-card"
    >
      {/* Faixa lateral esquerda — semântica do prazo, discreta. */}
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-[3px]', FAIXA_PRAZO[item.situacao])} />

      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,29fr)_minmax(0,20fr)_minmax(0,18fr)_minmax(0,12fr)_minmax(0,11fr)_minmax(0,10fr)] lg:items-center lg:gap-4">
        {/* ── A · Identificação ──────────────────────────────────────────── */}
        <div className="flex min-w-0 items-start gap-3">
          {item.foto ? (
            <img
              src={item.foto}
              alt=""
              loading="lazy"
              className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-inset ring-border/60"
            />
          ) : (
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ring-inset',
                AVATAR_CATEGORIA[item.categoria] ?? AVATAR_CATEGORIA.todos
              )}
            >
              {iniciais(item.colaborador)}
            </span>
          )}

          <div className="min-w-0 space-y-1">
            <h3 className="font-display text-[13px] font-semibold leading-tight tracking-tight">{item.titulo}</h3>
            <p className="truncate text-[11px] leading-tight text-muted-foreground">{item.colaborador}</p>
            {local && <p className="truncate text-[10px] leading-tight text-muted-foreground/80">{local}</p>}
            {item.competencia && (
              <span className={cn(ETIQUETA_BASE, 'border-primary/25 bg-primary/10 text-primary')}>
                <Target className="h-3 w-3 shrink-0" />
                <span className="truncate">{item.competencia}</span>
              </span>
            )}
          </div>
        </div>

        {/* Blocos B–E: grid de 2 colunas no mobile/tablet e itens do grid do
            card no desktop (`lg:contents` — o contêiner não cria caixa). */}
        <div className="grid grid-cols-2 gap-3 lg:contents">
          {/* ── B · Progresso ────────────────────────────────────────────── */}
          <div className="min-w-0 space-y-1.5 lg:border-l lg:border-border/30 lg:pl-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Progresso</p>
            <div className="flex items-center gap-2">
              <BarraProgresso
                percentual={exibido}
                indice={indice}
                cor={corBarra}
                reduzirMovimento={reduzirMovimento}
                trilhoClassName="h-1.5 min-w-[56px] flex-1 bg-muted/60"
              />
              <span
                className={cn(
                  'shrink-0 text-[11px] font-semibold tabular-nums',
                  mock ? mock.tinta : 'text-muted-foreground'
                )}
              >
                {exibido === null ? '—' : `${exibido}%`}
              </span>
            </div>
            {mock ? (
              /* ⚠️ TEMPORÁRIO — textos do mock (o "simulado" evita confusão com dado real). */
              <>
                <p className="text-[10px] font-medium leading-snug text-foreground/90">{mock.label}</p>
                <p className="text-[10px] leading-snug text-muted-foreground/70">{mock.hint}</p>
              </>
            ) : percentual === null ? (
              <p className="text-[10px] leading-snug text-muted-foreground">{TEXTO_PROGRESSO_AUSENTE}</p>
            ) : (
              <p className="text-[10px] leading-snug text-muted-foreground">{percentual}% de execução registrada</p>
            )}
          </div>

          {/* ── C · Ação de desenvolvimento ──────────────────────────────── */}
          <div className="min-w-0 space-y-1 lg:border-l lg:border-border/30 lg:pl-4">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Ação de desenvolvimento</p>
            <p className="flex items-start gap-1.5 text-[11px] leading-snug text-foreground/90">
              <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />
              <span className="line-clamp-3">{item.acao ?? 'Nenhuma ação registrada no plano.'}</span>
            </p>
          </div>

          {/* ── D · Prazo ────────────────────────────────────────────────── */}
          <div className="space-y-0.5 lg:border-l lg:border-border/30 lg:pl-4">
            <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Prazo
            </p>
            <p className={cn('text-[13px] font-semibold tabular-nums', TINTA_PRAZO[item.situacao])}>{item.prazoTexto}</p>
            <p
              className={cn(
                'text-[10px] leading-snug',
                item.situacao === 'vencido' ? 'text-destructive-vivid' : 'text-muted-foreground'
              )}
            >
              {item.prazoDescricao}
            </p>
          </div>

          {/* ── E · Status (do plano) + situação do prazo (complementar) ─── */}
          <div className="min-w-0 space-y-1 lg:border-l lg:border-border/30 lg:pl-4">
            <span className={cn(ETIQUETA_BASE, CLASSE_STATUS[item.categoria])}>{item.statusRotulo}</span>
            <span className="flex items-center gap-1.5 text-[10px] leading-snug text-muted-foreground">
              <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', COR_PONTO_PRAZO[item.situacao])} />
              {ROTULO_PRAZO[item.situacao]}
            </span>
          </div>

          {/* ── F · Ações (só o que o sistema realmente faz) ─────────────── */}
          {(onVerPdi || podeFiltrar) && (
            <div className="flex items-center justify-end gap-1.5">
              {onVerPdi && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onVerPdi(item)}
                  className="h-8 gap-1 rounded-lg border-border/60 bg-muted/30 px-2.5 text-[11px] font-medium transition-colors group-hover:border-primary/40 group-hover:text-primary"
                >
                  Ver PDI
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}

              {podeFiltrar && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Mais ações do PDI"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground group-hover:text-foreground"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {onFiltrarColaborador && item.colaboradorId && (
                      <DropdownMenuItem className="text-xs" onClick={() => onFiltrarColaborador(item)}>
                        Filtrar por este colaborador
                      </DropdownMenuItem>
                    )}
                    {onFiltrarCompetencia && item.competencia && (
                      <DropdownMenuItem className="text-xs" onClick={() => onFiltrarCompetencia(item)}>
                        Filtrar por esta competência
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </div>
    </MotionCard>
  );
}

