import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Award, Search } from 'lucide-react';
import { AppPagination } from '@/components/ui/app-pagination';
import { Button } from '@/components/ui/button';
import { EntradaPresenca, MAX_ENTRADA_INDEX, entradaCard } from '@/components/ui/entrada-cards';
import { linhaEntradaHubVariants } from '@/components/premiacoes/premiacoesEntrada';
import { CertificadoCard } from './CertificadoCard';
import { CertificadoDetalheDialog } from './CertificadoDetalheDialog';
import { CertificadosFiltros } from './CertificadosFiltros';
import { CertificadosSegmentos } from './CertificadosSegmentos';
import {
  ORDENACAO_CERTIFICADO_OPCOES,
  ORDENACAO_CERTIFICADO_PADRAO,
  SITUACAO_CERTIFICADO_OPCOES,
  certificadosBaseDosContadores,
  contarSituacoesCertificado,
  filtrarCertificados,
  montarCertificados,
  opcoesCategoriaCertificado,
  ordenarCertificados,
  type Certificado,
  type CertificadoRegistro,
  type ColaboradorCertificado,
  type CursoCertificado,
  type OrdenacaoCertificado,
  type SituacaoCertificado,
} from './certificadosDerivacoes';
import { PERIODO_OPCOES, paginarTreinamentos, type PeriodoTreinamento } from './treinamentosDerivacoes';

/**
 * ============================================================================
 * CERTIFICADOS — painel visual (grid de cards).
 *
 * Substitui a tabela antiga preservando os seis campos reais (colaborador,
 * curso, emissão, validade, código e ação). Nenhuma consulta nova: tudo deriva
 * das listas já carregadas por `TreinamentosPage`.
 *
 * ESTADO DE SITUAÇÃO: o dropdown e os badges compartilham UM único estado.
 * Os contadores são facetados: refletem busca/categoria/período, mas ignoram a
 * própria situação — assim o usuário vê quantos registros existem em cada
 * opção antes de selecioná-la. “Todos” = total após os demais filtros.
 *
 * MOVIMENTO: filtros/badges usam `entradaCard` (KPI Cards do Dashboard);
 * cards usam `linhaEntradaHubVariants` (lista de Campanhas) na ordem do grid.
 * ============================================================================
 */
export interface CertificadosPainelProps {
  certificados: readonly CertificadoRegistro[];
  cursos: readonly CursoCertificado[];
  colaboradores?: readonly ColaboradorCertificado[];
  carregando?: boolean;
  erro?: boolean;
  onTentarNovamente?: () => void;
}

const CERTIFICADOS_POR_PAGINA_PADRAO = 6;
const CERTIFICADOS_OPCOES_POR_PAGINA = [6, 12, 24, 48] as const;

function CertificadosSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 @[620px]:grid-cols-2 @[900px]:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }, (_, indice) => (
        <div
          key={indice}
          className="flex flex-col rounded-xl border border-border/40 bg-card/30 p-3 motion-safe:animate-pulse"
        >
          <div className="flex gap-3">
            <div className="h-[112px] w-[92px] shrink-0 rounded-lg bg-muted/40" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-16 rounded-full bg-muted/50" />
              <div className="h-4 w-3/4 rounded bg-muted/50" />
              <div className="h-3 w-1/2 rounded bg-muted/40" />
              <div className="mt-5 flex items-center gap-2">
                <div className="h-[30px] w-[30px] rounded-full bg-muted/50" />
                <div className="h-3 w-24 rounded bg-muted/40" />
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-y border-border/30 py-2">
            <div className="h-7 rounded bg-muted/30" />
            <div className="h-7 rounded bg-muted/30" />
            <div className="h-7 rounded bg-muted/30" />
          </div>
          <div className="mt-3 h-9 rounded-lg bg-muted/50" />
        </div>
      ))}
    </div>
  );
}

