import { ArrowRight, CalendarDays, Clock, ExternalLink, MapPin, MoreVertical, UserRound } from 'lucide-react';
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
 * CABEÇALHO (104 px): capa do CURSO em toda a largura; overlay escuro; badge do
 * status REAL no topo esquerdo; NOME DO CURSO e CATEGORIA sobrepostos na base.
 *
 * CORPO: três grupos de metadados (data · horário · modalidade/local), cada um
 * com linha complementar apenas quando existe dado real:
 *   • data      → complemento temporal calculado (`Em 7 dias`, `Iniciada há…`);
 *   • horário   → intervalo somente se `data_fim` trouxer hora + carga real;
 *   • local     → modalidade e, abaixo, sala/plataforma.
 * Depois: instrutor à esquerda (nome com até duas linhas) e ocupação à direita —
 * barra APENAS com contagem real de inscritos.
 *
 * RODAPÉ: uma única ação de visualização (“Ver turma” abre o diálogo de
 * detalhes). O menu contextual existe apenas quando o local é uma URL http(s),
 * pois nesse caso “Abrir link” é uma ação distinta. “Ver detalhes” e “Copiar
 * local” foram removidos: o primeiro repetia o mesmo handler do botão principal
 * e o segundo apenas copiava o `local_link` já exibido no card/detalhe. Sem URL,
 * o menu inteiro não é renderizado e o botão principal ocupa toda a largura.
 * ============================================================================
 */
export interface TurmaCardProps {
  turma: Turma;
  onAbrir: (turma: Turma) => void;
}

/**
 * Cor da barra de ocupação: verde na lotação completa, azul/ciano abaixo dela.
 * Sempre sobre o trilho navy (`--background` escurecido).
 */
function corBarraOcupacao(turma: Turma, percentual: number): string {
  if (percentual >= 100) return 'bg-success';
  return turma.grupo === 'andamento' ? 'bg-[hsl(var(--aqua))]' : 'bg-info';
}

