import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Check, Circle, Play, Radio } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatarPeriodo, type ContadoresItens } from './desempenhoComum';

/**
 * ============================================================================
 * PAINEL "CICLO ATIVO" — Gestão de Desempenho.
 *
 * Composição em três regiões (30% / 38% / 32% no desktop):
 *   • esquerda → identificação do ciclo (badge, nome, tipo/período, descrição);
 *   • centro   → timeline do CICLO DE VIDA REAL do registro;
 *   • direita  → progresso geral e contadores do que existe de fato.
 *
 * ⚠️ HONESTIDADE DOS DADOS: o sistema NÃO possui as etapas operacionais do
 * mockup (Planejamento / Avaliações / Feedbacks / Calibração / Encerramento).
 * A timeline reflete apenas os estados que `ciclos_avaliacao.status` realmente
 * assume nesta área (rascunho → ativo/em_andamento → concluído), sem inventar
 * fases, percentuais ou contadores. O "Progresso geral" é a média das metas
 * vinculadas ao ciclo (mesma fórmula de `progressoMeta`) e os contadores são
 * derivados de `metas_okrs` (status + data_limite).
 * ============================================================================
 */

interface EstagioCiclo {
  rotulo: string;
  estado: 'concluido' | 'atual' | 'pendente';
}

/** Índice do estágio atual para cada status real de `ciclos_avaliacao`. */
const ESTAGIO_POR_STATUS: Record<string, number> = {
  rascunho: 0,
  ativo: 1,
  em_andamento: 1,
  concluido: 2,
};

const ROTULOS_ESTAGIO = ['Rascunho', 'Em andamento', 'Concluído'];

function construirEstagios(status: unknown): EstagioCiclo[] {
  const indiceAtual = ESTAGIO_POR_STATUS[String(status ?? '').toLowerCase()] ?? 0;
  return ROTULOS_ESTAGIO.map((rotulo, indice) => ({
    rotulo,
    estado: indice < indiceAtual ? 'concluido' : indice === indiceAtual ? 'atual' : 'pendente',
  }));
}

function MarcadorEstagio({ estado }: { estado: EstagioCiclo['estado'] }) {
  if (estado === 'concluido') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-success/40 bg-success/15 text-success">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (estado === 'atual') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground ring-4 ring-primary/15">
        <Play className="h-3 w-3 fill-current" />
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted/60 text-muted-foreground">
      <Circle className="h-2.5 w-2.5 fill-current" />
    </span>
  );
}

function Contador({
  valor,
  rotulo,
  cor,
}: {
  valor: number;
  rotulo: string;
  cor: 'success' | 'warning' | 'destructive';
}) {
  const corPonto = { success: 'bg-success', warning: 'bg-warning', destructive: 'bg-destructive-vivid' }[cor];
  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-2 w-2 shrink-0 rounded-full', corPonto)} />
      <div className="leading-tight">
        <p className="text-base font-display font-medium">{valor}</p>
        <p className="text-[10px] text-muted-foreground">{rotulo}</p>
      </div>
    </div>
  );
}

interface CicloAtivoPanelProps {
  ciclo: any;
  progresso: number | null;
  contadores: ContadoresItens;
  onNavigate?: (tab: string) => void;
}

export function CicloAtivoPanel({ ciclo, progresso, contadores, onNavigate }: CicloAtivoPanelProps) {
  const estagios = construirEstagios(ciclo?.status);
  const indiceAtual = Math.max(
    estagios.findIndex((e) => e.estado === 'atual'),
    0,
  );
  const larguraConexao = estagios.length > 1 ? (indiceAtual / (estagios.length - 1)) * 100 : 0;

  return (
    <Card variant="elevated" className="border-border/30 bg-card/80">
      <div className="grid gap-6 p-5 lg:grid-cols-[3fr_3.8fr_3.2fr] lg:items-center">
        {/* ─── ESQUERDA ─────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            <Radio className="h-3 w-3" />
            Ciclo Ativo
          </span>
          <h2 className="truncate text-xl font-display font-medium tracking-tight" title={ciclo?.nome}>
            {ciclo?.nome}
          </h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            {ciclo?.tipo && <span className="capitalize">{ciclo.tipo}</span>}
            {ciclo?.tipo && <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />}
            <span className="font-mono">{formatarPeriodo(ciclo?.data_inicio, ciclo?.data_fim)}</span>
          </div>
          {ciclo?.descricao && (
            <p className="line-clamp-2 text-xs text-muted-foreground" title={ciclo.descricao}>
              {ciclo.descricao}
            </p>
          )}
        </div>

        {/* ─── CENTRO — timeline do ciclo ───────────────────────────── */}
        <div className="relative px-1">
          <div className="absolute left-6 right-6 top-3 h-[2px] -translate-y-1/2 rounded-full bg-border/60" aria-hidden />
          <div
            className="absolute left-6 top-3 h-[2px] -translate-y-1/2 rounded-full bg-primary transition-all"
            style={{ width: `calc((100% - 3rem) * ${larguraConexao / 100})` }}
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-2">
            {estagios.map((estagio) => (
              <div key={estagio.rotulo} className="flex flex-1 flex-col items-center gap-1.5 text-center">
                <MarcadorEstagio estado={estagio.estado} />
                <span
                  className={cn(
                    'text-[11px] leading-tight',
                    estagio.estado === 'atual' ? 'font-medium text-primary' : 'text-muted-foreground',
                  )}
                >
                  {estagio.rotulo}
                </span>
                {estagio.estado === 'atual' && (
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-primary/80">Atual</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ─── DIREITA — progresso e contadores ─────────────────────── */}
        <div className="space-y-3 lg:border-l lg:border-border/30 lg:pl-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Progresso geral</p>
              <p className="text-3xl font-display font-medium leading-none text-primary">
                {progresso === null ? '—' : `${progresso}%`}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {progresso === null ? 'sem metas vinculadas ao ciclo' : 'média das metas do ciclo'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onNavigate?.('metas')}
            >
              Ver metas
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow transition-all"
              style={{ width: `${progresso ?? 0}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-0.5">
            <Contador valor={contadores.concluidas} rotulo="metas concluídas" cor="success" />
            <Contador valor={contadores.emAndamento} rotulo="em andamento" cor="warning" />
            <Contador valor={contadores.atrasadas} rotulo="atrasadas" cor="destructive" />
          </div>
        </div>
      </div>
    </Card>
  );
}
