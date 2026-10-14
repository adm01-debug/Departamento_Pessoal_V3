import { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ROTULO_TIPO_FEEDBACK, type TipoFeedback } from './feedbacksComum';
// A coreografia é a MESMA da janela "Pendências" — a cadeia é
// `PendenciasDialog` → `AnimatedCascadeDialog` → estas variants. Importar da
// fonte é o que garante movimento IDÊNTICO (nada de réplica local com números
// parecidos) sem tocar em nenhum arquivo compartilhado.
import {
  cascadeContainerVariants,
  cascadeItemVariants,
  cascadeOverlayVariants,
  cascadeShellVariants,
} from '@/components/ui/cascade-motion';

/**
 * ============================================================================
 * DIÁLOGO "NOVO FEEDBACK" — Gestão de Desempenho.
 *
 * Liga o CTA da coluna lateral à mutation REAL que já existe no serviço
 * (`avaliacaoService.criarFeedback` → INSERT em `feedbacks_360`, respeitando o
 * isolamento por `empresa_id`). O diálogo só coleta os campos reais da tabela e
 * delega o envio ao chamador — o MESMO contrato do `NovoCicloDialog`.
 *
 * No modo demonstração (mock ligado) a própria página aborta a escrita via
 * `bloquearEscritaDesempenho`, como nas demais ações do módulo.
 *
 * ── ANIMAÇÃO: A MESMA JANELA "PENDÊNCIAS" ───────────────────────────────────
 * A casca deste modal NÃO usa o `DialogContent` do Design System (que monta
 * caixa e véu sem animação). Ela reproduz a estrutura real de
 * `AnimatedCascadeDialog`, com as MESMAS variants de `cascade-motion.ts`:
 *
 *   • CAIXA — nasce como um quadrado pequeno e estica em três fases no mesmo
 *     timeline (`scaleX/scaleY` 0 → 0,16 → largura → altura), 0,9 s, `easeInOut`,
 *     origem `top center`;
 *   • VÉU — `bg-black/60 backdrop-blur-sm` com opacidade 0 → 1 em 0,25 s (o
 *     escurecimento é gradual e o blur entra JUNTO, nunca depois);
 *   • CONTEÚDO — só começa quando a caixa termina de abrir
 *     (`delayChildren` = 0,9 s) e entra bloco a bloco (`y: 8 → 0`, 0,35 s);
 *   • FECHAMENTO — o inverso: os blocos somem de trás para frente e só então a
 *     caixa encolhe (altura primeiro, depois largura), com o véu acompanhando a
 *     saída inteira. O conteúdo só é desmontado quando a transição termina
 *     (`AnimatePresence` + `forceMount`).
 *
 * O contêiner da cascata usa `display: contents`: ele só propaga as variants e
 * NÃO cria caixa, então os blocos continuam sendo os itens do grid da própria
 * caixa — o layout do formulário fica byte a byte igual ao de antes.
 *
 * Acessibilidade, foco, `Esc`, clique fora e bloqueio de rolagem continuam
 * sendo do Radix (`DialogPrimitive`), como na referência.
 * ============================================================================
 */

const TIPOS: TipoFeedback[] = ['gestor', 'par', 'auto', 'subordinado'];

/**
 * Blocos que cascateiam dentro da caixa — a MESMA contagem da referência
 * (`itens + 1`): cabeçalho, grade de campos, textos e rodapé. Desse número sai
 * o atraso com que a caixa começa a encolher no fechamento.
 */
const BLOCOS_CASCATA = 4;

interface NovoFeedbackDialogProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  /** Colaboradores reais da empresa (avaliado/avaliador). */
  colaboradores: { id: string; nome_completo: string }[];
  /** Ciclos reais cadastrados. */
  ciclos: { id: string; nome: string }[];
  /** Ciclo pré-selecionado (o que está em foco na aba). */
  cicloIdPadrao?: string;
  onSubmit: (dados: Record<string, unknown>) => void;
  salvando?: boolean;
}