function MetaTurma({
  icone: Icone,
  principal,
  secundario,
  titulo,
}: {
  icone: typeof CalendarDays;
  principal: string;
  secundario?: string | null;
  titulo: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-1.5" title={titulo}>
      <Icone className="mt-[1px] h-3 w-3 shrink-0 text-muted-foreground/70" aria-hidden />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[10.5px] font-medium text-foreground/90">{principal}</p>
        {secundario ? (
          <p className="mt-0.5 truncate text-[8.5px] leading-tight text-muted-foreground @[320px]:text-[9px]">
            {secundario}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function TurmaCard({ turma, onAbrir }: TurmaCardProps) {
  const tituloId = `turma-${turma.id}`;
  const online = chaveModalidade(turma.modalidade) === 'online';
  const local = turma.local ?? (online ? 'Online' : 'Não informado');
  const percentualBarra = turma.ocupacao ? Math.min(100, Math.max(0, turma.ocupacao.percentual)) : 0;

  /** Grupo 3: modalidade como linha principal e o local como complemento —
   *  sem repetir a mesma informação (online sem sala => só “Online”). */
  const localPrincipal = turma.modalidade ? turma.modalidadeRotulo : local;
  const localSecundario = turma.local && turma.local !== localPrincipal ? turma.local : null;

  /** Grupo 2: intervalo só quando a fonte tem hora de término; nunca deduzido. */
  const horarioPrincipal = turma.hora
    ? turma.horaFim
      ? `${turma.hora} – ${turma.horaFim}`
      : turma.hora
    : 'Não informado';

  /** Só há menu quando existe uma ação secundária distinta: abrir URL real. */
  const linkDoLocal = turma.local && /^https?:\/\//i.test(turma.local) ? turma.local : null;

  return (
    <article
      data-turma-card={turma.id}
      aria-labelledby={tituloId}
      className="group @container flex h-full min-h-[240px] min-w-0 flex-col overflow-hidden rounded-xl border border-border/50 bg-card/50 transition-colors duration-200 hover:border-primary/35 hover:bg-card/80 focus-within:border-primary/40"
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
          className="absolute left-2.5 top-2.5 border-white/15 bg-[hsl(216_48%_9%)]/75 shadow-sm backdrop-blur-md"
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
          <p data-turma-categoria className="mt-0.5 truncate text-[10.5px] leading-tight text-white/75">
            {turma.categoria?.trim() || 'Sem categoria'}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-2.5 pb-2.5 pt-2">
        <dl
          data-turma-meta
          className="grid min-h-[28px] min-w-0 grid-cols-[minmax(0,1.25fr)_minmax(0,0.85fr)_minmax(0,1fr)] gap-1.5"
        >
          <div className="min-w-0">
            <dt className="sr-only">Data de início</dt>
            <dd>
              <MetaTurma
                icone={CalendarDays}
                principal={formatarDataTurma(turma.dataInicio)}
                secundario={turma.referencia}
                titulo={turma.referencia ? `Data de início · ${turma.referencia}` : 'Data de início'}
              />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="sr-only">Horário</dt>
            <dd>
              <MetaTurma
                icone={Clock}
                principal={horarioPrincipal}
                secundario={turma.duracao}
                titulo={turma.duracao ? `Horário · ${turma.duracao}` : 'Horário de início'}
              />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="sr-only">Modalidade e local</dt>
            <dd>
              <MetaTurma
                icone={MapPin}
                principal={localPrincipal}
                secundario={localSecundario}
                titulo={`Modalidade: ${localPrincipal}${localSecundario ? ` · Local: ${localSecundario}` : ''}`}
              />
            </dd>
          </div>
        </dl>

        <div className="flex min-w-0 items-center justify-between gap-2">
          <div data-turma-instrutor className="flex min-w-0 flex-1 items-center gap-2">
            <Avatar className="h-7 w-7 shrink-0 border border-border/50">
              {turma.instrutorFoto && (
                <AvatarImage src={turma.instrutorFoto} alt={turma.instrutorNome ?? 'Instrutor'} />
              )}
              <AvatarFallback
                className={cn(
                  'text-[9.5px] font-semibold',
                  corAvatarColaborador(turma.instrutorId ?? turma.instrutorNome ?? turma.id)
                )}
              >
                {turma.instrutorNome ? iniciaisColaborador(turma.instrutorNome) : <UserRound className="h-3.5 w-3.5" />}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 leading-tight">
              <p
                className="line-clamp-2 text-[11px] font-medium leading-[1.15] text-foreground"
                title={turma.instrutorNome ?? undefined}
              >
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
            <div className="w-[42%] min-w-[104px] shrink-0">
              <p
                className="truncate text-[9.5px] leading-none text-muted-foreground"
                title="Inscritos sobre a capacidade da turma"
              >
                {turma.ocupacao.inscritos} de {turma.ocupacao.capacidade} vagas
              </p>
              <div className="mt-1 flex min-w-0 items-center gap-1.5">
                <div
                  className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[hsl(216_48%_9%)] ring-1 ring-inset ring-white/[0.04]"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={turma.ocupacao.percentual}
                  aria-label={`Ocupação da turma: ${turma.ocupacao.percentual}%`}
                >
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width] duration-300',
                      corBarraOcupacao(turma, turma.ocupacao.percentual)
                    )}
                    style={{ width: `${percentualBarra}%` }}
                  />
                </div>
                <span className="shrink-0 text-[9.5px] font-semibold leading-none tabular-nums text-foreground">
                  {turma.ocupacao.percentual}%
                </span>
              </div>
            </div>
          ) : (
            <div
              className="w-[42%] min-w-[104px] shrink-0 text-right leading-tight"
              title="A tabela de turmas não possui contagem de inscritos por turma; a ocupação não é calculada."
            >
              <p className="truncate text-[10px] font-medium leading-tight text-foreground/85">
                {turma.capacidade ? `${turma.capacidade} vagas` : 'Capacidade não informada'}
              </p>
              <p className="truncate text-[9px] leading-tight text-muted-foreground/80">Ocupação não informada</p>
            </div>
          )}
        </div>

        <div data-turma-rodape className="mt-auto flex items-center gap-1.5 pt-0.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onAbrir(turma)}
            aria-label={`Ver turma ${turma.cursoNome}`}
            className="h-[34px] min-w-0 flex-1 gap-1.5 rounded-lg border-[hsl(var(--info)/0.3)] bg-[hsl(var(--info)/0.06)] px-3 text-[11.5px] font-semibold text-foreground transition-colors hover:border-[hsl(var(--info)/0.55)] hover:bg-[hsl(var(--info)/0.12)] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="truncate">Ver turma</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
          </Button>

          {linkDoLocal ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Ações da turma ${turma.cursoNome}`}
                  className="h-[34px] w-[34px] shrink-0 rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  className="gap-2"
                  onSelect={() => window.open(linkDoLocal, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
    </article>
  );
}
