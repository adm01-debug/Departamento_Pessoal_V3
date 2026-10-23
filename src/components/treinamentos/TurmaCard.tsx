import {
  ArrowRight,
  CalendarDays,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  MapPin,
  MoreVertical,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { TreinamentoStatusBadge } from './TreinamentoBadges';
import { TrainingCover } from './TrainingCover';
import { corAvatarColaborador, iniciaisColaborador } from './TreinamentoParticipantes';
import { chaveModalidade } from './treinamentosDerivacoes';
import { formatarDataTurma, type Turma } from './turmasDerivacoes';

/**
 * ============================================================================
 * CARD DE TURMA — composição horizontal compacta.
 *
 * CABEÇALHO (96 px): imagem real ou placeholder da categoria em toda a largura;
 * overlay escuro; badge do status REAL no topo esquerdo; NOME DO CURSO e
 * CATEGORIA sobrepostos na base da imagem.
 *
 * CORPO: uma linha de metadados (data · horário · local), uma linha com
 * instrutor à esquerda e ocupação à direita (barra APENAS com dados reais) e
 * rodapé compacto com ação principal + menu.
 * ============================================================================
 */
export interface TurmaCardProps {
  turma: Turma;
  onAbrir: (turma: Turma) => void;
}

const CORES_BARRA: Record<Turma['grupo'], string> = {
  proximas: 'bg-info',
  andamento: 'bg-[hsl(var(--aqua))]',
  concluidas: 'bg-success',
};

function MetaTurma({ icone: Icone, valor, titulo }: { icone: typeof CalendarDays; valor: string; titulo: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1" title={titulo}>
      <Icone className="h-3 w-3 shrink-0 text-muted-foreground/80" aria-hidden />
      <span className="truncate text-[10px] leading-tight text-foreground/90">{valor}</span>
    </div>
  );
}

export function TurmaCard({ turma, onAbrir }: TurmaCardProps) {
  const tituloId = `turma-${turma.id}`;
  const online = chaveModalidade(turma.modalidade) === 'online';
  const local = turma.local ?? (online ? 'Online' : 'Não informado');
  const percentualBarra = turma.ocupacao ? Math.min(100, Math.max(0, turma.ocupacao.percentual)) : 0;

  const copiarLocal = async () => {
    if (!turma.local) return;
    try {
      await navigator.clipboard.writeText(turma.local);
      toast.success('Local copiado');
    } catch {
      toast.error('Não foi possível copiar o local');
    }
  };

  return (
    <article
      data-turma-card={turma.id}
      aria-labelledby={tituloId}
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-border/50 bg-card/50 transition-colors duration-200 hover:border-primary/35 hover:bg-card/80 focus-within:border-primary/40"
    >
      <div data-turma-header className="relative h-[104px] w-full shrink-0 overflow-hidden">
        {/* Capa herdada do CURSO (`turma.imagemUrl` vem de `catalogo_cursos`):
            uma identidade visual por curso, nunca uma geração por turma. */}
        <TrainingCover
          tipo="training_session"
          nome={turma.cursoNome}
          categoria={turma.categoria}
          imagemUrl={turma.imagemUrl}
          formato="faixa"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

        <TreinamentoStatusBadge
          status={turma.status}
          className="absolute left-2.5 top-2.5 border-border/60 bg-background/85 shadow-sm backdrop-blur-md"
        />

        <div className="absolute inset-x-3 bottom-2 min-w-0">
          <h3
            id={tituloId}
            data-turma-titulo
            title={turma.cursoNome}
            className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.45)]"
          >
            {turma.cursoNome}
          </h3>
          <p data-turma-categoria className="mt-0.5 truncate text-[10px] leading-tight text-white/75">
            {turma.categoria?.trim() || 'Sem categoria'}
            {turma.modalidade ? (
              <>
                <span aria-hidden> · </span>
                {turma.modalidadeRotulo}
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-3 py-3">
        <dl data-turma-meta className="grid min-h-4 min-w-0 grid-cols-3 gap-2">
          <div className="min-w-0">
            <dt className="sr-only">Data de início</dt>
            <dd>
              <MetaTurma icone={CalendarDays} valor={formatarDataTurma(turma.dataInicio)} titulo="Data de início" />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="sr-only">Horário</dt>
            <dd>
              <MetaTurma icone={Clock} valor={turma.hora ?? 'Não informado'} titulo="Horário de início" />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="sr-only">Local</dt>
            <dd>
              <MetaTurma icone={MapPin} valor={local} titulo={`Local: ${local}`} />
            </dd>
          </div>
        </dl>

        <div className="flex min-h-8 min-w-0 items-center justify-between gap-3">
          <div data-turma-instrutor className="flex min-w-0 flex-1 items-center gap-2">
            <Avatar className="h-[30px] w-[30px] shrink-0 border border-border/50">
              {turma.instrutorFoto && (
                <AvatarImage src={turma.instrutorFoto} alt={turma.instrutorNome ?? 'Instrutor'} />
              )}
              <AvatarFallback
                className={cn(
                  'text-[10px] font-semibold',
                  corAvatarColaborador(turma.instrutorId ?? turma.instrutorNome ?? turma.id)
                )}
              >
                {turma.instrutorNome ? iniciaisColaborador(turma.instrutorNome) : <UserRound className="h-3.5 w-3.5" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[11px] font-medium text-foreground" title={turma.instrutorNome ?? undefined}>
                {turma.instrutorNome ?? 'Instrutor não informado'}
              </p>
              {turma.instrutorCargo?.trim() ? (
                <p className="truncate text-[9.5px] text-muted-foreground" title={turma.instrutorCargo}>
                  {turma.instrutorCargo}
                </p>
              ) : null}
            </div>
          </div>

          {turma.ocupacao ? (
            <div className="w-[46%] min-w-[104px] shrink-0">
              <div className="flex items-center justify-between gap-2 text-[9.5px] leading-none">
                <span className="truncate text-muted-foreground" title="Ocupação da turma">
                  {turma.ocupacao.inscritos} de {turma.ocupacao.capacidade} vagas
                </span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">
                  {turma.ocupacao.percentual}%
                </span>
              </div>
              <div
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-background/80"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={turma.ocupacao.percentual}
                aria-label={`Ocupação da turma: ${turma.ocupacao.percentual}%`}
              >
                <div
                  className={cn('h-full rounded-full transition-[width] duration-300', CORES_BARRA[turma.grupo])}
                  style={{ width: `${percentualBarra}%` }}
                />
              </div>
            </div>
          ) : (
            <div
              className="w-[46%] min-w-[104px] shrink-0 text-right leading-tight"
              title="A tabela de turmas não possui contagem de inscritos; a ocupação não é calculada."
            >
              <p className="truncate text-[9.5px] text-muted-foreground">
                {turma.capacidade ? `${turma.capacidade} vagas` : 'Capacidade não informada'}
              </p>
              <p className="truncate text-[9px] text-muted-foreground/70">Ocupação não informada</p>
            </div>
          )}
        </div>

        <div data-turma-rodape className="mt-auto flex items-center gap-1.5 pt-0.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onAbrir(turma)}
            aria-label={`Ver turma ${turma.cursoNome}`}
            className="h-9 min-w-0 flex-1 gap-1.5 rounded-lg border-border/60 px-3 text-[11.5px] font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="truncate">Ver turma</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Ações da turma ${turma.cursoNome}`}
                className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem className="gap-2" onSelect={() => onAbrir(turma)}>
                <Eye className="h-4 w-4" />
                Ver detalhes
              </DropdownMenuItem>
              {turma.local && (
                <DropdownMenuItem className="gap-2" onSelect={() => void copiarLocal()}>
                  <Copy className="h-4 w-4" />
                  Copiar local
                </DropdownMenuItem>
              )}
              {turma.local && /^https?:\/\//i.test(turma.local) && (
                <DropdownMenuItem
                  className="gap-2"
                  onSelect={() => window.open(turma.local!, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir link
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </article>
  );
}