export function NovoFeedbackDialog({
  aberto,
  onOpenChange,
  colaboradores,
  ciclos,
  cicloIdPadrao,
  onSubmit,
  salvando = false,
}: NovoFeedbackDialogProps) {
  const [avaliadoId, setAvaliadoId] = useState('');
  const [avaliadorId, setAvaliadorId] = useState('');
  const [tipo, setTipo] = useState<TipoFeedback>('gestor');
  const [nota, setNota] = useState('4');
  const [potencial, setPotencial] = useState('4');
  const [cicloId, setCicloId] = useState(cicloIdPadrao ?? '');
  const [pontosFortes, setPontosFortes] = useState('');
  const [pontosMelhoria, setPontosMelhoria] = useState('');
  const [comentarios, setComentarios] = useState('');

  const podeSalvar = Boolean(avaliadoId && avaliadorId) && !salvando;

  const enviar = () => {
    if (!podeSalvar) return;
    onSubmit({
      avaliado_id: avaliadoId,
      avaliador_id: avaliadorId,
      tipo,
      nota_geral: Number(nota),
      potencial: Number(potencial),
      ciclo_id: cicloId || null,
      pontos_fortes: pontosFortes.trim(),
      pontos_melhoria: pontosMelhoria.trim(),
      comentarios: comentarios.trim(),
      status: 'pendente',
    });
    onOpenChange(false);
    setPontosFortes('');
    setPontosMelhoria('');
    setComentarios('');
  };

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

                {/* CONTÊINER DA CASCATA — `contents` para não criar caixa: os
                    blocos continuam sendo os itens do grid da própria caixa,
                    então o layout do formulário não muda em nada. */}
                <motion.div
                  className="contents"
                  variants={cascadeContainerVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                >
                  <motion.div variants={cascadeItemVariants}>
                    <DialogHeader>
                      <DialogTitle className="font-display text-base">Novo feedback</DialogTitle>
                      <DialogDescription className="text-[11px]">
                        O registro entra como{' '}
                        <span className="font-medium text-foreground">pendente</span> no ciclo escolhido.
                      </DialogDescription>
                    </DialogHeader>
                  </motion.div>

        {/* Grade de campos — item da cascata, com as variants da referência. */}
        <motion.div variants={cascadeItemVariants} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[11px]">Avaliado</Label>
            <Select value={avaliadoId} onValueChange={setAvaliadoId}>
              <SelectTrigger aria-label="Avaliado" className="h-9 rounded-lg">
                <SelectValue placeholder="Selecione" />
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
            <Label className="text-[11px]">Avaliador</Label>
            <Select value={avaliadorId} onValueChange={setAvaliadorId}>
              <SelectTrigger aria-label="Avaliador do feedback" className="h-9 rounded-lg">
                <SelectValue placeholder="Selecione" />
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
            <Label className="text-[11px]">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoFeedback)}>
              <SelectTrigger aria-label="Tipo de feedback" className="h-9 rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {ROTULO_TIPO_FEEDBACK[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Ciclo</Label>
            <Select value={cicloId || '__vazio'} onValueChange={(v) => setCicloId(v === '__vazio' ? '' : v)}>
              <SelectTrigger aria-label="Ciclo do feedback" className="h-9 rounded-lg">
                <SelectValue placeholder="Sem ciclo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__vazio">Sem ciclo</SelectItem>
                {ciclos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Nota (1–5)</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px]">Potencial (1–5)</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={potencial}
              onChange={(e) => setPotencial(e.target.value)}
              className="h-9"
            />
          </div>
        </motion.div>

        <motion.div variants={cascadeItemVariants} className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[11px]">Pontos fortes</Label>
            <Textarea rows={2} value={pontosFortes} onChange={(e) => setPontosFortes(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px]">Pontos de melhoria</Label>
            <Textarea rows={2} value={pontosMelhoria} onChange={(e) => setPontosMelhoria(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px]">Comentários</Label>
            <Textarea rows={3} value={comentarios} onChange={(e) => setComentarios(e.target.value)} />
          </div>
        </motion.div>

        <motion.div variants={cascadeItemVariants}>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-9" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="sm" className="h-9" onClick={enviar} disabled={!podeSalvar}>
              {salvando ? 'Salvando...' : 'Salvar feedback'}
            </Button>
          </DialogFooter>
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
