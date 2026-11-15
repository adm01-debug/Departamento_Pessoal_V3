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
 * DIÁLOGO "NOVO PDI" — Gestão de Desempenho.
 *
 * Entrada de criação da aba "PDIs", ligada à mutation `criarPDI` da
 * `AvaliacaoPage` (`avaliacaoService.criarPDI` → INSERT em
 * `pdi_plano_desenvolvimento`, com `empresa_id` resolvido pela página).
 *
 * `status` respeita o CHECK da tabela
 * (`pendente | em_andamento | concluido | cancelado`); a criação oferece só os
 * dois estados iniciais. Coreografia idêntica a `NovoCicloDialog`.
 * ============================================================================
 */

const BLOCOS_CASCATA = 3;
const SHELL_CASCATA = cascadeShellVariants(BLOCOS_CASCATA);
const OVERLAY_CASCATA = cascadeOverlayVariants(BLOCOS_CASCATA);

const MotionDialogHeader = motion.create(DialogHeader);
const MotionDialogFooter = motion.create(DialogFooter);

export interface NovoPdiDados {
  titulo: string;
  colaborador_id: string;
  competencia_foco: string | null;
  acao_desenvolvimento: string | null;
  prazo: string | null;
  status: string;
}

/** Estados iniciais permitidos pelo CHECK de `pdi_plano_desenvolvimento`. */
const STATUS_INICIAIS = [
  { valor: 'pendente', rotulo: 'Pendente' },
  { valor: 'em_andamento', rotulo: 'Em andamento' },
];

interface NovoPdiDialogProps {
  colaboradores: { id: string; nome_completo: string }[];
  onSubmit: (dados: NovoPdiDados) => void;
  salvando?: boolean;
}

export function NovoPdiDialog({ colaboradores, onSubmit, salvando }: NovoPdiDialogProps) {
  const [aberto, setAberto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [colaboradorId, setColaboradorId] = useState('');
  const [competencia, setCompetencia] = useState('');
  const [acao, setAcao] = useState('');
  const [prazo, setPrazo] = useState('');
  const [status, setStatus] = useState('pendente');

  const valido = titulo.trim().length > 0 && colaboradorId.trim().length > 0;

  const limpar = () => {
    setTitulo('');
    setColaboradorId('');
    setCompetencia('');
    setAcao('');
    setPrazo('');
    setStatus('pendente');
  };

  const enviar = () => {
    if (!valido) return;
    onSubmit({
      titulo: titulo.trim(),
      colaborador_id: colaboradorId,
      competencia_foco: competencia.trim() || null,
      acao_desenvolvimento: acao.trim() || null,
      prazo: prazo || null,
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
          <Plus className="h-4 w-4" /> Novo PDI
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
                    <DialogTitle>Novo Plano de Desenvolvimento</DialogTitle>
                    <DialogDescription>Defina o dono do plano, a competência foco e o prazo.</DialogDescription>
                  </MotionDialogHeader>

                  <motion.div variants={cascadeItemVariants} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="novo-pdi-titulo">Título *</Label>
                      <Input
                        id="novo-pdi-titulo"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        placeholder="Ex.: Plano de liderança 2027"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Colaborador *</Label>
                      <Select value={colaboradorId} onValueChange={setColaboradorId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o colaborador" />
                        </SelectTrigger>
                        <SelectContent>
                          {colaboradores.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nome_completo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="novo-pdi-competencia">Competência foco</Label>
                      <Input
                        id="novo-pdi-competencia"
                        value={competencia}
                        onChange={(e) => setCompetencia(e.target.value)}
                        placeholder="Ex.: Comunicação"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="novo-pdi-acao">Ação de desenvolvimento</Label>
                      <Textarea
                        id="novo-pdi-acao"
                        value={acao}
                        onChange={(e) => setAcao(e.target.value)}
                        placeholder="O que será feito para desenvolver a competência"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="novo-pdi-prazo">Prazo</Label>
                        <Input
                          id="novo-pdi-prazo"
                          type="date"
                          value={prazo}
                          onChange={(e) => setPrazo(e.target.value)}
                        />
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
                      {salvando ? 'Criando...' : 'Criar PDI'}
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
