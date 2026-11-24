/**
 * ============================================================================
 * TURNOS & ESCALAS — DIÁLOGO "ESCALAS DO DIA" (clique num dia do mês).
 * ============================================================================
 *
 * Substitui a lista que era despejada ABAIXO da grade mensal: clicar num dia
 * abre esta janela e a página NÃO cresce (o detalhe do dia deixa de disputar
 * altura com o calendário).
 *
 * Conteúdo por linha — o que o RH precisa conferir sem sair da grade:
 * avatar/iniciais, nome completo, departamento, turno (com a cor cadastrada) e
 * a faixa de entrada → saída. O rodapé é só o fechamento; as ações de escrita
 * continuam em "Detalhes da escala", e a linha leva até lá.
 *
 * Moldura, véu, blur e cascata: `CascadeDialogFrame` (`ui/cascade-dialog.tsx`)
 * — a MESMA janela do resto do sistema, nada de biblioteca paralela. Como o
 * corpo é uma lista (um bloco por linha), a saída usa `CASCADE_SAIDA_RAPIDA`
 * para o fechamento não crescer com o número de colaboradores.
 *
 * LATCH DO ÚLTIMO CONTEÚDO: a moldura mantém o corpo montado durante a saída
 * (`forceMount` + `AnimatePresence`) e a página limpa a data no mesmo clique.
 * Guardar o último par (data + escalas) evita a caixa encolher vazia — mesmo
 * ajuste-na-renderização de `DialogoDetalhesEscala`.
 * ============================================================================
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarX2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { CASCADE_SAIDA_RAPIDA, cascadeItemVariants } from '@/components/ui/cascade-motion';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserAvatar } from '@/components/ui/user-avatar';
import { rotuloDataCompleta, rotuloDiaSemanaCompleto } from './turnosCalendario';
import { normalizarHex } from './turnosCores';
import { faixaHoraria, type EscalaRegistro, type TurnoRegistro } from './turnosMetricas';

export interface DialogoDiaEscalasProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  /** Dia escolhido na grade mensal (`yyyy-MM-dd`); `null` fecha a janela. */
  data: string | null;
  /** Escalas daquela data (já filtradas pela barra de filtros). */
  escalas: readonly EscalaRegistro[];
  turnos: readonly TurnoRegistro[];
  /** Abre os detalhes da escala (edição/exclusão continuam ali). */
  onAbrirEscala?: (escala: EscalaRegistro) => void;
}

/** Blocos que cascateiam: cabeçalho · lista · rodapé. */
const BLOCOS_CASCATA = 3;

interface AlvoDia {
  data: string;
  escalas: EscalaRegistro[];
}

export function DialogoDiaEscalas({
  aberto,
  onOpenChange,
  data,
  escalas,
  turnos,
  onAbrirEscala,
}: DialogoDiaEscalasProps) {
  const [alvo, setAlvo] = useState<AlvoDia | null>(data ? { data, escalas: [...escalas] } : null);

  // Ajuste na renderização (sem efeito): mantém o último dia durante a saída e
  // atualiza quando o usuário clica em outro dia com a janela aberta.
  if (data && (alvo?.data !== data || alvo.escalas.length !== escalas.length)) {
    setAlvo({ data, escalas: [...escalas] });
  }

  const conteudo = alvo;
  if (!conteudo) return null;

  const turnosPorId = new Map(turnos.map((turno) => [turno.id, turno]));
  const total = conteudo.escalas.length;
  // Ordem de leitura: por nome do colaborador (o mesmo critério do modal
  // "Próximas escalas"), em vez da ordem em que o banco devolveu as linhas.
  const ordenadas = [...conteudo.escalas].sort((a, b) =>
    (a.colaborador?.nome_completo ?? '').localeCompare(b.colaborador?.nome_completo ?? '', 'pt-BR')
  );

  return (
    <CascadeDialogFrame
      open={aberto}
      onOpenChange={onOpenChange}
      blocks={BLOCOS_CASCATA}
      perfilSaida={CASCADE_SAIDA_RAPIDA}
      className="rounded-none sm:max-w-[560px] sm:rounded-2xl"
      contentClassName="grid gap-3 p-5"
    >
      <motion.div variants={cascadeItemVariants}>
        <DialogHeader>
          <DialogTitle className="text-heading">Escalas do dia — {rotuloDataCompleta(conteudo.data)}</DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground">
            {rotuloDiaSemanaCompleto(conteudo.data)}, {rotuloDataCompleta(conteudo.data)} · {total}{' '}
            {total === 1 ? 'escala' : 'escalas'}
          </DialogDescription>
        </DialogHeader>
      </motion.div>
      <motion.div
        variants={cascadeItemVariants}
        className="max-h-[55vh] overflow-y-auto scroll-interno rounded-xl border border-border/40 bg-muted/10"
      >
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-3 py-10 text-center">
            <CalendarX2 className="h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="text-[13px] text-muted-foreground">Nenhuma escala cadastrada neste dia.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {ordenadas.map((escala) => {
              const turno = turnosPorId.get(escala.turno_id) ?? null;
              const cor = normalizarHex(turno?.cor ?? escala.turno?.cor);
              const nome = escala.colaborador?.nome_completo ?? 'Colaborador';
              const linha = (
                <>
                  <UserAvatar name={nome} size="sm" className="shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium leading-tight">{nome}</span>
                    <span className="block truncate text-[10px] leading-tight text-muted-foreground">
                      {escala.colaborador?.departamento || 'Sem departamento'}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[10px] leading-tight">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cor }} aria-hidden />
                      <span className="truncate text-foreground/90">
                        {turno?.nome ?? escala.turno?.nome ?? 'Turno removido'}
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {faixaHoraria(turno ?? escala.turno ?? null)}
                      </span>
                    </span>
                  </span>
                </>
              );

              return (
                <li key={escala.id}>
                  {onAbrirEscala ? (
                    <button
                      type="button"
                      onClick={() => onAbrirEscala(escala)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-muted/30"
                      aria-label={`Detalhes da escala de ${nome}`}
                    >
                      {linha}
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2">{linha}</div>
                  )}
                </li>
              );
            })}
          </ul>
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
