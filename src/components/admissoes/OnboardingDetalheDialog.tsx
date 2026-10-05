/**
 * Detalhe do onboarding — a janela que a versão anterior não tinha.
 *
 * O checklist completo de tarefas (com o botão "Concluir" por tarefa) SAiu do
 * card e passou a viver AQUI, aberto por "Ver onboarding". Assim o card da grade
 * fica compacto e esta tela pode ser densa sem poluir a listagem.
 *
 * Mesma receita de janela do sistema (`DetalhesAdmissaoDialog`,
 * `AnimatedCascadeDialog`): Radix + Framer, véu `bg-black/60 backdrop-blur-sm`,
 * casca que abre de dentro para fora (`cascadeShellVariants`) e cascata de
 * entrada/saída (`cascadeItemVariants`). Nada de coreografia nova.
 *
 * FUNCIONALIDADE: cada tarefa pendente tem "Concluir" (a MESMA mutation do
 * módulo) e o rodapé tem "Enviar e-mail de boas-vindas" + "Fechar".
 */
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarClock, CheckCircle2, Circle, Mail, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { iniciais, inicioDoDia } from './admissoesDerivacoes';
import { corAvatar } from './onboardingComum';
import {
  formatarPrazo,
  prazoDaTarefa,
  progressoOnboarding,
  resumoOnboarding,
  type ColaboradorOnboarding,
  type TarefaOnboarding,
} from './onboardingDerivacoes';
import {
  cascadeContainerVariants,
  cascadeItemVariants,
  cascadeOverlayVariants,
  cascadeShellVariants,
} from '@/components/ui/cascade-motion';

/** Blocos da cascata: cabeçalho + corpo + rodapé. */
const BLOCOS_CASCATA = 3;
const SHELL_CASCATA = cascadeShellVariants(BLOCOS_CASCATA);
const OVERLAY_CASCATA = cascadeOverlayVariants(BLOCOS_CASCATA);

export interface OnboardingDetalheDialogProps {
  colaborador: ColaboradorOnboarding | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Marca uma tarefa como concluída (id). */
  onConcluirTarefa: (tarefaId: string) => void;
  /** Id da tarefa cuja gravação está em andamento (spinner + bloqueio). */
  tarefaConcluindo?: string | null;
  /** Envia o e-mail de boas-vindas do colaborador do modal. */
  onEnviarEmail: (colaborador: ColaboradorOnboarding) => void;
}

/** Linha de tarefa do checklist (com "Concluir" quando ainda pendente). */
function LinhaTarefa({
  tarefa,
  hoje,
  concluindo,
  onConcluir,
}: {
  tarefa: TarefaOnboarding;
  hoje: number;
  concluindo: boolean;
  onConcluir: (tarefaId: string) => void;
}) {
  const feito = tarefa.concluida === true;
  const prazo = formatarPrazo(prazoDaTarefa(tarefa), hoje);

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border border-border/40 bg-background/40 p-3',
        feito && 'opacity-70'
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
          feito ? 'border-success bg-success text-white' : 'border-muted-foreground/30'
        )}
      >
        {feito && <CheckCircle2 className="h-3 w-3" />}
      </span>

      <div className="min-w-0 flex-1">
        <p className={cn('text-[13px] font-medium text-foreground', feito && 'text-muted-foreground line-through')}>
          {tarefa.titulo || 'Tarefa sem título'}
        </p>
        {tarefa.descricao && (
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{tarefa.descricao}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted-foreground">
          {prazo && (
            <span
              className={cn(
                'inline-flex items-center gap-1',
                !feito && prazo.tom === 'atraso' && 'text-destructive-vivid'
              )}
            >
              <CalendarClock className="h-3 w-3" /> {prazo.texto}
            </span>
          )}
          {tarefa.responsavel_nome && <span className="truncate">{tarefa.responsavel_nome}</span>}
        </div>
      </div>

      {!feito && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 shrink-0 gap-1 text-[11px] text-success hover:bg-success/10 hover:text-success"
          disabled={concluindo}
          onClick={() => {
            if (tarefa.id != null) onConcluir(String(tarefa.id));
          }}
        >
          {concluindo ? <Spinner size="sm" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Concluir
        </Button>
      )}
    </div>
  );
}

