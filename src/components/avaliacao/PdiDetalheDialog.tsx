import type { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookOpen, Calendar, Clock, Filter, MoreHorizontal, Target, TrendingUp, X } from 'lucide-react';
import { cn } from '@/lib/utils';
// A coreografia do modal é a MESMA da janela "Pendências": a cadeia é
// `PendenciasDialog` → `AnimatedCascadeDialog` → estas variants. Importar da
// fonte é o que garante movimento IDÊNTICO — nenhuma réplica local de números —
// sem alterar nenhum arquivo compartilhado.
import {
  cascadeContainerVariants,
  cascadeItemVariants,
  cascadeOverlayVariants,
  cascadeShellVariants,
} from '@/components/ui/cascade-motion';
import { formatarData, iniciais } from './desempenhoComum';
import {
  CLASSE_STATUS,
  COR_PONTO_PRAZO,
  DETALHE_PROGRESSO_AUSENTE,
  ETIQUETA_BASE,
  ROTULO_PRAZO,
  TEXTO_PROGRESSO_AUSENTE,
  TINTA_PRAZO,
  type PdiDerivado,
} from './pdiComum';

/**
 * ============================================================================
 * DETALHE DO PDI — modal de leitura do plano.
 *
 * Mostra SÓ campos que existem em `pdi_plano_desenvolvimento`: título,
 * colaborador, competência foco, ação de desenvolvimento, prazo, status,
 * comentários e as datas de criação/atualização. É o lugar onde o texto longo
 * do plano é lido por inteiro (o card mostra um recorte), e é o destino REAL do
 * botão "Ver PDI" — nenhum botão decorativo.
 *
 * A região de progresso repete a leitura honesta do card ("Progresso não
 * acompanhado"): a tabela não registra percentual nem ações, e o status nunca é
 * convertido em percentual.
 *
 * Mesmo idioma visual do dialog irmão (`FeedbackDetalheDialog`): caixa
 * `max-w-2xl`, blocos `rounded-lg border border-border/50 bg-background/50 p-3`.
 *
 * ── ANIMAÇÃO: A MESMA JANELA "PENDÊNCIAS" ───────────────────────────────────
 * A casca NÃO usa o `DialogContent` do Design System (que monta caixa e véu sem
 * animação). Ela reproduz a estrutura real de `AnimatedCascadeDialog`, com as
 * MESMAS variants de `cascade-motion.ts`:
 *
 *   • CAIXA — nasce como um quadrado pequeno e estica em três fases no mesmo
 *     timeline (`scaleX`/`scaleY` 0 → 0,16 → largura → altura), 0,9 s,
 *     `easeInOut`, origem `top center`;
 *   • VÉU — `bg-black/60 backdrop-blur-sm` com opacidade 0 → 1 em 0,25 s (o
 *     escurecimento é gradual e o blur entra junto, nunca depois);
 *   • CONTEÚDO — só começa quando a caixa termina de abrir (`delayChildren`),
 *     bloco a bloco (`y: 8 → 0`, 0,35 s): aqui são DOIS blocos — cabeçalho e a
 *     grade de blocos de leitura;
 *   • FECHAMENTO — o inverso: os blocos somem de trás para frente e só então a
 *     caixa encolhe (altura primeiro, depois largura), com o véu acompanhando a
 *     saída inteira; o conteúdo só é desmontado no fim (`AnimatePresence` +
 *     `forceMount`).
 *
 * O contêiner da cascata usa `display: contents`: propaga as variants sem criar
 * caixa, então cabeçalho e grade continuam sendo os itens do grid da própria
 * caixa (largura, padding, raio, bordas e espaçamentos seguem idênticos).
 *
 * Foco, `Esc`, clique fora e bloqueio de rolagem continuam sendo do Radix
 * (`DialogPrimitive`), como na referência.
 * ============================================================================
 */

