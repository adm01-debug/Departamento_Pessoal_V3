/**
 * ============================================================================
 * TURNOS & ESCALAS — DIÁLOGO "DETALHES DA ESCALA".
 * ============================================================================
 *
 * Abre ao clicar numa célula COM escala. Mostra o colaborador, o dia e cada
 * escala registrada naquela data (turno, horário, duração líquida e status) e
 * concentra as ações de escrita: trocar o turno e excluir (com confirmação em
 * dois passos, no próprio rodapé — sem abrir uma segunda camada de modal).
 *
 * ANIMAÇÃO: `CascadeDialogFrame` (`ui/cascade-dialog.tsx`) — a moldura oficial
 * do sistema, a MESMA usada pelo popup de Pendências e pela janela "Nova
 * solicitação" de Horas Extras. Os blocos cascateiam por `cascadeItemVariants`;
 * nenhum número de animação é recriado aqui.
 *
 * LATCH DO ÚLTIMO CONTEÚDO: a moldura mantém o corpo montado durante a saída
 * (`forceMount` + `AnimatePresence`), e a página fecha/limpa o alvo no mesmo
 * clique. Guardar o último par (data + escalas) evita a caixa encolher vazia —
 * mesmo ajuste-na-renderização usado em `SolicitacaoDetalhesDialog`.
 * ============================================================================
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeftRight, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/ui/user-avatar';
import { rotuloDataCompleta, rotuloDiaSemanaCompleto } from './turnosCalendario';
import { normalizarHex } from './turnosCores';
import {
  duracaoLiquidaMinutos,
  faixaHoraria,
  formatarDuracaoMinutos,
  formatarIntervaloMinutos,
  type EscalaRegistro,
  type TurnoRegistro,
} from './turnosMetricas';

export interface DialogoDetalhesEscalaProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  /** Dia selecionado (`yyyy-MM-dd`); `null` mantém a janela fechada. */
  data: string | null;
  /** Escalas daquele colaborador naquele dia. */
  escalas: readonly EscalaRegistro[];
  turnos: readonly TurnoRegistro[];
  podeGerenciar: boolean;
  /** Abre o formulário em modo edição para a escala escolhida. */
  onTrocarTurno: (escala: EscalaRegistro) => void;
  onExcluir: (escalaId: string) => void;
  excluindo?: boolean;
}

/** Blocos que cascateiam: cabeçalho · colaborador · escalas · rodapé. */
const BLOCOS_CASCATA = 4;

interface AlvoDetalhes {
  data: string;
  escalas: EscalaRegistro[];
}

export function DialogoDetalhesEscala({
  aberto,
  onOpenChange,
  data,
  escalas,
  turnos,
  podeGerenciar,
  onTrocarTurno,
  onExcluir,
  excluindo = false,
}: DialogoDetalhesEscalaProps) {
  const [alvo, setAlvo] = useState<AlvoDetalhes | null>(data ? { data, escalas: [...escalas] } : null);
  if (data && (alvo?.data !== data || alvo.escalas.length !== escalas.length)) {
    setAlvo({ data, escalas: [...escalas] });
  }

  const [confirmando, setConfirmando] = useState<string | null>(null);

  const conteudo = alvo;
  if (!conteudo) return null;

  const primeira = conteudo.escalas[0];
  const nome = primeira?.colaborador?.nome_completo ?? 'Colaborador';
  const departamento = primeira?.colaborador?.departamento ?? null;

  return (
    <CascadeDialogFrame
      open={aberto && Boolean(data)}
      onOpenChange={(valor) => {
        if (!valor) setConfirmando(null);
        onOpenChange(valor);
      }}
      blocks={BLOCOS_CASCATA}
      className="rounded-none sm:max-w-[520px] sm:rounded-lg"
      contentClassName="grid gap-3 p-5"
    >
      <motion.div variants={cascadeItemVariants}>
        <DialogHeader>
          <DialogTitle className="text-heading">Detalhes da escala</DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground">
            {rotuloDiaSemanaCompleto(conteudo.data)}, {rotuloDataCompleta(conteudo.data)}
          </DialogDescription>
        </DialogHeader>
      </motion.div>

      <motion.div variants={cascadeItemVariants}>
        <div className="flex items-center gap-2.5">
          <UserAvatar name={nome} size="md" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium">{nome}</p>
            <p className="truncate text-[10px] text-muted-foreground">{departamento || 'Sem departamento'}</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={cascadeItemVariants}>
        <ul className="space-y-2">
          {conteudo.escalas.map((escala) => {
            const turno = turnos.find((t) => t.id === escala.turno_id) ?? null;
            const cor = normalizarHex(turno?.cor ?? escala.turno?.cor);
            const duracao = duracaoLiquidaMinutos(turno ?? escala.turno ?? null);

            return (
              <li key={escala.id} className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[13px] font-medium">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cor }} aria-hidden />
                      <span className="truncate">{turno?.nome ?? escala.turno?.nome ?? 'Turno removido'}</span>
                    </p>
                    <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                      {faixaHoraria(turno ?? escala.turno ?? null)} ·{' '}
                      {formatarIntervaloMinutos(turno?.intervalo_minutos ?? null)} · líquido{' '}
                      {formatarDuracaoMinutos(duracao)}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px] capitalize">
                    {escala.status || 'agendado'}
                  </Badge>
                </div>

                {podeGerenciar && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 px-2 text-[10px]"
                      onClick={() => onTrocarTurno(escala)}
                    >
                      <ArrowLeftRight className="h-3 w-3" aria-hidden />
                      Trocar turno
                    </Button>
                    {confirmando === escala.id ? (
                      <>
                        <span className="text-[10px] text-muted-foreground">Excluir esta escala?</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[10px] text-muted-foreground"
                          onClick={() => setConfirmando(null)}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 border-danger/45 bg-danger/10 px-2 text-[10px] text-danger hover:bg-danger/20"
                          onClick={() => onExcluir(escala.id)}
                          disabled={excluindo}
                        >
                          <Trash2 className="h-3 w-3" aria-hidden />
                          {excluindo ? 'Excluindo…' : 'Excluir'}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 px-2 text-[10px] text-danger hover:bg-danger/10 hover:text-danger"
                        onClick={() => setConfirmando(escala.id)}
                      >
                        <Trash2 className="h-3 w-3" aria-hidden />
                        Excluir
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
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
