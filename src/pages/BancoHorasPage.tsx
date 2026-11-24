/**
 * ============================================================================
 * BANCO DE HORAS — página (composição).
 *
 * ESTRUTURA (de cima para baixo):
 *   1. Cabeçalho de UMA linha (`CabecalhoBancoHoras`): ícone + título +
 *      subtítulo à esquerda; seletor de período + "Mais filtros" + "Exportar"
 *      à direita;
 *   2. CINCO indicadores (`BancoHorasKpis`): o saldo da equipe em card
 *      protagonista (~35%) e quatro secundários (movimentações, créditos,
 *      débitos e colaboradores no vermelho), cada um com o selo de variação
 *      contra o período anterior;
 *   3. Duas colunas (72 / 28 em `xl`), alinhadas pelo TOPO e com alturas
 *      independentes:
 *        ESQUERDA — `ExtratoBancoHoras`: chips de tipo com contagem, busca e
 *                   ordenação ACIMA do card; dentro dele, tabela densa e
 *                   paginação de 8 em 8 logo após a última linha (o card mede o
 *                   que a página filtrada tem para mostrar);
 *        DIREITA  — quatro blocos de leitura: rosca da situação dos saldos,
 *                   barras de totais do recorte, alerta de saldos negativos e a
 *                   curva de evolução do saldo.
 *
 * ── UM RECORTE, VÁRIOS BLOCOS ───────────────────────────────────────────────
 * PERÍODO (De/Até) e FILTROS (busca/tipo) são estado DESTA página porque o
 * cabeçalho os edita e o mesmo recorte alimenta ao mesmo tempo os KPI Cards de
 * movimento, as barras de totais, a série de evolução, o extrato e o CSV
 * exportado. O botão "Mais filtros" acende o chip de saldos negativos e o chip
 * escreve no mesmo objeto — dois donos para o mesmo filtro seria bug na certa.
 * Paginação e ordenação continuam estado LOCAL do extrato (só dizem respeito
 * àquela tabela).
 *
 * Os DOIS conceitos de saldo continuam separados (ver `bancoHorasComum.ts`):
 *   • FOTO (`saldosPorColaborador` → `resumirSituacaoSaldos`): último
 *     `saldo_atual` de cada pessoa, em toda a base carregada. Alimenta o KPI do
 *     protagonista, o KPI de negativos, a rosca e o alerta — NÃO muda quando o
 *     usuário filtra uma semana.
 *   • PERÍODO (`recortarPorPeriodo` → `resumirHoras`/`evolucaoSaldo`): créditos
 *     menos débitos dentro do recorte. Alimenta os KPIs de movimento, as barras,
 *     a curva e o extrato.
 * O comparativo (`compararPeriodos`) usa a janela anterior de MESMO tamanho,
 * resolvida sobre a base inteira — é o que dá sentido ao "vs. período anterior".
 *
 * ── ENTRADA (uma fila única) ────────────────────────────────────────────────
 *   cabeçalho ................ fila simples (slot 0)
 *   `BancoHorasKpis` ......... banda de KPI (`entradaKpiGlobal`)
 *   conteúdo ................. banda de conteúdo (`entradaConteudoGlobal`):
 *                              extrato (0) → rosca (1) → barras (2) →
 *                              alerta (3) → evolução (4, ou 3 quando não há
 *                              ninguém no vermelho e o alerta não é desenhado)
 * Os números (14 px, 520 ms, 120 ms, `ease-out`) vêm de
 * `components/ui/entradaGlobal.ts`; esta página só escolhe a POSIÇÃO de cada
 * bloco.
 *
 * ── RESPONSABILIDADES ───────────────────────────────────────────────────────
 *   DADOS:      `bancoHorasService.listarDaEmpresa` via React Query (nenhuma
 *               chamada de rede nasce aqui).
 *   REGRAS:     `bancoHorasComum` (parsing de `interval`, recortes, somas e
 *               comparativo).
 *   EXPORTAÇÃO: `exportarBancoHoras` (CSV do recorte, com toast de retorno).
 * ============================================================================
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageTitle } from '@/components/PageTitle';
import { PageLayout } from '@/components/layout';
import { AlertaSaldoNegativoCard } from '@/components/banco-horas/AlertaSaldoNegativoCard';
import { BancoHorasKpis } from '@/components/banco-horas/BancoHorasKpis';
import { CabecalhoBancoHoras } from '@/components/banco-horas/CabecalhoBancoHoras';
import { EvolucaoSaldoCard } from '@/components/banco-horas/EvolucaoSaldoCard';
import { ExtratoBancoHoras } from '@/components/banco-horas/ExtratoBancoHoras';
import { SituacaoSaldosCard } from '@/components/banco-horas/SituacaoSaldosCard';
import { TotaisHorasCard } from '@/components/banco-horas/TotaisHorasCard';
import {
  FILTROS_EXTRATO_PADRAO,
  PERIODO_EXTRATO_PADRAO,
  compararPeriodos,
  evolucaoSaldo,
  recortarPorPeriodo,
  resumirHoras,
  resumirSituacaoSaldos,
  saldosPorColaborador,
  temPeriodoAtivo,
  type FiltrosExtrato,
  type PeriodoExtrato,
  type RegistroBancoHoras,
} from '@/components/banco-horas/bancoHorasComum';
import { exportarExtratoBancoHoras } from '@/components/banco-horas/exportarBancoHoras';
import { useEmpresas } from '@/hooks';
import { bancoHorasService } from '@/services/bancoHorasService';

/**
 * Colunas da área de trabalho: extrato largo + coluna de leitura estreita.
 * 2,6 / 3,6 ≈ 72% para o extrato — a tabela de 7 colunas precisa da largura, e a
 * coluna da direita é feita de números curtos (rosca, barras, nomes, curva).
 *
 * ── ALTURA: AS DUAS COLUNAS TERMINAM NA MESMA LINHA ─────────────────────────
 * `items-stretch` (padrão da grade, declarado para ficar explícito) é a regra:
 * a linha da grade tem a altura da coluna MAIS ALTA — a da direita, que empilha
 * quatro cards — e a esquerda é esticada até essa altura. Quem absorve a sobra
 * é o CARD DO EXTRATO (`flex-1`), e dentro dele a sobra fica ENTRE a última
 * linha e a paginação, que é ancorada na base (`mt-auto`): os registros continuam
 * agrupados no topo, logo abaixo do cabeçalho, e a borda inferior do extrato cai
 * exatamente na borda inferior do card "Evolução do saldo".
 *
 * A alternativa de `items-start` (cada coluna na altura do próprio conteúdo)
 * deixava um vazio de ~390 px ABAIXO do extrato no recorte "Negativos" — o
 * desalinhamento que esta grade existe para impedir. Esticar a TABELA em vez do
 * card também não serve: linhas de 79 px para preencher espaço.
 *
 * No empilhamento (< `xl`) cada coluna é uma linha própria da grade, então não
 * há altura igualada forçada entre elas.
 */
