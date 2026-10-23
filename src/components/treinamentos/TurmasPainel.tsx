import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, CheckCircle2, PlayCircle, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntradaPresenca, MAX_ENTRADA_INDEX, entradaCard } from '@/components/ui/entrada-cards';
import { linhaEntradaHubVariants } from '@/components/premiacoes/premiacoesEntrada';
import { cn } from '@/lib/utils';
import { AgendaSemanal } from './AgendaSemanal';
import { MaisTurmasCard } from './MaisTurmasCard';
import { TurmaCard } from './TurmaCard';
import { TurmaDetalheDialog } from './TurmaDetalheDialog';
import { TurmasFiltros } from './TurmasFiltros';
import {
  ORDENACAO_TURMA_OPCOES,
  ORDENACAO_TURMA_PADRAO,
  PERIODO_TURMA_OPCOES,
  agruparTurmas,
  contarTurmas,
  filtrarTurmas,
  indicesEntradaTurmas,
  montarTurmas,
  opcoesModalidadeTurma,
  opcoesStatusTurma,
  ordenarTurmas,
  semanaSugeridaAgenda,
  type ColaboradorTurma,
  type CursoTurma,
  type GrupoTurma,
  type OrdenacaoTurma,
  type PeriodoTurma,
  type Turma,
  type TurmaRegistro,
} from './turmasDerivacoes';

/**
 * ============================================================================
 * TURMAS / INSTÂNCIAS — painel operacional.
 *
 * Substitui a tabela antiga (Curso · Instrutor · Início · Status · Vagas) por
 * três colunas por situação + agenda semanal, preservando TODOS os registros e
 * funcionalidades existentes. Nenhuma consulta nova: tudo é derivado das linhas
 * já carregadas por `TreinamentosPage`.
 *
 * FILTROS: busca, status, modalidade, período e ordenação em memória. As opções
 * vêm dos dados reais e os contadores refletem o recorte exibido.
 *
 * MOVIMENTO (padrões já aprovados, nenhum novo):
 * - filtros, cabeçalhos das colunas e agenda → `entradaCard` (KPI Cards do
 *   Dashboard Executivo), uma vez por montagem;
 * - cards → `linhaEntradaHubVariants` (lista de Campanhas), na ordem
 *   “primeiro de cada coluna, depois o segundo de cada coluna”; o card
 *   “Mais turmas em breve” fecha a coluna Em andamento com o índice seguinte
 *   ao do último card real;
 * - `key` estável por id: filtrar/ordenar não reinicia a entrada dos cards já
 *   montados. `prefers-reduced-motion` é respeitado pelo `MotionConfig` da página.
 * ============================================================================
 */
export interface TurmasPainelProps {
  instancias: readonly TurmaRegistro[];
  cursos: readonly CursoTurma[];
  colaboradores?: readonly ColaboradorTurma[];
  carregando?: boolean;
  /** Fluxo REAL de criação de turma (modal/formulário) — ausente = sem CTA. */
  onNovaTurma?: () => void;
  /** Autorização real (matriz `permissions`) já verificada pelo chamador. */
  podeCriarTurma?: boolean;
}

interface ColunaTurma {
  chave: GrupoTurma;
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  tile: string;
  badge: string;
}

const COLUNAS: readonly ColunaTurma[] = [
  {
    chave: 'proximas',
    titulo: 'Próximas turmas',
    descricao: 'Turmas que iniciarão em breve',
    icone: CalendarClock,
    tile: 'border-info/25 bg-info/10 text-info',
    badge: 'border-info/25 bg-info/10 text-info',
  },
  {
    chave: 'andamento',
    titulo: 'Em andamento',
    descricao: 'Turmas em execução no momento',
    icone: PlayCircle,
    tile: 'border-[hsl(var(--aqua)/0.25)] bg-[hsl(var(--aqua)/0.1)] text-[hsl(var(--aqua))]',
    badge: 'border-[hsl(var(--aqua)/0.25)] bg-[hsl(var(--aqua)/0.1)] text-[hsl(var(--aqua))]',
  },
  {
    chave: 'concluidas',
    titulo: 'Turmas concluídas',
    descricao: 'Turmas finalizadas recentemente',
    icone: CheckCircle2,
    tile: 'border-success/25 bg-success/10 text-success',
    badge: 'border-success/25 bg-success/10 text-success',
  },
];

const VAZIO: Record<GrupoTurma, { titulo: string; descricao: string }> = {
  proximas: {
    titulo: 'Nenhuma turma planejada',
    descricao: 'Não há turmas com início previsto.',
  },
  andamento: {
    titulo: 'Nenhuma turma em andamento',
    descricao: 'Não há turmas em execução neste momento.',
  },
  concluidas: {
    titulo: 'Nenhuma turma concluída',
    descricao: 'Nenhuma turma finalizada recentemente.',
  },
};

