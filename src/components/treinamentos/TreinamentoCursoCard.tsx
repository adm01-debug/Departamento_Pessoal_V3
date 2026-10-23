import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Laptop,
  MapPin,
  Monitor,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TreinamentosCascadeDialog, TreinamentosCascadeItem } from './TreinamentosCascadeDialog';
import { cn } from '@/lib/utils';
import { estiloCategoriaTreinamento, TreinamentoCategoriaBadge } from './TreinamentoBadges';
import { TrainingCover } from './TrainingCover';
import { TreinamentoCursoAcoes } from './TreinamentoCursoAcoes';
import { AvatarParticipante } from './TreinamentoParticipantes';
import {
  chaveModalidade,
  formatarCargaHoraria,
  formatarDataTreinamento,
  rotuloModalidade,
  type CursoCatalogo,
  type ParticipacaoCurso,
} from './treinamentosDerivacoes';

/**
 * ============================================================================
 * CARD DO CURSO — Catálogo de Treinamentos.
 *
 * Anatomia (referência aprovada): capa quadrada à esquerda · conteúdo ao centro
 * (categoria, nome, descrição, modalidade, carga horária, obrigatoriedade) ·
 * informações e ações à direita (inscritos + menu + “Ver curso”).
 *
 * HONESTIDADE DOS DADOS
 * - `catalogo_cursos` NÃO tem coluna de imagem/capa. O curso só usa `<img>`
 *   quando a fonte fornecer `imagem_url` de verdade; caso contrário o
 *   placeholder usa a família cromática + ícone da categoria (`TreinamentoBadges`),
 *   sem URL externa e sem fingir ser uma capa oficial.
 * - Inscritos vêm de `inscricoes_cursos` (ou do mock visual). Sem inscrição, o
 *   grupo é omitido — nenhum avatar, nome ou número é inventado.
 * - Sem descrição, o card mantém o mesmo alinhamento vertical dos demais.
 *
 * MOVIMENTO: o card NÃO anima por conta própria. A cascata é aplicada pelo
 * Catálogo (`linhaEntradaHubVariants`, a mesma entrada da lista de Campanhas do
 * Hub de Premiações) no item do grid — evitando animação duplicada nos filhos.
 * ============================================================================
 */

const ICONE_MODALIDADE: Record<string, LucideIcon> = {
  online: Monitor,
  presencial: MapPin,
  hibrido: Laptop,
  hibrida: Laptop,
  ead: Monitor,
  remoto: Monitor,
  semipresencial: Laptop,
};

const AVATARES_VISIVEIS = 3;

function BadgeObrigatoriedade({ obrigatorio, className }: { obrigatorio: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[10.5px] font-medium leading-none',
        obrigatorio
          ? 'border-success/25 bg-success/10 text-success'
          : 'border-border/60 bg-muted/40 text-muted-foreground',
        className
      )}
    >
      {obrigatorio ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <Circle className="h-3 w-3 shrink-0" />}
      {obrigatorio ? 'Obrigatório' : 'Opcional'}
    </span>
  );
}

/**
 * Capa do curso — delegada ao `TrainingCover` (camada única de imagens do Hub).
 * Mantém o mesmo enquadramento quadrado do card e o mesmo fallback por
 * categoria; quando existir uma capa real, ela entra no lugar sem mudar nada.
 */
function CursoCapa({ curso }: { curso: CursoCatalogo }) {
  return (
    <TrainingCover
      tipo="course"
      nome={curso.nome}
      categoria={curso.categoria}
      imagemUrl={curso.imagem_url}
      formato="quadrada"
    />
  );
}

