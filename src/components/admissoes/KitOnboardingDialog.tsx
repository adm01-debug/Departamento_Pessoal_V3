/**
 * CRIAÇÃO/EDIÇÃO DE PERFIL DE KIT (Jornada de Onboarding).
 *
 * Antes, o botão "Novo Perfil de Kit" era DECORATIVO (sem `onClick`) e não havia
 * nenhuma tela de escrita — só o `onboarding_kits` de leitura. Este diálogo fecha
 * o CRUD mínimo sobre a tabela EXISTENTE (nenhuma tabela nova):
 *   • nome do kit
 *   • itens (um por linha → `itens` JSONB)
 *   • status ativo/inativo
 *
 * SEM CAMPO DE IMAGEM: `public.onboarding_kits` não tem coluna de imagem e o
 * serviço ignora `imagem_url` na gravação. Um campo cuja imagem desaparece ao
 * recarregar é pior que campo nenhum, então o formulário não o oferece.
 *
 * Não grava nada por conta própria: só monta o payload e devolve `onSalvar` —
 * quem grava é o serviço (`onboardingJornadaService`), via mutation do hook.
 */
import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Package, X } from 'lucide-react';
import {
  cascadeContainerVariants,
  cascadeItemVariants,
  cascadeOverlayVariants,
  cascadeShellVariants,
} from '@/components/ui/cascade-motion';
import type { KitOnboarding, KitOnboardingInput } from '@/services/onboardingJornadaService';

/**
 * ANIMAÇÃO DE ENTRADA/SAÍDA — a MESMA da janela "Pendências".
 *
 * "Pendências" usa `AnimatedCascadeDialog`, cuja coreografia mora em
 * `@/components/ui/cascade-motion` (fonte única). Reutilizamos AQUI os MESMOS
 * variants/durações (nada de animação nova nem de valores "aproximados"):
 *   • casco abre de dentro para fora (`cascadeShellVariants`);
 *   • conteúdo cascateia (cabeçalho → corpo → rodapé) (`cascadeItemVariants` +
 *     `cascadeContainerVariants`);
 *   • véu com fade (`cascadeOverlayVariants`) — só a animação, aparência igual;
 *   • saída é o inverso exato (mesmos variants, `exit="closed"`).
 * Blocos = cabeçalho + corpo + rodapé (3), igual às outras janelas grandes.
 */
const BLOCOS_CASCATA = 3;
const SHELL_CASCATA = cascadeShellVariants(BLOCOS_CASCATA);
const OVERLAY_CASCATA = cascadeOverlayVariants(BLOCOS_CASCATA);

/** Itens: uma linha por item (linhas em branco são descartadas). */
export function itensParaTexto(itens: string[]): string {
  return itens.join('\n');
}

export function textoParaItens(texto: string): string[] {
  return texto
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

interface KitOnboardingDialogProps {
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  /** `null`/omitido = criar. Com kit = editar aquele perfil. */
  kit?: KitOnboarding | null;
  salvando?: boolean;
  onSalvar: (entrada: KitOnboardingInput) => void;
}

export function KitOnboardingDialog({ open, onOpenChange, kit, salvando, onSalvar }: KitOnboardingDialogProps) {
  const [nome, setNome] = useState('');
  const [itens, setItens] = useState('');
  const [ativo, setAtivo] = useState(true);

  // Cada abertura recarrega o formulário do zero (criar) ou do kit (editar).
  useEffect(() => {
    if (!open) return;
    setNome(kit?.nome ?? '');
    setItens(itensParaTexto(kit?.itens ?? []));
    setAtivo(kit?.ativo ?? true);
  }, [open, kit]);

  const lista = textoParaItens(itens);
  const invalido = nome.trim().length === 0 || lista.length === 0;

  const salvar = () => {
    if (invalido) return;
    // `imagem_url` NÃO entra no payload: a coluna não existe e o serviço ignora
    // o campo, então não há o que enviar.
    onSalvar({ nome: nome.trim(), itens: lista, ativo });
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <DialogPrimitive.Portal forceMount>
            {/* VÉU — MESMA animação de "Pendências" (fade via
                `cascadeOverlayVariants`); a APARÊNCIA do véu não muda. */}
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/60"
                variants={OVERLAY_CASCATA}
                initial="closed"
                animate="open"
                exit="closed"
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild forceMount>
              {/* CASCO — abre "de dentro para fora" na MESMA coreografia da
                  janela "Pendências" (`cascadeShellVariants`). O visual do modal
                  (max-w, borda, fundo, sombra, grid/gap) e o conteúdo seguem
                  IDÊNTICOS aos de antes. */}
              <motion.div
                className="fixed left-[50%] top-[50%] z-50 w-full max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-hidden border bg-background shadow-lg sm:rounded-lg"
                style={{ transformOrigin: 'top center' }}
                variants={SHELL_CASCATA}
                initial="closed"
                animate="open"
                exit="closed"
              >
                <motion.div
                  className="grid gap-3 p-5"
                  variants={cascadeContainerVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                >
                  {/* CABEÇALHO — 1º bloco da cascata. */}
                  <motion.div
                    variants={cascadeItemVariants}
                    className="flex flex-col space-y-1 text-center sm:text-left"
                  >
                    <DialogPrimitive.Title className="flex items-center gap-2 text-[17px] font-semibold leading-snug tracking-tight">
                      <Package className="h-5 w-5 text-primary" />
                      {kit ? `Editar ${kit.nome}` : 'Novo perfil de kit'}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="text-[13px] text-muted-foreground">
                      {kit
                        ? 'Ajuste os equipamentos vinculados a este perfil.'
                        : 'Defina os equipamentos e acessos do perfil.'}
                    </DialogPrimitive.Description>
                  </motion.div>

                  {/* CORPO — 2º bloco da cascata (o formulário, intacto). */}
                  <motion.div variants={cascadeItemVariants} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="kit-nome">Nome do kit</Label>
                      <Input
                        id="kit-nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Kit Desenvolvedor"
                        aria-label="Nome do kit"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="kit-itens">Itens (um por linha)</Label>
                      <Textarea
                        id="kit-itens"
                        value={itens}
                        onChange={(e) => setItens(e.target.value)}
                        placeholder={'Notebook\nHeadset\nCrachá'}
                        aria-label="Itens do kit"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {lista.length} item{lista.length === 1 ? '' : 's'} no perfil.
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border/40 p-3">
                      <div>
                        <p className="text-[13px] font-medium">Perfil ativo</p>
                        <p className="text-[11px] text-muted-foreground">Perfis inativos saem da grade da jornada.</p>
                      </div>
                      <Switch checked={ativo} onCheckedChange={setAtivo} aria-label="Perfil ativo" />
                    </div>
                  </motion.div>

                  {/* RODAPÉ — 3º bloco da cascata (mesmos botões/estilos). */}
                  <motion.div
                    variants={cascadeItemVariants}
                    className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-1"
                  >
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => onOpenChange(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" className="rounded-xl" disabled={invalido || salvando} onClick={salvar}>
                      {salvando ? 'Salvando…' : 'Salvar perfil'}
                    </Button>
                  </motion.div>
                </motion.div>

                <DialogPrimitive.Close className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md opacity-70 transition-colors hover:bg-accent hover:opacity-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Fechar</span>
                </DialogPrimitive.Close>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
