import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { AppPagination } from '@/components/ui/app-pagination';
import { Button } from '@/components/ui/button';
import { EntradaPresenca, MAX_ENTRADA_INDEX } from '@/components/ui/entrada-cards';
import { linhaEntradaHubVariants } from '@/components/premiacoes/premiacoesEntrada';
import { TreinamentoCursoCard } from './TreinamentoCursoCard';
import { TreinamentosCatalogoFiltros } from './TreinamentosCatalogoFiltros';
import {
  CATALOGO_OPCOES_POR_PAGINA,
  CATALOGO_POR_PAGINA_PADRAO,
  OBRIGATORIEDADE_OPCOES,
  ORDENACAO_CATALOGO_OPCOES,
  ORDENACAO_CATALOGO_PADRAO,
  filtrarCursos,
  opcoesCategoriaCurso,
  opcoesModalidadeCurso,
  ordenarCursos,
  paginarTreinamentos,
  type CursoCatalogo,
  type ObrigatoriedadeFiltro,
  type OrdenacaoCatalogo,
  type ParticipacaoCurso,
} from './treinamentosDerivacoes';

/**
 * ============================================================================
 * CATÁLOGO DE TREINAMENTOS — grid de cards horizontais.
 *
 * Substitui a tabela antiga (Nome · Categoria · Modalidade · Carga · Obrigatório
 * · Excluir) preservando TODOS os dados e ações reais, sem tocar em banco,
 * serviços de escrita, permissões ou cálculos.
 *
 * FILTROS: aplicados em memória sobre a lista já carregada (`catalogo_cursos`
 * por empresa). Nenhuma API nova, nenhum total inventado — a paginação é de
 * apresentação e o rodapé calcula “Mostrando X–Y de Z cursos” a partir do
 * conjunto filtrado.
 *
 * MOVIMENTO: cada card entra com `linhaEntradaHubVariants` (mesma animação da
 * lista de Campanhas do Hub de Premiações: 0,8s, y 10px, scaleX 0.94→1,
 * passo 0,08s). A `key` é o id do curso, então trocar filtro, ordenar ou
 * paginar NÃO reanima os cards já montados. O atraso para de crescer no 9º item.
 * ============================================================================
 */

const OPCOES_OBRIGATORIEDADE = OBRIGATORIEDADE_OPCOES.map((opcao) => ({ ...opcao }));
const OPCOES_ORDENACAO = ORDENACAO_CATALOGO_OPCOES.map((opcao) => ({ ...opcao }));

function CatalogoSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-3 gap-y-2.5 @[760px]:grid-cols-2" aria-hidden>
      {Array.from({ length: 4 }, (_, indice) => (
        <div key={indice} className="flex min-h-[124px] gap-3 rounded-xl border border-border/40 bg-card/30 p-2.5">
          <div className="h-[104px] w-[104px] shrink-0 rounded-[9px] bg-muted/50 motion-safe:animate-pulse" />
          <div className="flex flex-1 flex-col justify-between py-1">
            <div className="space-y-2">
              <div className="h-4 w-20 rounded-full bg-muted/50 motion-safe:animate-pulse" />
              <div className="h-4 w-3/4 rounded bg-muted/50 motion-safe:animate-pulse" />
              <div className="h-3 w-full rounded bg-muted/40 motion-safe:animate-pulse" />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="h-3 w-28 rounded bg-muted/40 motion-safe:animate-pulse" />
              <div className="h-8 w-24 rounded-lg bg-muted/50 motion-safe:animate-pulse" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EstadoVazioCatalogo({ filtroAtivo, onLimpar }: { filtroAtivo: boolean; onLimpar: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/50 bg-card/30 px-4 py-14 text-center">
      <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
        <Search className="h-5 w-5" />
      </span>
      <p className="text-sm font-medium text-foreground">Nenhum curso encontrado</p>
      <p className="text-xs text-muted-foreground">Ajuste os filtros para visualizar outros cursos.</p>
      {filtroAtivo && (
        <Button variant="outline" size="sm" className="mt-2 h-8 rounded-lg px-3 text-[11.5px]" onClick={onLimpar}>
          Limpar filtros
        </Button>
      )}
    </div>
  );
}

export interface TreinamentosCatalogoProps {
  cursos: CursoCatalogo[];
  participantesPorCurso: Record<string, ParticipacaoCurso>;
  carregando?: boolean;
  onExcluir: (curso: CursoCatalogo) => void;
}

export function TreinamentosCatalogo({
  cursos,
  participantesPorCurso,
  carregando = false,
  onExcluir,
}: TreinamentosCatalogoProps) {
  const [busca, setBusca] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [modalidade, setModalidade] = useState('todas');
  const [obrigatoriedade, setObrigatoriedade] = useState<ObrigatoriedadeFiltro>('todas');
  const [ordenacao, setOrdenacao] = useState<OrdenacaoCatalogo>(ORDENACAO_CATALOGO_PADRAO);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(CATALOGO_POR_PAGINA_PADRAO);

  // Opções SEMPRE derivadas dos dados reais (nada fixo da imagem de referência).
  const categoriaOpcoes = useMemo(
    () => [{ value: 'todas', label: 'Todas' }, ...opcoesCategoriaCurso(cursos)],
    [cursos]
  );
  const modalidadeOpcoes = useMemo(
    () => [{ value: 'todas', label: 'Todas' }, ...opcoesModalidadeCurso(cursos)],
    [cursos]
  );

  const filtroAtivo =
    busca.trim().length > 0 ||
    categoria !== 'todas' ||
    modalidade !== 'todas' ||
    obrigatoriedade !== 'todas' ||
    ordenacao !== ORDENACAO_CATALOGO_PADRAO;

  const filtrados = useMemo(() => {
    const base = filtrarCursos(cursos, { busca, categoria, modalidade, obrigatoriedade });
    return ordenarCursos(base, ordenacao);
  }, [cursos, busca, categoria, modalidade, obrigatoriedade, ordenacao]);

  const pagina = useMemo(
    () => paginarTreinamentos(filtrados, paginaAtual, porPagina),
    [filtrados, paginaAtual, porPagina]
  );

  const reiniciarPagina = () => setPaginaAtual(1);

  const limparFiltros = () => {
    setBusca('');
    setCategoria('todas');
    setModalidade('todas');
    setObrigatoriedade('todas');
    setOrdenacao(ORDENACAO_CATALOGO_PADRAO);
    setPaginaAtual(1);
  };

  return (
    <div className="@container flex flex-col gap-3">
      <TreinamentosCatalogoFiltros
        busca={busca}
        onBusca={(valor) => {
          setBusca(valor);
          reiniciarPagina();
        }}
        categoria={categoria}
        onCategoria={(valor) => {
          setCategoria(valor);
          reiniciarPagina();
        }}
        modalidade={modalidade}
        onModalidade={(valor) => {
          setModalidade(valor);
          reiniciarPagina();
        }}
        obrigatoriedade={obrigatoriedade}
        onObrigatoriedade={(valor) => {
          setObrigatoriedade(valor);
          reiniciarPagina();
        }}
        ordenacao={ordenacao}
        onOrdenacao={(valor) => {
          setOrdenacao(valor);
          reiniciarPagina();
        }}
        categoriaOpcoes={categoriaOpcoes}
        modalidadeOpcoes={modalidadeOpcoes}
        obrigatoriedadeOpcoes={OPCOES_OBRIGATORIEDADE}
        ordenacaoOpcoes={OPCOES_ORDENACAO}
        filtroAtivo={filtroAtivo}
        onLimpar={limparFiltros}
      />

      {carregando ? (
        <CatalogoSkeleton />
      ) : pagina.itens.length === 0 ? (
        <EstadoVazioCatalogo filtroAtivo={filtroAtivo} onLimpar={limparFiltros} />
      ) : (
        <EntradaPresenca>
          <div data-catalogo-grid className="grid grid-cols-1 gap-x-3 gap-y-2.5 @[760px]:grid-cols-2">
            {pagina.itens.map((curso, indice) => (
              <motion.div
                key={curso.id}
                custom={Math.min(indice, MAX_ENTRADA_INDEX)}
                variants={linhaEntradaHubVariants}
                initial="hidden"
                animate="visible"
                className="min-w-0 origin-center"
              >
                <TreinamentoCursoCard
                  curso={curso}
                  participacao={participantesPorCurso[curso.id]}
                  onExcluir={onExcluir}
                />
              </motion.div>
            ))}
          </div>
        </EntradaPresenca>
      )}

      <div className="border-t border-border/40 pt-2.5">
        <AppPagination
          page={pagina.pagina}
          total={pagina.total}
          pageSize={porPagina}
          pageSizeOptions={CATALOGO_OPCOES_POR_PAGINA}
          onPageChange={setPaginaAtual}
          onPageSizeChange={(valor) => {
            setPorPagina(valor);
            reiniciarPagina();
          }}
          selectorPosition="end"
          linhasPorPaginaLabel="Itens por página"
          isLoading={carregando}
          label={
            pagina.total === 0 ? (
              'Nenhum curso encontrado'
            ) : (
              <>
                Mostrando <span className="font-semibold text-foreground">{pagina.inicio}</span>–
                <span className="font-semibold text-foreground">{pagina.fim}</span> de{' '}
                <span className="font-semibold text-foreground">{pagina.total}</span>{' '}
                {pagina.total === 1 ? 'curso' : 'cursos'}
              </>
            )
          }
        />
      </div>
    </div>
  );
}
