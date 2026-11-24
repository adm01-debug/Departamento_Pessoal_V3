import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, CheckCircle2, PlayCircle, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntradaPresenca, MAX_ENTRADA_INDEX, entradaCard } from '@/components/ui/entrada-cards';
import { linhaEntradaHubVariants } from '@/components/premiacoes/premiacoesEntrada';
import { cn } from '@/lib/utils';
import { AgendaSemanal } from './AgendaSemanal';
import { CabecalhoColunaTurma, type TomCabecalhoTurma } from './CabecalhoColunaTurma';
import { CalendarioTurmasDialog } from './CalendarioTurmasDialog';
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
  inicioSemana,
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
  /**
   * Data de referência para sugerir a semana da agenda. Produção usa `new Date()`;
   * testes passam uma data fixa. A sugestão considera SOMENTE as turmas filtradas.
   */
  referencia?: Date;
}

interface ColunaTurma {
  chave: GrupoTurma;
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  tom: TomCabecalhoTurma;
}

const COLUNAS: readonly ColunaTurma[] = [
  {
    chave: 'proximas',
    titulo: 'Próximas turmas',
    descricao: 'Turmas que iniciarão em breve',
    icone: CalendarClock,
    tom: {
      icone: 'text-info',
      superficie: 'border-info/20 bg-info/[0.07]',
      contador: 'border-info/30 bg-info/10 text-info',
      acento: 'bg-info/80',
    },
  },
  {
    chave: 'andamento',
    titulo: 'Em andamento',
    descricao: 'Turmas em execução no momento',
    icone: PlayCircle,
    tom: {
      icone: 'text-[hsl(var(--aqua))]',
      superficie: 'border-[hsl(var(--aqua)/0.2)] bg-[hsl(var(--aqua)/0.07)]',
      contador: 'border-[hsl(var(--aqua)/0.3)] bg-[hsl(var(--aqua)/0.1)] text-[hsl(var(--aqua))]',
      acento: 'bg-[hsl(var(--aqua)/0.8)]',
    },
  },
  {
    chave: 'concluidas',
    titulo: 'Turmas concluídas',
    descricao: 'Turmas finalizadas recentemente',
    icone: CheckCircle2,
    tom: {
      icone: 'text-success',
      superficie: 'border-success/20 bg-success/[0.07]',
      contador: 'border-success/30 bg-success/10 text-success',
      acento: 'bg-success/80',
    },
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
      className="grid grid-cols-1 gap-3 @[620px]:grid-cols-2 @[940px]:grid-cols-3 @[1120px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(240px,0.75fr)]"
      aria-hidden
    >
      {Array.from({ length: 3 }, (_, coluna) => (
        <div key={coluna} className="flex min-w-0 flex-col gap-2">
          {/* Placeholder da faixa de status: mesma altura/raio do cabeçalho real,
              para a coluna não “pular” quando os dados chegam. */}
          <div className="flex h-[58px] items-center gap-2.5 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
            <div className="h-[18px] w-[18px] shrink-0 rounded bg-muted/50 motion-safe:animate-pulse" />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="h-3 w-32 rounded bg-muted/50 motion-safe:animate-pulse" />
              <div className="h-3 w-40 max-w-full rounded bg-muted/40 motion-safe:animate-pulse" />
            </div>
            <div className="h-5 min-w-[22px] shrink-0 rounded-full bg-muted/50 motion-safe:animate-pulse" />
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
  referencia,
}: TurmasPainelProps) {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState('todos');
  const [modalidade, setModalidade] = useState('todas');
  const [periodo, setPeriodo] = useState<PeriodoTurma>('todas');
  const [ordenacao, setOrdenacao] = useState<OrdenacaoTurma>(ORDENACAO_TURMA_PADRAO);
  const [detalhe, setDetalhe] = useState<Turma | null>(null);
  const [calendarioAberto, setCalendarioAberto] = useState(false);
  const [mesCalendario, setMesCalendario] = useState<Date>(() => new Date());
  /**
   * Cada abertura remonta o calendário (key), garantindo que ele já abra no mês
   * da semana exibida — sem efeito de sincronização nem flash do mês anterior.
   * Fechar não muda a chave, então a animação de saída continua funcionando.
   */
  const [aberturaCalendario, setAberturaCalendario] = useState(0);

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
  /** Mesma coleção ordenada entregue à agenda e ao calendário mensal. */
  const turmasAgenda = useMemo(() => ordenarTurmas(filtradas, 'data_asc'), [filtradas]);
  const contagens = useMemo(() => contarTurmas(grupos), [grupos]);
  const indices = useMemo(() => indicesEntradaTurmas(grupos), [grupos]);
  /**
   * Índice do card complementar: um passo DEPOIS de todos os cards reais
   * (`indices.size` é sempre maior que o maior índice usado), para ele entrar
   * por último na coluna Em andamento e nunca “furar” a cascata.
   */
  const indiceMaisTurmas = Math.min(indices.size, MAX_ENTRADA_INDEX);
  /**
   * B-01: a semana sugerida considera SOMENTE as turmas filtradas. Se o filtro
   * não tiver nenhuma turma, abre na semana de referência (hoje em produção).
   * A `key` abaixo remonta a agenda apenas quando o RECORTE muda — navegar com
   * as setas não altera a chave e, portanto, não reposiciona a semana.
   */
  const semanaInicial = useMemo(() => {
    const base = referencia ?? new Date();
    return semanaSugeridaAgenda(turmasAgenda, base) ?? inicioSemana(base);
  }, [turmasAgenda, referencia]);
  const chaveFiltrosAgenda = useMemo(
    () => JSON.stringify([busca, status, modalidade, periodo]),
    [busca, status, modalidade, periodo]
  );

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
            className="grid grid-cols-1 gap-3 @[620px]:grid-cols-2 @[940px]:grid-cols-3 @[1120px]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(240px,0.75fr)]"
          >
            {COLUNAS.map((coluna, indiceColuna) => {
              const lista = grupos[coluna.chave];
              return (
                <motion.section
                  key={coluna.chave}
                  {...entradaCard(indiceColuna)}
                  aria-labelledby={`turmas-coluna-${coluna.chave}`}
                  data-turmas-coluna={coluna.chave}
                  className={cn('min-w-0', coluna.chave === 'concluidas' && '@[620px]:col-span-2 @[940px]:col-span-1')}
                >
                  <CabecalhoColunaTurma
                    id={`turmas-coluna-${coluna.chave}`}
                    titulo={coluna.titulo}
                    descricao={coluna.descricao}
                    contagem={contagens[coluna.chave]}
                    icone={coluna.icone}
                    tom={coluna.tom}
                  />

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

            <div className="@[620px]:col-span-2 @[940px]:col-span-3 @[1120px]:col-span-1 flex min-w-0 flex-col">
              <AgendaSemanal
                key={chaveFiltrosAgenda}
                turmas={turmasAgenda}
                semanaInicial={semanaInicial}
                onAbrir={setDetalhe}
                onVerCalendarioCompleto={(semana) => {
                  setMesCalendario(semana);
                  setAberturaCalendario((atual) => atual + 1);
                  setCalendarioAberto(true);
                }}
              />
            </div>
          </div>
        </EntradaPresenca>
      )}

      <CalendarioTurmasDialog
        key={aberturaCalendario}
        open={calendarioAberto}
        onOpenChange={setCalendarioAberto}
        mesInicial={mesCalendario}
        turmas={turmasAgenda}
        onAbrirTurma={setDetalhe}
      />

      <TurmaDetalheDialog
        turma={detalhe}
        onOpenChange={(aberto) => {
          if (!aberto) setDetalhe(null);
        }}
      />
    </div>
  );
}
