/**
 * ============================================================================
 * TURNOS & ESCALAS — DIÁLOGO "NOVO TURNO" / EDIÇÃO.
 * ============================================================================
 *
 * Preserva integralmente os campos e as regras do cadastro que já existia em
 * `TurnosPage` (nome, cor, entrada, saída, intervalo) e acrescenta o que o novo
 * painel usa: status ativo/inativo — que é uma coluna real de `turnos.ativo` e
 * já era lida pela tabela antiga — e a duração líquida calculada a partir dos
 * horários, para o RH conferir antes de salvar.
 *
 * ── COR: SELETOR DO DESIGN SYSTEM (não o `input type="color"`) ──────────────
 * O campo de cor era o controle NATIVO do navegador, que abre uma janela clara
 * do sistema operacional — um bloco branco no meio do modal escuro. Agora ele é
 * o `SeletorCor` do módulo (área de saturação/brilho + matiz + paleta +
 * hexadecimal editável), num popover em PORTAL: nada de UI nativa e nada de
 * painel cortado pela moldura. O valor gravado continua sendo o mesmo hex de
 * `turnos.cor` — validação, payload e serviço não mudaram.
 *
 * Escrita com os métodos já existentes do serviço (`criarTurno`,
 * `atualizarTurno`, `excluirTurno`); nenhuma tabela nova, nenhum campo novo no
 * banco. A janela é a moldura padrão (`CascadeDialogFrame`), como as demais.
 * ============================================================================
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { turnoService } from '@/services/turnoService';
import { safeErrorMessage } from '@/utils/safeError';
import { SeletorCor } from './SeletorCor';
import { duracaoLiquidaMinutos, formatarDuracaoMinutos, type TurnoRegistro } from './turnosMetricas';

export interface DialogoTurnoProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  empresaId: string | null | undefined;
  /** `null` = criar; registro = editar. */
  turno: TurnoRegistro | null;
  onSalvo: () => void;
}

/** Blocos que cascateiam: cabeçalho · identificação · horários · rodapé. */
const BLOCOS_CASCATA = 4;

const FORM_VAZIO = {
  nome: '',
  cor: '#3b82f6',
  horario_inicio: '08:00',
  horario_fim: '17:00',
  intervalo_minutos: 60,
  ativo: true,
};

type FormTurno = typeof FORM_VAZIO;

/** Estado inicial do formulário a partir do turno em edição. */
function estadoDoTurno(turno: TurnoRegistro | null): FormTurno {
  if (!turno) return { ...FORM_VAZIO };
  return {
    nome: turno.nome,
    cor: turno.cor ?? FORM_VAZIO.cor,
    horario_inicio: turno.horario_inicio?.slice(0, 5) ?? FORM_VAZIO.horario_inicio,
    horario_fim: turno.horario_fim?.slice(0, 5) ?? FORM_VAZIO.horario_fim,
    intervalo_minutos: turno.intervalo_minutos ?? 0,
    ativo: turno.ativo !== false,
  };
}

