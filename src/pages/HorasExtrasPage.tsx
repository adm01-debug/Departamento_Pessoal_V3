/**
 * ============================================================================
 * SOLICITAÇÕES DE HORAS EXTRAS — página (composição).
 *
 * ESTRUTURA (de cima para baixo, na ordem da referência aprovada):
 *   1. Cabeçalho compacto (`CabecalhoSolicitacoes`: ícone + título + subtítulo
 *      + "Nova solicitação" na mesma faixa);
 *   2. Os QUATRO indicadores (`HorasExtrasKpis`) — pendentes, horas
 *      aprovadas, total e TAXA DE APROVAÇÃO — em quatro cards independentes e
 *      uniformes (nenhum deles é filtro);
 *   3. Aprovações pendentes (`AprovacoesPendentes`) — a fila de decisão em
 *      cartões compactos, com o FILTRO DE PERÍODO no cabeçalho da seção;
 *   4. Histórico de solicitações (`HistoricoSolicitacoes`) — um único
 *      container com cabeçalho, filtros, tabela e paginação.
 *
 * O `PageLayout` continua envolvendo a página (largura, respiro e animação de
 * entrada), mas SEM `title`/`description`/`actions`: nesta tela eles foram
 * substituídos pelo cabeçalho compacto acima. O `PageLayout` em si NÃO foi
 * alterado — vale para todas as outras páginas.
 *
 * ENTRADA (UMA fila única — a MESMA do Dashboard Executivo, sem números aqui):
 *   cabeçalho da página ....... fila simples, slot 0
 *   `HorasExtrasKpis` ........ banda de KPI (`entradaKpiGlobal`): 0, 1, 3, 5
 *   `AprovacoesPendentes` .... banda de CONTEÚDO (`entradaConteudoGlobal`):
 *                              cabeçalho da seção no slot 0 (junto do 1º KPI)
 *                              e cartões em 2, 4, 7, 8…
 *   `HistoricoSolicitacoes` .. fecha a banda de conteúdo, no slot seguinte ao
 *                              último cartão da fila (por isso o `index` dele é
 *                              `LIMITE_CARTOES + 1`, e não um número solto).
 * Os dois lados do zíper se encaixam: os cards de conteúdo preenchem os vãos
 * entre os KPI Cards, nenhum bloco espera a faixa de cima terminar e nenhum
 * slot é dividido por dois blocos visíveis ao mesmo tempo. Os números (14 px,
 * 520 ms, 120 ms, `ease-out`) vêm de `components/ui/entradaGlobal.ts` — esta
 * página só escolhe a POSIÇÃO de cada faixa.
 *
 * DIVISÃO DE RESPONSABILIDADES (nada de lógica duplicada):
 *   - DADOS e ESCRITAS: `useHorasExtras` (React Query) → `horaExtraService`
 *     (Supabase). A página só COMPÕE: nenhuma chamada de rede nasce aqui.
 *   - DERIVAÇÕES (recorte de período e somas): `horasExtrasComum`.
 *   - FILTROS DA LISTA: dentro de `HistoricoSolicitacoes`.
 *   - O período é estado DESTA página porque alimenta a faixa de indicadores,
 *     a fila de aprovação e o histórico ao mesmo tempo.
 *
 * Nenhum campo, ação, filtro ou salvamento da versão anterior foi removido:
 * criar, aprovar, rejeitar, excluir e a leitura completa continuam
 * disponíveis; o período abre em "Todo o período", então a tela não esconde
 * nada por padrão.
 * ============================================================================
 */
import { useMemo, useState } from 'react';
import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { useHorasExtras } from '@/hooks/useHorasExtras';
import { useColaboradores } from '@/hooks/useColaboradores';
import { AprovacoesPendentes, LIMITE_CARTOES } from '@/components/horas-extras/AprovacoesPendentes';
import { CabecalhoSolicitacoes } from '@/components/horas-extras/CabecalhoSolicitacoes';
import { HistoricoSolicitacoes } from '@/components/horas-extras/HistoricoSolicitacoes';
import { HorasExtrasKpis } from '@/components/horas-extras/HorasExtrasKpis';
import { NovaSolicitacaoDialog, type NovaSolicitacaoDados } from '@/components/horas-extras/NovaSolicitacaoDialog';
import { SolicitacaoDetalhesDialog } from '@/components/horas-extras/SolicitacaoDetalhesDialog';
import {
  recortarPorPeriodo,
  resumoDecisoes,
  somarHoras,
  statusDe,
  type PeriodoId,
  type SolicitacaoHoraExtra,
} from '@/components/horas-extras/horasExtrasComum';

