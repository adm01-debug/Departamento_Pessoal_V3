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
 * DIÁLOGO "NOVA META" — Gestão de Desempenho.
 *
 * Entrada de criação da aba "Metas & OKRs", ligada à mutation `criarMeta` da
 * `AvaliacaoPage` (`avaliacaoService.criarMeta` → INSERT em `metas_okrs`, com
 * `empresa_id` resolvido pela própria página). Os campos são exatamente as
 * colunas da tabela; o diálogo só coleta e delega.
 *
 * A coreografia é a MESMA de `NovoCicloDialog` (variants de
 * `ui/cascade-motion`) — nenhuma animação nova.
 * ============================================================================
 */

const BLOCOS_CASCATA = 3;
const SHELL_CASCATA = cascadeShellVariants(BLOCOS_CASCATA);
const OVERLAY_CASCATA = cascadeOverlayVariants(BLOCOS_CASCATA);

const MotionDialogHeader = motion.create(DialogHeader);
const MotionDialogFooter = motion.create(DialogFooter);

/** Sentinela de "sem seleção" — `SelectItem` não aceita value vazio. */
const VAZIO = '__vazio';

export interface NovaMetaDados {
  titulo: string;
  descricao: string | null;
  tipo: string;
  colaborador_id: string | null;
  ciclo_id: string | null;
  meta_valor: number | null;
  valor_atual: number;
  data_limite: string | null;
}

/** Tipos de meta — o default da coluna `tipo` em `metas_okrs` é `individual`. */
const TIPOS = [
  { valor: 'individual', rotulo: 'Individual' },
  { valor: 'equipe', rotulo: 'Equipe' },
  { valor: 'empresa', rotulo: 'Empresa' },
];

interface NovaMetaDialogProps {
  colaboradores: { id: string; nome_completo: string }[];
  ciclos: { id: string; nome: string }[];
  onSubmit: (dados: NovaMetaDados) => void;
  salvando?: boolean;
}

export function NovaMetaDialog({ colaboradores, ciclos, onSubmit, salvando }: NovaMetaDialogProps) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState('individual');
  const [colaboradorId, setColaboradorId] = useState(VAZIO);
  const [cicloId, setCicloId] = useState(VAZIO);
  const [metaValor, setMetaValor] = useState('');
  const [valorAtual, setValorAtual] = useState('');
  const [dataLimite, setDataLimite] = useState('');

  const valido = titulo.trim().length > 0;

  const limpar = () => {
    setTitulo('');
    setDescricao('');
    setTipo('individual');
    setColaboradorId(VAZIO);
    setCicloId(VAZIO);
    setMetaValor('');
    setValorAtual('');
    setDataLimite('');
  };

  const numero = (v: string): number | null => {
    const t = v.trim();
    if (!t) return null;
    const n = Number(t.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  const enviar = () => {
    if (!valido) return;
    onSubmit({
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      tipo,
      colaborador_id: colaboradorId === VAZIO ? null : colaboradorId,
      ciclo_id: cicloId === VAZIO ? null : cicloId,
      meta_valor: numero(metaValor),
      valor_atual: numero(valorAtual) ?? 0,
      data_limite: dataLimite || null,
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
          <Plus className="h-4 w-4" /> Nova Meta
        </Button>
      </DialogTrigger>
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
              <motion.div
                className="fixed left-[50%] top-[50%] z-50 w-full max-w-[460px] translate-x-[-50%] translate-y-[-50%] overflow-hidden border bg-background shadow-lg sm:max-w-[480px] sm:rounded-lg"
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
                  <MotionDialogHeader variants={cascadeItemVariants}>
                    <DialogTitle>Nova Meta / OKR</DialogTitle>
                    <DialogDescription>Defina o objetivo, o responsável e o prazo da meta.</DialogDescription>
                  </MotionDialogHeader>

                  <motion.div variants={cascadeItemVariants} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="nova-meta-titulo">Título *</Label>
                      <Input
                        id="nova-meta-titulo"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        placeholder="Ex.: Reduzir turnover em 10%"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="nova-meta-descricao">Descrição</Label>
                      <Textarea
                        id="nova-meta-descricao"
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        placeholder="O que precisa acontecer para a meta ser atingida"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
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
                        <Label htmlFor="nova-meta-prazo">Prazo</Label>
                        <Input
                          id="nova-meta-prazo"
                          type="date"
                          value={dataLimite}
                          onChange={(e) => setDataLimite(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Responsável</Label>
                        <Select value={colaboradorId} onValueChange={setColaboradorId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sem responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={VAZIO}>Sem responsável</SelectItem>
                            {colaboradores.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.nome_completo}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Ciclo</Label>
                        <Select value={cicloId} onValueChange={setCicloId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sem ciclo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={VAZIO}>Sem ciclo</SelectItem>
                            {ciclos.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="nova-meta-alvo">Valor alvo</Label>
                        <Input
                          id="nova-meta-alvo"
                          inputMode="decimal"
                          value={metaValor}
                          onChange={(e) => setMetaValor(e.target.value)}
                          placeholder="Ex.: 100"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="nova-meta-atual">Valor atual</Label>
                        <Input
                          id="nova-meta-atual"
                          inputMode="decimal"
                          value={valorAtual}
                          onChange={(e) => setValorAtual(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </motion.div>

                  <MotionDialogFooter variants={cascadeItemVariants}>
                    <Button variant="outline" onClick={() => setAberto(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={enviar} disabled={!valido || salvando}>
                      {salvando ? 'Criando...' : 'Criar meta'}
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