export function DialogoTurno({ aberto, onOpenChange, empresaId, turno, onSalvo }: DialogoTurnoProps) {
  const chaveAlvo = turno?.id ?? 'novo';
  const [assinatura, setAssinatura] = useState(chaveAlvo);
  const [form, setForm] = useState<FormTurno>(() => estadoDoTurno(turno));
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  if (aberto && chaveAlvo !== assinatura) {
    setAssinatura(chaveAlvo);
    setForm(estadoDoTurno(turno));
    setConfirmandoExclusao(false);
  }

  const duracao = duracaoLiquidaMinutos({
    horario_inicio: form.horario_inicio,
    horario_fim: form.horario_fim,
    intervalo_minutos: form.intervalo_minutos,
  });
  const podeSalvar = !!empresaId && form.nome.trim().length > 0 && !!form.horario_inicio && !!form.horario_fim;

  const salvar = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error('Empresa não selecionada.');
      const payload = {
        nome: form.nome.trim(),
        cor: form.cor,
        horario_inicio: form.horario_inicio,
        horario_fim: form.horario_fim,
        intervalo_minutos: form.intervalo_minutos,
        ativo: form.ativo,
      };
      if (turno) return turnoService.atualizarTurno(turno.id, payload, empresaId);
      return turnoService.criarTurno({ ...payload, empresa_id: empresaId });
    },
    onSuccess: () => {
      toast.success(turno ? 'Turno atualizado.' : 'Turno criado.');
      onOpenChange(false);
      onSalvo();
    },
    onError: (erro: Error) => toast.error(safeErrorMessage(erro, 'Não foi possível salvar o turno.')),
  });

  const excluir = useMutation({
    mutationFn: async () => {
      if (!empresaId || !turno) throw new Error('Turno não selecionado.');
      return turnoService.excluirTurno(turno.id, empresaId);
    },
    onSuccess: () => {
      toast.success('Turno excluído.');
      onOpenChange(false);
      onSalvo();
    },
    onError: (erro: Error) => toast.error(safeErrorMessage(erro, 'Não foi possível excluir o turno.')),
  });

  return (
    <CascadeDialogFrame
      open={aberto}
      onOpenChange={(valor) => {
        if (!valor) setConfirmandoExclusao(false);
        onOpenChange(valor);
      }}
      blocks={BLOCOS_CASCATA}
      className="rounded-none sm:max-w-[520px] sm:rounded-lg"
      contentClassName="grid gap-3 p-5"
    >
      <motion.div variants={cascadeItemVariants}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-heading">
            <Clock className="h-4 w-4 text-primary" aria-hidden />
            {turno ? 'Editar turno' : 'Novo turno'}
          </DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground">
            Nome, cor e horários são os mesmos campos do cadastro de turnos.
          </DialogDescription>
        </DialogHeader>
      </motion.div>

      <motion.div variants={cascadeItemVariants}>
        {/* Nome ocupa a linha; a cor é um campo do MESMO tamanho (`h-9`), alinhado
            pela base com o input (sm:items-end). O seletor abre em portal, então
            o painel de cor não é cortado pelo `overflow-hidden` da moldura. */}
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_8.5rem] sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="turno-nome">Nome</Label>
            <Input
              id="turno-nome"
              value={form.nome}
              placeholder="Ex.: Administrativo"
              onChange={(event) => setForm((atual) => ({ ...atual, nome: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="turno-cor">Cor</Label>
            <SeletorCor id="turno-cor" valor={form.cor} onValor={(cor) => setForm((atual) => ({ ...atual, cor }))} />
          </div>
        </div>
      </motion.div>

      <motion.div variants={cascadeItemVariants}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="turno-entrada">Entrada</Label>
            <Input
              id="turno-entrada"
              type="time"
              value={form.horario_inicio}
              onChange={(event) => setForm((atual) => ({ ...atual, horario_inicio: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="turno-saida">Saída</Label>
            <Input
              id="turno-saida"
              type="time"
              value={form.horario_fim}
              onChange={(event) => setForm((atual) => ({ ...atual, horario_fim: event.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="turno-intervalo">Intervalo (min)</Label>
            <Input
              id="turno-intervalo"
              type="number"
              min={0}
              value={form.intervalo_minutos}
              onChange={(event) => setForm((atual) => ({ ...atual, intervalo_minutos: Number(event.target.value) }))}
            />
          </div>
        </div>
      </motion.div>

      <motion.div variants={cascadeItemVariants}>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            role="switch"
            aria-checked={form.ativo}
            onClick={() => setForm((atual) => ({ ...atual, ativo: !atual.ativo }))}
            className="flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <span
              className={
                form.ativo
                  ? 'relative h-4 w-7 rounded-full bg-primary transition-colors'
                  : 'relative h-4 w-7 rounded-full bg-muted transition-colors'
              }
              aria-hidden
            >
              <span
                className={
                  form.ativo
                    ? 'absolute top-0.5 left-3.5 h-3 w-3 rounded-full bg-primary-foreground transition-all'
                    : 'absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-foreground/70 transition-all'
                }
              />
            </span>
            Turno ativo
          </button>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            líquido {formatarDuracaoMinutos(duracao)}
          </span>
        </div>
      </motion.div>

      <motion.div variants={cascadeItemVariants}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-3">
          {/* AÇÃO DESTRUTIVA à esquerda, sozinha no canto: é o padrão do
              sistema para excluir (longe do botão de salvar, que é o caminho
              feliz). A confirmação continua em DOIS passos no MESMO lugar —
              o botão troca de rótulo e fica com a tinta de perigo cheia, então
              o clique de confirmação nunca cai no mesmo alvo do primeiro. */}
          <div className="flex items-center">
            {turno &&
              (confirmandoExclusao ? (
                <Button
                  variant="outline"
                  className="h-[32px] gap-1.5 rounded-lg border-danger/45 bg-danger/12 px-3 text-[11px] font-semibold text-danger hover:bg-danger/20 hover:text-danger"
                  onClick={() => excluir.mutate()}
                  disabled={excluir.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  {excluir.isPending ? 'Excluindo…' : 'Confirmar exclusão'}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="h-[32px] gap-1.5 rounded-lg px-3 text-[11px] font-medium text-danger transition-colors hover:bg-danger/12 hover:text-danger"
                  onClick={() => setConfirmandoExclusao(true)}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  Excluir turno
                </Button>
              ))}
          </div>

          {/* AÇÕES PRINCIPAIS à direita, na ordem do sistema (cancelar → ação
              primária). Altura 40 px renderizados: o mesmo porte dos campos do
              formulário sem competir com eles. */}
          <div className="ml-auto flex items-center gap-2.5">
            <Button
              variant="outline"
              className="h-[32px] rounded-lg border-border/70 bg-secondary/40 px-[14px] text-[11px] font-medium text-foreground transition-colors hover:border-border hover:bg-secondary/70"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="h-[32px] rounded-lg px-[16px] text-[11px] font-semibold transition-shadow hover:shadow-glow-sm"
              onClick={() => salvar.mutate()}
              disabled={!podeSalvar || salvar.isPending}
            >
              {salvar.isPending ? 'Salvando…' : turno ? 'Salvar turno' : 'Criar turno'}
            </Button>
          </div>
        </div>
      </motion.div>
    </CascadeDialogFrame>
  );
}