export function OnboardingDetalheDialog({
  colaborador,
  open,
  onOpenChange,
  onConcluirTarefa,
  tarefaConcluindo,
  onEnviarEmail,
}: OnboardingDetalheDialogProps) {
  const tarefas = colaborador?.tarefas ?? [];
  const progresso = progressoOnboarding(tarefas);
  const hoje = inicioDoDia(new Date());
  const resumo = resumoOnboarding(tarefas, hoje);
  const corBarra = progresso.valor >= 100 ? 'bg-success' : resumo.atrasadas > 0 ? 'bg-destructive-vivid' : 'bg-primary';

  return (
    <DialogPrimitive.Root open={open && !!colaborador} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && colaborador && (
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
                className="fixed left-[50%] top-[50%] z-50 flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border/50 bg-card p-0 shadow-2xl"
                style={{ transformOrigin: 'top center' }}
                variants={SHELL_CASCATA}
                initial="closed"
                animate="open"
                exit="closed"
              >
                <motion.div
                  className="flex min-h-0 flex-1 flex-col"
                  variants={cascadeContainerVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                >
                  {/* HEADER — avatar + identificação + progresso + contadores */}
                  <motion.div
                    variants={cascadeItemVariants}
                    className="shrink-0 border-b border-border/30 bg-muted/20 px-5 py-4"
                  >
                    <DialogPrimitive.Title className="sr-only">Onboarding de {colaborador.nome}</DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">
                      Acompanhamento das tarefas de integração do colaborador
                    </DialogPrimitive.Description>

                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className={cn(
                          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold',
                          corAvatar(colaborador.nome)
                        )}
                      >
                        {iniciais(colaborador.nome)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-base font-semibold text-foreground">
                          {colaborador.nome || 'Candidato sem nome'}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {[colaborador.cargo, colaborador.departamento].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                      <p className="shrink-0 pr-9 font-display text-lg font-semibold tabular-nums text-foreground">
                        {progresso.valor}%
                      </p>
                    </div>

                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                      <div className={cn('h-full rounded-full', corBarra)} style={{ width: `${progresso.valor}%` }} />
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-3 w-3" /> {resumo.concluidas} concluída(s)
                      </span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Circle className="h-3 w-3" /> {resumo.pendentes} pendente(s)
                      </span>
                      {resumo.atrasadas > 0 && (
                        <span className="inline-flex items-center gap-1 text-destructive-vivid">
                          <CalendarClock className="h-3 w-3" /> {resumo.atrasadas} em risco
                        </span>
                      )}
                    </div>
                  </motion.div>

                  {/* CORPO — o checklist completo (a única viewport de rolagem) */}
                  <motion.div
                    variants={cascadeItemVariants}
                    className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Tarefas de integração
                    </p>
                    {tarefas.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground">
                        Nenhuma tarefa de onboarding para esta etapa.
                      </p>
                    ) : (
                      tarefas.map((tarefa) => (
                        <LinhaTarefa
                          key={String(tarefa.id)}
                          tarefa={tarefa}
                          hoje={hoje}
                          concluindo={tarefaConcluindo != null && String(tarefa.id) === String(tarefaConcluindo)}
                          onConcluir={onConcluirTarefa}
                        />
                      ))
                    )}
                  </motion.div>

                  {/* RODAPÉ — e-mail + fechar */}
                  <motion.div
                    variants={cascadeItemVariants}
                    className="flex shrink-0 items-center justify-between gap-2 border-t border-border/30 bg-muted/20 px-5 py-3"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 gap-2 text-xs"
                      onClick={() => onEnviarEmail(colaborador)}
                    >
                      <Mail className="h-4 w-4" /> Enviar e-mail de boas-vindas
                    </Button>
                    <DialogPrimitive.Close asChild>
                      <Button variant="ghost" size="sm" className="h-9 text-xs">
                        Fechar
                      </Button>
                    </DialogPrimitive.Close>
                  </motion.div>
                </motion.div>

                <DialogPrimitive.Close className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-md opacity-70 transition-colors hover:bg-accent hover:opacity-100">
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
