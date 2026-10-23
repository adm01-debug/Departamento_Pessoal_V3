import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Award, CalendarDays, RefreshCw, Users } from 'lucide-react';
import { AppPagination } from '@/components/ui/app-pagination';
import { Button } from '@/components/ui/button';
import { EntradaPresenca, MAX_ENTRADA_INDEX, entradaCard } from '@/components/ui/entrada-cards';
import { LINHA_HUB_INICIO, linhaEntradaHubVariants } from '@/components/premiacoes/premiacoesEntrada';
import { cn } from '@/lib/utils';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { AvatarParticipante } from './TreinamentoParticipantes';
import { TreinamentoIcone } from './TreinamentoBadges';
import { InscricaoStatusBadge } from './InscricaoStatusBadge';
import { InscricoesFiltros } from './InscricoesFiltros';
import { InscricoesSegmentos } from './InscricoesSegmentos';
import {
  INSCRICOES_OPCOES_POR_PAGINA,
  INSCRICOES_POR_PAGINA_PADRAO,
  contarSegmentosInscricao,
  filtrarInscricoes,
  montarInscricoes,
  opcoesCursoInscricao,
  opcoesDepartamentoInscricao,
  opcoesStatusInscricao,
  paginarInscricoes,
  type ColaboradorInscricao,
  type CursoInscricao,
  type Inscricao,
  type InscricaoRegistro,
} from './inscricoesDerivacoes';
import type { Certificado } from './certificadosDerivacoes';

/** Painel operacional da aba Inscrições. */
export interface InscricoesPainelProps {
  inscricoes: readonly InscricaoRegistro[];
  cursos?: readonly CursoInscricao[];
  colaboradores?: readonly ColaboradorInscricao[];
  certificados?: readonly Certificado[];
  carregando?: boolean;
  erro?: boolean;
  onTentarNovamente?: () => void;
  onVerCertificado?: (certificado: Certificado) => void;
}

const GRID_TABELA = 'grid grid-cols-[20%_20%_13%_13%_12%_11%_11%] items-center';

/**
 * Barra da coluna PROGRESSO — mesmo acabamento do "Funil de Onboarding por
 * Etapa" (`AdmissoesDashboard.tsx`): degradê horizontal, sem glow/sombra.
 *
 * Os degradês usam os tokens do Design System:
 *   100%       → `--success` → `--primary` (verde → lime)
 *   50%–99%    → `--info` (mais profundo no início) → `--aqua` (azul → ciano)
 *   0%–49%     → `--warning` (mais profundo no início) → `--coins` (âmbar → amarelo)
 */
type TomBarra = 'sucesso' | 'andamento' | 'alerta';

const GRADIENTE_BARRA: Record<TomBarra, string> = {
  sucesso: 'linear-gradient(90deg, hsl(var(--success)) 0%, hsl(var(--primary)) 100%)',
  andamento: 'linear-gradient(90deg, hsl(var(--info) / 0.55) 0%, hsl(var(--info)) 45%, hsl(var(--aqua)) 100%)',
  alerta: 'linear-gradient(90deg, hsl(var(--warning) / 0.55) 0%, hsl(var(--warning)) 45%, hsl(var(--coins)) 100%)',
};

function tomBarra(percentual: number): TomBarra {
  if (percentual >= 100) return 'sucesso';
  if (percentual >= 50) return 'andamento';
  return 'alerta';
}

/** Parâmetros copiados do Funil de Onboarding por Etapa. */
const DURACAO_PREENCHIMENTO = 0.6;
const EASE_PREENCHIMENTO = [0.25, 0.46, 0.45, 0.94] as const;
const PASSO_CASCATA_BARRA = 0.05;

/**
 * A linha já entra com `opacity + y + scaleX` a partir de 0,46 s
 * (`linhaEntradaHubVariants`). A barra começa 0,45 s depois do início da linha
 * — quando o fade já a deixou visível, sem esperar os 0,8 s completos — e
 * mantém o passo de 0,05 s do Funil. Assim as duas animações não competem e a
 * cascata não soma o delay da linha inteira.
 */
const ATRASO_BARRA_APOS_LINHA = 0.45;

