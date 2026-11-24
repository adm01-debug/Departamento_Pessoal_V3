/**
 * ============================================================================
 * TURNOS & ESCALAS — DIÁLOGO "NOVA ESCALA" (criar / trocar turno).
 * ============================================================================
 *
 * Mesma moldura de janela do sistema (`CascadeDialogFrame` — a animação do
 * popup de Pendências), com os campos que a operação realmente precisa:
 *
 *   • colaborador (equipe ativa da empresa);
 *   • turno (catálogo real, com horário e duração líquida visíveis);
 *   • data + recorrência (única, diária ou semanal, até 30 ocorrências);
 *   • PRÉ-CHECAGEM DE CONFLITO: para cada data que será salva, se o colaborador
 *     já tem escala com horário que se sobrepõe ao turno escolhido, a janela
 *     avisa antes de confirmar (a regra é a mesma de `detectarConflitos`).
 *
 * SALVAMENTO (sem duplicar registro): em modo edição, `atualizarEscala` na
 * linha escolhida. Em modo criação, cada data procurada no período já carregado
 * — se existir escala daquele colaborador no dia, ATUALIZA o turno dela em vez
 * de inserir uma segunda. Datas fora do período carregado (recorrência longa)
 * são criadas normalmente; a consulta pontual (`obterEscalaDoDia`) não é usada
 * aqui para não disparar N requisições por clique em "Salvar".
 *
 * Nada de validação trabalhista: o aviso é de SOBREPOSIÇÃO de horários, que é
 * dado do próprio sistema.
 * ============================================================================
 */
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { AlertTriangle, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { CascadeDialogFrame } from '@/components/ui/cascade-dialog';
import { cascadeItemVariants } from '@/components/ui/cascade-motion';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { turnoService } from '@/services/turnoService';
import { safeErrorMessage } from '@/utils/safeError';
import {
  chaveData,
  gerarDatasRecorrentes,
  MAX_OCORRENCIAS_ESCALA,
  rotuloDataCompleta,
  type RecorrenciaEscala,
} from './turnosCalendario';
import { normalizarHex } from './turnosCores';
import {
  duracaoLiquidaMinutos,
  faixaHoraria,
  formatarDuracaoMinutos,
  janelasSeSobrepoem,
  janelaDoTurno,
  type EscalaRegistro,
  type MembroEquipe,
  type TurnoRegistro,
} from './turnosMetricas';

export interface DialogoNovaEscalaProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  empresaId: string | null | undefined;
  equipe: readonly MembroEquipe[];
  turnos: readonly TurnoRegistro[];
  /** Escalas já carregadas do período — usadas só para pré-checar conflito. */
  escalasExistentes: readonly EscalaRegistro[];
  /** Colaborador/data vindos do clique numa célula vazia. */
  prefill: { colaboradorId: string; data: string } | null;
  /** Escala em edição ("Trocar turno" nos detalhes). */
  edicao: EscalaRegistro | null;
  onSalvo: () => void;
}

/** Blocos que cascateiam: cabeçalho · pessoa/turno · data/recorrência · resumo · rodapé. */
const BLOCOS_CASCATA = 5;

interface EstadoFormulario {
  colaboradorId: string;
  turnoId: string;
  data: string;
  recorrencia: RecorrenciaEscala;
  ocorrencias: number;
}

/** Estado inicial a partir do alvo (célula vazia, edição ou nada). */
function estadoInicial(prefill: DialogoNovaEscalaProps['prefill'], edicao: EscalaRegistro | null): EstadoFormulario {
  if (edicao) {
    return {
      colaboradorId: edicao.colaborador_id,
      turnoId: edicao.turno_id,
      data: edicao.data.slice(0, 10),
      recorrencia: 'unica',
      ocorrencias: 1,
    };
  }
  return {
    colaboradorId: prefill?.colaboradorId ?? '',
    turnoId: '',
    data: prefill?.data ?? chaveData(new Date()),
    recorrencia: 'unica',
    ocorrencias: 1,
  };
}

