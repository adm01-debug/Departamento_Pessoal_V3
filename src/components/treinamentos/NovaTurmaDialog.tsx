import { useEffect, useState } from 'react';
import { CalendarDays, Clock, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TreinamentosCascadeDialog, TreinamentosCascadeItem } from './TreinamentosCascadeDialog';
import type { ColaboradorTurma, CursoTurma } from './turmasDerivacoes';

/**
 * NOVA TURMA — formulário real de criação.
 *
 * Usa SOMENTE a operação existente `catalogoCursoService.criarInstancia` (sem
 * API/DB/migration novas). O status nasce com o default do banco (`planejado`);
 * a lista é invalidada pelo chamador após sucesso. No modo demonstração, o
 * guard `bloquearEscritaTreinamentos` impede o insert, como em todas as outras
 * criações do módulo.
 */
export interface NovaTurmaPayload {
  curso_id: string;
  instrutor_id: string | null;
  data_inicio: string;
  local_link: string | null;
  capacidade_maxima: number | null;
}

export interface NovaTurmaDialogProps {
  cursos: readonly CursoTurma[];
  colaboradores: readonly ColaboradorTurma[];
  /** Mantém o componente montado para a animação de saída do shell. */
  open?: boolean;
  onOpenChange: (aberto: boolean) => void;
  onCriar: (dados: NovaTurmaPayload) => void;
  pendente?: boolean;
}

export function NovaTurmaDialog({
  cursos,
  colaboradores,
  open = true,
  onOpenChange,
  onCriar,
  pendente = false,
}: NovaTurmaDialogProps) {
  const [cursoId, setCursoId] = useState('');
  const [instrutorId, setInstrutorId] = useState('sem_instrutor');
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [local, setLocal] = useState('');
  const [capacidade, setCapacidade] = useState('');

  // Reabrir sempre começa limpo, como quando o modal era remontado pelo pai.
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reabrir limpa o formulário, como no mount anterior
    setCursoId('');
    setInstrutorId('sem_instrutor');
    setData('');
    setHora('');
    setLocal('');
    setCapacidade('');
  }, [open]);

  const capacidadeNumero = capacidade.trim() ? Number(capacidade) : null;
  const capacidadeInvalida = capacidadeNumero !== null && (!Number.isFinite(capacidadeNumero) || capacidadeNumero <= 0);
  const podeSalvar = Boolean(cursoId && data && hora) && !capacidadeInvalida && !pendente;

  const salvar = () => {
    if (!podeSalvar) return;
    const inicio = new Date(`${data}T${hora}:00`);
    if (Number.isNaN(inicio.getTime())) {
      toast.error('Data/horário inválidos');
      return;
    }
    onCriar({
      curso_id: cursoId,
      instrutor_id: instrutorId === 'sem_instrutor' ? null : instrutorId,
      data_inicio: inicio.toISOString(),
      local_link: local.trim() || null,
      capacidade_maxima: capacidadeNumero,
    });
  };

  return (
    <TreinamentosCascadeDialog open={open} onOpenChange={onOpenChange} blocks={3} className="max-w-[500px]">
      <TreinamentosCascadeItem>
        <DialogHeader>
          <DialogTitle className="text-left text-base">Nova Turma</DialogTitle>
          <DialogDescription className="text-left text-xs leading-relaxed">
            Cadastre uma nova instância de treinamento. A turma será criada como <strong>Planejada</strong>.
          </DialogDescription>
        </DialogHeader>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="nova-turma-curso">Curso *</Label>
            <Select value={cursoId} onValueChange={setCursoId}>
              <SelectTrigger id="nova-turma-curso" aria-label="Curso da nova turma" className="h-10">
                <SelectValue placeholder="Selecione o curso" />
              </SelectTrigger>
              <SelectContent>
                {cursos.map((curso) => (
                  <SelectItem key={curso.id} value={curso.id}>
                    {curso.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {cursos.length === 0 && (
              <p className="text-[10.5px] text-muted-foreground">Nenhum curso cadastrado no catálogo.</p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="nova-turma-instrutor">Instrutor</Label>
            <Select value={instrutorId} onValueChange={setInstrutorId}>
              <SelectTrigger id="nova-turma-instrutor" aria-label="Instrutor da nova turma" className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sem_instrutor">Sem instrutor definido</SelectItem>
                {colaboradores.map((colaborador) => (
                  <SelectItem key={colaborador.id} value={colaborador.id}>
                    {colaborador.nome_completo ?? 'Colaborador'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="nova-turma-data" className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" aria-hidden /> Data de início *
              </Label>
              <Input
                id="nova-turma-data"
                type="date"
                value={data}
                onChange={(event) => setData(event.target.value)}
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nova-turma-hora" className="flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden /> Horário *
              </Label>
              <Input
                id="nova-turma-hora"
                type="time"
                value={hora}
                onChange={(event) => setHora(event.target.value)}
                className="h-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="nova-turma-local" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" aria-hidden /> Local / link
              </Label>
              <Input
                id="nova-turma-local"
                value={local}
                onChange={(event) => setLocal(event.target.value)}
                placeholder="Sala, endereço ou link"
                className="h-10"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="nova-turma-capacidade" className="flex items-center gap-1">
                <Users className="h-3 w-3" aria-hidden /> Capacidade
              </Label>
              <Input
                id="nova-turma-capacidade"
                type="number"
                min={1}
                value={capacidade}
                onChange={(event) => setCapacidade(event.target.value)}
                placeholder="Vagas"
                className="h-10"
              />
            </div>
          </div>
          {capacidadeInvalida && (
            <p className="text-[10.5px] text-destructive">Informe uma capacidade maior que zero ou deixe em branco.</p>
          )}
        </div>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pendente}
            className="h-9 rounded-lg px-4 text-[11.5px]"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={salvar}
            disabled={!podeSalvar}
            className="h-9 rounded-lg px-4 text-[11.5px] font-semibold"
          >
            {pendente ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </TreinamentosCascadeItem>
    </TreinamentosCascadeDialog>
  );
}
