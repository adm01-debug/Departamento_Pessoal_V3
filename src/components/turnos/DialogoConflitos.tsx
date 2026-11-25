/**
 * ============================================================================
 * TURNOS & ESCALAS — DIÁLOGO "RESOLVER CONFLITOS".
 * ============================================================================
 *
 * Aberto pela ação "Resolver" do KPI Card de conflitos. Lista cada dia de cada
 * colaborador em que DUAS escalas se sobrepõem (regra em `detectarConflitos` —
 * sobreposição de horários, não regra trabalhista) e oferece a única correção
 * que o modelo de dados suporta: excluir a escala indesejada. Excluir uma das
 * duas resolve o dia; a lista se recalcula sozinha depois da invalidação.
 *
 * Moldura padrão do sistema, com `CASCADE_SAIDA_RAPIDA` porque o corpo é uma
 * lista (um bloco por conflito).
 * ============================================================================
 */
import { motion } from 'framer-motion';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { CASCADE_SAIDA_RAPIDA, cascadeItemVariants } from '@/components/ui/cascade-motion';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { rotuloDataCompleta } from './turnosCalendario';
import { normalizarHex } from './turnosCores';
import { faixaHoraria, type ConflitoEscala, type EscalaRegistro, type TurnoRegistro } from './turnosMetricas';

export interface DialogoConflitosProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  conflitos: readonly ConflitoEscala[];
  turnos: readonly TurnoRegistro[];
  podeGerenciar: boolean;
  onExcluir: (escalaId: string) => void;
  excluindo?: boolean;
}

/** Blocos que cascateiam: cabeçalho · lista · rodapé. */
const BLOCOS_CASCATA = 3;

export function DialogoConflitos({
  aberto,
  onOpenChange,
  conflitos,
  turnos,
  podeGerenciar,
  onExcluir,
  excluindo = false,
}: DialogoConflitosProps) {
  const turnosPorId = new Map(turnos.map((turno) => [turno.id, turno]));

  return (
    <CascadeDialogFrame
      open={aberto}
      onOpenChange={onOpenChange}
      blocks={BLOCOS_CASCATA}
      perfilSaida={CASCADE_SAIDA_RAPIDA}
      className="rounded-none sm:max-w-[600px] sm:rounded-lg"
      contentClassName="grid gap-3 p-5"
    >
      <motion.div variants={cascadeItemVariants}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-heading">
            <AlertTriangle className="h-4 w-4 text-destructive-vivid" aria-hidden />
            Conflitos de escala
          </DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground">
            {conflitos.length === 0
              ? 'Nenhuma sobreposição de horários no período.'
              : `${conflitos.length} dia(s) com escalas sobrepostas para o mesmo colaborador.`}
          </DialogDescription>
        </DialogHeader>
      </motion.div>

      <motion.div variants={cascadeItemVariants} className="max-h-[55vh] space-y-2 overflow-y-auto">
        {conflitos.length === 0 ? (
          <p className="px-1 py-6 text-center text-[13px] text-muted-foreground">
            Nada para resolver — todas as escalas do período estão consistentes.
          </p>
        ) : (
          conflitos.map((conflito) => (
            <div key={conflito.chave} className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
              <p className="text-[13px] font-medium">{conflito.colaboradorNome}</p>
              <p className="text-[10px] text-muted-foreground">{rotuloDataCompleta(conflito.data)}</p>

              <ul className="mt-1.5 space-y-1">
                {conflito.escalas.map((escala: EscalaRegistro) => {
                  const turno = turnosPorId.get(escala.turno_id) ?? null;
                  return (
                    <li key={escala.id} className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: normalizarHex(turno?.cor ?? escala.turno?.cor) }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-[10px]">
                        {turno?.nome ?? escala.turno?.nome ?? 'Turno'} · {faixaHoraria(turno ?? escala.turno ?? null)}
                      </span>
                      {podeGerenciar && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 px-1.5 text-[10px] text-danger hover:bg-danger/10 hover:text-danger"
                          onClick={() => onExcluir(escala.id)}
                          disabled={excluindo}
                        >
                          <Trash2 className="h-3 w-3" aria-hidden />
                          Excluir
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </motion.div>

      <motion.div variants={cascadeItemVariants}>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </motion.div>
    </CascadeDialogFrame>
  );
}
