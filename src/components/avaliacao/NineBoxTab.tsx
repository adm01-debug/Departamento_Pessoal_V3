import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Minus, Users } from 'lucide-react';
import { EntradaPresenca } from './entradaCards';
import { NineBoxFiltros } from './NineBoxFiltros';
import { NineBoxFocoBanner } from './NineBoxFocoBanner';
import { NineBoxKpis, type IndicadorNineBox } from './NineBoxKpis';
import { NineBoxLateral } from './NineBoxLateral';
import { NineBoxMatriz } from './NineBoxMatriz';
import { NineBoxQuadranteDialog } from './NineBoxQuadranteDialog';
// ⚠️ TEMPORÁRIO — mock visual do Nine-Box. Remover este import junto com o
// bloco marcado no corpo do componente e com `nineBoxMock.ts`.
import { aplicarMockNineBox, MOCK_NINEBOX_COMPARAR_INICIAL } from './nineBoxMock';
import {
  cargosDisponiveis,
  contarQuadrantes,
  correspondeBusca,
  departamentosDisponiveis,
  derivarPontos,
  lerAtencao,
  lerInsightsEstruturados,
  lerMovimento,
  pontosDoQuadrante,
  pontosEmAtencao,
  rankingPontos,
  type ColaboradorNineBox,
  type QuadranteKey,
} from './nineBoxComum';

/**
 * ============================================================================
 * ABA "NINE-BOX" — composição completa da tela.
 *
 * Ordem visual (a da referência): (A) quatro KPI Cards → (B) banner "Foco agora"
 * → (C) busca e filtros → (D) matriz 3×3 (≈72%) + coluna lateral com os três
 * widgets estratégicos (≈28%).
 *
 * FONTE DOS DADOS: só as listas que `AvaliacaoPage` já carregava — `feedbacks`
 * (com `nota_geral`, `potencial` e `ciclo_id`), `ciclos`, `colaboradores`
 * (cargo/departamento/foto) e `pdis` (relação real por `colaborador_id`).
 * Nenhuma consulta nova, nenhuma escrita, nenhum parâmetro de banco tocado.
 *
 * A regra de classificação e as decisões de integridade estão documentadas em
 * `nineBoxComum.ts`:
 *   • potencial ausente NÃO é presumido (o item sai da matriz);
 *   • um colaborador aparece UMA vez por ciclo (registro mais recente);
 *   • movimentação só existe com as duas notas nos dois ciclos.
 *
 * ENTRADA: `EntradaPresenca` + a cascata `entradaCard(i)` dos KPI Cards do
 * Dashboard Executivo — KPIs (0–3), banner (4), filtros (5), matriz (6),
 * widgets (7–9). Nenhuma animação global foi alterada.
 * ============================================================================
 */

interface NineBoxTabProps {
  /** Feedbacks da empresa (mesma lista que a página já carregava). */
  feedbacks: any[];
  /** Ciclos cadastrados (opções do seletor "Visão atual" + ciclo anterior). */
  ciclos?: any[];
  /** Ciclo em foco (o mesmo selecionado na página). `''` = todos. */
  cicloId?: string;
  onCicloId?: (cicloId: string) => void;
  /** Colaboradores já carregados pela página (cargo/departamento/foto). */
  colaboradores?: ColaboradorNineBox[];
  /** PDIs já carregados pela página (relação real por `colaborador_id`). */
  pdis?: any[];
}

