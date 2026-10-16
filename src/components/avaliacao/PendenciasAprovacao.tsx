/**
 * ============================================================================
 * SUBABA "AGUARDANDO GESTOR" — fila de aprovação formal da avaliação.
 *
 * ONDE VIVE: dentro da aba **Feedbacks** (`FeedbacksTab`), como SEGUNDA
 * visualização interna — a primeira ("Avaliações") é a lista aprovada e
 * permanece intacta. Nada fora daqui foi redesenhado.
 *
 * O QUE ESTA TELA FAZ: mostra a avaliação consolidada que o RH enviou ao gestor
 * e oferece SOMENTE os controles do fluxo aprovado —
 *   • RH/admin: `Enviar para aprovação` (e `Reenviar` depois de devolvida);
 *   • gestor:   `Aprovar` · `Devolver para correção` (justificativa ≥ 10);
 *   • RH:       `Validar Potencial` depois do aval do gestor (só role `rh`);
 *   • todos:    `Ver avaliação` (abre o MESMO modal de detalhe do módulo).
 *
 * REÚSO (nada de peça nova no Design System): `MotionCard`/`entradaCard` (a
 * cascata de entrada do módulo), `Card`, `Button`, `Dialog`, `Label`,
 * `Textarea`, `faixaNota` (mesmas tintas/rótulos dos cards), `iniciais`,
 * `formatarData`, `TomStatusAprovacao` (tokens semânticos já existentes) e os
 * ícones Lucide.
 *
 * AUTORIZAÇÃO: os botões só evitam oferecer o que o servidor recusaria
 * (`podeEnviarParaGestor` / `podeDecidirAprovacao` / `podeValidarPotencial`).
 * A decisão é da RPC, que revalida papel, vínculo gestor↔colaborador e empresa.
 * ============================================================================
 */

import { useState } from 'react';
import { Calendar, CheckCircle2, RotateCcw, Send, ShieldCheck, UserCheck, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { MotionCard, entradaCard } from './entradaCards';
import { formatarData, iniciais } from './desempenhoComum';
import { faixaNota } from './feedbacksComum';
import { podeValidarPotencial } from './acoesFeedback';
import {
  MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO,
  ROTULO_STATUS_APROVACAO,
  TOM_STATUS_APROVACAO,
  podeDecidirAprovacao,
  podeEnviarParaGestor,
  validarJustificativaDevolucao,
  type PendenciaAprovacao,
} from './aprovacaoGestor';

interface PendenciasAprovacaoProps {
  /** Fila derivada por `derivarPendencias` (nenhuma consulta nova). */
  pendencias: PendenciaAprovacao[];
  /** Papel do usuário (`admin` | `rh` | `gestor` | `user` | null). */
  papel?: string | null;
  /**
   * `true` somente no modo real. Em demonstração os controles de ESCRITA ficam
   * desabilitados com a razão visível: os registros fictícios nunca são gravados.
   */
  acoesHabilitadas?: boolean;
  /** Uma operação de aprovação em andamento (desabilita todos os controles). */
  salvando?: boolean;
  /** Índice-base da cascata de entrada (continua a contagem dos blocos da aba). */
  indiceBase?: number;
  onVerAvaliacao?: (p: PendenciaAprovacao) => void;
  onEnviar?: (p: PendenciaAprovacao) => void;
  onDecidir?: (p: PendenciaAprovacao, decisao: 'aprovado' | 'devolvido', justificativa?: string | null) => void;
  onValidarPotencial?: (p: PendenciaAprovacao) => void;
}

/** Nota no mesmo formato dos cards de feedback ("4,5"). */
function formatarNota(nota: number | null): string | null {
  if (nota === null || nota === undefined) return null;
  const n = Number(nota);
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : null;
}

/** Bloco de nota (desempenho consolidado ou potencial) com a faixa já aprovada. */
function BlocoNota({ rotulo, nota, vazio }: { rotulo: string; nota: number | null; vazio: string }) {
  const texto = formatarNota(nota);
  const faixa = texto ? faixaNota(nota) : null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{rotulo}</span>
      {texto && faixa ? (
        <span className="flex items-center gap-1.5">
          <span className={cn('font-display text-base font-semibold leading-none tabular-nums', faixa.tinta)}>
            {texto}
          </span>
          <span
            className={cn(
              'rounded-md border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide',
              faixa.badge
            )}
          >
            {faixa.rotulo}
          </span>
        </span>
      ) : (
        <span className="text-[11px] text-muted-foreground">{vazio}</span>
      )}
    </div>
  );
}