const GRADE_COLUNAS = 'grid min-w-0 grid-cols-1 items-stretch gap-[13px] xl:grid-cols-[minmax(0,2.6fr)_minmax(0,1fr)]';

/** Pilha da coluna da direita (11 px entre cards: leitura contínua, sem ar). */
const PILHA_LATERAL = 'flex min-w-0 flex-col gap-[11px]';

export default function BancoHorasPage() {
  const { empresaAtual } = useEmpresas();

  const { data: registros = [], isLoading } = useQuery<RegistroBancoHoras[]>({
    queryKey: ['banco_horas', empresaAtual?.id],
    queryFn: () => bancoHorasService.listarDaEmpresa(empresaAtual!.id),
    enabled: !!empresaAtual?.id,
  });

  // PERÍODO e FILTROS — estado da página (cabeçalho, KPIs, coluna direita, extrato e CSV).
  const [periodo, setPeriodo] = useState<PeriodoExtrato>(PERIODO_EXTRATO_PADRAO);
  const [filtros, setFiltros] = useState<FiltrosExtrato>(FILTROS_EXTRATO_PADRAO);
  const periodoAtivo = temPeriodoAtivo(periodo);

  const recorte = useMemo(() => recortarPorPeriodo(registros, periodo), [registros, periodo]);
  const resumo = useMemo(() => resumirHoras(recorte), [recorte]);

  // COMPARATIVO — janela anterior de mesmo tamanho, resolvida na base inteira.
  const comparativo = useMemo(() => compararPeriodos(registros, periodo), [registros, periodo]);

  // FOTO — toda a base carregada, independente do recorte de datas.
  const saldos = useMemo(() => saldosPorColaborador(registros), [registros]);
  const situacao = useMemo(() => resumirSituacaoSaldos(saldos), [saldos]);

  // SÉRIE do recorte (último ponto = "Saldo do período" dos KPI Cards).
  const pontosEvolucao = useMemo(() => evolucaoSaldo(recorte), [recorte]);

  const temNegativos = situacao.negativos > 0;

  /** "Limpar" do cabeçalho: zera período, busca e tipo de uma vez. */
  function limparFiltros() {
    setPeriodo(PERIODO_EXTRATO_PADRAO);
    setFiltros(FILTROS_EXTRATO_PADRAO);
  }

  /**
   * "Ver lista" do KPI de negativos: leva o usuário ao card de alerta, que traz
   * os nomes e o total em dívida. Sem negativos o botão já está desabilitado.
   */
  function irParaSaldosNegativos() {
    document.getElementById('banco-horas-alerta')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  return (
    <>
      <PageTitle title="Banco de Horas" description="Controle de banco de horas" />

      <PageLayout className="flex w-full flex-col gap-[12px] space-y-0">
        <CabecalhoBancoHoras
          periodo={periodo}
          onPeriodoChange={setPeriodo}
          filtros={filtros}
          onFiltrosChange={setFiltros}
          onLimparFiltros={limparFiltros}
          onExportar={() => exportarExtratoBancoHoras(recorte, periodo)}
          podeExportar={recorte.length > 0}
          index={0}
        />

        <BancoHorasKpis
          resumo={resumo}
          situacao={situacao}
          periodoAtivo={periodoAtivo}
          comparativo={comparativo}
          onVerSaldosNegativos={temNegativos ? irParaSaldosNegativos : undefined}
          index={0}
        />

        <div className={GRADE_COLUNAS}>
          <ExtratoBancoHoras
            registros={recorte}
            totalBase={registros.length}
            filtros={filtros}
            onFiltrosChange={setFiltros}
            isLoading={isLoading}
            index={0}
          />

          <div className={PILHA_LATERAL}>
            <SituacaoSaldosCard situacao={situacao} isLoading={isLoading} index={1} />
            <TotaisHorasCard resumo={resumo} periodoAtivo={periodoAtivo} index={2} />
            {/* O alerta devolve `null` quando ninguém está no vermelho — por isso
                a evolução recua um slot da fila nesse caso. */}
            <AlertaSaldoNegativoCard saldos={saldos} index={3} />
            <EvolucaoSaldoCard pontos={pontosEvolucao} index={temNegativos ? 4 : 3} />
          </div>
        </div>
      </PageLayout>
    </>
  );
}
