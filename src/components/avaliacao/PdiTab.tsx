import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AppPagination } from '@/components/ui/app-pagination';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { EntradaPresenca, entradaCard } from './entradaCards';
import { PdiCard } from './PdiCard';
import { PdiDetalheDialog } from './PdiDetalheDialog';
import { PdiFiltros } from './PdiFiltros';
import { PdiFocoBanner } from './PdiFocoBanner';
import {
  colaboradoresDosPdis,
  competenciasDisponiveis,
  contarPorCategoria,
  correspondeBusca,
  derivarPdi,
  ordenarPdis,
  pdisEmAtencao,
  resumoAtencao,
  type CategoriaPdi,
  type ColaboradorPdi,
  type CriterioOrdemPdi,
  type FiltroPrazo,
  type PdiDerivado,
} from './pdiComum';

/**
 * ============================================================================
 * ABA "PDI" — composição completa da tela.
 *
 * Ordem visual (a da referência): (A) banner "Foco agora" → (B) busca/filtros/
 * ordenação → (C) filtros rápidos por status → (D) listagem analítica de cards
 * horizontais → (E) paginação compacta.
 *
 * FONTE DOS DADOS: a lista já carregada por `AvaliacaoPage` (`getMockPdis()` ou
 * `avaliacaoService.listarPDIs`) + a lista de colaboradores que a página já
 * busca para o módulo inteiro (usada só para resolver cargo/departamento/foto
 * do dono do plano — a consulta de PDIs traz apenas o nome). Busca, filtros,
 * ordenação e paginação são 100% client-side: nenhuma consulta nova, nenhuma
 * escrita, nenhuma mudança de permissão ou de isolamento por empresa.
 *
 * ENTRADA: `EntradaPresenca` (libera o keyframe `hidden` que o
 * `initial={false}` do PageTransition bloqueia) + a cascata `entradaCard(i)` dos
 * KPI Cards do Dashboard Executivo, na ordem de leitura — banner (0), barra de
 * filtros (1), cards (2, 3, 4... de cima para baixo), paginação (no fim).
 *
 * PAGINAÇÃO: o componente oficial do sistema (`AppPagination`) só entra quando a
 * lista realmente passa de uma página — com o conjunto atual (5 planos) não há
 * paginação decorativa ocupando o rodapé.
 * ============================================================================
 */

/** Itens por página — mesmo padrão de Metas & OKRs. */
const POR_PAGINA_PADRAO = 6;
const OPCOES_POR_PAGINA = [6, 12, 24] as const;

interface PdiTabProps {
  /** PDIs da empresa (mesma lista que a página já carregava). */
  pdis: any[];
  /** Colaboradores já carregados pela página (cargo/departamento/foto). */
  colaboradores?: ColaboradorPdi[];
}

