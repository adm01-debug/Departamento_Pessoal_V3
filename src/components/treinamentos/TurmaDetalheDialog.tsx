import { useEffect, useState, type ReactNode } from 'react';
import { CalendarDays, Clock, GraduationCap, MapPin, Monitor, UserRound, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { TreinamentosCascadeDialog, TreinamentosCascadeItem } from './TreinamentosCascadeDialog';
import { TreinamentoCategoriaBadge, TreinamentoStatusBadge } from './TreinamentoBadges';
import { corAvatarColaborador, iniciaisColaborador } from './TreinamentoParticipantes';
import { chaveModalidade } from './treinamentosDerivacoes';
import { formatarDataTurma, type Turma } from './turmasDerivacoes';

/**
 * Visualização da TURMA — somente leitura.
 *
 * Não existe rota, página de resultados ou “sala virtual” no sistema; este
 * diálogo apresenta exatamente os campos reais da instância (status, datas,
 * local, capacidade), do curso vinculado (categoria, modalidade, carga,
 * descrição) e do instrutor autorizado. Nenhuma ação de escrita é oferecida.
 */
export interface TurmaDetalheDialogProps {
  turma: Turma | null;
  onOpenChange: (aberto: boolean) => void;
}

function LinhaDetalhe({ icone: Icone, rotulo, children }: { icone: LucideIcon; rotulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/40 bg-background/40 px-2.5 py-2">
      <dt className="flex items-center gap-1 text-[9.5px] uppercase tracking-[0.08em] text-muted-foreground">
        <Icone className="h-3 w-3 shrink-0" aria-hidden />
        {rotulo}
      </dt>
      <dd className="mt-1 truncate text-[12px] font-medium text-foreground">{children}</dd>
    </div>
  );
}

export function TurmaDetalheDialog({ turma, onOpenChange }: TurmaDetalheDialogProps) {
  const [ultimaTurma, setUltimaTurma] = useState<Turma | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- guarda a última turma para o shell concluir a saída
    if (turma) setUltimaTurma(turma);
  }, [turma]);
  const exibida = turma ?? ultimaTurma;
  if (!exibida) return null;

  const local = exibida.local ?? (chaveModalidade(exibida.modalidade) === 'online' ? 'Online' : 'Não informado');
  const IconeModalidade = chaveModalidade(exibida.modalidade) === 'online' ? Monitor : MapPin;

  return (
    <TreinamentosCascadeDialog open={!!turma} onOpenChange={onOpenChange} blocks={4} className="max-w-[540px]">
      <TreinamentosCascadeItem>
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-1.5">
            <TreinamentoCategoriaBadge categoria={exibida.categoria} />
            <TreinamentoStatusBadge status={exibida.status} />
          </div>
          <DialogTitle className="mt-1 pr-6 text-left text-base leading-snug">{exibida.cursoNome}</DialogTitle>
          <DialogDescription className="text-left text-xs leading-relaxed">
            {exibida.descricao?.trim() || 'Este curso não possui descrição cadastrada.'}
          </DialogDescription>
        </DialogHeader>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem>
        <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-muted/20 p-3">
          <Avatar className="h-10 w-10 border border-border/50">
            {exibida.instrutorFoto && (
              <AvatarImage src={exibida.instrutorFoto} alt={exibida.instrutorNome ?? 'Instrutor'} />
            )}
            <AvatarFallback
              className={cn(
                'text-[11px] font-semibold',
                corAvatarColaborador(exibida.instrutorId ?? exibida.instrutorNome ?? exibida.id)
              )}
            >
              {exibida.instrutorNome ? iniciaisColaborador(exibida.instrutorNome) : <UserRound className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[9.5px] uppercase tracking-[0.08em] text-muted-foreground">Instrutor</p>
            <p className="truncate text-[13px] font-semibold text-foreground">
              {exibida.instrutorNome ?? 'Instrutor não informado'}
            </p>
            {exibida.instrutorCargo?.trim() ? (
              <p className="truncate text-[11px] text-muted-foreground">{exibida.instrutorCargo}</p>
            ) : null}
          </div>
        </div>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem className="mt-1">
        <dl className="grid grid-cols-2 gap-2">
          <LinhaDetalhe icone={CalendarDays} rotulo="Data de início">
            {formatarDataTurma(exibida.dataInicio)}
          </LinhaDetalhe>
          <LinhaDetalhe icone={Clock} rotulo="Horário">
            {exibida.hora ?? 'Não informado'}
          </LinhaDetalhe>
          <LinhaDetalhe icone={IconeModalidade} rotulo="Local / modalidade">
            <span title={local}>{local}</span>
          </LinhaDetalhe>
          <LinhaDetalhe icone={GraduationCap} rotulo="Modalidade">
            {exibida.modalidadeRotulo}
          </LinhaDetalhe>
          <LinhaDetalhe icone={Clock} rotulo="Carga horária">
            {exibida.cargaHoraria ?? 'Não informada'}
          </LinhaDetalhe>
          <LinhaDetalhe icone={Users} rotulo="Capacidade">
            {exibida.capacidade ? `${exibida.capacidade} vagas` : 'Não informada'}
          </LinhaDetalhe>
        </dl>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem className="mt-1">
        <p className="rounded-lg border border-dashed border-border/50 bg-muted/10 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          {exibida.ocupacao
            ? `${exibida.ocupacao.inscritos} de ${exibida.ocupacao.capacidade} vagas ocupadas (${exibida.ocupacao.percentual}%).`
            : 'O sistema não possui contagem de inscritos por turma; por isso a ocupação não é exibida para este registro.'}
        </p>
      </TreinamentosCascadeItem>
    </TreinamentosCascadeDialog>
  );
}