function ColunaVazia({ coluna }: { coluna: ColunaTurma }) {
  const Icone = coluna.icone;
  return (
    <div className="flex min-h-[170px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/50 bg-card/20 px-4 py-7 text-center">
      <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-full border border-border/50 bg-muted/30 text-muted-foreground">
        <Icone className="h-4 w-4" aria-hidden />
      </span>
      <p className="text-[12px] font-medium text-foreground">{VAZIO[coluna.chave].titulo}</p>
      <p className="text-[10.5px] leading-snug text-muted-foreground">{VAZIO[coluna.chave].descricao}</p>
    </div>
  );
}

function TurmasSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-3 @[620px]:grid-cols-2 @[940px]:grid-cols-3 @[1180px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(240px,0.75fr)]"
      aria-hidden
    >
      {Array.from({ length: 3 }, (_, coluna) => (
        <div key={coluna} className="flex min-w-0 flex-col gap-2">
          <div className="mb-1 flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-muted/50 motion-safe:animate-pulse" />
            <div className="h-3 w-32 rounded bg-muted/50 motion-safe:animate-pulse" />
          </div>
          {Array.from({ length: 2 }, (_, card) => (
            <div
              key={card}
              className="overflow-hidden rounded-xl border border-border/40 bg-card/30 motion-safe:animate-pulse"
            >
              <div className="h-[104px] bg-muted/40" />
              <div className="space-y-2 p-3">
                <div className="h-4 w-3/4 rounded bg-muted/50" />
                <div className="h-3 w-1/2 rounded bg-muted/40" />
                <div className="h-10 w-full rounded bg-muted/30" />
                <div className="h-8 w-full rounded bg-muted/50" />
              </div>
            </div>
          ))}
        </div>
      ))}
      <div className="h-[340px] rounded-xl border border-border/40 bg-card/30 motion-safe:animate-pulse" />
    </div>
  );
}