export function PendenciasAprovacao({
  pendencias,
  papel,
  acoesHabilitadas = false,
  salvando = false,
  indiceBase = 3,
  onVerAvaliacao,
  onEnviar,
  onDecidir,
  onValidarPotencial,
}: PendenciasAprovacaoProps) {
  /** Devolução em curso (o diálogo exige justificativa ≥ MIN caracteres). */
  const [devolvendo, setDevolvendo] = useState<PendenciaAprovacao | null>(null);
  const [justificativa, setJustificativa] = useState('');

  const ehRhAdmin = podeEnviarParaGestor(papel);
  const ehGestor = podeDecidirAprovacao(papel);
  const ehRh = podeValidarPotencial(papel);

  const fecharDevolucao = () => {
    setDevolvendo(null);
    setJustificativa('');
  };

  const confirmarDevolucao = () => {
    if (!devolvendo) return;
    if (!validarJustificativaDevolucao(justificativa).pode) return;
    onDecidir?.(devolvendo, 'devolvido', justificativa.trim());
    fecharDevolucao();
  };

  const minimoNaoAtingido = devolvendo !== null && !validarJustificativaDevolucao(justificativa).pode;
  const semAcao = salvando || !acoesHabilitadas;

  if (pendencias.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/40 px-6 py-12 text-center">
        <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
        <p className="text-[13px] font-medium">Nenhuma avaliação na fila de aprovação</p>
        <p className="max-w-md text-[11px] text-muted-foreground">
          Quando o RH enviar uma avaliação consolidada, ela aparece aqui para o gestor aprovar ou devolver.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {pendencias.map((p, i) => {
          const podeEnviar = ehRhAdmin && (p.status === 'em_preparacao' || p.status === 'devolvida');
          const podeDecidir = ehGestor && p.status === 'aguardando_gestor';
          const podeValidar = ehRh && p.status === 'aprovada_gestor';
          const local = [p.cargo, p.departamento].filter(Boolean).join(' · ');

          return (
            <MotionCard
              key={p.id}
              {...entradaCard(indiceBase + Math.min(i, 6))}
              className="flex flex-col gap-3 rounded-xl border-border/60 bg-gradient-to-b from-card to-card/60 px-4 py-3 shadow-elevated transition-all hover:border-primary/30 hover:shadow-lg lg:flex-row lg:items-stretch lg:gap-5"
            >
              {/* (A) Colaborador avaliado */}
              <div className="flex min-w-0 flex-1 gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[12px] font-semibold text-primary ring-1 ring-inset ring-primary/20">
                  {iniciais(p.colaborador)}
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="min-w-0">
                    <h3
                      className="truncate font-display text-[13px] font-semibold leading-tight tracking-tight"
                      title={p.colaborador}
                    >
                      {p.colaborador}
                    </h3>
                    <p className="truncate text-[11px] leading-tight text-muted-foreground">
                      {local || 'Sem cargo e departamento cadastrados'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex h-6 items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 text-[10px] font-medium text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {p.cicloNome}
                    </span>
                    {p.quadrante && (
                      <span className="inline-flex h-6 items-center rounded-md border border-success/45 bg-success/20 px-2 text-[10px] font-medium text-success">
                        Nine-Box: {p.quadrante}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* (B) Gestor responsável + data de envio */}
              <div className="flex min-w-0 shrink-0 flex-row items-end justify-between gap-3 border-t border-border/20 pt-2.5 lg:w-[216px] lg:flex-col lg:items-start lg:justify-start lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <div className="min-w-0 space-y-1.5 lg:w-full">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Gestor responsável
                  </p>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary ring-1 ring-inset ring-primary/20">
                      {iniciais(p.gestorResponsavel)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-medium leading-tight" title={p.gestorResponsavel}>
                        {p.gestorResponsavel}
                      </span>
                    </span>
                  </div>
                  {p.justificativa && (
                    <p
                      className="line-clamp-2 text-[10px] italic leading-snug text-muted-foreground"
                      title={p.justificativa}
                    >
                      “{p.justificativa}”
                    </p>
                  )}
                </div>
                <p className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[10px] text-muted-foreground lg:mt-auto">
                  <Send className="h-3.5 w-3.5 shrink-0" />
                  {p.enviadoEm ? `Enviado em ${formatarData(p.enviadoEm)}` : 'Ainda não enviado'}
                </p>
              </div>

              {/* (C) Desempenho · Potencial · Status · Ações —
                  mesma ORDEM do card de feedback aprovado (números → badge →
                  ação). O badge fica em linha PRÓPRIA: antes ele dividia a
                  linha com as duas notas e o rótulo longo ("Aguardando gestor")
                  vazava para fora do card. */}
              <div className="flex shrink-0 flex-col gap-2 border-t border-border/20 pt-2.5 lg:w-[248px] lg:justify-between lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                <div className="flex flex-wrap items-start gap-4">
                  <BlocoNota rotulo="Desempenho" nota={p.desempenho} vazio="Sem nota" />
                  <BlocoNota rotulo="Potencial" nota={p.potencial} vazio="Não atribuído" />
                </div>
                <span
                  role="status"
                  className={cn(
                    'inline-flex h-6 w-fit items-center whitespace-nowrap rounded-md border px-2 text-[10px] font-medium uppercase tracking-wide',
                    TOM_STATUS_APROVACAO[p.status]
                  )}
                >
                  {ROTULO_STATUS_APROVACAO[p.status]}
                </span>

                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {podeEnviar && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      disabled={semAcao}
                      onClick={() => onEnviar?.(p)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      {p.status === 'devolvida' ? 'Reenviar ao gestor' : 'Enviar ao gestor'}
                    </Button>
                  )}
                  {podeDecidir && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        disabled={semAcao}
                        onClick={() => setDevolvendo(p)}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Devolver
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 border-success/45 bg-success/15 text-xs text-success hover:bg-success/25 hover:text-success"
                        disabled={semAcao}
                        onClick={() => onDecidir?.(p, 'aprovado', null)}
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Aprovar
                      </Button>
                    </>
                  )}
                  {podeValidar && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 text-xs"
                      disabled={semAcao}
                      onClick={() => onValidarPotencial?.(p)}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Validar Potencial
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="group h-8 gap-1.5 rounded-lg border-border/60 bg-secondary/30 text-[11px] font-normal text-foreground/90 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                    onClick={() => onVerAvaliacao?.(p)}
                  >
                    Ver avaliação
                  </Button>
                </div>
              </div>
            </MotionCard>
          );
        })}
      </div>

      {!acoesHabilitadas && (
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Users className="h-3 w-3 shrink-0" />
          Em demonstração a fila é somente de leitura: os registros fictícios nunca são gravados. Os controles de
          aprovação são liberados no modo real.
        </p>
      )}

      {/* Devolução exige justificativa (mínimo de 10 caracteres, igual à RPC). */}
      <Dialog open={devolvendo !== null} onOpenChange={(aberto) => !aberto && fecharDevolucao()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base">Devolver para correção</DialogTitle>
            <DialogDescription className="text-[11px]">
              {devolvendo?.colaborador} · {devolvendo?.cicloNome} · {devolvendo?.gestorResponsavel}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label
              htmlFor="justificativa-devolucao"
              className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              Justificativa obrigatória
            </Label>
            <Textarea
              id="justificativa-devolucao"
              value={justificativa}
              rows={3}
              disabled={salvando}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Explique o que precisa ser corrigido antes da aprovação"
            />
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              A avaliação volta para o RH corrigir e reenviar (mínimo de {MIN_CARACTERES_JUSTIFICATIVA_DEVOLUCAO}{' '}
              caracteres). O histórico é preservado.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" disabled={salvando} onClick={fecharDevolucao}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs"
              disabled={salvando || minimoNaoAtingido}
              onClick={confirmarDevolucao}
            >
              {salvando ? 'Enviando…' : 'Confirmar devolução'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
