import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Spinner } from '@/components/ui/spinner';
import { AlertTriangle } from 'lucide-react';
import { jornadaService } from '@/services';
import { turnoService, type EscalaDoDia } from '@/services/turnoService';
import type { Tables } from '@/integrations/supabase/database.types';
import { todayLocalISO } from '@/utils/dateLocal';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';
import { FalhaConsulta } from './FalhaConsulta';

interface Jornada {
  id: string;
  horario_entrada?: string | null;
  horario_saida?: string | null;
  intervalo_minutos?: number | null;
  carga_horaria_semanal?: number | null;
}

interface EditarJornadaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jornada: Jornada | null;
  empresaId: string;
  /** Quando informado, o modal também edita a escala de um dia específico
   *  (tabela `escalas_trabalho`) além da jornada contratual. */
  colaboradorId?: string;
  /** A consulta da jornada contratual FALHOU — `jornada` é null por erro, não
   *  por ausência. Sem isto o modal afirmaria "nenhuma jornada ativa" sem ter
   *  conseguido olhar. */
  jornadaIndisponivel?: boolean;
}

export function EditarJornadaDialog({
  open,
  onOpenChange,
  jornada,
  empresaId,
  colaboradorId,
  jornadaIndisponivel = false,
}: EditarJornadaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar Jornada</DialogTitle>
        </DialogHeader>

        {!jornada &&
          (jornadaIndisponivel ? (
            <FalhaConsulta o="a jornada contratual" />
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhuma jornada contratual ativa nesta empresa — cadastre uma jornada em Jornadas para editar entrada,
              saída, intervalo e carga semanal. A escala do dia abaixo pode ser ajustada mesmo assim.
            </p>
          ))}

        {jornada && (
          <EditarJornadaForm
            key={jornada.id}
            jornada={jornada}
            empresaId={empresaId}
            onDone={() => onOpenChange(false)}
          />
        )}

        {colaboradorId && empresaId && <EscalaDoDiaSection colaboradorId={colaboradorId} empresaId={empresaId} />}
      </DialogContent>
    </Dialog>
  );
}

/** Remontado (via `key={jornada.id}`) sempre que o modal abre para uma jornada
 *  diferente — o estado inicial já nasce correto, sem precisar de um efeito
 *  para sincronizar o form com a prop depois da montagem. */