function CursoParticipantes({ participacao, className }: { participacao: ParticipacaoCurso; className?: string }) {
  const visiveis = participacao.colaboradores.slice(0, AVATARES_VISIVEIS);
  const excedente = Math.max(0, participacao.inscritos - visiveis.length);
  const rotulo = `${participacao.inscritos} ${participacao.inscritos === 1 ? 'inscrito' : 'inscritos'}`;

  return (
    <div className={cn('flex flex-col items-end gap-1', className)} title={rotulo}>
      <div className="flex items-center">
        {visiveis.length > 0 ? (
          <div className="flex -space-x-2">
            {visiveis.map((colaborador) => (
              <AvatarParticipante key={colaborador.id} colaborador={colaborador} className="h-6 w-6" />
            ))}
          </div>
        ) : (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-border/70 text-muted-foreground/70">
            <UserRound className="h-3 w-3" />
          </span>
        )}
        {excedente > 0 && (
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-border/60 bg-muted/50 px-1 text-[9.5px] font-semibold tabular-nums text-muted-foreground">
            +{excedente}
          </span>
        )}
      </div>
      <span className="whitespace-nowrap text-[10px] leading-none text-muted-foreground">{rotulo}</span>
    </div>
  );
}

/**
 * Metadado da ficha do curso: label discreto + valor com ícone real do sistema.
 * Não é KPI Card: sem fundo próprio, sem destaque numérico.
 */
function Metadado({
  icone: Icone,
  rotulo,
  valor,
  tom,
}: {
  icone: LucideIcon;
  rotulo: string;
  valor: string;
  /** Cores semânticas do Design System para o tile do ícone. */
  tom: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase leading-none tracking-[0.08em] text-muted-foreground">
        {rotulo}
      </dt>
      <dd className="mt-1 flex min-h-[30px] min-w-0 items-center gap-2">
        <span
          aria-hidden
          className={cn('flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg border', tom)}
        >
          <Icone className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 truncate text-[12.5px] font-semibold text-foreground" title={valor}>
          {valor}
        </span>
      </dd>
    </div>
  );
}

/**
 * Visualização do curso — ficha compacta de consulta.
 *
 * Usa SOMENTE campos reais do cadastro + inscrições; não cria rota fictícia,
 * não inventa participantes e não exibe progresso por etapa.
 *
 * A cascata é a de Pendências (`cascade-motion.ts` via
 * `TreinamentosCascadeDialog`): cabeçalho → badges → metadados → inscritos.
 */
