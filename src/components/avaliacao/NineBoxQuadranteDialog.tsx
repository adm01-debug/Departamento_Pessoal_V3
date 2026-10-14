import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, X } from 'lucide-react';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
// A coreografia é a MESMA da janela "Pendências" — a cadeia é
// `PendenciasDialog` → `AnimatedCascadeDialog` → estas variants. Importar da
// fonte (`@/components/ui/cascade-motion`) é o que garante movimento IDÊNTICO —
// nenhuma réplica local com números "parecidos" — sem tocar em nenhum arquivo
// compartilhado.
import {
  cascadeContainerVariants,
  cascadeItemVariants,
  cascadeOverlayVariants,
  cascadeShellVariants,
} from '@/components/ui/cascade-motion';
import { iniciais } from './desempenhoComum';
import { PELE_QUADRANTE, QUADRANTE_POR_CHAVE, type PontoNineBox, type QuadranteKey } from './nineBoxComum';

/**
 * ============================================================================
 * LISTA DO QUADRANTE — o destino real do clique em uma célula da matriz.
 *
 * Mostra as pessoas daquele quadrante com o que existe de verdade: nome, cargo,
 * departamento, as duas NOTAS (desempenho e potencial) e se há PDI vinculado.
 * Nenhuma ação inventada (sem editar, sem mover de quadrante): a lista é de
 * leitura, como o resto da aba.
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
 *     bloco a bloco (`y: 8 → 0`, 0,35 s): o cabeçalho e cada colaborador da
 *     lista;
 *   • FECHAMENTO — o inverso: os blocos somem de trás para frente e só então a
 *     caixa encolhe (altura primeiro, depois largura), com o véu acompanhando a
 *     saída inteira; o conteúdo só é desmontado no fim (`AnimatePresence` +
 *     `forceMount`).
 *
 * O contêiner da cascata usa `display: contents`: propaga as variants sem criar
 * caixa, então o cabeçalho, a lista e a mensagem de vazio continuam sendo os
 * itens do grid da própria caixa (largura, padding, raio, bordas e espaçamentos
 * seguem idênticos). Cada linha da lista continua sendo um `li` de um `ul` — o
 * elemento animado é o próprio `li` (`motion.li`), não um `div` extra.
 *
 * Foco, `Esc`, clique fora, `aria-describedby` e bloqueio de rolagem continuam
 * sendo do Radix (`DialogPrimitive`), como na referência. `cascade-motion` não
 * trata `prefers-reduced-motion` — e a referência também não, então o
 * comportamento é o mesmo de "Pendências" (nada de movimento extra nem a menos).
 * ============================================================================
 */

interface NineBoxQuadranteDialogProps {
  chave: QuadranteKey | null;
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  pessoas: PontoNineBox[];
}

export function NineBoxQuadranteDialog({ chave, aberto, onOpenChange, pessoas }: NineBoxQuadranteDialogProps) {
  // `chave` fica preenchida durante a SAÍDA (o pai separa "qual quadrante" de
  // "está aberto", como `PdiTab` faz com `detalhe`/`detalheAberto`): se ela
  // voltasse a `null` no fechamento, este `return` desmontaria a caixa no
  // primeiro frame e o `AnimatePresence` não teria o que animar.
  if (!chave) return null;

  const meta = QUADRANTE_POR_CHAVE[chave];
  const pele = PELE_QUADRANTE[chave];

  // Blocos que cascateiam dentro da caixa — a MESMA contagem da referência
  // (`itens + 1`): o cabeçalho + cada colaborador (ou a mensagem de vazio).
  // Desse número sai só o instante em que a caixa começa a encolher no
  // fechamento.
  const blocos = 1 + Math.max(1, pessoas.length);
  const shellVariants = cascadeShellVariants(blocos);
  const overlayVariants = cascadeOverlayVariants(blocos);

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

            {/* CAIXA — as MESMAS classes visuais do `DialogContent` do Design
                System que esta janela já usava (largura `max-w-lg`, padding,
                borda, raio, sombra) + a coreografia da referência.
                `transformOrigin: top center` é o que faz o quadrado nascer
                ancorado no topo, como em "Pendências". */}
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-3 border bg-background p-5 shadow-lg sm:rounded-lg"
                style={{ transformOrigin: 'top center' }}
                variants={shellVariants}
                initial="closed"
                animate="open"
                exit="closed"
              >
                <DialogPrimitive.Close className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md opacity-70 transition-colors hover:bg-accent hover:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Fechar</span>
                </DialogPrimitive.Close>

                {/* CONTÊINER DA CASCATA — `contents` para não criar caixa: o
                    cabeçalho, a lista e a mensagem de vazio seguem sendo os itens
                    do grid da própria caixa, então o layout não muda em nada. */}
                <motion.div
                  className="contents"
                  variants={cascadeContainerVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                >
                  <motion.div variants={cascadeItemVariants}>
                    <DialogHeader>
                      <DialogTitle className={cn('font-display text-base', pele.tinta)}>{meta.nome}</DialogTitle>
                      <DialogDescription className="text-[11px]">
                        {meta.leitura} · {pessoas.length} {pessoas.length === 1 ? 'colaborador' : 'colaboradores'}
                      </DialogDescription>
                    </DialogHeader>
                  </motion.div>

                  {pessoas.length === 0 ? (
                    <motion.p
                      variants={cascadeItemVariants}
                      className="flex items-center gap-2 rounded-lg border border-dashed border-border/50 px-3 py-4 text-[12px] text-muted-foreground"
                    >
                      <Users className="h-4 w-4 shrink-0" />
                      Nenhum colaborador neste quadrante no recorte atual.
                    </motion.p>
                  ) : (
                    <ul className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
                      {pessoas.map((p) => (
                        <motion.li
                          key={p.id}
                          variants={cascadeItemVariants}
                          className="flex min-w-0 items-center gap-2.5 rounded-lg border border-border/50 bg-background/50 p-2.5"
                        >
                          <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-inset ring-border/60">
                            {p.foto ? (
                              <img src={p.foto} alt="" loading="lazy" className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center bg-muted/60 text-[10px] font-semibold text-muted-foreground">
                                {iniciais(p.nome)}
                              </span>
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-medium leading-tight">{p.nome}</p>
                            <p className="truncate text-[10px] leading-tight text-muted-foreground">
                              {[p.cargo, p.departamento].filter(Boolean).join(' · ') ||
                                'Sem cargo e departamento cadastrados'}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-[10px] leading-tight text-muted-foreground">
                              Desempenho{' '}
                              <span className="font-semibold tabular-nums text-foreground">{p.nota ?? '—'}</span>
                            </p>
                            <p className="text-[10px] leading-tight text-muted-foreground">
                              Potencial{' '}
                              <span className="font-semibold tabular-nums text-foreground">{p.potencial ?? '—'}</span>
                            </p>
                          </div>
                          <span
                            className={cn(
                              'shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                              p.temPdi
                                ? 'border-success/30 bg-success/10 text-success'
                                : 'border-border/60 bg-muted/40 text-muted-foreground'
                            )}
                          >
                            {p.temPdi ? 'Com PDI' : 'Sem PDI'}
                          </span>
                        </motion.li>
                      ))}
                    </ul>
                  )}
                </motion.div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
