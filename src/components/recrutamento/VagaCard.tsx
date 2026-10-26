import { useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Building2, Clock, MapPin, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import type { VagaRow } from '@/types/recrutamento';
import { ETAPAS, type EtapaPipelineId } from './pipelineEtapas';
import { temaDaCompetencia } from './competenciasComum';
import { gradienteDaVaga } from './vagasGradients';
import type { VagaComResumo } from './vagasComum';

/**
 * ============================================================================
 * CARD DE VAGA — identidade visual + funil real por etapa.
 *
 * Todos os números vêm de `vagasComum` (candidaturas já carregadas): o funil
 * usa as CINCO etapas reais de `pipelineEtapas`, inclusive Contratado. Nenhum
 * candidato/etapa/data é criado aqui.
 *
 * AÇÕES REAIS: “Gerenciar Vaga” abre o Pipeline filtrado pela vaga; o menu
 * contextual mantém “Ver análises” e “Excluir vaga” (com a confirmação já
 * existente). Não há atalho duplicado de Gerenciar dentro do menu.
 * ============================================================================
 */
export interface VagaCardProps {
  resumo: VagaComResumo;
  indice: number;
  onGerenciar: (vaga: VagaRow) => void;
  onVerAnalises: () => void;
  onExcluir: (vaga: VagaRow) => void;
}

const COR_ETAPA: Record<EtapaPipelineId, string> = {
  triagem: 'bg-info',
  entrevista: 'bg-[hsl(var(--chart-4))]',
  teste: 'bg-[hsl(var(--info)/0.62)]',
  proposta: 'bg-success',
  contratado: 'bg-[hsl(var(--aqua))]',
};

/**
 * Fórmula única de identidade cromática dos cards. O accent e a opacidade
 * alimentam o ÍCONE (preservado); o FUNDO e a BORDA externa vêm da configuração
 * multicamada em `vagasGradients.ts` (duas radiais + base linear por família).
 */
const ICONE_IDENTIDADE =
  'border-[rgb(var(--vaga-accent)/0.36)] bg-[rgb(var(--vaga-accent)/0.13)] text-[rgb(var(--vaga-accent))]';

/**
 * FUNDO NEUTRO (avaliação temporária) — `true` aplica a TODOS os cards a mesma
 * superfície navy do design system (`bg-card`) com borda neutra, sem degradê.
 * `false` (atual) aplica o degradê multicamada da identidade em
 * `vagasGradients.ts`. O mapeamento cromático (`identidade.accent`) não é
 * alterado em nenhum dos modos; o ícone continua colorido.
 */
const FUNDO_NEUTRO = false;

export function VagaCard({ resumo, indice, onGerenciar, onVerAnalises, onExcluir }: VagaCardProps) {
  const { vaga, identidade, aberta, fechada, statusRotulo, totalCandidatos, candidatosPorEtapa, temporal, atividade } =
    resumo;
  const [menuAberto, setMenuAberto] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const Icone = identidade.icone;
  const requisitos = (vaga.requisitos ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const visiveis = requisitos.slice(0, 3);
  const restantes = requisitos.slice(3);
  const titulo = vaga.titulo?.trim() || 'Vaga sem título';
  const gradiente = gradienteDaVaga(identidade.token);
  const estiloIdentidade = {
    '--vaga-accent': identidade.accent,
    '--vaga-accent-alpha': identidade.alpha,
    '--vaga-borda': gradiente.borda,
    '--vaga-borda-hover': gradiente.bordaHover,
    // Camadas radiais + linear do módulo de configuração; `bg-card` permanece
    // como cor de base do design system.
    backgroundImage: FUNDO_NEUTRO ? undefined : gradiente.fundo,
  } as CSSProperties;

  return (
    <motion.article
      id={`vaga-card-${vaga.id}`}
      data-vaga-card={vaga.id}
      data-vaga-status={statusRotulo}
      aria-labelledby={`vaga-card-titulo-${vaga.id}`}
      {...entradaCard(indice)}
      style={estiloIdentidade}
      className={cn(
        'group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card p-3.5 transition-colors duration-200',
        FUNDO_NEUTRO
          ? 'border-border/60 hover:border-border/85'
          : 'border-[var(--vaga-borda)] hover:border-[var(--vaga-borda-hover)]'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border',
              ICONE_IDENTIDADE
            )}
            aria-hidden
          >
            <Icone className="h-5 w-5" />
          </span>
          {/* Status "Fechada": pill SEM indicador circular — apenas o texto,
              centralizado, com o vermelho vibrante aprovado (#f87171 no texto,
              #ef4444 na borda e fundo translúcido da mesma cor a 15%). */}
          <span
            className={cn(
              'inline-flex h-5 items-center justify-center rounded-full border px-2 text-[9.5px] font-semibold leading-none',
              aberta
                ? 'border-success/35 bg-success/15 text-success'
                : fechada
                  ? 'border-[#ef4444] bg-[#ef4444]/15 text-[#f87171]'
                  : 'border-border/60 bg-muted/30 text-muted-foreground'
            )}
          >
            {statusRotulo}
          </span>
          {temporal ? (
            <span className="truncate text-[10px] font-medium leading-none text-foreground/75">{temporal}</span>
          ) : null}
        </div>

        <DropdownMenu open={menuAberto} onOpenChange={setMenuAberto}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Ações da vaga ${titulo}`}
              className="h-8 w-8 shrink-0 rounded-md text-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="gap-2"
              onSelect={() => {
                setMenuAberto(false);
                onVerAnalises();
              }}
            >
              <BarChart3 className="h-4 w-4" />
              Ver análises
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive"
              onSelect={() => {
                setMenuAberto(false);
                setConfirmarExclusao(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
              Excluir vaga
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <h3
        id={`vaga-card-titulo-${vaga.id}`}
        title={titulo}
        className="mt-3 line-clamp-2 min-h-[46px] text-[17.5px] font-semibold leading-[1.3] tracking-[-0.01em] text-foreground"
      >
        {titulo}
      </h3>

      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] leading-tight text-foreground/75">
        <span className="flex min-w-0 items-center gap-1">
          <Building2 className="h-3 w-3 shrink-0 text-foreground/65" aria-hidden />
          <span className="truncate">{vaga.departamento?.trim() || 'Departamento não informado'}</span>
        </span>
        <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-foreground/25" />
        <span className="flex min-w-0 items-center gap-1">
          <MapPin className="h-3 w-3 shrink-0 text-foreground/65" aria-hidden />
          <span className="truncate">{vaga.modalidade?.trim() || 'Modalidade não informada'}</span>
        </span>
      </div>

      {/* `mt-2.5` (10px) em vez de 12px: as pills de 24px são 2px mais altas que
          as antigas de 22px, então a margem absorve a diferença e a altura do
          card não muda. */}
      <div className="mt-2.5 flex min-h-[24px] flex-wrap gap-1.5">
        {visiveis.map((requisito) => {
          const tema = temaDaCompetencia(requisito);
          return (
            <span
              key={requisito}
              title={requisito}
              className={cn(
                'inline-flex h-6 max-w-full items-center rounded-full border px-2 text-[11px] font-medium leading-none',
                tema.texto,
                tema.fundo,
                tema.borda
              )}
            >
              <span className="truncate">{requisito}</span>
            </span>
          );
        })}
        {restantes.length > 0 ? (
          <span
            title={`Mais ${restantes.length}: ${restantes.join(', ')}`}
            aria-label={`Mais ${restantes.length} competências: ${restantes.join(', ')}`}
            className="inline-flex h-6 items-center rounded-full border border-border/70 bg-muted px-2 text-[11px] font-medium leading-none text-foreground/75"
          >
            +{restantes.length}
          </span>
        ) : null}
        {requisitos.length === 0 ? (
          <span className="text-[10px] leading-tight text-foreground/70">Sem competências informadas</span>
        ) : null}
      </div>

      <div data-vaga-funil className="mt-3 rounded-lg border border-border/60 bg-background p-2.5">
        <p className="flex items-baseline gap-1.5 leading-none">
          <span className="text-[14px] font-semibold tabular-nums text-foreground">{totalCandidatos}</span>
          <span className="text-[10px] font-medium text-foreground/60">
            {totalCandidatos === 1 ? 'candidato' : 'candidatos'}
          </span>
        </p>

        <div className="mt-1.5 flex gap-1" aria-hidden>
          {ETAPAS.map((etapa) => (
            <span key={etapa.id} className={cn('h-1.5 flex-1 rounded-full', COR_ETAPA[etapa.id])} />
          ))}
        </div>

        <div className="mt-1.5 grid grid-cols-5 gap-1">
          {ETAPAS.map((etapa) => {
            const quantidade = candidatosPorEtapa[etapa.id] ?? 0;
            return (
              <div key={etapa.id} className="min-w-0">
                <span
                  className="block min-h-[20px] text-[8.5px] font-medium leading-[1.15] text-foreground/70"
                  title={etapa.label}
                >
                  {etapa.label}
                </span>
                <span
                  className={cn(
                    'mt-0.5 block text-[10.5px] font-semibold leading-none tabular-nums',
                    quantidade > 0 ? 'text-foreground' : 'text-foreground/55'
                  )}
                >
                  {quantidade}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border/45 pt-2.5">
        <span className="flex min-w-0 items-center gap-1 text-[10px] leading-tight text-foreground/70">
          <Clock className="h-3 w-3 shrink-0 text-foreground/60" aria-hidden />
          <span className="truncate" title={atividade}>
            {atividade}
          </span>
        </span>
        <Button
          type="button"
          variant="outline"
          onClick={() => onGerenciar(vaga)}
          aria-label={`Gerenciar vaga ${titulo}`}
          className="group/botao h-[34px] shrink-0 gap-1.5 rounded-lg border-info/55 bg-background/50 px-3.5 text-[11px] font-semibold text-foreground transition-colors hover:border-info/80 hover:bg-info/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          Gerenciar Vaga
          <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover/botao:translate-x-0.5" />
        </Button>
      </div>

      <AlertDialog open={confirmarExclusao} onOpenChange={setConfirmarExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{titulo}"?</AlertDialogTitle>
            <AlertDialogDescription>
              A vaga sai da listagem junto com as candidaturas vinculadas a ela. As demais vagas e candidatos não são
              afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmarExclusao(false);
                onExcluir(vaga);
              }}
            >
              Excluir vaga
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.article>
  );
}
