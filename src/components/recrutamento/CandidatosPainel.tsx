import { useId, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Archive,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  UserCheck,
  UserRound,
  Users,
  UserX,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { entradaCard } from '@/components/ui/entrada-cards';
import { cn } from '@/lib/utils';
import { formatCurrency, formatNumber } from '@/utils/format';
import type { CandidaturaComRelacoes, VagaRow } from '@/types/recrutamento';
import { ETAPAS } from './pipelineEtapas';
import { TabelaCandidatos } from './TabelaCandidatos';
import {
  FILTROS_CANDIDATOS_PADRAO,
  ORDENACOES,
  SITUACOES,
  contarFiltrosExtras,
  contarSituacoes,
  filtrarCandidaturas,
  ordenarCandidaturas,
  origensDisponiveis,
  paginarCandidaturas,
  paginasVisiveis,
  resumoSelecao,
  temFiltrosAtivos,
  vagasComCandidaturas,
  type FiltrosCandidatos,
  type OrdenacaoCandidato,
  type SituacaoCandidato,
} from './candidatosComum';

/**
 * ============================================================================
 * CANDIDATOS — composição da referência: 5 indicadores, painel único de
 * filtros, tabela (desktop) / cartões (mobile), seleção com agregados reais e
 * paginação local.
 *
 * Fonte única: `candidaturas` já carregadas pela página (inclui candidato e
 * vaga). Nenhuma consulta nova, nenhum campo fictício. O filtro "Nível" NÃO é
 * renderizado porque o modelo não possui esse campo (limitação documentada).
 * ============================================================================
 */
interface CandidatosPainelProps {
  candidaturas: readonly CandidaturaComRelacoes[];
  vagas: readonly VagaRow[];
  onVerPerfil: (cand: CandidaturaComRelacoes) => void;
  onMoverEtapa: (id: string, etapa: string) => void | boolean | Promise<void | boolean>;
  /** Consulta de candidaturas falhou — mostra erro + tentativa novamente. */
  erro?: boolean;
  onTentarNovamente?: () => void;
}

const TAMANHOS_PAGINA = [8, 16, 24] as const;

const TEMA_INDICADOR: Record<SituacaoCandidato, { icone: typeof Users; chip: string; ativo: string; hover: string }> = {
  todas: {
    icone: Users,
    chip: 'bg-primary/12 text-primary',
    ativo: 'border-primary/55 bg-primary/[0.07]',
    hover: 'hover:border-primary/35',
  },
  em_processo: {
    icone: UserRound,
    chip: 'bg-info/12 text-info',
    ativo: 'border-info/55 bg-info/[0.07]',
    hover: 'hover:border-info/35',
  },
  contratados: {
    icone: UserCheck,
    chip: 'bg-success/12 text-success',
    ativo: 'border-success/55 bg-success/[0.07]',
    hover: 'hover:border-success/35',
  },
  reprovados: {
    icone: UserX,
    chip: 'bg-destructive-vivid/12 text-destructive-vivid',
    ativo: 'border-destructive-vivid/55 bg-destructive-vivid/[0.07]',
    hover: 'hover:border-destructive-vivid/35',
  },
  arquivados: {
    icone: Archive,
    chip: 'bg-muted/40 text-muted-foreground',
    ativo: 'border-border/80 bg-muted/25',
    hover: 'hover:border-border/80',
  },
};

export function CandidatosPainel({
  candidaturas,
  vagas,
  onVerPerfil,
  onMoverEtapa,
  erro = false,
  onTentarNovamente,
}: CandidatosPainelProps) {
  const [filtros, setFiltros] = useState<FiltrosCandidatos>(FILTROS_CANDIDATOS_PADRAO);
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState<number>(TAMANHOS_PAGINA[0]);
  const [selecionados, setSelecionados] = useState<ReadonlySet<string>>(new Set());

  const vagasPorId = useMemo(() => new Map(vagas.map((vaga) => [vaga.id, vaga])), [vagas]);
  const vagasOpcoes = useMemo(() => vagasComCandidaturas(candidaturas, vagas), [candidaturas, vagas]);
  const origens = useMemo(() => origensDisponiveis(candidaturas), [candidaturas]);
  const contagens = useMemo(() => contarSituacoes(candidaturas), [candidaturas]);

  const filtradas = useMemo(
    () => ordenarCandidaturas(filtrarCandidaturas(candidaturas, filtros), filtros.ordenacao),
    [candidaturas, filtros]
  );
  const paginaDados = useMemo(
    () => paginarCandidaturas(filtradas, pagina, tamanhoPagina),
    [filtradas, pagina, tamanhoPagina]
  );
  const resumo = useMemo(() => resumoSelecao(candidaturas, selecionados), [candidaturas, selecionados]);

  // Mesma identidade de lista usada por Desligamentos → Processos: quando a
  // página, a ordenação ou um filtro mudam, o `<tbody>` remonta e a cascata das
  // linhas toca de novo. Seleção, hover e menus não alteram esta chave.
  const chaveCascata = `${paginaDados.paginaAtual}|${filtros.ordenacao}|${filtros.situacao}|${filtros.vagaId}|${filtros.etapa}|${filtros.origem}|${filtros.apenasAvaliados}|${filtros.apenasComPretensao}|${tamanhoPagina}`;

  const aplicarFiltros = (patch: Partial<FiltrosCandidatos>) => {
    setFiltros((atual) => ({ ...atual, ...patch }));
    setPagina(1);
    setSelecionados(new Set());
  };

  const limparFiltros = () => {
    setFiltros({ ...FILTROS_CANDIDATOS_PADRAO });
    setPagina(1);
    setSelecionados(new Set());
  };

  const idsDaPagina = paginaDados.itens.map((cand) => cand.id);
  const todosDaPagina = idsDaPagina.length > 0 && idsDaPagina.every((id) => selecionados.has(id));
  const algunsDaPagina = idsDaPagina.some((id) => selecionados.has(id));

  const alternarSelecao = (id: string) => {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  };

  const alternarTodos = () => {
    setSelecionados((atual) => {
      const proximo = new Set(atual);
      if (todosDaPagina) idsDaPagina.forEach((id) => proximo.delete(id));
      else idsDaPagina.forEach((id) => proximo.add(id));
      return proximo;
    });
  };

  const filtrosAtivos = temFiltrosAtivos(filtros);
  const extras = contarFiltrosExtras(filtros);

  if (erro) {
    return (
      <motion.div
        {...entradaCard(0)}
        role="alert"
        className="rounded-2xl border border-destructive-vivid/35 bg-destructive-vivid/[0.06] px-6 py-12 text-center"
      >
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-destructive-vivid/35 bg-destructive-vivid/10 text-destructive-vivid">
          <AlertTriangle className="h-5 w-5" aria-hidden />
        </span>
        <p className="text-[12.5px] font-semibold text-foreground">Não foi possível carregar os candidatos</p>
        <p className="mx-auto mt-1 max-w-md text-[10.5px] leading-relaxed text-muted-foreground">
          A consulta de candidaturas falhou. Verifique a conexão e tente novamente.
        </p>
        {onTentarNovamente ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onTentarNovamente}
            className="mt-3 h-8 rounded-lg text-[11px]"
          >
            Tentar novamente
          </Button>
        ) : null}
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 1 · INDICADORES — filtros rápidos sincronizados com a tabela. */}
      <div
        className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5"
        role="group"
        aria-label="Filtrar candidatos por situação"
      >
        {SITUACOES.map(({ valor, label }, indice) => {
          const tema = TEMA_INDICADOR[valor];
          const Icone = tema.icone;
          const ativo = filtros.situacao === valor;
          return (
            <motion.button
              key={valor}
              type="button"
              {...entradaCard(indice)}
              aria-pressed={ativo}
              onClick={() => aplicarFiltros({ situacao: valor })}
              className={cn(
                'flex h-[64px] min-w-0 items-center gap-2.5 rounded-xl border px-3 text-left transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                ativo ? tema.ativo : cn('border-border/50 bg-card/40', tema.hover)
              )}
            >
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tema.chip)}>
                <Icone className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[9px] font-semibold uppercase leading-tight tracking-[0.07em] text-muted-foreground">
                  {label}
                </span>
                <span className="block text-[19px] font-semibold leading-tight tabular-nums text-foreground">
                  {contagens[valor]}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* 2 · FILTROS — painel único navy, labels dentro do controle. */}
      <motion.div {...entradaCard(5)} className="rounded-xl border border-border/55 bg-card p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
          <div className="grid w-full grid-cols-2 gap-2.5 lg:grid-cols-4 xl:flex xl:w-auto xl:flex-1 xl:flex-wrap xl:items-center">
            <div className="min-w-0 xl:w-[200px]">
              <FiltroSelect
                label="Vaga"
                valor={filtros.vagaId}
                aoMudar={(valor) => aplicarFiltros({ vagaId: valor })}
                opcoes={[
                  { value: 'todas', label: 'Todas as vagas' },
                  ...vagasOpcoes.map((v) => ({ value: v.id, label: v.titulo })),
                ]}
              />
            </div>
            <div className="min-w-0 xl:w-[150px]">
              <FiltroSelect
                label="Etapa"
                valor={filtros.etapa}
                aoMudar={(valor) => aplicarFiltros({ etapa: valor })}
                opcoes={[
                  { value: 'todas', label: 'Todas as etapas' },
                  ...ETAPAS.map((e) => ({ value: e.id, label: e.label })),
                ]}
              />
            </div>
            <div className="min-w-0 xl:w-[160px]">
              <FiltroSelect
                label="Origem"
                valor={filtros.origem}
                aoMudar={(valor) => aplicarFiltros({ origem: valor })}
                opcoes={[
                  { value: 'todas', label: 'Todas as origens' },
                  ...origens.map((o) => ({ value: o, label: o })),
                ]}
              />
            </div>
            <div className="min-w-0 xl:w-[170px]">
              <FiltroSelect
                label="Ordenar por"
                valor={filtros.ordenacao}
                aoMudar={(valor) => aplicarFiltros({ ordenacao: valor as OrdenacaoCandidato })}
                opcoes={ORDENACOES.map((o) => ({ value: o.valor, label: o.label }))}
                icone={<ArrowUpDown className="h-2.5 w-2.5" aria-hidden />}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <MaisFiltros filtros={filtros} extras={extras} aoMudar={aplicarFiltros} />
            {filtrosAtivos ? (
              <Button
                type="button"
                variant="ghost"
                onClick={limparFiltros}
                className="h-[46px] gap-1 rounded-lg px-2 text-[10px] text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" aria-hidden />
                Limpar
              </Button>
            ) : null}
          </div>
        </div>
      </motion.div>

      {/* 3 · TABELA / CARTÕES + 4 · PAGINAÇÃO */}
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card">
        {resumo.total > 0 ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border/40 bg-primary/[0.04] px-3 py-2 text-[10px]">
            <span className="font-semibold text-foreground">
              {resumo.total} {resumo.total === 1 ? 'selecionado' : 'selecionados'}
            </span>
            {resumo.mediaAvaliacao !== null ? (
              <span className="text-muted-foreground">
                Avaliação média{' '}
                <strong className="font-semibold text-foreground">
                  {formatNumber(resumo.mediaAvaliacao, { decimals: 1 })}
                </strong>
              </span>
            ) : null}
            {resumo.mediaPretensao !== null ? (
              <span className="text-muted-foreground">
                Pretensão média{' '}
                <strong className="font-semibold text-foreground">{formatCurrency(resumo.mediaPretensao)}</strong>
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelecionados(new Set())}
              className="ml-auto h-6 rounded-md px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              Limpar seleção
            </Button>
          </div>
        ) : null}

        {paginaDados.itens.length > 0 ? (
          <TabelaCandidatos
            candidaturas={paginaDados.itens}
            vagasPorId={vagasPorId}
            selecionados={selecionados}
            onAlternarSelecao={alternarSelecao}
            onAlternarTodos={alternarTodos}
            todosDaPaginaSelecionados={todosDaPagina}
            algunsSelecionados={algunsDaPagina}
            onVerPerfil={onVerPerfil}
            onMoverEtapa={onMoverEtapa}
            cascadeKey={chaveCascata}
          />
        ) : (
          <EstadoVazio semDados={candidaturas.length === 0} filtrosAtivos={filtrosAtivos} onLimpar={limparFiltros} />
        )}

        {paginaDados.total > 0 ? (
          <Paginacao
            inicio={paginaDados.inicio}
            fim={paginaDados.fim}
            total={paginaDados.total}
            paginaAtual={paginaDados.paginaAtual}
            totalPaginas={paginaDados.totalPaginas}
            tamanho={tamanhoPagina}
            onPagina={setPagina}
            onTamanho={(valor) => {
              setTamanhoPagina(valor);
              setPagina(1);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function FiltroSelect({
  label,
  valor,
  aoMudar,
  opcoes,
  icone,
}: {
  label: string;
  valor: string;
  aoMudar: (valor: string) => void;
  opcoes: { value: string; label: string }[];
  icone?: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/80 bg-background/45 px-2 pb-1 pt-1.5">
      <span className="flex items-center gap-1 text-[8px] font-semibold uppercase leading-none tracking-[0.08em] text-muted-foreground">
        {icone}
        {label}
      </span>
      <Select value={valor} onValueChange={aoMudar}>
        <SelectTrigger
          aria-label={label}
          className="h-6 w-full rounded-none border-0 bg-transparent p-0 text-[11px] shadow-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 [&>span]:line-clamp-1 [&>svg]:h-3 [&>svg]:w-3"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((opcao) => (
            <SelectItem key={opcao.value} value={opcao.value} className="text-xs">
              {opcao.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MaisFiltros({
  filtros,
  extras,
  aoMudar,
}: {
  filtros: FiltrosCandidatos;
  extras: number;
  aoMudar: (patch: Partial<FiltrosCandidatos>) => void;
}) {
  const id = useId();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'h-[46px] gap-1.5 rounded-lg border-border/80 bg-background/45 px-3 text-[10.5px] font-medium text-foreground/85 hover:bg-muted/40 hover:text-foreground',
            extras > 0 && 'border-primary/50 text-primary'
          )}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          Mais filtros
          {extras > 0 ? (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 px-1 text-[9px] font-semibold tabular-nums text-primary">
              {extras}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(320px,calc(100vw-2rem))] p-3">
        <div className="space-y-3">
          <div>
            <label
              htmlFor={`${id}-busca`}
              className="text-[8.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
            >
              Buscar
            </label>
            <div className="relative mt-1">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                id={`${id}-busca`}
                value={filtros.busca}
                onChange={(event) => aoMudar({ busca: event.target.value })}
                placeholder="Nome, e-mail, vaga..."
                aria-label="Buscar candidatos"
                className="h-8 rounded-lg border-border/60 bg-background/60 pl-7 text-[11px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor={`${id}-avaliados`} className="flex items-start gap-2 text-[10.5px] text-foreground/85">
              <Checkbox
                id={`${id}-avaliados`}
                checked={filtros.apenasAvaliados}
                onCheckedChange={(valor) => aoMudar({ apenasAvaliados: valor === true })}
                className="mt-0.5"
              />
              Somente com avaliação
            </label>
            <label htmlFor={`${id}-pretensao`} className="flex items-start gap-2 text-[10.5px] text-foreground/85">
              <Checkbox
                id={`${id}-pretensao`}
                checked={filtros.apenasComPretensao}
                onCheckedChange={(valor) => aoMudar({ apenasComPretensao: valor === true })}
                className="mt-0.5"
              />
              Somente com pretensão informada
            </label>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Paginacao({
  inicio,
  fim,
  total,
  paginaAtual,
  totalPaginas,
  tamanho,
  onPagina,
  onTamanho,
}: {
  inicio: number;
  fim: number;
  total: number;
  paginaAtual: number;
  totalPaginas: number;
  tamanho: number;
  onPagina: (pagina: number) => void;
  onTamanho: (tamanho: number) => void;
}) {
  const paginas = paginasVisiveis(totalPaginas, paginaAtual);
  return (
    <motion.div
      {...entradaCard(8)}
      className="flex w-full flex-col gap-3 border-t border-border/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="shrink-0">
        <p className="text-[10px] text-muted-foreground">
          Mostrando{' '}
          <span className="font-medium tabular-nums text-foreground">
            {inicio}–{fim}
          </span>{' '}
          de <span className="font-medium tabular-nums text-foreground">{total}</span>{' '}
          {total === 1 ? 'candidato' : 'candidatos'}
        </p>
      </div>

      {/* Grupo único à direita: navegação e itens por página ficam juntos,
          sem centralização artificial. Em telas estreitas ele quebra por
          dentro, mas continua alinhado ao canto direito. */}
      <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-6 gap-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Página anterior"
            disabled={paginaAtual <= 1}
            onClick={() => onPagina(paginaAtual - 1)}
            className="h-7 w-7 rounded-lg border-border/60 bg-background/50 text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          </Button>
          {paginas.map((valor, indice) =>
            valor === 'gap' ? (
              <span key={`gap-${indice}`} className="px-1 text-[10px] text-muted-foreground" aria-hidden>
                …
              </span>
            ) : (
              <Button
                key={valor}
                type="button"
                variant={valor === paginaAtual ? 'secondary' : 'ghost'}
                size="sm"
                aria-label={`Página ${valor}`}
                aria-current={valor === paginaAtual ? 'page' : undefined}
                onClick={() => onPagina(valor)}
                className={cn(
                  'h-7 min-w-7 rounded-lg px-1 text-[10px] tabular-nums',
                  valor === paginaAtual
                    ? 'border border-primary/40 bg-primary/15 font-semibold text-primary hover:bg-primary/20'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                )}
              >
                {valor}
              </Button>
            )
          )}
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Próxima página"
            disabled={paginaAtual >= totalPaginas}
            onClick={() => onPagina(paginaAtual + 1)}
            className="h-7 w-7 rounded-lg border-border/60 bg-background/50 text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.06em] text-muted-foreground">Itens por página</span>
          <Select value={String(tamanho)} onValueChange={(valor) => onTamanho(Number(valor))}>
            <SelectTrigger
              aria-label="Itens por página"
              className="h-7 w-[70px] rounded-lg border-border/60 bg-background/50 text-[10px]"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TAMANHOS_PAGINA.map((opcao) => (
                <SelectItem key={opcao} value={String(opcao)} className="text-xs">
                  {opcao}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </motion.div>
  );
}

function EstadoVazio({
  semDados,
  filtrosAtivos,
  onLimpar,
}: {
  semDados: boolean;
  filtrosAtivos: boolean;
  onLimpar: () => void;
}) {
  return (
    <motion.div {...entradaCard(6)} className="px-6 py-12 text-center">
      <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-muted/30 text-muted-foreground">
        {semDados ? <Users className="h-5 w-5" aria-hidden /> : <Search className="h-5 w-5" aria-hidden />}
      </span>
      <p className="text-[12.5px] font-semibold text-foreground">
        {semDados ? 'Nenhuma candidatura registrada' : 'Nenhum candidato encontrado'}
      </p>
      <p className="mx-auto mt-1 max-w-md text-[10.5px] leading-relaxed text-muted-foreground">
        {semDados
          ? 'As candidaturas aparecerão aqui quando os candidatos se inscreverem nas vagas.'
          : 'Ajuste os filtros para ver outros candidatos.'}
      </p>
      {filtrosAtivos ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLimpar}
          className="mt-3 h-8 rounded-lg text-[11px]"
        >
          Limpar filtros
        </Button>
      ) : null}
    </motion.div>
  );
}