function CursoDetalhesDialog({
  curso,
  participacao,
  aberto,
  onOpenChange,
}: {
  curso: CursoCatalogo;
  participacao?: ParticipacaoCurso;
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
}) {
  const IconeModalidade = ICONE_MODALIDADE[chaveModalidade(curso.modalidade)] ?? Monitor;
  const estilo = estiloCategoriaTreinamento(curso.categoria);
  const IconeCurso = estilo.icone;
  const descricao = curso.descricao?.trim();

  const inscritos = participacao?.inscritos ?? 0;
  const colaboradores = participacao?.colaboradores ?? [];
  const visiveis = colaboradores.slice(0, AVATARES_VISIVEIS);
  const obrigatorio = curso.obrigatorio === true;
  const rotuloParticipantes = `${inscritos} ${inscritos === 1 ? 'participante vinculado' : 'participantes vinculados'}`;

  return (
    <TreinamentosCascadeDialog
      open={aberto}
      onOpenChange={onOpenChange}
      blocks={4}
      className="max-h-[90dvh] w-[calc(100vw_-_2rem)] max-w-[440px] gap-3.5 overflow-y-auto p-5"
    >
      <TreinamentosCascadeItem>
        <div className="relative">
          <DialogHeader className="relative pr-8 text-left">
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                style={{ borderColor: 'color-mix(in oklab, currentColor 60%, transparent)' }}
                className={cn(
                  'relative flex h-[42px] w-[42px] shrink-0 items-center justify-center overflow-hidden rounded-xl border',
                  estilo.tile
                )}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(135deg,currentColor,transparent_74%)] opacity-[0.18]"
                />
                <IconeCurso className="relative h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <DialogTitle className="line-clamp-2 text-left text-[17px] font-semibold leading-snug tracking-tight text-foreground sm:text-[18px]">
                  {curso.nome}
                </DialogTitle>
                <DialogDescription
                  className="mt-1 line-clamp-3 text-left text-[12.5px] leading-relaxed text-foreground/70"
                  title={descricao || undefined}
                >
                  {descricao || 'Este curso não possui descrição cadastrada.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem>
        <div className="flex flex-wrap items-center gap-2">
          <TreinamentoCategoriaBadge
            categoria={curso.categoria}
            className="h-6 cursor-default border-[color:color-mix(in_oklab,currentColor_60%,transparent)] bg-[color:color-mix(in_oklab,currentColor_16%,transparent)] px-2.5 text-[11px] font-semibold transition-colors duration-200 hover:bg-[color:color-mix(in_oklab,currentColor_22%,transparent)]"
          />
          <BadgeObrigatoriedade
            obrigatorio={obrigatorio}
            className={cn(
              'h-6 px-2.5 text-[11px] transition-colors duration-200',
              obrigatorio
                ? 'border-success/40 bg-success/[0.14] text-success'
                : 'border-border/70 bg-muted/45 text-foreground/75'
            )}
          />
        </div>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem>
        <div className="h-px bg-gradient-to-r from-transparent via-border/70 to-transparent" />
        <dl className="mt-3.5 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
          <Metadado
            icone={IconeModalidade}
            rotulo="Modalidade"
            valor={rotuloModalidade(curso.modalidade)}
            tom="border-info/35 bg-info/[0.12] text-[color:color-mix(in_oklab,hsl(var(--info))_88%,hsl(var(--foreground)))]"
          />
          <Metadado
            icone={Clock}
            rotulo="Carga horária"
            valor={formatarCargaHoraria(curso.carga_horaria)}
            tom="border-primary/35 bg-primary/[0.12] text-[color:color-mix(in_oklab,hsl(var(--primary))_82%,hsl(var(--foreground)))]"
          />
          <Metadado
            icone={ShieldCheck}
            rotulo="NR relacionada"
            valor={curso.nr_relacionada?.trim() || 'Não informada'}
            tom="border-info/25 bg-info/[0.07] text-[color:color-mix(in_oklab,hsl(var(--info))_45%,hsl(var(--muted-foreground)))]"
          />
          <Metadado
            icone={CalendarDays}
            rotulo="Cadastrado em"
            valor={formatarDataTreinamento(curso.created_at)}
            tom="border-[hsl(var(--chart-4)/0.35)] bg-[hsl(var(--chart-4)/0.10)] text-[color:color-mix(in_oklab,hsl(var(--chart-4))_85%,hsl(var(--foreground)))]"
          />
        </dl>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem>
        <div className="h-px bg-gradient-to-r from-transparent via-border/70 to-transparent" />
        <div className="mt-3.5 rounded-xl border border-border/60 bg-[linear-gradient(135deg,hsl(var(--info)/0.07),hsl(var(--background))_52%,hsl(var(--success)/0.055))] px-3 py-3 shadow-[inset_0_1px_0_hsl(var(--foreground)/0.05)]">
          <div className="flex items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              <Users className="h-3.5 w-3.5 shrink-0 text-info" aria-hidden />
              <span className="truncate">Colaboradores inscritos</span>
            </p>
            {inscritos > 0 && (
              <span
                title={`${rotuloParticipantes}`}
                className="inline-flex h-5 min-w-6 shrink-0 items-center justify-center rounded-full border border-success/40 bg-success/[0.14] px-1.5 text-[10.5px] font-semibold tabular-nums text-success"
              >
                {inscritos}
              </span>
            )}
          </div>

          {inscritos > 0 ? (
            <div className="mt-2 flex items-center gap-2.5">
              {visiveis.length > 0 && (
                <div className="flex shrink-0 -space-x-2">
                  {visiveis.map((colaborador) => (
                    <AvatarParticipante
                      key={colaborador.id}
                      colaborador={colaborador}
                      className="h-8 w-8 border-2 border-background shadow-sm"
                    />
                  ))}
                </div>
              )}
              <p className="min-w-0 text-[11.5px] leading-snug text-foreground/70">{rotuloParticipantes}</p>
            </div>
          ) : (
            <p className="mt-2 text-[11.5px] leading-snug text-foreground/70">
              Nenhuma inscrição registrada para este curso.
            </p>
          )}
        </div>
      </TreinamentosCascadeItem>
    </TreinamentosCascadeDialog>
  );
}