export function TurmasPainel({
  instancias,
  cursos,
  colaboradores = [],
  carregando = false,
  onNovaTurma,
  podeCriarTurma = false,
}: TurmasPainelProps) {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('todos');
  const [modalidade, setModalidade] = useState('todas');
  const [periodo, setPeriodo] = useState<PeriodoTurma>('todas');
  const [ordenacao, setOrdenacao] = useState<OrdenacaoTurma>(ORDENACAO_TURMA_PADRAO);
  const [detalhe, setDetalhe] = useState<Turma | null>(null);

  const turmas = useMemo(() => montarTurmas(instancias, cursos, colaboradores), [instancias, cursos, colaboradores]);

  const statusOpcoes = useMemo(() => [{ value: 'todos', label: 'Todos' }, ...opcoesStatusTurma(turmas)], [turmas]);
  const modalidadeOpcoes = useMemo(
    () => [{ value: 'todas', label: 'Todas' }, ...opcoesModalidadeTurma(turmas)],
    [turmas]
  );

  const filtroAtivo =
    busca.trim().length > 0 ||
    status !== 'todos' ||
    modalidade !== 'todas' ||
    periodo !== 'todas' ||
    ordenacao !== ORDENACAO_TURMA_PADRAO;

  const filtradas = useMemo(() => {
    const base = filtrarTurmas(turmas, { busca, status, modalidade, periodo });
    return ordenarTurmas(base, ordenacao);
  }, [turmas, busca, status, modalidade, periodo, ordenacao]);

  const grupos = useMemo(() => agruparTurmas(filtradas), [filtradas]);
  const contagens = useMemo(() => contarTurmas(grupos), [grupos]);
  const indices = useMemo(() => indicesEntradaTurmas(grupos), [grupos]);
  /**
   * Índice do card complementar: um passo DEPOIS de todos os cards reais
   * (`indices.size` é sempre maior que o maior índice usado), para ele entrar
   * por último na coluna Em andamento e nunca “furar” a cascata.
   */
  const indiceMaisTurmas = Math.min(indices.size, MAX_ENTRADA_INDEX);
  const semanaInicial = useMemo(() => semanaSugeridaAgenda(ordenarTurmas(turmas, 'data_asc')), [turmas]);

  const limparFiltros = () => {
    setBusca('');
    setStatus('todos');
    setModalidade('todas');
    setPeriodo('todas');
    setOrdenacao(ORDENACAO_TURMA_PADRAO);
  };

  return (
    <div className="@container flex flex-col gap-3">
      <TurmasFiltros
        busca={busca}
        onBusca={setBusca}
        status={status}
        onStatus={setStatus}
        modalidade={modalidade}
        onModalidade={setModalidade}
        periodo={periodo}
        onPeriodo={setPeriodo}
        ordenacao={ordenacao}
        onOrdenacao={setOrdenacao}
        statusOpcoes={statusOpcoes}
        modalidadeOpcoes={modalidadeOpcoes}
        periodoOpcoes={PERIODO_TURMA_OPCOES}
        ordenacaoOpcoes={ORDENACAO_TURMA_OPCOES}
        filtroAtivo={filtroAtivo}
        onLimpar={limparFiltros}
      />

      {filtroAtivo && filtradas.length === 0 && !carregando && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border/50 bg-card/30 px-3 py-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
            <Search className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium text-foreground">Nenhuma turma encontrada</p>
            <p className="text-[10.5px] text-muted-foreground">Ajuste os filtros para visualizar outras turmas.</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 rounded-lg px-3 text-[11.5px]" onClick={limparFiltros}>
            Limpar filtros
          </Button>
        </div>
      )}

      {carregando ? (
        <TurmasSkeleton />
      ) : (
        <EntradaPresenca>
          <div
            data-turmas-grid
            className="grid grid-cols-1 gap-3 @[620px]:grid-cols-2 @[940px]:grid-cols-3 @[1180px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(240px,0.75fr)]"
          >
            {COLUNAS.map((coluna, indiceColuna) => {
              const Icone = coluna.icone;
              const lista = grupos[coluna.chave];
              return (
                <motion.section
                  key={coluna.chave}
                  {...entradaCard(indiceColuna)}
                  aria-labelledby={`turmas-coluna-${coluna.chave}`}
                  data-turmas-coluna={coluna.chave}
                  className={cn('min-w-0', coluna.chave === 'concluidas' && '@[620px]:col-span-2 @[940px]:col-span-1')}
                >
                  <header className="mb-2 flex min-h-8 items-start gap-2.5">
                    <span
                      className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', coluna.tile)}
                    >
                      <Icone className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <h2
                          id={`turmas-coluna-${coluna.chave}`}
                          className="truncate text-[13px] font-semibold leading-tight text-foreground"
                        >
                          {coluna.titulo}
                        </h2>
                        <span
                          className={cn(
                            'inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border px-1.5 text-[10px] font-semibold tabular-nums leading-none',
                            coluna.badge
                          )}
                          title={`${contagens[coluna.chave]} turma(s)`}
                        >
                          {contagens[coluna.chave]}
                        </span>
                      </div>
                      <p
                        className="mt-0.5 truncate text-[10.5px] leading-tight text-muted-foreground"
                        title={coluna.descricao}
                      >
                        {coluna.descricao}
                      </p>
                    </div>
                  </header>

                  <div
                    className={cn(
                      'flex flex-col gap-3',
                      coluna.chave === 'concluidas' &&
                        '@[620px]:grid @[620px]:grid-cols-2 @[940px]:flex @[940px]:flex-col'
                    )}
                  >
                    {lista.length === 0 ? (
                      <ColunaVazia coluna={coluna} />
                    ) : (
                      lista.map((turma) => (
                        <motion.div
                          key={turma.id}
                          custom={Math.min(indices.get(turma.id) ?? 0, MAX_ENTRADA_INDEX)}
                          variants={linhaEntradaHubVariants}
                          initial="hidden"
                          animate="visible"
                          className="min-w-0 origin-center"
                        >
                          <TurmaCard turma={turma} onAbrir={setDetalhe} />
                        </motion.div>
                      ))
                    )}

                    {/* Complemento da coluna — NÃO é turma: fica fora de
                        `grupos`, da contagem, dos filtros e da agenda. */}
                    {coluna.chave === 'andamento' && (
                      <motion.div
                        key="mais-turmas-em-breve"
                        custom={indiceMaisTurmas}
                        variants={linhaEntradaHubVariants}
                        initial="hidden"
                        animate="visible"
                        className="min-w-0 origin-center"
                      >
                        <MaisTurmasCard onNovaTurma={onNovaTurma} podeCriarTurma={podeCriarTurma} />
                      </motion.div>
                    )}
                  </div>
                </motion.section>
              );
            })}

            <div className="@[620px]:col-span-2 @[940px]:col-span-3 @[1180px]:col-span-1">
              <AgendaSemanal
                turmas={ordenarTurmas(filtradas, 'data_asc')}
                semanaInicial={semanaInicial}
                onAbrir={setDetalhe}
              />
            </div>
          </div>
        </EntradaPresenca>
      )}

      <TurmaDetalheDialog
        turma={detalhe}
        onOpenChange={(aberto) => {
          if (!aberto) setDetalhe(null);
        }}
      />
    </div>
  );
}