/**
 * PREVIEW LOCAL (somente desenvolvimento) — preenche as barras de progresso da
 * aba Inscrições com percentuais fictícios para validar o design.
 *
 * - Não altera `inscricao.progresso`, status, serviços, banco nem storage.
 * - Ativa apenas com `import.meta.env.DEV` E
 *   `VITE_TREINAMENTOS_PREVIEW_PROGRESSO=true` (nunca em produção).
 * - Com a flag desligada, o percentual real (ou "Não informado") permanece.
 */
const PREVIEW_PROGRESSO_ATIVO =
  import.meta.env.DEV &&
  import.meta.env.MODE !== 'test' &&
  import.meta.env.VITE_TREINAMENTOS_PREVIEW_PROGRESSO === 'true';

const PREVIEW_PROGRESSO_PERCENTUAIS = [100, 100, 75, 45, 20, 10, 90, 60] as const;

function percentualPreview(indice: number): number | null {
  if (!PREVIEW_PROGRESSO_ATIVO) return null;
  return PREVIEW_PROGRESSO_PERCENTUAIS[indice] ?? null;
}

function ProgressoInscricao({
  progresso,
  indice,
  animar,
}: {
  progresso: number | null;
  /** Posição visual da linha na página (0–7 no preview). */
  indice: number;
  /** A entrada da linha ainda está acontecendo? Coordena o início da barra. */
  animar: boolean;
}) {
  const movimentoReduzido = useMovimentoReduzido();
  const percentualSimulado = percentualPreview(indice);
  const percentual = percentualSimulado ?? progresso;

  if (percentual === null) {
    return (
      <div
        className="flex min-w-0 items-center gap-2"
        title="O modelo de inscrições não possui percentual de progresso."
      >
        <span className="h-1.5 min-w-[36px] flex-1 rounded-full border border-dashed border-border/70 bg-muted/20" />
        <span className="shrink-0 text-[9.5px] text-muted-foreground">Não informado</span>
      </div>
    );
  }

  const gradiente = GRADIENTE_BARRA[tomBarra(percentual)];
  const atraso = animar
    ? LINHA_HUB_INICIO + ATRASO_BARRA_APOS_LINHA + Math.min(indice, MAX_ENTRADA_INDEX) * PASSO_CASCATA_BARRA
    : 0;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        role="progressbar"
        aria-label={`Progresso da inscrição: ${percentual}%`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentual}
        className="h-1.5 min-w-[36px] flex-1 overflow-hidden rounded-full bg-muted/60"
      >
        <motion.span
          className="block h-full rounded-full"
          style={{ backgroundImage: gradiente }}
          initial={animar && !movimentoReduzido ? { width: 0 } : false}
          animate={{ width: `${percentual}%` }}
          transition={
            movimentoReduzido
              ? { duration: 0 }
              : { duration: DURACAO_PREENCHIMENTO, delay: atraso, ease: EASE_PREENCHIMENTO }
          }
        />
      </span>
      <span className="w-[30px] shrink-0 text-right text-[10px] font-medium tabular-nums text-foreground">
        {percentual}%
      </span>
    </div>
  );
}

function CelulaData({ texto }: { texto: string }) {
  const indisponivel = texto === 'Não informado';
  return (
    <span
      className={cn(
        'flex min-w-0 items-center gap-1.5 text-[10.5px] tabular-nums',
        indisponivel ? 'text-muted-foreground/80' : 'text-foreground/90'
      )}
    >
      {!indisponivel && <CalendarDays className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />}
      <span className="truncate">{texto}</span>
    </span>
  );
}

function ColaboradorCelula({ inscricao }: { inscricao: Inscricao }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <AvatarParticipante
        colaborador={{
          id: inscricao.colaboradorId || inscricao.colaboradorNome,
          nome: inscricao.colaboradorNome,
          fotoUrl: inscricao.colaboradorFoto,
        }}
        className="h-8 w-8 shrink-0 border-0 ring-1 ring-border/50"
      />
      <div className="min-w-0">
        <p
          className="line-clamp-2 text-[12px] font-semibold leading-tight text-foreground"
          title={inscricao.colaboradorNome}
        >
          {inscricao.colaboradorNome}
        </p>
        <p className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground">
          {[inscricao.colaboradorDepartamento, inscricao.colaboradorCargo].filter(Boolean).join(' · ') ||
            'Departamento e cargo não informados'}
        </p>
      </div>
    </div>
  );
}