export interface TreinamentoCursoCardProps {
  curso: CursoCatalogo;
  participacao?: ParticipacaoCurso;
  onExcluir: (curso: CursoCatalogo) => void;
}

export function TreinamentoCursoCard({ curso, participacao, onExcluir }: TreinamentoCursoCardProps) {
  const [detalhes, setDetalhes] = useState(false);
  const IconeModalidade = ICONE_MODALIDADE[chaveModalidade(curso.modalidade)] ?? Monitor;
  const modalidade = rotuloModalidade(curso.modalidade);
  const carga = formatarCargaHoraria(curso.carga_horaria);
  const obrigatorio = curso.obrigatorio === true;

  return (
    <div className="@container h-full">
      <article
        data-curso-card={curso.id}
        aria-labelledby={`curso-${curso.id}`}
        className="group flex h-full min-h-[124px] gap-3 rounded-xl border border-border/50 bg-card/50 p-2.5 transition-colors duration-200 hover:border-primary/35 hover:bg-card/80 focus-within:border-primary/40"
      >
        <div className="h-[92px] w-[92px] shrink-0 overflow-hidden rounded-[9px] @[420px]:h-[104px] @[420px]:w-[104px] @[560px]:h-[112px] @[560px]:w-[112px]">
          <CursoCapa curso={curso} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 py-0.5">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <TreinamentoCategoriaBadge categoria={curso.categoria} />
              <h3
                id={`curso-${curso.id}`}
                className="mt-1 line-clamp-2 text-[14px] font-semibold leading-snug text-foreground"
                title={curso.nome}
              >
                {curso.nome}
              </h3>
              {curso.descricao?.trim() ? (
                <p
                  className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-muted-foreground"
                  title={curso.descricao}
                >
                  {curso.descricao}
                </p>
              ) : null}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1 @[430px]:flex-row @[430px]:items-start">
              {participacao && participacao.inscritos > 0 && (
                <CursoParticipantes participacao={participacao} className="hidden @[430px]:flex" />
              )}
              <TreinamentoCursoAcoes nome={curso.nome} onExcluir={() => onExcluir(curso)} />
              {participacao && participacao.inscritos > 0 && (
                <span className="whitespace-nowrap text-[10px] leading-none text-muted-foreground @[430px]:hidden">
                  {participacao.inscritos} inscritos
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5" title={`Modalidade: ${modalidade}`}>
                <IconeModalidade className="h-3.5 w-3.5 shrink-0" />
                {modalidade}
              </span>
              <span className="inline-flex items-center gap-1.5" title={`Carga horária: ${carga}`}>
                <Clock className="h-3.5 w-3.5 shrink-0" />
                {carga}
              </span>
              <BadgeObrigatoriedade obrigatorio={obrigatorio} />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDetalhes(true)}
              aria-label={`Ver curso ${curso.nome}`}
              className="ml-auto h-8 shrink-0 gap-1.5 rounded-lg border-border/60 px-3 text-[11.5px] font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ver curso
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </article>

      <CursoDetalhesDialog curso={curso} participacao={participacao} aberto={detalhes} onOpenChange={setDetalhes} />
    </div>
  );
}