export default function HorasExtrasPage() {
  const { solicitacoes, isLoading, criar, aprovar, rejeitar, excluir } = useHorasExtras();
  const { colaboradores } = useColaboradores();

  /** Recorte de período da faixa de indicadores, da fila e do histórico. */
  const [periodo, setPeriodo] = useState<PeriodoId>('todos');
  const [novaAberta, setNovaAberta] = useState(false);
  const [detalhe, setDetalhe] = useState<SolicitacaoHoraExtra | null>(null);

  // A consulta devolve `any[]`; o cast é o mesmo contrato que a tabela antiga
  // já usava (`s.colaborador.nome_completo`, `s.horas_solicitadas`...).
  const registros = useMemo(() => (solicitacoes ?? []) as SolicitacaoHoraExtra[], [solicitacoes]);

  const doPeriodo = useMemo(() => recortarPorPeriodo(registros, periodo), [registros, periodo]);
  const pendentes = useMemo(() => doPeriodo.filter((s) => statusDe(s.status) === 'pendente'), [doPeriodo]);
  const aprovadas = useMemo(() => doPeriodo.filter((s) => statusDe(s.status) === 'aprovada'), [doPeriodo]);
  const horasPendentes = useMemo(() => somarHoras(pendentes), [pendentes]);
  const horasAprovadas = useMemo(() => somarHoras(aprovadas), [aprovadas]);
  // Base do KPI "Taxa de aprovação": só aprovadas + rejeitadas entram no
  // denominador (pendente é fila, não decisão). Sai de `horasExtrasComum` para
  // que tela e teste leiam a MESMA regra.
  const decisoes = useMemo(() => resumoDecisoes(doPeriodo), [doPeriodo]);

  /**
   * Quantos blocos a fila de aprovação exibe de fato (o mesmo recorte de
   * apresentação de `AprovacoesPendentes`, `LIMITE_CARTOES`). Serve só para
   * posicionar o histórico na fila de entrada da página: ele entra DEPOIS do
   * último cartão, nunca no mesmo slot. `Math.max(1, …)` cobre a fila vazia —
   * ali o card de estado vazio ocupa a primeira posição.
   */
  const cartoesNaFila = Math.max(1, Math.min(pendentes.length, LIMITE_CARTOES));

  /**
   * Escritas: sempre pelo hook (mutateAsync). O `try/catch` vazio não engole o
   * erro em silêncio — o `onError` do hook já publica o toast com
   * `safeErrorMessage`; aqui só evitamos a rejeição solta no handler do clique.
   */
  const criarSolicitacao = async (dados: NovaSolicitacaoDados) => {
    await criar(dados);
  };

  const aprovarSolicitacao = async (s: SolicitacaoHoraExtra) => {
    try {
      await aprovar({ id: s.id });
      setDetalhe(null);
    } catch {
      /* toast no hook */
    }
  };

  const rejeitarSolicitacao = async (s: SolicitacaoHoraExtra) => {
    try {
      await rejeitar({ id: s.id });
      setDetalhe(null);
    } catch {
      /* toast no hook */
    }
  };

  const excluirSolicitacao = async (s: SolicitacaoHoraExtra) => {
    try {
      await excluir(s.id);
      setDetalhe(null);
    } catch {
      /* toast no hook */
    }
  };

  const abrirDetalhes = (s: SolicitacaoHoraExtra) => setDetalhe(s);

  return (
    <>
      <PageTitle title="Horas Extras" description="Controle de horas extras" />

      {/* Respiro vertical entre as faixas (px de CLASSE × 1,25 = px renderizados
          pela base rem de 20 px do Design System):
            cabeçalho → KPIs ......................... 16 px → 20 px
            KPIs → aprovações / → histórico .......... 16 + 3 px → ~24 px
          O vão é do container (`gap`); os 3 px extras das duas seções de baixo
          moram dentro delas (`pt-[3px]`), porque `space-y-*` do `PageLayout`
          venceria qualquer margem aplicada nos filhos. */}
      <PageLayout className="flex w-full flex-col gap-[16px] space-y-0">
        <CabecalhoSolicitacoes onNova={() => setNovaAberta(true)} index={0} />

        <HorasExtrasKpis
          pendentes={pendentes.length}
          horasPendentes={horasPendentes}
          aprovadas={decisoes.aprovadas}
          horasAprovadas={horasAprovadas}
          total={doPeriodo.length}
          decisoes={decisoes}
          index={0}
        />

        <AprovacoesPendentes
          solicitacoes={pendentes}
          periodo={periodo}
          onPeriodoChange={setPeriodo}
          onVerDetalhes={abrirDetalhes}
          onAprovar={aprovarSolicitacao}
          onRejeitar={rejeitarSolicitacao}
          index={0}
        />

        <HistoricoSolicitacoes
          solicitacoes={doPeriodo}
          isLoading={isLoading}
          onVerDetalhes={abrirDetalhes}
          // A linha da tabela NÃO recebe aprovar/rejeitar: a coluna AÇÕES é
          // sempre o mesmo par [ 👁 ] [ 🗑 ]. A decisão mora nos cartões da fila
          // acima e no diálogo "Ver detalhes" (que o olho abre) — o mesmo
          // `SolicitacaoDetalhesDialog` abaixo, alimentado por estes handlers.
          onExcluir={excluirSolicitacao}
          onNova={() => setNovaAberta(true)}
          index={cartoesNaFila + 1}
        />

        <NovaSolicitacaoDialog
          open={novaAberta}
          onOpenChange={setNovaAberta}
          colaboradores={colaboradores}
          onCriar={criarSolicitacao}
        />

        <SolicitacaoDetalhesDialog
          solicitacao={detalhe}
          open={detalhe !== null}
          onOpenChange={(aberto) => {
            if (!aberto) setDetalhe(null);
          }}
          onAprovar={aprovarSolicitacao}
          onRejeitar={rejeitarSolicitacao}
        />
      </PageLayout>
    </>
  );
}
