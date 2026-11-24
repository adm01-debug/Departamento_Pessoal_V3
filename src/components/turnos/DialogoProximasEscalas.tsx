/**
 * ============================================================================
 * TURNOS & ESCALAS — DIÁLOGO "PRÓXIMAS ESCALAS" (ação "Ver todas" do card).
 * ============================================================================
 *
 * O card lateral é um RESUMO (5 datas). Aqui abre a lista COMPLETA da janela de
 * `DIAS_PROXIMAS_ESCALAS`, agrupada por data, com tudo que não cabe no card:
 * período consultado, quantidade por dia, colaboradores, departamentos, turno e
 * horário.
 *
 * FONTE ÚNICA: recebe `grupos` já montados a partir de `escalasProximas` (a
 * mesma consulta do card) por `agruparEscalasPorDia` (`turnosMetricas.ts`).
 * Nenhum registro novo, nenhum dia repetido, nenhuma contagem paralela — o
 * `total` de cada grupo é o tamanho da própria lista.
 *
 * Moldura/velocidade: `CascadeDialogFrame` com `CASCADE_SAIDA_RAPIDA` (o corpo
 * é uma lista longa, um bloco por dia — sem o perfil rápido o fechamento
 * cresceria com o número de datas).
 * ============================================================================
 */
import { motion } from 'framer-motion';
import { CalendarClock, CalendarX2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { CASCADE_SAIDA_RAPIDA, cascadeItemVariants } from '@/components/ui/cascade-motion';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { rotuloDataCompleta, rotuloDiaSemanaCompleto, rotuloProximidade } from './turnosCalendario';
import { normalizarHex } from './turnosCores';
import { faixaHoraria, type GrupoDiaEscalas, type TurnoRegistro } from './turnosMetricas';

export interface DialogoProximasEscalasProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  /** Dias com escala a partir de hoje, já agrupados e ordenados. */
  grupos: readonly GrupoDiaEscalas[];
  turnos: readonly TurnoRegistro[];
  /** Janela consultada (`yyyy-MM-dd`) — o mesmo intervalo da consulta. */
  periodo: { inicio: string; fim: string };
}

/** Blocos que cascateiam: cabeçalho · lista · rodapé. */
const BLOCOS_CASCATA = 3;

export function DialogoProximasEscalas({ aberto, onOpenChange, grupos, turnos, periodo }: DialogoProximasEscalasProps) {
  const turnosPorId = new Map(turnos.map((turno) => [turno.id, turno]));
  const totalEscalas = grupos.reduce((soma, grupo) => soma + grupo.total, 0);

  return (
    <CascadeDialogFrame
      open={aberto}
      onOpenChange={onOpenChange}
      blocks={BLOCOS_CASCATA}
      perfilSaida={CASCADE_SAIDA_RAPIDA}
      className="rounded-none sm:max-w-[620px] sm:rounded-2xl"
      contentClassName="grid gap-3 p-5"
    >
      <motion.div variants={cascadeItemVariants}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-heading">
            <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
            Próximas escalas
          </DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground">
            {rotuloDataCompleta(periodo.inicio)} a {rotuloDataCompleta(periodo.fim)} · {grupos.length}{' '}
            {grupos.length === 1 ? 'dia' : 'dias'} · {totalEscalas} {totalEscalas === 1 ? 'escala' : 'escalas'}
          </DialogDescription>
        </DialogHeader>
      </motion.div>
      <motion.div
        variants={cascadeItemVariants}
        className="max-h-[55vh] space-y-2 overflow-y-auto scroll-interno pr-0.5"
      >
        {grupos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-3 py-10 text-center">
            <CalendarX2 className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-[13px] text-muted-foreground">Nenhuma escala programada para este período.</p>
          </div>
        ) : (
          grupos.map((grupo) => (
            <section key={grupo.chave} className="rounded-xl border border-border/40 bg-muted/20">
              <header className="flex items-center justify-between gap-2 border-b border-border/40 px-3 py-1.5">
                <p className="min-w-0 truncate text-[11px] font-semibold">
                  {rotuloDiaSemanaCompleto(grupo.chave)}, {rotuloDataCompleta(grupo.chave)}
                  <span className="ml-1.5 font-normal text-muted-foreground">{rotuloProximidade(grupo.chave)}</span>
                </p>
                <span className="shrink-0 rounded-full bg-background/60 px-1.5 text-[9px] font-semibold tabular-nums text-muted-foreground">
                  {grupo.total} {grupo.total === 1 ? 'escala' : 'escalas'}
                </span>
              </header>

              <ul className="divide-y divide-border/30">
                {grupo.escalas.map((escala) => {
                  const turno = turnosPorId.get(escala.turno_id) ?? null;
                  return (
                    <li key={escala.id} className="flex items-center gap-2 px-3 py-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: normalizarHex(turno?.cor ?? escala.turno?.cor) }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] leading-tight">
                          {escala.colaborador?.nome_completo ?? 'Colaborador'}
                        </span>
                        <span className="block truncate text-[10px] leading-tight text-muted-foreground">
                          {escala.colaborador?.departamento || 'Sem departamento'}
                          {' · '}
                          {turno?.nome ?? escala.turno?.nome ?? 'Turno removido'}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {faixaHoraria(turno ?? escala.turno ?? null)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
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