export function NineBoxTab({
  feedbacks,
  ciclos = [],
  cicloId = '',
  onCicloId,
  colaboradores = [],
  pdis = [],
}: NineBoxTabProps) {
  const [busca, setBusca] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [cargo, setCargo] = useState('');
  const [comPdi, setComPdi] = useState(false);
  const [emAtencao, setEmAtencao] = useState(false);
  const [comparar, setComparar] = useState(MOCK_NINEBOX_COMPARAR_INICIAL);
  // "QUAL quadrante" e "ESTÁ aberto" são estados separados — o MESMO padrão do
  // `PdiTab` (`detalhe`/`detalheAberto`). O diálogo precisa continuar com o
  // quadrante em mãos enquanto a animação de FECHAMENTO roda: se ele voltasse a
  // `null` no clique de fechar, a janela seria desmontada no primeiro frame e
  // sairia sem animação (é o `aberto` que dispara o `exit` do `AnimatePresence`).
  const [quadranteAtivo, setQuadranteAtivo] = useState<QuadranteKey | null>(null);
  const [quadranteAberto, setQuadranteAberto] = useState(false);

  /* ⚠️ TEMPORÁRIO — MOCK VISUAL DO NINE-BOX (ver `nineBoxMock.ts`) ⚠️
     Injeta colaboradores e feedbacks fictícios SÓ nesta aba, depois de receber
     as listas reais da página. Não altera banco, serviço nem as outras abas.
     PARA REMOVER: apague este bloco, o import marcado no topo e o arquivo
     `nineBoxMock.ts`. */
  const {
    feedbacks: feedbacksBase,
    colaboradores: colaboradoresBase,
    pdis: pdisBase,
  } = aplicarMockNineBox({
    feedbacks,
    colaboradores,
    pdis,
  });
  /* ⚠️ FIM DO BLOCO TEMPORÁRIO ⚠️ */

  /** Ciclos em ordem cronológica: o anterior sai daqui, sem inventar data. */
  const ciclosOrdenados = useMemo(
    () =>
      [...ciclos]
        .map((c: any) => ({
          id: String(c?.id ?? ''),
          nome: String(c?.nome ?? 'Ciclo'),
          inicio: String(c?.data_inicio ?? ''),
        }))
        .filter((c) => c.id)
        .sort((a, b) => a.inicio.localeCompare(b.inicio)),
    [ciclos]
  );

  /** Pessoas do ciclo em foco — uma por colaborador (ver `nineBoxComum`). */
  const pontos = useMemo(
    () =>
      derivarPontos({
        feedbacks: feedbacksBase,
        cicloId: cicloId || null,
        colaboradores: colaboradoresBase,
        pdis: pdisBase,
      }),
    [feedbacksBase, cicloId, colaboradoresBase, pdisBase]
  );

  /** Pessoas do ciclo ANTERIOR (base do comparativo). */
  const pontosAnteriores = useMemo(() => {
    const i = ciclosOrdenados.findIndex((c) => c.id === cicloId);
    const anterior = i > 0 ? ciclosOrdenados[i - 1] : null;
    if (!anterior) return [];
    return derivarPontos({
      feedbacks: feedbacksBase,
      cicloId: anterior.id,
      colaboradores: colaboradoresBase,
      pdis: pdisBase,
    });
  }, [ciclosOrdenados, cicloId, feedbacksBase, colaboradoresBase, pdisBase]);

  /** Recorte dos filtros (a matriz e os widgets olham este conjunto). */
  const filtrados = useMemo(() => {
    const atencaoIds = new Set(pontosEmAtencao(pontos).map((p) => p.id));
    return pontos.filter((p) => {
      if (departamento && p.departamento !== departamento) return false;
      if (cargo && p.cargo !== cargo) return false;
      if (comPdi && !p.temPdi) return false;
      if (emAtencao && !atencaoIds.has(p.id)) return false;
      return correspondeBusca(p, busca);
    });
  }, [pontos, departamento, cargo, comPdi, emAtencao, busca]);

  const contagens = useMemo(() => contarQuadrantes(filtrados), [filtrados]);
  const ranking = useMemo(() => rankingPontos(filtrados), [filtrados]);
  const movimento = useMemo(() => lerMovimento(pontos, pontosAnteriores), [pontos, pontosAnteriores]);

  /** Atenção e insights olham o CICLO INTEIRO (o banner não é um filtro). */
  const atencao = useMemo(() => lerAtencao(pontos), [pontos]);
  const insights = useMemo(
    () => lerInsightsEstruturados(contagens, atencao, movimento),
    [contagens, atencao, movimento]
  );

  const departamentos = useMemo(() => departamentosDisponiveis(pontos), [pontos]);
  const cargos = useMemo(() => cargosDisponiveis(pontos), [pontos]);

  const classificados = filtrados.filter((p) => p.quadrante !== null).length;
  const pctDoCiclo = filtrados.length > 0 ? Math.round((classificados / filtrados.length) * 100) : 0;
  const pctComparaveis = (n: number) =>
    movimento.comparaveis > 0
      ? `${Math.round((n / movimento.comparaveis) * 100)}% dos comparáveis`
      : 'Sem histórico comparável';

  /** Comparativo só aparece ligado; desligado, os KPIs ficam indisponíveis. */
  const comparativoAtivo = comparar && movimento.comparaveis > 0;

  const indicadores: IndicadorNineBox[] = [
    {
      id: 'avaliados',
      rotulo: 'Colaboradores avaliados',
      valor: classificados,
      contexto: `${pctDoCiclo}% do ciclo`,
      icone: Users,
      tom: 'bg-info/15 text-info',
    },
    {
      id: 'evoluíram',
      rotulo: 'Evoluíram',
      valor: comparativoAtivo ? movimento.evoluiram : null,
      contexto: comparativoAtivo ? pctComparaveis(movimento.evoluiram) : 'Sem histórico comparável',
      icone: ArrowUpRight,
      tom: 'bg-success/15 text-success',
    },
    {
      id: 'permaneceram',
      rotulo: 'Permaneceram',
      valor: comparativoAtivo ? movimento.permaneceram : null,
      contexto: comparativoAtivo ? pctComparaveis(movimento.permaneceram) : 'Sem histórico comparável',
      icone: Minus,
      tom: 'bg-info/15 text-info',
    },
    {
      id: 'regrediram',
      rotulo: 'Regrediram',
      valor: comparativoAtivo ? movimento.regrediram : null,
      contexto: comparativoAtivo ? pctComparaveis(movimento.regrediram) : 'Sem histórico comparável',
      icone: ArrowDownRight,
      tom: 'bg-destructive-vivid/15 text-destructive-vivid',
    },
  ];

  const filtrosAtivos = [departamento !== '', cargo !== '', comPdi, emAtencao].filter(Boolean).length;

  const limparFiltros = () => {
    setBusca('');
    setDepartamento('');
    setCargo('');
    setComPdi(false);
    setEmAtencao(false);
  };

  /** Abre a lista de um quadrante — destino do clique no card da matriz. */
  const abrirQuadrante = (chave: QuadranteKey) => {
    setQuadranteAtivo(chave);
    setQuadranteAberto(true);
  };

  return (
    <EntradaPresenca>
      <div className="space-y-3">
        {/* A · Quatro KPIs (mesma cascata dos KPI Cards do Dashboard). */}
        <NineBoxKpis indicadores={indicadores} indiceBase={0} />

        {/* B · Banner de atenção (só existe com gente em atenção de verdade). */}
        <NineBoxFocoBanner
          indice={4}
          total={atencao.total}
          emRisco={atencao.emRisco}
          semPdi={atencao.semPdi}
          semClassificacao={atencao.semClassificacao}
          ativo={emAtencao}
          onVerDetalhes={() => setEmAtencao((v) => !v)}
        />

        {/* C · Busca + filtros + comparativo + ciclo em visão. */}
        <NineBoxFiltros
          indice={5}
          busca={busca}
          onBusca={setBusca}
          departamento={departamento}
          onDepartamento={setDepartamento}
          departamentos={departamentos}
          cargo={cargo}
          onCargo={setCargo}
          cargos={cargos}
          comPdi={comPdi}
          onComPdi={setComPdi}
          emAtencao={emAtencao}
          onEmAtencao={setEmAtencao}
          comparar={comparar}
          onComparar={setComparar}
          ciclos={ciclosOrdenados}
          cicloId={cicloId}
          onCicloId={(id) => onCicloId?.(id)}
          filtrosAtivos={filtrosAtivos}
          onLimpar={limparFiltros}
        />

        {/* D · Matriz (≈72%) + coluna lateral (≈28%). */}
        {/* As duas colunas começam alinhadas pelo TOPO e terminam na ALTURA
            NATURAL do próprio conteúdo (`items-start`): a matriz NÃO é esticada
            para acompanhar a sidebar — era isso que criava o vazio abaixo do
            eixo Desempenho. */}
        <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,72fr)_minmax(0,28fr)]">
          <NineBoxMatriz
            indice={6}
            porQuadrante={(chave) => pontosDoQuadrante(filtrados, chave)}
            onAbrirQuadrante={abrirQuadrante}
          />
          <NineBoxLateral indice={7} ranking={ranking} insights={insights} />
        </div>

        <NineBoxQuadranteDialog
          chave={quadranteAtivo}
          aberto={quadranteAberto}
          onOpenChange={setQuadranteAberto}
          pessoas={quadranteAtivo ? pontosDoQuadrante(filtrados, quadranteAtivo) : []}
        />
      </div>
    </EntradaPresenca>
  );
}
