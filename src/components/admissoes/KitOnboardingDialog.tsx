/**
 * CRIAÇÃO/EDIÇÃO DE PERFIL DE KIT (Jornada de Onboarding).
 *
 * Antes, o botão "Novo Perfil de Kit" era DECORATIVO (sem `onClick`) e não havia
 * nenhuma tela de escrita — só o `onboarding_kits` de leitura. Este diálogo fecha
 * o CRUD mínimo sobre a tabela EXISTENTE (nenhuma tabela nova):
 *   • nome do kit
 *   • itens (um por linha → `itens` JSONB)
 *   • status ativo/inativo
 *   • imagem do kit (seleção/prévia/substituição/remoção)
 *
 * IMAGEM — LIMITE HONESTO: `public.onboarding_kits` AINDA NÃO tem coluna de
 * imagem. A área de upload é real (validação + prévia local), mas NADA é enviado
 * ao Storage nem gravado no banco: a imagem vale apenas para a SESSÃO atual.
 * Deixamos o campo `imagem_url` já no payload para o dia em que a persistência
 * for autorizada — sem fingir que a imagem foi salva permanentemente.
 *
 * Não grava nada por conta própria: só monta o payload e devolve `onSalvar` —
 * quem grava é o serviço (`onboardingJornadaService`), via mutation do hook.
 */
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ImagePlus, Package, Trash2, X } from 'lucide-react';
import { validateUploadFile } from '@/utils/uploadValidation';
import {
  cascadeContainerVariants,
  cascadeItemVariants,
  cascadeOverlayVariants,
  cascadeShellVariants,
} from '@/components/ui/cascade-motion';
import type { KitOnboarding, KitOnboardingInput } from '@/services/onboardingJornadaService';

/** Limite da imagem do kit (reusa a validação de upload do produto). */
const MAX_IMAGEM_MB = 5;

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
  // Imagem: `preview` é o que aparece na tela (URL de objeto recém-criada OU a
  // imagem de sessão já associada ao kit). NÃO é persistida em lugar nenhum.
  const [imagemPreview, setImagemPreview] = useState<string | null>(null);
  const [erroImagem, setErroImagem] = useState<string | null>(null);
  const inputImagemRef = useRef<HTMLInputElement>(null);
  // URL de objeto criada por nós (se houver) — é a única revogável.
  // NÃO revogamos ao fechar: a URL alimenta o overlay de SESSÃO da grade e só é
  // liberada quando a imagem é trocada/removida ainda dentro do diálogo.
  const objectUrlRef = useRef<string | null>(null);

  // Cada abertura recarrega o formulário do zero (criar) ou do kit (editar).
  useEffect(() => {
    if (!open) return;
    setNome(kit?.nome ?? '');
    setItens(itensParaTexto(kit?.itens ?? []));
    setAtivo(kit?.ativo ?? true);
    setImagemPreview(kit?.imagem_url ?? null);
    setErroImagem(null);
    objectUrlRef.current = null;
  }, [open, kit]);

  const selecionarImagem = (e: ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;
    try {
      validateUploadFile(arquivo, { maxSizeMB: MAX_IMAGEM_MB });
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(arquivo);
      objectUrlRef.current = url;
      setImagemPreview(url);
      setErroImagem(null);
    } catch (err) {
      setErroImagem(err instanceof Error ? err.message : 'Imagem inválida.');
    }
  };

  const removerImagem = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setImagemPreview(null);
    setErroImagem(null);
  };

  const lista = textoParaItens(itens);
  const invalido = nome.trim().length === 0 || lista.length === 0;

  const salvar = () => {
    if (invalido) return;
    // `imagem_url` entra no payload quando há imagem OU quando o kit tinha uma e
    // ela foi removida (`null` sinaliza a remoção). Sem imagem nova e sem imagem
    // anterior, o campo é OMITIDO — assim o contrato do formulário não muda.
    const imagemUrl = imagemPreview ?? (kit?.imagem_url ? null : undefined);
    onSalvar({
      nome: nome.trim(),
      itens: lista,
      ativo,
      ...(imagemUrl === undefined ? {} : { imagem_url: imagemUrl }),
    });
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

                    {/* IMAGEM DO KIT — área real de seleção/prévia/substituição/remoção,
              porém de SESSÃO: não existe coluna no banco para persistir (aviso
              explícito logo abaixo, para não fingir gravação permanente). */}
                    <div className="space-y-1.5">
                      <Label>Imagem do kit</Label>
                      {imagemPreview ? (
                        <div className="overflow-hidden rounded-xl border border-border/40 bg-muted/10">
                          <img src={imagemPreview} alt="Prévia da imagem do kit" className="h-40 w-full object-cover" />
                          <div className="flex items-center justify-between gap-2 p-2.5">
                            <span className="text-[11px] text-muted-foreground">Imagem selecionada</span>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg px-2.5 text-xs"
                                onClick={() => inputImagemRef.current?.click()}
                              >
                                Substituir
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-destructive hover:text-destructive"
                                onClick={removerImagem}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Remover
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => inputImagemRef.current?.click()}
                          aria-label="Adicionar imagem do kit"
                          className="flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/50 p-5 text-center text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                        >
                          <ImagePlus className="h-5 w-5 opacity-60" />
                          <span className="text-[11px] font-medium uppercase tracking-wide">Sem imagem</span>
                          <span className="text-xs">Adicionar imagem</span>
                        </button>
                      )}
                      <input
                        ref={inputImagemRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={selecionarImagem}
                        aria-label="Selecionar imagem do kit"
                      />
                      {erroImagem && <p className="text-[11px] text-destructive">{erroImagem}</p>}
                      <p className="text-[11px] text-muted-foreground">
                        JPG, PNG ou WEBP • até {MAX_IMAGEM_MB}MB. A imagem é exibida nesta sessão; a gravação permanente
                        depende de uma nova coluna no banco (ainda não existe).
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
