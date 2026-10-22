import { UserRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { ColaboradorParticipacao, ResumoParticipacao } from './treinamentosDerivacoes';

/**
 * Coluna Participantes.
 *
 * Fonte de verdade: `treinamento_participantes` (treinamento → colaborador +
 * `presente`), agregada por `agruparParticipantes`. A barra representa
 * PRESENÇAS CONFIRMADAS sobre o total de participantes do treinamento — uma
 * única definição para todas as linhas (não mistura inscritos × capacidade).
 *
 * Sem registros para o treinamento, o componente mostra o estado vazio
 * padronizado em vez de inventar avatares, quantidades ou progresso.
 *
 * CORES (refino de hierarquia): preenchimento em DEGRADÊ horizontal lime → success
 * (`primary` → `success`, ambos tokens oficiais) sobre trilho azul-marinho
 * (`background`) — o progresso continua discreto e não compete com o badge de
 * Status, que segue dono da cor semântica.
 */

const CORES_AVATAR = [
  'bg-info/15 text-info',
  'bg-success/15 text-success',
  'bg-warning/15 text-warning',
  'bg-xp/15 text-xp',
  'bg-[hsl(var(--chart-5)/0.15)] text-[hsl(var(--chart-5))]',
];

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

function corAvatar(id: string): string {
  let soma = 0;
  for (let i = 0; i < id.length; i += 1) soma = (soma + id.charCodeAt(i)) % 997;
  return CORES_AVATAR[soma % CORES_AVATAR.length];
}

function AvatarParticipante({ colaborador }: { colaborador: ColaboradorParticipacao }) {
  return (
    <Avatar className="h-7 w-7 border-2 border-card ring-1 ring-border/40" title={colaborador.nome}>
      {colaborador.fotoUrl && <AvatarImage src={colaborador.fotoUrl} alt={colaborador.nome} />}
      <AvatarFallback className={cn('text-[10px] font-semibold', corAvatar(colaborador.id))}>
        {iniciais(colaborador.nome)}
      </AvatarFallback>
    </Avatar>
  );
}

export function TreinamentoParticipantes({
  resumo,
  className,
  centralizado = false,
}: {
  resumo?: ResumoParticipacao;
  className?: string;
  /**
   * Centraliza o CONJUNTO na coluna (avatares + chip "+N" + barra + "X de Y").
   * Padrão `false` mantém o alinhamento à esquerda dos cartões mobile.
   */
  centralizado?: boolean;
}) {
  if (!resumo || resumo.total === 0) {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-[11px] text-muted-foreground',
          centralizado && 'justify-center',
          className
        )}
        title="Nenhum registro em treinamento_participantes para este treinamento."
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-border/70 text-muted-foreground/70">
          <UserRound className="h-3.5 w-3.5" />
        </span>
        <span>Sem participantes</span>
      </div>
    );
  }

  const visiveis = resumo.colaboradores.slice(0, 3);
  // O mock visual informa o "+N" da referência; no caminho real ele continua
  // sendo a diferença entre o total de participantes e os avatares exibidos.
  const excedente = resumo.excedente ?? resumo.total - visiveis.length;

  return (
    <div
      className={cn('min-w-0 space-y-1.5', className)}
      title={`${resumo.presentes} de ${resumo.total} participantes`}
    >
      <div className={cn('flex items-center', centralizado && 'justify-center')}>
        <div className="flex -space-x-2">
          {visiveis.map((colaborador) => (
            <AvatarParticipante key={colaborador.id} colaborador={colaborador} />
          ))}
        </div>
        {excedente > 0 && (
          <span className="ml-1.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-border/60 bg-muted/50 px-1 text-[10px] font-semibold tabular-nums text-muted-foreground">
            +{excedente}
          </span>
        )}
      </div>

      <div className={cn('flex min-w-0 items-center gap-2', centralizado && 'justify-center')}>
        <div
          className={cn(
            'h-1.5 min-w-0 overflow-hidden rounded-full bg-background/80',
            centralizado ? 'max-w-[96px] flex-1' : 'flex-1'
          )}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/80 to-success/80 transition-[width] duration-300"
            style={{ width: `${resumo.percentual}%` }}
          />
        </div>
        <span
          className={cn(
            'shrink-0 text-[10px] tabular-nums text-muted-foreground',
            centralizado && 'min-w-[46px] text-right'
          )}
        >
          {resumo.presentes} de {resumo.total}
        </span>
      </div>
    </div>
  );
}