export function PdiTab({ pdis, colaboradores = [] }: PdiTabProps) {
  const reduzirMovimento = useMovimentoReduzido();

  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<CategoriaPdi>('todos');
  const [competencia, setCompetencia] = useState('');
  const [colaboradorId, setColaboradorId] = useState('');
  const [prazo, setPrazo] = useState<FiltroPrazo>('todos');
  const [ordem, setOrdem] = useState<CriterioOrdemPdi>('prazo');
  const [emAtencao, setEmAtencao] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(POR_PAGINA_PADRAO);
  const [detalhe, setDetalhe] = useState<PdiDerivado | null>(null);
  const [detalheAberto, setDetalheAberto] = useState(false);

  /** Categoria/prazo/cargo/departamento/foto derivados UMA vez por carga. */
  const derivados = useMemo(() => pdis.map((p) => derivarPdi(p, colaboradores)), [pdis, colaboradores]);

  /** Foco agora: olha o conjunto INTEIRO (independe dos filtros da barra). */
  const atencao = useMemo(() => resumoAtencao(derivados), [derivados]);
  const idsEmAtencao = useMemo(() => new Set(pdisEmAtencao(derivados).map((i) => i.id)), [derivados]);
  const competencias = useMemo(() => competenciasDisponiveis(pdis), [pdis]);
  const pessoas = useMemo(() => colaboradoresDosPdis(derivados), [derivados]);

  /** Busca + Status + Competência + Colaborador + Prazo (antes da atenção). */
  const base = useMemo(
    () =>
      derivados.filter((d) => {
        if (status !== 'todos' && d.categoria !== status) return false;
        if (competencia && d.competencia !== competencia) return false;
        if (colaboradorId && d.colaboradorId !== colaboradorId) return false;
        if (prazo === 'vencidos' && !d.vencido) return false;
        if (prazo === 'no_prazo' && d.vencido) return false;
        return correspondeBusca(d, busca);
      }),
    [derivados, status, competencia, colaboradorId, prazo, busca]
  );

  /** Contadores das pílulas: refletem os DEMAIS filtros, não o status ativo. */
  const contagem = useMemo(() => contarPorCategoria(base), [base]);

  const lista = useMemo(() => {
    const filtradas = emAtencao ? base.filter((d) => idsEmAtencao.has(d.id)) : base;
    return ordenarPdis(filtradas, ordem);
  }, [base, emAtencao, idsEmAtencao, ordem]);

  const totalPaginas = Math.max(1, Math.ceil(lista.length / Math.max(1, porPagina)));
  const paginaAtual = Math.min(Math.max(1, pagina), totalPaginas);
  const inicio = (paginaAtual - 1) * porPagina;
  const visiveis = lista.slice(inicio, inicio + porPagina);

  const filtrosAtivos = [
    status !== 'todos',
    competencia !== '',
    colaboradorId !== '',
    prazo !== 'todos',
    emAtencao,
  ].filter(Boolean).length;

  const limparFiltros = () => {
    setBusca('');
    setStatus('todos');
    setCompetencia('');
    setColaboradorId('');
    setPrazo('todos');
    setEmAtencao(false);
    setPagina(1);
  };

  /**
   * Ação do banner: alterna o filtro de atenção. Ligando, os filtros da barra
   * começam do zero (o recorte do banner é o conjunto inteiro em atenção).
   */
  const alternarAtencao = () => {
    if (!emAtencao) {
      setBusca('');
      setStatus('todos');
      setCompetencia('');
      setColaboradorId('');
      setPrazo('todos');
    }
    setEmAtencao((v) => !v);
    setPagina(1);
  };

  const abrirDetalhe = (item: PdiDerivado) => {
    setDetalhe(item);
    setDetalheAberto(true);
  };

  const filtrarPorColaborador = (item: PdiDerivado) => {
    if (!item.colaboradorId) return;
    setColaboradorId(item.colaboradorId);
    setEmAtencao(false);
    setPagina(1);
  };

  const filtrarPorCompetencia = (item: PdiDerivado) => {
    if (!item.competencia) return;
    setCompetencia(item.competencia);
    setEmAtencao(false);
    setPagina(1);
  };

  const precisaPaginacao = lista.length > POR_PAGINA_PADRAO;

  return (
    <EntradaPresenca>
      <div className="space-y-3">
        {/* A · Banner de atenção (só existe com PDI em atenção de verdade). */}
        <PdiFocoBanner
          indice={0}
          total={atencao.total}
          vencidos={atencao.vencidos}
          pendentes={atencao.pendentes}
          ativo={emAtencao}
          onVerAtencao={alternarAtencao}
        />

        {/* B + C · Busca, filtros, ordenação e pílulas de status. */}
        <PdiFiltros
          indice={1}
          busca={busca}
          onBusca={(v) => {
            setBusca(v);
            setPagina(1);
          }}
          status={status}
          onStatus={(v) => {
            setStatus(v);
            setEmAtencao(false);
            setPagina(1);
          }}
          competencia={competencia}
          onCompetencia={(v) => {
            setCompetencia(v);
            setPagina(1);
          }}
          competencias={competencias}
          colaboradorId={colaboradorId}
          onColaboradorId={(v) => {
            setColaboradorId(v);
            setPagina(1);
          }}
          colaboradores={pessoas}
          prazo={prazo}
          onPrazo={(v) => {
            setPrazo(v);
            setPagina(1);
          }}
          ordem={ordem}
          onOrdem={setOrdem}
          contagem={contagem}
          filtrosAtivos={filtrosAtivos}
          emAtencao={emAtencao}
          totalAtencao={atencao.total}
          onLimpar={limparFiltros}
          onLimparAtencao={() => {
            setEmAtencao(false);
            setPagina(1);
          }}
        />

        {/* D · Listagem analítica. */}
        {visiveis.length === 0 ? (
          <motion.div
            {...entradaCard(2)}
            className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/40 px-6 py-12 text-center"
          >
            <TrendingUp className="h-6 w-6 text-muted-foreground" />
            <p className="text-[13px] font-medium">Nenhum PDI encontrado</p>
            <p className="max-w-md text-[11px] text-muted-foreground">
              Ajuste a busca ou os filtros para ver outros planos de desenvolvimento.
            </p>
            <Button variant="outline" size="sm" className="mt-1 h-8 text-xs" onClick={limparFiltros}>
              Limpar filtros
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-2">
            {visiveis.map((item, i) => (
              <PdiCard
                key={item.id || `${paginaAtual}-${i}`}
                item={item}
                indice={2 + i}
                reduzirMovimento={reduzirMovimento}
                onVerPdi={abrirDetalhe}
                onFiltrarColaborador={filtrarPorColaborador}
                onFiltrarCompetencia={filtrarPorCompetencia}
              />
            ))}
          </div>
        )}

        {/* E · Paginação compacta — só quando existe mais de uma página. */}
        {precisaPaginacao && (
          <motion.div {...entradaCard(2 + visiveis.length)}>
            <AppPagination
              page={paginaAtual}
              total={lista.length}
              pageSize={porPagina}
              pageSizeOptions={OPCOES_POR_PAGINA}
              onPageChange={setPagina}
              onPageSizeChange={(n) => {
                setPorPagina(n);
                setPagina(1);
              }}
              label={`Mostrando ${inicio + 1}–${inicio + visiveis.length} de ${lista.length}`}
            />
          </motion.div>
        )}

        <PdiDetalheDialog
          item={detalhe}
          aberto={detalheAberto}
          onOpenChange={setDetalheAberto}
          onFiltrarColaborador={filtrarPorColaborador}
          onFiltrarCompetencia={filtrarPorCompetencia}
        />
      </div>
    </EntradaPresenca>
  );
}
