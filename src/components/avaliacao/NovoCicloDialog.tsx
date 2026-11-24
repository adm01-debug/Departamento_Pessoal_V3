import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  cascadeContainerVariants,
  cascadeItemVariants,
  cascadeOverlayVariants,
  cascadeShellVariants,
} from '@/components/ui/cascade-motion';
import { Plus, X } from 'lucide-react';

/**
 * ============================================================================
 * DIÁLOGO "NOVO CICLO" — Gestão de Desempenho.
 *
 * Ação funcional ligada à mutation `criarCiclo` que já existia na página
 * (`avaliacaoService.criarCiclo` → INSERT em `ciclos_avaliacao`, respeitando o
 * isolamento por `empresa_id`). O diálogo apenas coleta os campos reais da
 * tabela e delega o envio; nenhum comportamento decorativo.
 *
 * ANIMAÇÃO DE ENTRADA/SAÍDA — a MESMA da janela "Pendências".
 *
 * "Pendências" usa `AnimatedCascadeDialog`, cuja coreografia mora em
 * `@/components/ui/cascade-motion` (fonte única do sistema — nenhuma animação
 * nova é criada aqui, nem valores "aproximados"): o casco nasce como um quadrado
 * pequeno e abre "de dentro para fora" (`cascadeShellVariants`), só então o
 * conteúdo cascateia (cabeçalho → corpo → rodapé, `cascadeItemVariants` +
 * `cascadeContainerVariants`) e o véu entra em fade (`cascadeOverlayVariants`).
 * A saída é o inverso exato dos MESMOS variants (`exit="closed"`): os blocos
 * somem de trás para frente e só depois o casco encolhe. É a montagem
 * Radix + Framer já usada pelas outras janelas grandes do sistema
 * (`NovaAdmissaoDialog`, `KitOnboardingDialog`, `DetalhesAdmissaoDialog`) —
 * `AnimatePresence` + `forceMount` mantêm a árvore viva até o fim do exit.
 *
 * O visual/formulário NÃO muda: o `max-w`, a borda, o fundo, a sombra, o
 * `grid gap-3 p-5` (que antes vivia no `DialogContent` e passou para o
 * contêiner da cascata) e o X continuam idênticos.
 * ============================================================================
 */

/** Blocos que cascateiam: cabeçalho + corpo + rodapé. */
const BLOCOS_CASCATA = 3;
const SHELL_CASCATA = cascadeShellVariants(BLOCOS_CASCATA);
const OVERLAY_CASCATA = cascadeOverlayVariants(BLOCOS_CASCATA);

/** `DialogHeader`/`DialogFooter` animáveis — mesmo padrão de `NovaAdmissaoDialog`. */
const MotionDialogHeader = motion.create(DialogHeader);
const MotionDialogFooter = motion.create(DialogFooter);

export interface NovoCicloDados {
  nome: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  tipo: string;
  status: string;
}

const TIPOS = [
  { valor: 'semestral', rotulo: 'Semestral' },
  { valor: 'anual', rotulo: 'Anual' },
  { valor: 'trimestral', rotulo: 'Trimestral' },
  { valor: 'experiencia', rotulo: 'Experiência' },
];

const STATUS_INICIAIS = [
  { valor: 'rascunho', rotulo: 'Rascunho' },
  { valor: 'ativo', rotulo: 'Ativo' },
];

interface NovoCicloDialogProps {
  onSubmit: (dados: NovoCicloDados) => void;
  salvando?: boolean;
}

export function NovoCicloDialog({ onSubmit, salvando }: NovoCicloDialogProps) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState('semestral');
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [status, setStatus] = useState('rascunho');

  const valido = nome.trim().length > 0 && !!inicio && !!fim;

  const limpar = () => {
    setNome('');
    setDescricao('');
    setTipo('semestral');
    setInicio('');
    setFim('');
    setStatus('rascunho');
  };

  const enviar = () => {
    if (!valido) return;
    onSubmit({
      nome: nome.trim(),
      descricao: descricao.trim(),
      data_inicio: inicio,
      data_fim: fim,
      tipo,
      status,
    });
    limpar();
    setAberto(false);
  };

  return (
    <Dialog
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (!o) limpar();
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-11 gap-1.5 rounded-xl bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-glow-sm"
        >
          <Plus className="h-4 w-4" /> Novo Ciclo
        </Button>
      </DialogTrigger>
      {/* Mesma montagem da janela "Pendências" (`AnimatePresence` + `forceMount`
          mantêm a árvore viva no exit; variants de `ui/cascade-motion.ts`). */}
      <AnimatePresence>
        {aberto && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                variants={OVERLAY_CASCATA}
                initial="closed"
                animate="open"
                exit="closed"
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild forceMount>
              {/* CASCO — o mesmo tamanho/look do `DialogContent` de antes
                  (`max-w-[460px]` + `sm:max-w-[480px]`, borda, fundo, sombra);
                  só o movimento é novo. */}
              <motion.div
                className="fixed left-[50%] top-[50%] z-50 w-full max-w-[460px] translate-x-[-50%] translate-y-[-50%] overflow-hidden border bg-background shadow-lg sm:max-w-[480px] sm:rounded-lg"
                style={{ transformOrigin: 'top center' }}
                variants={SHELL_CASCATA}
                initial="closed"
                animate="open"
                exit="closed"
              >
                {/* CONTÊINER da cascata: carrega o `grid gap-3 p-5` que antes
                    vivia no `DialogContent` — layout idêntico. */}
                <motion.div
                  className="grid gap-3 p-5"
                  variants={cascadeContainerVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                >
                  <MotionDialogHeader variants={cascadeItemVariants}>
                    <DialogTitle>Novo Ciclo de Avaliação</DialogTitle>
                    <DialogDescription>Defina o período e o tipo do ciclo de desempenho.</DialogDescription>
                  </MotionDialogHeader>

                  <motion.div variants={cascadeItemVariants} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="novo-ciclo-nome">Nome *</Label>
                      <Input
                        id="novo-ciclo-nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        placeholder="Ex.: Ciclo S1 2027"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="novo-ciclo-descricao">Descrição</Label>
                      <Textarea
                        id="novo-ciclo-descricao"
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        placeholder="Objetivo do ciclo"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="novo-ciclo-inicio">Início *</Label>
                        <Input
                          id="novo-ciclo-inicio"
                          type="date"
                          value={inicio}
                          onChange={(e) => setInicio(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="novo-ciclo-fim">Fim *</Label>
                        <Input id="novo-ciclo-fim" type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Tipo</Label>
                        <Select value={tipo} onValueChange={setTipo}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIPOS.map((t) => (
                              <SelectItem key={t.valor} value={t.valor}>
                                {t.rotulo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Status inicial</Label>
                        <Select value={status} onValueChange={setStatus}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_INICIAIS.map((s) => (
                              <SelectItem key={s.valor} value={s.valor}>
                                {s.rotulo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </motion.div>

                  <MotionDialogFooter variants={cascadeItemVariants}>
                    <Button variant="outline" onClick={() => setAberto(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={enviar} disabled={!valido || salvando}>
                      {salvando ? 'Criando...' : 'Criar ciclo'}
                    </Button>
                  </MotionDialogFooter>
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
    </Dialog>
  );
}