function CursoCelula({ inscricao }: { inscricao: Inscricao }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <TreinamentoIcone
        categoria={inscricao.categoria}
        className="h-8 w-8 shrink-0 rounded-lg [&>svg]:h-4 [&>svg]:w-4"
      />
      <div className="min-w-0">
        <p className="line-clamp-2 text-[12px] font-semibold leading-tight text-foreground" title={inscricao.cursoNome}>
          {inscricao.cursoNome}
        </p>
        <p className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground">
          {inscricao.categoria || 'Sem categoria'}
        </p>
      </div>
    </div>
  );
}

function AcaoInscricao({
  inscricao,
  onVerCertificado,
  compacto = false,
}: {
  inscricao: Inscricao;
  onVerCertificado?: (certificado: Certificado) => void;
  compacto?: boolean;
}) {
  const certificado = inscricao.certificado;
  if (!certificado || !onVerCertificado) {
    return (
      <span
        className="text-[10px] text-muted-foreground/70"
        title="Nenhuma ação disponível nos dados atuais desta inscrição."
      >
        —
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onVerCertificado(certificado)}
      title="Ver prévia do certificado"
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-background/40 text-[10px] font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/[0.08] hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
        compacto ? 'h-8 px-3' : 'h-8 max-w-full px-2'
      )}
    >
      <Award className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">Certificado</span>
    </button>
  );
}

function LinhaTabela({
  inscricao,
  index,
  animar,
  onVerCertificado,
}: {
  inscricao: Inscricao;
  index: number;
  animar: boolean;
  onVerCertificado?: (certificado: Certificado) => void;
}) {
  return (
    <motion.div
      role="row"
      data-inscricao-row
      custom={Math.min(index, MAX_ENTRADA_INDEX)}
      variants={linhaEntradaHubVariants}
      initial={animar ? 'hidden' : false}
      animate="visible"
      className={cn(
        GRID_TABELA,
        'min-h-[58px] border-b border-border/25 px-4 py-2 transition-colors duration-200 last:border-0 hover:bg-muted/15'
      )}
    >
      <div role="cell" className="min-w-0 pr-3">
        <ColaboradorCelula inscricao={inscricao} />
      </div>
      <div role="cell" className="min-w-0 pr-3">
        <CursoCelula inscricao={inscricao} />
      </div>
      <div role="cell" className="min-w-0 pr-3">
        <ProgressoInscricao progresso={inscricao.progresso} indice={index} animar={animar} />
      </div>
      <div role="cell" className="min-w-0 pr-3">
        <InscricaoStatusBadge
          tom={inscricao.statusTom}
          label={inscricao.statusLabel}
          original={inscricao.statusOriginal}
        />
      </div>
      <div role="cell" className="min-w-0 pr-3">
        <CelulaData texto={inscricao.dataInicioTexto} />
      </div>
      <div role="cell" className="min-w-0 pr-3" title="O modelo não possui data prevista; exibe a conclusão real.">
        <CelulaData texto={inscricao.dataConclusaoTexto} />
      </div>
      <div role="cell" className="flex min-w-0 items-center justify-end">
        <AcaoInscricao inscricao={inscricao} onVerCertificado={onVerCertificado} />
      </div>
    </motion.div>
  );
}