export function DialogoNovaEscala({
  aberto,
  onOpenChange,
  empresaId,
  equipe,
  turnos,
  escalasExistentes,
  prefill,
  edicao,
  onSalvo,
}: DialogoNovaEscalaProps) {
  const chaveAlvo = `${edicao?.id ?? ''}|${prefill?.colaboradorId ?? ''}|${prefill?.data ?? ''}`;
  const [assinatura, setAssinatura] = useState(chaveAlvo);
  const [form, setForm] = useState<EstadoFormulario>(() => estadoInicial(prefill, edicao));

  // Reabrir com outro alvo reinicia o formulário (ajuste na renderização, sem
  // efeito colateral) — o mesmo padrão usado nos diálogos de Horas Extras.
  if (aberto && chaveAlvo !== assinatura) {
    setAssinatura(chaveAlvo);
    setForm(estadoInicial(prefill, edicao));
  }

  const turnoSelecionado = turnos.find((turno) => turno.id === form.turnoId) ?? null;
  const datas = gerarDatasRecorrentes(form.data, form.recorrencia, form.ocorrencias);
  const janelaNova = janelaDoTurno(turnoSelecionado);

  // Datas que já têm uma escala do mesmo colaborador com horário sobreposto.
  const conflitos = datas.filter((dia) =>
    escalasExistentes.some((escala) => {
      if (escala.colaborador_id !== form.colaboradorId) return false;
      if (escala.data.slice(0, 10) !== dia) return false;
      if (edicao && escala.id === edicao.id) return false;
      return janelasSeSobrepoem(janelaNova, janelaDoTurno(escala.turno ?? null));
    })
  );

  const podeSalvar = !!empresaId && !!form.colaboradorId && !!form.turnoId && datas.length > 0;

  const salvar = useMutation({
    mutationFn: async () => {
      if (!empresaId) throw new Error('Empresa não selecionada.');

      if (edicao) {
        return turnoService.atualizarEscala(edicao.id, { turno_id: form.turnoId }, empresaId);
      }

      for (const dia of datas) {
        const existente = escalasExistentes.find(
          (escala) => escala.colaborador_id === form.colaboradorId && escala.data.slice(0, 10) === dia
        );
        if (existente) {
          await turnoService.atualizarEscala(existente.id, { turno_id: form.turnoId }, empresaId);
        } else {
          await turnoService.criarEscala({
            empresa_id: empresaId,
            colaborador_id: form.colaboradorId,
            turno_id: form.turnoId,
            data: dia,
            status: 'agendado',
          });
        }
      }
      return null;
    },
    onSuccess: () => {
      const quantidade = edicao ? 1 : datas.length;
      toast.success(
        edicao ? 'Escala atualizada.' : quantidade > 1 ? `${quantidade} escalas salvas.` : 'Escala criada.'
      );
      onOpenChange(false);
      onSalvo();
    },
    onError: (erro: Error) => toast.error(safeErrorMessage(erro, 'Não foi possível salvar a escala.')),
  });

  return (
    <CascadeDialogFrame
      open={aberto}
      onOpenChange={onOpenChange}
      blocks={BLOCOS_CASCATA}
      className="rounded-none sm:max-w-[540px] sm:rounded-lg"
      contentClassName="grid gap-3 p-5"
    >
      <motion.div variants={cascadeItemVariants}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-heading">
            <CalendarPlus className="h-4 w-4 text-primary" aria-hidden />
            {edicao ? 'Trocar turno' : 'Nova escala'}
          </DialogTitle>
          <DialogDescription className="text-[10px] text-muted-foreground">
            {edicao ? 'Escolha o novo turno para a data da escala.' : 'Defina colaborador, turno e as datas da escala.'}
          </DialogDescription>
        </DialogHeader>
      </motion.div>

      <motion.div variants={cascadeItemVariants}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nova-escala-colaborador">Colaborador</Label>
            <Select
              value={form.colaboradorId}
              onValueChange={(valor) => setForm((atual) => ({ ...atual, colaboradorId: valor }))}
              disabled={!!edicao}
            >
              <SelectTrigger id="nova-escala-colaborador" aria-label="Colaborador">
                <SelectValue placeholder="Selecionar colaborador" />
              </SelectTrigger>
              <SelectContent>
                {equipe.map((membro) => (
                  <SelectItem key={membro.id} value={membro.id}>
                    {membro.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nova-escala-turno">Turno</Label>
            <Select value={form.turnoId} onValueChange={(valor) => setForm((atual) => ({ ...atual, turnoId: valor }))}>
              <SelectTrigger id="nova-escala-turno" aria-label="Turno">
                <SelectValue placeholder="Selecionar turno" />
              </SelectTrigger>
              <SelectContent>
                {turnos.map((turno) => (
                  <SelectItem key={turno.id} value={turno.id}>
                    {turno.nome} · {faixaHoraria(turno)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      <motion.div variants={cascadeItemVariants}>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_90px]">
          <div className="space-y-1.5">
            <Label htmlFor="nova-escala-data">Data</Label>
            <Input
              id="nova-escala-data"
              type="date"
              value={form.data}
              onChange={(event) => setForm((atual) => ({ ...atual, data: event.target.value }))}
              disabled={!!edicao}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nova-escala-recorrencia">Recorrência</Label>
            <Select
              value={form.recorrencia}
              onValueChange={(valor) => setForm((atual) => ({ ...atual, recorrencia: valor as RecorrenciaEscala }))}
              disabled={!!edicao}
            >
              <SelectTrigger id="nova-escala-recorrencia" aria-label="Recorrência">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unica">Não repetir</SelectItem>
                <SelectItem value="diaria">Diária</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nova-escala-ocorrencias">Vezes</Label>
            <Input
              id="nova-escala-ocorrencias"
              type="number"
              min={1}
              max={MAX_OCORRENCIAS_ESCALA}
              value={form.ocorrencias}
              onChange={(event) => setForm((atual) => ({ ...atual, ocorrencias: Number(event.target.value) }))}
              disabled={!!edicao || form.recorrencia === 'unica'}
            />
          </div>
        </div>
      </motion.div>

      <motion.div variants={cascadeItemVariants}>
        <div className="space-y-2">
          {turnoSelecionado ? (
            <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-3 py-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: normalizarHex(turnoSelecionado.cor) }}
                aria-hidden
              />
              <p className="min-w-0 flex-1 truncate text-[13px] font-medium">{turnoSelecionado.nome}</p>
              <p className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                {faixaHoraria(turnoSelecionado)} · {formatarDuracaoMinutos(duracaoLiquidaMinutos(turnoSelecionado))}
              </p>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">Selecione um turno para ver o horário e a carga diária.</p>
          )}

          {datas.length > 0 && !edicao && (
            <p className="text-[10px] text-muted-foreground">
              {datas.length === 1
                ? `Será salva em ${rotuloDataCompleta(datas[0])}.`
                : `${datas.length} datas: de ${rotuloDataCompleta(datas[0])} a ${rotuloDataCompleta(datas[datas.length - 1])}.`}
            </p>
          )}

          {conflitos.length > 0 && (
            <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-foreground">
                  {conflitos.length === 1
                    ? 'Já existe escala com horário sobreposto nesta data'
                    : `Já existem escalas com horário sobreposto em ${conflitos.length} datas`}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {conflitos.slice(0, 4).map(rotuloDataCompleta).join(', ')}
                  {conflitos.length > 4 ? '…' : ''}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={cascadeItemVariants}>
        {/* Rodapé com o MESMO porte dos botões do diálogo de turno (40 px de
            altura, 13,75 px de texto, semibold na ação primária): antes eles
            herdavam o `h-9` + `text-control` (45 px + 16,25 px) e liam maiores
            que os campos acima. `justify-end` mantém os dois na mesma linha. */}
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border/40 pt-3">
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
            {salvar.isPending ? 'Salvando…' : edicao ? 'Salvar turno' : 'Salvar escala'}
          </Button>
        </div>
      </motion.div>
    </CascadeDialogFrame>
  );
}