/**
 * Blocos que cascateiam dentro da caixa — MESMA contagem da referência
 * (`itens + 1`): cabeçalho e a grade de blocos de leitura.
 */
const BLOCOS_CASCATA = 2;

interface PdiDetalheDialogProps {
  /** Plano aberto (`null` mantém o diálogo fechado). */
  item: PdiDerivado | null;
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  /** Filtra a lista pelo colaborador do plano e fecha o diálogo. */
  onFiltrarColaborador?: (item: PdiDerivado) => void;
  /** Filtra a lista pela competência foco e fecha o diálogo. */
  onFiltrarCompetencia?: (item: PdiDerivado) => void;
}

/** Bloco de leitura — a MESMA pele dos blocos do dialog de feedback. */
function Bloco({
  icone: Icone,
  titulo,
  tinta,
  children,
}: {
  icone: typeof BookOpen;
  titulo: string;
  tinta?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5 rounded-lg border border-border/50 bg-background/50 p-3">
      <p
        className={cn(
          'flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider',
          tinta ?? 'text-muted-foreground'
        )}
      >
        <Icone className="h-3.5 w-3.5" />
        {titulo}
      </p>
      {children}
    </div>
  );
}

export function PdiDetalheDialog({
  item,
  aberto,
  onOpenChange,
  onFiltrarColaborador,
  onFiltrarCompetencia,
}: PdiDetalheDialogProps) {
  if (!item) return null;

  const local = [item.cargo, item.departamento].filter(Boolean).join(' · ');

  // Variants da referência (fonte única): o número de blocos só recalcula o
  // instante em que a caixa começa a encolher no fechamento.
  const shellVariants = cascadeShellVariants(BLOCOS_CASCATA);
  const overlayVariants = cascadeOverlayVariants(BLOCOS_CASCATA);

  return (
    <DialogPrimitive.Root open={aberto} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {aberto && (
          <DialogPrimitive.Portal forceMount>
            {/* VÉU — mesmas classes e variants do `AnimatedCascadeDialog`. */}
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                variants={overlayVariants}
                initial="closed"
                animate="open"
                exit="closed"
              />
            </DialogPrimitive.Overlay>

            {/* CAIXA — classes visuais do `DialogContent` do Design System
                (largura, padding, borda, raio, sombra) + a coreografia da
                referência. `transformOrigin: top center` é o que faz o quadrado
                nascer ancorado no topo, como em "Pendências". */}
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-3 border bg-background p-5 shadow-lg sm:rounded-lg"
                style={{ transformOrigin: 'top center' }}
                variants={shellVariants}
                initial="closed"
                animate="open"
                exit="closed"
              >
                {/* Os controles do canto superior direito (⋯ e X) NÃO ficam mais
                    aqui em posição absoluta: eles vivem lado a lado no cluster do
                    cabeçalho, abaixo. */}

                {/* CONTÊINER DA CASCATA — `contents` para não criar caixa: o
                    cabeçalho e a grade seguem sendo os itens do grid da caixa,
                    então o layout do modal não muda em nada. */}
                <motion.div
                  className="contents"
                  variants={cascadeContainerVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                >
                  <motion.div
                    variants={cascadeItemVariants}
                    className="flex flex-col space-y-1 text-center sm:text-left"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      {item.foto ? (
                        <img
                          src={item.foto}
                          alt=""
                          className="h-11 w-11 shrink-0 rounded-full object-cover ring-1 ring-inset ring-border/60"
                        />
                      ) : (
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/20">
                          {iniciais(item.colaborador)}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <DialogTitle className="font-display text-base">{item.titulo}</DialogTitle>
                        <DialogDescription className="text-[11px]">
                          {item.colaborador}
                          {local ? ` · ${local}` : ''}
                        </DialogDescription>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className={cn(ETIQUETA_BASE, CLASSE_STATUS[item.categoria])}>
                            <TrendingUp className="h-3 w-3 shrink-0" />
                            {item.statusRotulo}
                          </span>
                          {item.competencia && (
                            <span className={cn(ETIQUETA_BASE, 'border-primary/25 bg-primary/10 text-primary')}>
                              <Target className="h-3 w-3 shrink-0" />
                              {item.competencia}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Cluster único do canto superior direito: [ ⋯ ] [ X ],
                          lado a lado (gap-2 = 8px), mesma altura (40px) e alvos
                          de clique independentes. O X continua sendo o MESMO
                          `DialogPrimitive.Close` — só saiu do posicionamento
                          absoluto, que o empilhava sobre o ⋯. */}
                      <div className="flex shrink-0 items-center gap-2">
                        {(onFiltrarColaborador || onFiltrarCompetencia) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Mais ações do PDI"
                                className="h-10 w-10 shrink-0 rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                              >
                                <MoreHorizontal className="h-[17px] w-[17px]" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                              {onFiltrarColaborador && item.colaboradorId && (
                                <DropdownMenuItem
                                  className="text-xs"
                                  onClick={() => {
                                    onFiltrarColaborador(item);
                                    onOpenChange(false);
                                  }}
                                >
                                  <Filter className="mr-2 h-3.5 w-3.5" />
                                  Filtrar por este colaborador
                                </DropdownMenuItem>
                              )}
                              {onFiltrarCompetencia && item.competencia && (
                                <DropdownMenuItem
                                  className="text-xs"
                                  onClick={() => {
                                    onFiltrarCompetencia(item);
                                    onOpenChange(false);
                                  }}
                                >
                                  <Filter className="mr-2 h-3.5 w-3.5" />
                                  Filtrar por esta competência
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}

                        {/* Fechar — o MESMO `DialogPrimitive.Close` de antes (um só
                          botão funcional), agora como irmão do ⋯ no cluster. */}
                        <DialogPrimitive.Close asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Fechar"
                            className="h-10 w-10 shrink-0 rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                          >
                            <X className="h-[17px] w-[17px]" />
                          </Button>
                        </DialogPrimitive.Close>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={cascadeItemVariants} className="grid gap-3 sm:grid-cols-2">
                    <Bloco icone={TrendingUp} titulo="Progresso">
                      <p className="text-[12px] leading-relaxed text-muted-foreground">{TEXTO_PROGRESSO_AUSENTE}</p>
                      <p className="text-[11px] leading-snug text-muted-foreground/70">{DETALHE_PROGRESSO_AUSENTE}</p>
                    </Bloco>

                    <Bloco icone={Calendar} titulo="Prazo" tinta={TINTA_PRAZO[item.situacao]}>
                      <p className={cn('text-[13px] font-semibold tabular-nums', TINTA_PRAZO[item.situacao])}>
                        {item.prazoTexto}
                      </p>
                      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', COR_PONTO_PRAZO[item.situacao])} />
                        {ROTULO_PRAZO[item.situacao]} · {item.prazoDescricao}
                      </p>
                    </Bloco>

                    <div className="sm:col-span-2">
                      <Bloco icone={BookOpen} titulo="Ação de desenvolvimento">
                        <p className="text-[12px] leading-relaxed text-muted-foreground">
                          {item.acao ?? 'Nenhuma ação registrada no plano.'}
                        </p>
                      </Bloco>
                    </div>

                    {item.comentarios && (
                      <div className="sm:col-span-2">
                        <Bloco icone={BookOpen} titulo="Comentários">
                          <p className="text-[12px] leading-relaxed text-muted-foreground">{item.comentarios}</p>
                        </Bloco>
                      </div>
                    )}

                    <div className="sm:col-span-2">
                      <Bloco icone={Clock} titulo="Registro">
                        <p className="text-[11px] text-muted-foreground">
                          Criado em {formatarData(item.pdi?.created_at)} · Atualizado em{' '}
                          {formatarData(item.pdi?.updated_at)}
                        </p>
                      </Bloco>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