function CartaoInscricao({
  inscricao,
  index,
  animar,
  onVerCertificado,
}: {
  inscricao: Inscricao;
  index: number;
  animar: boolean;
  onVerCertificado?: (certificado: Certificado) => void;
}) {
  return (
    <motion.article
      data-inscricao-card
      custom={Math.min(index, MAX_ENTRADA_INDEX)}
      variants={linhaEntradaHubVariants}
      initial={animar ? 'hidden' : false}
      animate="visible"
      className="min-w-0 origin-center rounded-xl border border-border/60 bg-card/60 p-3.5 transition-colors duration-200 hover:border-border"
    >
      <div className="flex items-start gap-2.5">
        <AvatarParticipante
          colaborador={{
            id: inscricao.colaboradorId || inscricao.colaboradorNome,
            nome: inscricao.colaboradorNome,
            fotoUrl: inscricao.colaboradorFoto,
          }}
          className="h-9 w-9 shrink-0 border-0 ring-1 ring-border/50"
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[12.5px] font-semibold leading-tight text-foreground">
            {inscricao.colaboradorNome}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {[inscricao.colaboradorDepartamento, inscricao.colaboradorCargo].filter(Boolean).join(' · ') ||
              'Departamento e cargo não informados'}
          </p>
        </div>
        <InscricaoStatusBadge
          tom={inscricao.statusTom}
          label={inscricao.statusLabel}
          original={inscricao.statusOriginal}
          className="shrink-0"
        />
      </div>
      <div className="mt-3 flex min-w-0 items-center gap-2.5 border-t border-border/30 pt-3">
        <TreinamentoIcone
          categoria={inscricao.categoria}
          className="h-8 w-8 shrink-0 rounded-lg [&>svg]:h-4 [&>svg]:w-4"
        />
        <div className="min-w-0">
          <p className="line-clamp-2 text-[12px] font-semibold leading-tight text-foreground">{inscricao.cursoNome}</p>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{inscricao.categoria || 'Sem categoria'}</p>
        </div>
      </div>
      <div className="mt-3">
        <p className="mb-1 text-[9px] uppercase tracking-[0.08em] text-muted-foreground">Progresso</p>
        <ProgressoInscricao progresso={inscricao.progresso} indice={index} animar={animar} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/30 pt-3">
        <div className="min-w-0">
          <p className="mb-1 text-[9px] uppercase tracking-[0.08em] text-muted-foreground">Data de início</p>
          <CelulaData texto={inscricao.dataInicioTexto} />
        </div>
        <div className="min-w-0" title="O modelo não possui data prevista; exibe a conclusão real.">
          <p className="mb-1 text-[9px] uppercase tracking-[0.08em] text-muted-foreground">Conclusão</p>
          <CelulaData texto={inscricao.dataConclusaoTexto} />
        </div>
      </div>
      <div className="mt-3 flex justify-end border-t border-border/30 pt-3">
        <AcaoInscricao inscricao={inscricao} onVerCertificado={onVerCertificado} compacto />
      </div>
    </motion.article>
  );
}