function EditarJornadaForm({
  jornada,
  empresaId,
  onDone,
}: {
  jornada: Jornada;
  empresaId: string;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    horario_entrada: (jornada.horario_entrada || '').slice(0, 5),
    horario_saida: (jornada.horario_saida || '').slice(0, 5),
    intervalo_minutos: String(jornada.intervalo_minutos ?? ''),
    carga_horaria_semanal: String(jornada.carga_horaria_semanal ?? ''),
  });

  const salvar = useMutation({
    mutationFn: () =>
      jornadaService.atualizarJornada(
        jornada.id,
        {
          horario_entrada: form.horario_entrada,
          horario_saida: form.horario_saida,
          intervalo_minutos: Number(form.intervalo_minutos),
          carga_horaria_semanal: Number(form.carga_horaria_semanal),
        },
        empresaId
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jornadas'] });
      qc.invalidateQueries({ queryKey: ['jornada-colaborador'] });
      toast.success('Escala atualizada com sucesso.');
      onDone();
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Não foi possível atualizar a escala.')),
  });

  return (
    <>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Entrada</Label>
            <Input
              type="time"
              value={form.horario_entrada}
              onChange={(e) => setForm((p) => ({ ...p, horario_entrada: e.target.value }))}
            />
          </div>
          <div>
            <Label>Saída</Label>
            <Input
              type="time"
              value={form.horario_saida}
              onChange={(e) => setForm((p) => ({ ...p, horario_saida: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Intervalo (minutos)</Label>
            <Input
              type="number"
              value={form.intervalo_minutos}
              onChange={(e) => setForm((p) => ({ ...p, intervalo_minutos: e.target.value }))}
            />
          </div>
          <div>
            <Label>Carga semanal (horas)</Label>
            <Input
              type="number"
              value={form.carga_horaria_semanal}
              onChange={(e) => setForm((p) => ({ ...p, carga_horaria_semanal: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 border border-warning/20 text-xs text-warning">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Atenção: esta jornada pode ser utilizada por outros colaboradores. Alterações neste horário podem refletir
            em outros vínculos que utilizam esta jornada.
          </span>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          Salvar alterações
        </Button>
      </DialogFooter>
    </>
  );
}

/** Escala de UM dia (`escalas_trabalho`), separada da jornada contratual.
 *  Carrega o que já existe no dia escolhido para que salvar corrija o registro
 *  em vez de empilhar uma segunda escala no mesmo dia. */
function EscalaDoDiaSection({ colaboradorId, empresaId }: { colaboradorId: string; empresaId: string }) {
  const [data, setData] = useState(todayLocalISO());

  const turnos = useQuery({
    queryKey: ['turnos', empresaId],
    queryFn: () => turnoService.listarTurnos(empresaId),
    enabled: !!empresaId,
  });

  const escala = useQuery({
    queryKey: ['escalas', 'dia', colaboradorId, empresaId, data],
    queryFn: () => turnoService.obterEscalaDoDia(colaboradorId, empresaId, data),
    enabled: !!colaboradorId && !!empresaId && !!data,
  });

  return (
    <section className="space-y-3 border-t border-border/50 pt-4">
      <h3 className="text-sm font-semibold">Escala do dia</h3>

      <div>
        <Label htmlFor="escala-dia-data">Dia</Label>
        <DatePicker
          id="escala-dia-data"
          value={data}
          onChange={setData}
          placeholder="Selecionar dia"
          aria-label="Dia da escala"
        />
      </div>

      {!data ? (
        <p className="text-xs text-muted-foreground">Selecione um dia para ver a escala.</p>
      ) : escala.isLoading || turnos.isLoading ? (
        <div data-testid="escala-dia-carregando" className="py-2">
          <Spinner />
        </div>
      ) : escala.isError || turnos.isError ? (
        <FalhaConsulta o="a escala deste dia" />
      ) : (
        <EscalaDoDiaFields
          key={`${data}:${escala.data?.id ?? 'sem-escala'}`}
          colaboradorId={colaboradorId}
          empresaId={empresaId}
          data={data}
          escala={escala.data ?? null}
          turnos={turnos.data ?? []}
        />
      )}
    </section>
  );
}

/** Remontado por `key` quando muda o dia (ou a escala encontrada nele), pelo
 *  mesmo motivo do form de jornada: o estado inicial já nasce do dado carregado. */
function EscalaDoDiaFields({
  colaboradorId,
  empresaId,
  data,
  escala,
  turnos,
}: {
  colaboradorId: string;
  empresaId: string;
  data: string;
  escala: EscalaDoDia | null;
  turnos: Tables<'turnos'>[];
}) {
  const qc = useQueryClient();
  const [turnoId, setTurnoId] = useState(escala?.turno_id ?? '');
  const [observacoes, setObservacoes] = useState(escala?.observacoes ?? '');

  const salvar = useMutation({
    // Relê a escala do dia no instante do salvar: é essa leitura que decide
    // UPDATE x INSERT. Sem ela, salvar duas vezes para o mesmo dia criava uma
    // segunda escala em vez de corrigir a primeira.
    mutationFn: async (): Promise<{ modo: 'update' | 'insert' }> => {
      const existente = await turnoService.obterEscalaDoDia(colaboradorId, empresaId, data);
      const observacoesLimpas = observacoes.trim() || null;

      if (existente) {
        await turnoService.atualizarEscala(
          existente.id,
          { turno_id: turnoId, observacoes: observacoesLimpas },
          empresaId
        );
        return { modo: 'update' };
      }

      await turnoService.criarEscala({
        colaborador_id: colaboradorId,
        empresa_id: empresaId,
        data,
        turno_id: turnoId,
        observacoes: observacoesLimpas,
      });
      return { modo: 'insert' };
    },
    onSuccess: ({ modo }) => {
      qc.invalidateQueries({ queryKey: ['escalas'] });
      qc.invalidateQueries({ queryKey: ['escalas_trabalho'] });
      toast.success(modo === 'update' ? 'Escala do dia atualizada.' : 'Escala do dia criada.');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Não foi possível salvar a escala do dia.')),
  });

  // Criar e corrigir sem poder remover deixa o dia errado gravado para sempre:
  // o formulário só troca turno e observações, nunca apaga o agendamento.
  const remover = useMutation({
    // Relê antes de apagar, como o salvar: a escala pode ter saído em outra aba.
    mutationFn: async (): Promise<{ removido: boolean }> => {
      const existente = await turnoService.obterEscalaDoDia(colaboradorId, empresaId, data);
      if (!existente) return { removido: false };
      await turnoService.excluirEscala(existente.id, empresaId);
      return { removido: true };
    },
    onSuccess: ({ removido }) => {
      qc.invalidateQueries({ queryKey: ['escalas'] });
      qc.invalidateQueries({ queryKey: ['escalas_trabalho'] });
      toast.success(removido ? 'Escala do dia removida.' : 'Nenhuma escala neste dia para remover.');
    },
    onError: (e: Error) => toast.error(safeErrorMessage(e, 'Não foi possível remover a escala do dia.')),
  });

  return (
    <div className="space-y-3">
      {turnos.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Nenhum turno cadastrado nesta empresa — cadastre um turno antes de montar a escala.
        </p>
      )}

      <div>
        <Label htmlFor="escala-dia-turno">Turno</Label>
        <Select value={turnoId || undefined} onValueChange={setTurnoId} disabled={turnos.length === 0}>
          <SelectTrigger id="escala-dia-turno" aria-label="Turno da escala">
            <SelectValue placeholder="Selecionar turno" />
          </SelectTrigger>
          <SelectContent>
            {turnos.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.nome} ({t.horario_inicio.slice(0, 5)}–{t.horario_fim.slice(0, 5)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="escala-dia-observacoes">Observações</Label>
        <Textarea
          id="escala-dia-observacoes"
          rows={2}
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {escala
          ? 'Já existe escala neste dia — salvar corrige o registro existente.'
          : 'Nenhuma escala registrada neste dia — salvar cria o registro.'}
      </p>

      {salvar.isError && (
        <p role="alert" className="text-xs text-[hsl(var(--destructive-vivid))]">
          {safeErrorMessage(salvar.error, 'Não foi possível salvar a escala do dia.')}
        </p>
      )}

      <Button
        className="w-full"
        onClick={() => salvar.mutate()}
        disabled={salvar.isPending || remover.isPending || !turnoId || turnos.length === 0}
      >
        {salvar.isPending ? 'Salvando…' : 'Salvar escala do dia'}
      </Button>

      {escala && (
        <>
          {remover.isError && (
            <p role="alert" className="text-xs text-[hsl(var(--destructive-vivid))]">
              {safeErrorMessage(remover.error, 'Não foi possível remover a escala do dia.')}
            </p>
          )}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => remover.mutate()}
            disabled={remover.isPending || salvar.isPending}
          >
            {remover.isPending ? 'Removendo…' : 'Remover escala do dia'}
          </Button>
        </>
      )}
    </div>
  );
}