function EstadoErro({ onTentarNovamente }: { onTentarNovamente?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-destructive/30 bg-destructive/[0.04] px-4 py-12 text-center">
      <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-sm font-medium text-foreground">Não foi possível carregar os certificados</p>
      <p className="text-xs text-muted-foreground">Verifique a conexão e tente novamente.</p>
      {onTentarNovamente && (
        <Button
          variant="outline"
          size="sm"
          className="mt-2 h-8 rounded-lg px-3 text-[11.5px]"
          onClick={onTentarNovamente}
        >
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

function EstadoVazio({ filtroAtivo, onLimpar }: { filtroAtivo: boolean; onLimpar: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/50 bg-card/30 px-4 py-14 text-center">
      <span className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
        {filtroAtivo ? <Search className="h-5 w-5" aria-hidden /> : <Award className="h-5 w-5" aria-hidden />}
      </span>
      <p className="text-sm font-medium text-foreground">
        {filtroAtivo ? 'Nenhum certificado corresponde aos filtros selecionados.' : 'Nenhum certificado encontrado'}
      </p>
      <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
        {filtroAtivo
          ? 'Ajuste os filtros para visualizar outros certificados.'
          : 'Ainda não existem certificados disponíveis para consulta.'}
      </p>
      {filtroAtivo && (
        <Button variant="outline" size="sm" className="mt-2 h-8 rounded-lg px-3 text-[11.5px]" onClick={onLimpar}>
          Limpar filtros
        </Button>
      )}
    </div>
  );
}

export function CertificadosPainel({
  certificados,
  cursos,
  colaboradores = [],
  carregando = false,
  erro = false,
  onTentarNovamente,
}: CertificadosPainelProps) {
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState<SituacaoCertificado>('todos');
  const [categoria, setCategoria] = useState('todas');
  const [periodo, setPeriodo] = useState<PeriodoTreinamento>('todos');
  const [ordenacao, setOrdenacao] = useState<OrdenacaoCertificado>(ORDENACAO_CERTIFICADO_PADRAO);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(CERTIFICADOS_POR_PAGINA_PADRAO);
  const [detalhe, setDetalhe] = useState<Certificado | null>(null);

  const lista = useMemo(
    () => montarCertificados(certificados, cursos, colaboradores),
    [certificados, cursos, colaboradores]
  );

  const categoriaOpcoes = useMemo(
    () => [{ value: 'todas', label: 'Todas' }, ...opcoesCategoriaCertificado(lista)],
    [lista]
  );

  const baseContadores = useMemo(
    () => certificadosBaseDosContadores(lista, { busca, categoria, periodo, situacao: 'todos' }),
    [lista, busca, categoria, periodo]
  );
  const contagens = useMemo(() => contarSituacoesCertificado(baseContadores), [baseContadores]);

  const filtrados = useMemo(() => {
    const base = filtrarCertificados(lista, { busca, situacao, categoria, periodo });
    return ordenarCertificados(base, ordenacao);
  }, [lista, busca, situacao, categoria, periodo, ordenacao]);

  const paginaAtual = useMemo(() => paginarTreinamentos(filtrados, pagina, porPagina), [filtrados, pagina, porPagina]);

  const filtroAtivo =
    busca.trim().length > 0 ||
    situacao !== 'todos' ||
    categoria !== 'todas' ||
    periodo !== 'todos' ||
    ordenacao !== ORDENACAO_CERTIFICADO_PADRAO;

  const reiniciarPagina = () => setPagina(1);

  const limparFiltros = () => {
    setBusca('');
    setSituacao('todos');
    setCategoria('todas');
    setPeriodo('todos');
    setOrdenacao(ORDENACAO_CERTIFICADO_PADRAO);
    setPagina(1);
  };

  return (
    <div className="@container flex flex-col gap-3">
      <CertificadosFiltros
        busca={busca}
        onBusca={(valor) => {
          setBusca(valor);
          reiniciarPagina();
        }}
        situacao={situacao}
        onSituacao={(valor) => {
          setSituacao(valor);
          reiniciarPagina();
        }}
        categoria={categoria}
        onCategoria={(valor) => {
          setCategoria(valor);
          reiniciarPagina();
        }}
        periodo={periodo}
        onPeriodo={(valor) => {
          setPeriodo(valor);
          reiniciarPagina();
        }}
        ordenacao={ordenacao}
        onOrdenacao={(valor) => {
          setOrdenacao(valor);
          reiniciarPagina();
        }}
        situacaoOpcoes={SITUACAO_CERTIFICADO_OPCOES}
        categoriaOpcoes={categoriaOpcoes}
        periodoOpcoes={PERIODO_OPCOES}
        ordenacaoOpcoes={ORDENACAO_CERTIFICADO_OPCOES}
        filtroAtivo={filtroAtivo}
        onLimpar={limparFiltros}
      />

      <CertificadosSegmentos
        ativa={situacao}
        contagens={contagens}
        onChange={(valor) => {
          setSituacao(valor);
          reiniciarPagina();
        }}
      />

      {erro ? (
        <EstadoErro onTentarNovamente={onTentarNovamente} />
      ) : carregando ? (
        <CertificadosSkeleton />
      ) : filtrados.length === 0 ? (
        <EstadoVazio filtroAtivo={filtroAtivo && lista.length > 0} onLimpar={limparFiltros} />
      ) : (
        <EntradaPresenca>
          <div
            data-certificados-grid
            className="grid auto-rows-fr grid-cols-1 gap-3 @[620px]:grid-cols-2 @[900px]:grid-cols-3"
          >
            {paginaAtual.itens.map((certificado, indice) => (
              <motion.div
                key={certificado.id}
                custom={Math.min(indice, MAX_ENTRADA_INDEX)}
                variants={linhaEntradaHubVariants}
                initial="hidden"
                animate="visible"
                className="min-w-0 origin-center h-full"
              >
                <CertificadoCard certificado={certificado} onVisualizar={setDetalhe} />
              </motion.div>
            ))}
          </div>
        </EntradaPresenca>
      )}

      {!erro && !carregando && filtrados.length > 0 && (
        <div className="border-t border-border/40 pt-2.5">
          <AppPagination
            page={paginaAtual.pagina}
            total={paginaAtual.total}
            pageSize={porPagina}
            pageSizeOptions={CERTIFICADOS_OPCOES_POR_PAGINA}
            onPageChange={setPagina}
            onPageSizeChange={(valor) => {
              setPorPagina(valor);
              setPagina(1);
            }}
            selectorPosition="end"
            linhasPorPaginaLabel="Itens por página"
            label={
              <>
                Mostrando <span className="font-semibold text-foreground">{paginaAtual.inicio}</span>–
                <span className="font-semibold text-foreground">{paginaAtual.fim}</span> de{' '}
                <span className="font-semibold text-foreground">{paginaAtual.total}</span>{' '}
                {paginaAtual.total === 1 ? 'certificado' : 'certificados'}
              </>
            }
          />
        </div>
      )}

      <CertificadoDetalheDialog
        certificado={detalhe}
        onOpenChange={(aberto) => {
          if (!aberto) setDetalhe(null);
        }}
      />
    </div>
  );
}