function InscricoesSkeleton() {
  return (
    <div className="space-y-2.5" aria-busy="true" aria-label="Carregando inscrições">
      <div className="h-11 rounded-xl border border-border/40 bg-muted/20 motion-safe:animate-pulse" />
      <div className="grid grid-cols-2 gap-2 min-[980px]:grid-cols-5">
        {Array.from({ length: 5 }, (_, indice) => (
          <div
            key={indice}
            className="h-9 rounded-full border border-border/40 bg-muted/20 motion-safe:animate-pulse"
          />
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border/40 bg-card/40">
        {Array.from({ length: 6 }, (_, indice) => (
          <div
            key={indice}
            className="flex min-h-[58px] items-center gap-3 border-b border-border/25 px-4 last:border-0"
          >
            <div className="h-8 w-8 shrink-0 rounded-full bg-muted/40 motion-safe:animate-pulse" />
            <div className="h-3 w-40 rounded bg-muted/40 motion-safe:animate-pulse" />
            <div className="ml-auto h-3 w-32 rounded bg-muted/30 motion-safe:animate-pulse" />
            <div className="h-5 w-20 rounded-full bg-muted/30 motion-safe:animate-pulse" />
            <div className="h-3 w-20 rounded bg-muted/30 motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

function InscricoesErro({ onTentarNovamente }: { onTentarNovamente?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-destructive/25 bg-destructive/[0.04] px-6 py-10 text-center"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-destructive/25 bg-destructive/10 text-destructive">
        <AlertTriangle className="h-4 w-4" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-semibold text-foreground">Não foi possível carregar as inscrições</p>
      <p className="mt-1 max-w-md text-xs text-muted-foreground">
        A listagem existente continua preservada; tente novamente sem alterar filtros ou dados.
      </p>
      {onTentarNovamente && (
        <Button
          type="button"
          variant="outline"
          onClick={onTentarNovamente}
          className="mt-4 h-9 gap-2 rounded-lg px-3.5 text-[11.5px]"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

function InscricoesVazio({ filtroAtivo, onLimpar }: { filtroAtivo: boolean; onLimpar: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border/50 bg-card/40 px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-muted/25 text-muted-foreground">
        <Users className="h-4 w-4" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-semibold text-foreground">Nenhuma inscrição encontrada</p>
      <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
        {filtroAtivo
          ? 'Ajuste os filtros para visualizar outras inscrições.'
          : 'As inscrições aparecerão aqui quando forem registradas.'}
      </p>
      {filtroAtivo && (
        <Button
          type="button"
          variant="outline"
          onClick={onLimpar}
          className="mt-4 h-9 rounded-lg border-border/60 px-3.5 text-[11.5px]"
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );
}

export function InscricoesPainel({
  inscricoes,
  cursos = [],
  colaboradores = [],
  certificados = [],
  carregando = false,
  erro = false,
  onTentarNovamente,
  onVerCertificado,
}: InscricoesPainelProps) {
  const [busca, setBusca] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('todos');
  const [cursoFiltro, setCursoFiltro] = useState('todos');
  const [departamentoFiltro, setDepartamentoFiltro] = useState('todos');
  const [periodo, setPeriodo] = useState<'todos' | 'mes' | '30d' | '90d' | 'ano'>('todos');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(INSCRICOES_POR_PAGINA_PADRAO);
  const [animar, setAnimar] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setAnimar(false), 1600);
    return () => window.clearTimeout(timer);
  }, []);

  const todas = useMemo(
    () => montarInscricoes(inscricoes, cursos, colaboradores, certificados),
    [inscricoes, cursos, colaboradores, certificados]
  );

  const cursosDisponiveis = useMemo<readonly CursoInscricao[]>(() => {
    if (cursos.length > 0) return cursos;
    const mapa = new Map<string, CursoInscricao>();
    for (const inscricao of todas) {
      if (inscricao.cursoId && !mapa.has(inscricao.cursoId)) {
        mapa.set(inscricao.cursoId, {
          id: inscricao.cursoId,
          nome: inscricao.cursoNome,
          categoria: inscricao.categoria,
        });
      }
    }
    return [...mapa.values()];
  }, [cursos, todas]);

  const statusOpcoes = useMemo(() => opcoesStatusInscricao(todas), [todas]);
  const cursoOpcoes = useMemo(() => opcoesCursoInscricao(cursosDisponiveis), [cursosDisponiveis]);
  const departamentoOpcoes = useMemo(() => opcoesDepartamentoInscricao(todas), [todas]);

  const base = useMemo(
    () => filtrarInscricoes(todas, { busca, cursoId: cursoFiltro, departamento: departamentoFiltro, periodo }),
    [todas, busca, cursoFiltro, departamentoFiltro, periodo]
  );
  const contagens = useMemo(() => contarSegmentosInscricao(base), [base]);
  const filtradas = useMemo(
    () => (statusFiltro === 'todos' ? base : base.filter((inscricao) => inscricao.statusCodigo === statusFiltro)),
    [base, statusFiltro]
  );
  const pagina = useMemo(
    () => paginarInscricoes(filtradas, paginaAtual, porPagina),
    [filtradas, paginaAtual, porPagina]
  );

  const filtroAtivo =
    busca.trim().length > 0 ||
    statusFiltro !== 'todos' ||
    cursoFiltro !== 'todos' ||
    departamentoFiltro !== 'todos' ||
    periodo !== 'todos';

  const limparFiltros = () => {
    setBusca('');
    setStatusFiltro('todos');
    setCursoFiltro('todos');
    setDepartamentoFiltro('todos');
    setPeriodo('todos');
    setPaginaAtual(1);
  };

  const atualizar = (acao: () => void) => {
    acao();
    setPaginaAtual(1);
  };

  if (carregando) return <InscricoesSkeleton />;
  if (erro) return <InscricoesErro onTentarNovamente={onTentarNovamente} />;

  const rotuloPaginacao =
    pagina.total === 0
      ? 'Nenhuma inscrição'
      : `Mostrando ${pagina.inicio}–${pagina.fim} de ${pagina.total} ${pagina.total === 1 ? 'inscrição' : 'inscrições'}`;

  return (
    <div className="space-y-2.5">
      <InscricoesFiltros
        busca={busca}
        onBusca={(valor) => atualizar(() => setBusca(valor))}
        status={statusFiltro}
        onStatus={(valor) => atualizar(() => setStatusFiltro(valor))}
        curso={cursoFiltro}
        onCurso={(valor) => atualizar(() => setCursoFiltro(valor))}
        departamento={departamentoFiltro}
        onDepartamento={(valor) => atualizar(() => setDepartamentoFiltro(valor))}
        periodo={periodo}
        onPeriodo={(valor) => atualizar(() => setPeriodo(valor))}
        statusOpcoes={statusOpcoes}
        cursoOpcoes={cursoOpcoes}
        departamentoOpcoes={departamentoOpcoes}
        filtroAtivo={filtroAtivo}
        onLimpar={limparFiltros}
      />
      <InscricoesSegmentos
        ativa={statusFiltro}
        contagens={contagens}
        onChange={(valor) => atualizar(() => setStatusFiltro(valor))}
      />
      {filtradas.length === 0 ? (
        <InscricoesVazio filtroAtivo={filtroAtivo} onLimpar={limparFiltros} />
      ) : (
        <EntradaPresenca>
          <motion.div {...entradaCard(8)} className="space-y-2.5">
            <div
              role="table"
              aria-label="Inscrições"
              className="hidden overflow-hidden rounded-xl border border-border/60 bg-card/60 shadow-sm min-[1180px]:block"
            >
              <div role="rowgroup">
                <div
                  role="row"
                  className={cn(
                    GRID_TABELA,
                    'border-b border-border/40 bg-muted/15 px-4 py-2 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground'
                  )}
                >
                  <div role="columnheader" className="min-w-0 pr-3">
                    Colaborador
                  </div>
                  <div role="columnheader" className="min-w-0 pr-3">
                    Curso
                  </div>
                  <div role="columnheader" className="min-w-0 pr-3">
                    Progresso
                  </div>
                  <div role="columnheader" className="min-w-0 pr-3">
                    Status
                  </div>
                  <div role="columnheader" className="min-w-0 pr-3">
                    Data de início
                  </div>
                  <div
                    role="columnheader"
                    className="min-w-0 pr-3"
                    title="Data real de conclusão. O modelo não possui conclusão prevista."
                  >
                    Conclusão
                  </div>
                  <div role="columnheader" className="min-w-0 text-right">
                    Ações
                  </div>
                </div>
              </div>
              <div role="rowgroup">
                {pagina.itens.map((inscricao, indice) => (
                  <LinhaTabela
                    key={inscricao.id}
                    inscricao={inscricao}
                    index={indice}
                    animar={animar}
                    onVerCertificado={onVerCertificado}
                  />
                ))}
              </div>
            </div>
            <div className="grid gap-2.5 min-[1000px]:grid-cols-2 min-[1180px]:hidden">
              {pagina.itens.map((inscricao, indice) => (
                <CartaoInscricao
                  key={inscricao.id}
                  inscricao={inscricao}
                  index={indice}
                  animar={animar}
                  onVerCertificado={onVerCertificado}
                />
              ))}
            </div>
            <AppPagination
              page={pagina.paginaAtual}
              total={pagina.total}
              pageSize={porPagina}
              pageSizeOptions={INSCRICOES_OPCOES_POR_PAGINA}
              onPageChange={setPaginaAtual}
              onPageSizeChange={(tamanho) => atualizar(() => setPorPagina(tamanho))}
              label={rotuloPaginacao}
              linhasPorPaginaLabel="Itens por página"
              selectorPosition="end"
              className="px-1"
            />
          </motion.div>
        </EntradaPresenca>
      )}
    </div>
  );
}
