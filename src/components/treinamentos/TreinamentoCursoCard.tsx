import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, CheckCircle2, Circle, Clock, Laptop, MapPin, Monitor, UserRound, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TreinamentosCascadeDialog, TreinamentosCascadeItem } from './TreinamentosCascadeDialog';
import { cn } from '@/lib/utils';
import { TreinamentoCategoriaBadge } from './TreinamentoBadges';
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

function LinhaDetalhe({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{rotulo}</dt>
      <dd className="mt-1 truncate text-[12.5px] font-medium text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Visualização do curso — a única leitura detalhada disponível no módulo.
 * Usa SOMENTE campos reais do cadastro + inscrições; não cria rota fictícia.
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
  const Icone = ICONE_MODALIDADE[chaveModalidade(curso.modalidade)] ?? Monitor;

  return (
    <TreinamentosCascadeDialog open={aberto} onOpenChange={onOpenChange} blocks={4} className="max-w-[520px]">
      <TreinamentosCascadeItem>
        <DialogHeader>
          <DialogTitle className="pr-6 text-left text-base leading-snug">{curso.nome}</DialogTitle>
          <DialogDescription className="text-left text-xs leading-relaxed">
            {curso.descricao?.trim() || 'Este curso não possui descrição cadastrada.'}
          </DialogDescription>
        </DialogHeader>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem>
        <div className="flex flex-wrap items-center gap-2">
          <TreinamentoCategoriaBadge categoria={curso.categoria} />
          <BadgeObrigatoriedade obrigatorio={curso.obrigatorio === true} />
        </div>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem className="mt-1">
        <dl className="grid grid-cols-2 gap-3 rounded-xl border border-border/50 bg-muted/20 p-3">
          <LinhaDetalhe rotulo="Modalidade">
            <span className="inline-flex items-center gap-1.5">
              <Icone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {rotuloModalidade(curso.modalidade)}
            </span>
          </LinhaDetalhe>
          <LinhaDetalhe rotulo="Carga horária">{formatarCargaHoraria(curso.carga_horaria)}</LinhaDetalhe>
          <LinhaDetalhe rotulo="NR relacionada">{curso.nr_relacionada?.trim() || '—'}</LinhaDetalhe>
          <LinhaDetalhe rotulo="Cadastrado em">{formatarDataTreinamento(curso.created_at)}</LinhaDetalhe>
        </dl>
      </TreinamentosCascadeItem>

      <TreinamentosCascadeItem className="mt-1">
        {participacao && participacao.inscritos > 0 ? (
          <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              <Users className="h-3 w-3" />
              Colaboradores inscritos
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex -space-x-2">
                {participacao.colaboradores.slice(0, 5).map((colaborador) => (
                  <AvatarParticipante key={colaborador.id} colaborador={colaborador} className="h-7 w-7" />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {participacao.inscritos} {participacao.inscritos === 1 ? 'inscrito' : 'inscritos'}
              </span>
            </div>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border/50 bg-muted/10 p-3 text-xs text-muted-foreground">
            Nenhuma inscrição registrada para este curso.
          </p>
        )}
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
