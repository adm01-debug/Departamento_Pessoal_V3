/**
 * ============================================================================
 * INDICADORES DO BANCO DE HORAS — UM CARD PROTAGONISTA + QUATRO SECUNDÁRIOS.
 *
 *   ┌───────────────────────────┐ ┌──────────────┐ ┌──────────────┐
 *   │ (⚖)  Saldo total da equipe│ │ (≡) Moviment.│ │ (↑) Créditos │
 *   │      +14h15               │ │     24       │ │     32h30    │
 *   │      32h30 créditos · …   │ │  —  vs. ant. │ │  —  vs. ant. │
 *   │      ↑ +12% vs. anterior  │ └──────────────┘ └──────────────┘
 *   └───────────────────────────┘ ┌──────────────┐ ┌──────────────┐
 *                                 │ (↓) Débitos  │ │ (⚠) Colab. 3 │
 *                                 │     18h15    │ │ 5h00 a comp. │
 *                                 └──────────────┘ └──────────────┘
 *
 * A referência de organização interna (imagem 5 — Hub de Treinamentos) é uma
 * LINHA: bloco do ícone à esquerda, coluna de leitura à direita com título,
 * valor e leitura auxiliar, tudo alinhado ao centro vertical. É essa anatomia
 * que este arquivo reproduz — e é ela que elimina as faixas vazias que os
 * cards tinham quando o ícone ficava acima do título e o rodapé era empurrado
 * para a base com `mt-auto` (o card media 197 px de altura útil para ~150 px de
 * conteúdo). Sem o `mt-auto`, a altura passa a ser conteúdo + padding.
 *
 * A proporção entre os cinco vive no `GRADE` (1,7fr + 3×1fr + 1,3fr): o
 * protagonista continua sendo o card largo, e o card de negativos — o único com
 * rótulo de duas linhas — recebe a folga que precisa para não truncar o título.
 * A partir de 1480 px os cinco dividem UMA linha; abaixo disso a faixa vira
 * grade de duas colunas (mesma altura compacta, nenhuma rolagem horizontal).
 *
 * ── O QUE CADA CARD MEDE (nada mudou de significado) ────────────────────────
 * Protagonista: saldo do PERÍODO (créditos − débitos), com os dois totais e a
 * variação contra o período anterior — `compararPeriodos()` em
 * `bancoHorasComum.ts`, a única fonte desses percentuais.
 * Secundários: movimentações, créditos e débitos do período e a FOTO de quem
 * está no vermelho (`situacao`, que não muda com o filtro de datas).
 * A foto do saldo atual de cada colaborador continua na rosca da coluna
 * direita ("Saldo atual somado") e no alerta — nenhum número se perdeu.
 *
 * ── SEM MINIGRÁFICOS (decisão de produto) ───────────────────────────────────
 * Os cards secundários NÃO desenham as micro-barras dos últimos dias: a tira
 * fica só com número + leitura auxiliar, o mesmo desenho seco dos KPI Cards do
 * Hub de Treinamentos. Os números NÃO mudaram: saem de
 * `resumirHoras`/`compararPeriodos`, exatamente como antes. As micro-séries
 * seguem disponíveis em `bancoHorasComum.miniBarras` (testadas), simplesmente
 * não são mais consumidas por esta tira.
 * ============================================================================
 */
import type { ReactNode } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  Scale,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EntradaPresenca, MotionCard } from '@/components/ui/entrada-cards';
import { entradaKpiGlobal, propsEntradaGlobal } from '@/components/ui/entradaGlobal';
import { cn } from '@/lib/utils';
import {
  formatarHorasBanco,
  type ComparativoPeriodo,
  type ResumoHoras,
  type SituacaoSaldos,
  type VariacaoMetrica,
} from './bancoHorasComum';

export interface BancoHorasKpisProps {
  /** Recorte de MOVIMENTO do período escolhido no extrato. */
  resumo: ResumoHoras;
  /** Recorte de FOTO (saldo atual de cada colaborador). */
  situacao: SituacaoSaldos;
  /** Existe período selecionado? (muda o texto auxiliar dos cards) */
  periodoAtivo: boolean;
  /** Comparativo com a janela anterior de mesmo tamanho. */
  comparativo: ComparativoPeriodo;
  /** Abre a janela com a lista de quem está no vermelho (5º card). */
  onVerSaldosNegativos?: () => void;
  /** Posição da faixa na BANDA de KPI Cards (fila intercalada do sistema). */
  index?: number;
}

/**
 * Proporção da faixa: o protagonista leva ~28% da largura e divide a linha com
 * os quatro secundários. `minmax(0,…)` impede que um nome comprido force a
 * coluna a crescer e gere rolagem horizontal.
 *
 * UMA LINHA SÓ A PARTIR DE 1480 px — e o motivo é medido, não estético: com
 * ícone à esquerda cada card perde ~52 px de largura útil, e abaixo disso
 * "Movimentações" (uma palavra só, que não quebra linha) e a legenda do
 * comparativo sairiam com reticências. Entre 1100 e 1479 px a faixa vira grade
 * de TRÊS colunas (o protagonista ocupa duas, então as duas linhas fecham sem
 * célula vazia); abaixo de 1100 px, duas colunas; no celular, uma. Em todas as
 * faixas a altura é a mesma (`auto-rows-fr`) e não há rolagem horizontal.
 */
const GRADE =
  'grid auto-rows-fr grid-cols-1 gap-[12px] min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3 min-[1480px]:grid-cols-[minmax(0,1.38fr)_repeat(3,minmax(0,1fr))_minmax(0,1.07fr)]';

/**
 * ── ANATOMIA DE UM KPI CARD (a mesma do Hub de Treinamentos) ────────────────
 * `Card` → linha flex centralizada: bloco do ÍCONE à esquerda, coluna de
 * leitura à direita (título → valor → leitura auxiliar). Sem `mt-auto`, sem
 * `flex-1` e sem quinta faixa: a altura do card passa a ser o conteúdo + o
 * padding (121 px renderizados — eram 197 px na faixa anterior).
 */
const CARTAO = 'min-w-0 overflow-hidden rounded-[11px] border-border/50 bg-card';
const LINHA_CARTAO = 'flex items-center gap-[10px] border p-[13px]';
const COLUNA_TEXTO = 'flex min-w-0 flex-1 flex-col items-start gap-[3px]';
const BLOCO_ICONE = 'grid h-[32px] w-[32px] shrink-0 place-items-center rounded-[10px]';
const ICONE = 'h-[15px] w-[15px]';
/**
 * Título dos secundários: DUAS linhas reservadas em todos (`min-h`), então o
 * valor e o rodapé dos quatro cards caem exatamente na mesma linha — o de
 * negativos usa as duas linhas, os de uma palavra só deixam a segunda livre.
 */
const TITULO_CARTAO =
  'line-clamp-2 min-h-[23px] w-full text-[10px] font-medium leading-[1.15] text-muted-foreground';
const VALOR_CARTAO =
  'min-w-0 max-w-full truncate text-[20px] font-semibold leading-none tabular-nums text-foreground';

/** `+14h15` para crédito e `-3h45` para débito (o formatador segue o do sistema). */
function horasComSinalTexto(horas: number): string {
  const texto = formatarHorasBanco(horas);
  return horas > 0 ? `+${texto}` : texto;
}

/** `1 colaborador` / `N colaboradores`. */
function pluralColaboradores(quantidade: number): string {
  return quantidade === 1 ? '1 colaborador' : `${quantidade} colaboradores`;
}

/** `1 lançamento` / `N lançamentos`. */
function pluralLancamentos(quantidade: number): string {
  return quantidade === 1 ? '1 lançamento' : `${quantidade} lançamentos`;
}

/**
 * Selo compacto de variação ("↑ +12%").
 *
 * `inverso` existe para os DÉBITOS: subir o débito é notícia ruim, então o
 * mesmo `+5%` que fica verde em créditos fica vermelho ali. A cor nunca é
 * escolhida pelo card no olho — ela sai da direção real da métrica.
 */
function SeloVariacao({
  variacao,
  inverso = false,
  className,
}: {
  variacao: VariacaoMetrica;
  inverso?: boolean;
  className?: string;
}) {
  if (variacao.percentual === null) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full bg-muted/50 px-[5px] py-[1px] text-[9.5px] font-semibold leading-none text-muted-foreground',
          className
        )}
      >
        —
      </span>
    );
  }

  const subiu = variacao.percentual > 0;
  const neutro = variacao.percentual === 0;
  const favoravel = inverso ? !subiu : subiu;
  const Icone = subiu ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-[2px] rounded-full px-[5px] py-[1px] text-[9.5px] font-semibold leading-none tabular-nums',
        neutro
          ? 'bg-muted/50 text-muted-foreground'
          : favoravel
            ? 'bg-success/12 text-success'
            : 'bg-destructive/12 text-destructive',
        className
      )}
    >
      {!neutro && <Icone className="h-[10px] w-[10px] shrink-0" aria-hidden />}
      {variacao.rotulo}
    </span>
  );
}

/** Rodapé padrão de um card secundário: selo de variação + janela comparada. */
function RodapeVariacao({
  variacao,
  inverso,
  rotuloJanela,
}: {
  variacao: VariacaoMetrica;
  inverso?: boolean;
  rotuloJanela: string;
}) {
  return (
    <div className="flex w-full min-w-0 items-center gap-[3px]">
      <SeloVariacao variacao={variacao} inverso={inverso} />
      <span
        className="min-w-0 truncate text-[9px] leading-none text-muted-foreground/80"
        title={rotuloJanela}
      >
        {rotuloJanela}
      </span>
    </div>
  );
}

interface CartaoSecundarioProps {
  index: number;
  icone: LucideIcon;
  tom: string;
  rotulo: string;
  valor: string;
  rodape: ReactNode;
  /** Ação opcional na MESMA linha do valor (não cria uma quarta faixa). */
  acao?: ReactNode;
  destaque?: boolean;
}

/**
 * Card secundário — a anatomia da referência (Hub de Treinamentos), sem o
 * minigráfico:
 *
 *   ┌──────────────────────────────────┐
 *   │ [≡]  Movimentações               │  ← ícone 40 px à esquerda (centrado)
 *   │      24                          │  ← valor em destaque
 *   │      ↑ +20%  vs. anterior        │  ← leitura auxiliar
 *   └──────────────────────────────────┘
 *
 * O título reserva DUAS linhas (`min-h`) para que os quatro secundários alinhem
 * valor e rodapé mesmo quando um rótulo é mais comprido — e o card não guarda
 * espaço nenhum abaixo do rodapé: a altura é só conteúdo + padding.
 */
function CartaoSecundario({
  index,
  icone: Icone,
  tom,
  rotulo,
  valor,
  rodape,
  acao,
  destaque = false,
}: CartaoSecundarioProps) {
  return (
    <MotionCard
      {...propsEntradaGlobal(index, entradaKpiGlobal)}
      data-entrada="cascata"
      className={cn(CARTAO, LINHA_CARTAO, destaque ? 'border-warning/30' : 'border-border/50')}
    >
      <span className={cn(BLOCO_ICONE, tom)}>
        <Icone className={ICONE} aria-hidden />
      </span>

      <div className={COLUNA_TEXTO}>
        <p className={TITULO_CARTAO} title={rotulo}>
          {rotulo}
        </p>

        <div className="flex w-full min-w-0 items-center gap-[6px]">
          <p className={VALOR_CARTAO}>{valor}</p>
          {acao}
        </div>

        {rodape}
      </div>
    </MotionCard>
  );
}

export function BancoHorasKpis({
  resumo,
  situacao,
  periodoAtivo,
  comparativo,
  onVerSaldosNegativos,
  index = 0,
}: BancoHorasKpisProps) {
  const saldoPositivo = resumo.saldo >= 0;
  const semMovimento = resumo.registros === 0;

  const rotuloComparacao =
    comparativo.saldo.percentual === null
      ? 'sem base no período anterior'
      : periodoAtivo
        ? 'em relação ao período anterior'
        : 'em relação ao recorte anterior';

  const descricaoNegativos =
    situacao.negativos === 0
      ? 'Nenhum colaborador no vermelho'
      : `${formatarHorasBanco(situacao.horasNegativas)} a compensar`;

  return (
    <EntradaPresenca>
      <div className={GRADE}>
        {/* PROTAGONISTA — o único card com fundo tingido; valor em maior peso.
            Em 2 e 3 colunas ele ocupa a linha inteira (o grid fecha sem célula
            vazia); na faixa de 5, volta a ser uma coluna só. */}
        <MotionCard
          {...propsEntradaGlobal(index, entradaKpiGlobal)}
          data-entrada="cascata"
          className={cn(
            CARTAO,
            LINHA_CARTAO,
            'min-[640px]:col-span-2 min-[1480px]:col-span-1',
            saldoPositivo
              ? 'border-success/25 bg-gradient-to-br from-success/12 via-success/[0.04] to-transparent'
              : 'border-destructive/25 bg-gradient-to-br from-destructive/12 via-destructive/[0.04] to-transparent'
          )}
        >
          <span
            className={cn(
              BLOCO_ICONE,
              saldoPositivo ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
            )}
          >
            <Scale className={ICONE} aria-hidden />
          </span>

          <div className={COLUNA_TEXTO}>
            <p className="w-full truncate text-[11px] font-medium leading-tight text-muted-foreground">
              Saldo total da equipe
            </p>

            <p
              className={cn(
                'max-w-full truncate text-[23px] font-semibold leading-none tracking-tight tabular-nums',
                saldoPositivo ? 'text-foreground' : 'text-destructive'
              )}
            >
              {horasComSinalTexto(resumo.saldo)}
            </p>

            <p className="w-full truncate text-[10px] leading-tight text-muted-foreground">
              {semMovimento
                ? 'Sem movimentações no recorte'
                : `${formatarHorasBanco(resumo.creditos)} créditos · ${formatarHorasBanco(resumo.debitos)} débitos`}
            </p>

            <div className="flex w-full min-w-0 items-center gap-[6px]">
              <SeloVariacao variacao={comparativo.saldo} />
              <span
                className="min-w-0 truncate text-[9px] leading-none text-muted-foreground/80"
                title={rotuloComparacao}
              >
                {rotuloComparacao}
              </span>
            </div>
          </div>
        </MotionCard>

        {/* SECUNDÁRIOS — quatro cards de mesma anatomia e mesma altura. */}
        <CartaoSecundario
          index={index + 1}
          icone={ArrowLeftRight}
          tom="bg-primary/15 text-primary"
          rotulo="Movimentações"
          valor={String(resumo.registros)}
          rodape={
            <RodapeVariacao
              variacao={comparativo.movimentacoes}
              rotuloJanela={comparativo.rotuloJanela}
            />
          }
        />

        <CartaoSecundario
          index={index + 2}
          icone={TrendingUp}
          tom="bg-success/15 text-success"
          rotulo="Créditos"
          valor={formatarHorasBanco(resumo.creditos)}
          rodape={
            <RodapeVariacao variacao={comparativo.creditos} rotuloJanela={comparativo.rotuloJanela} />
          }
        />

        <CartaoSecundario
          index={index + 3}
          icone={TrendingDown}
          tom="bg-destructive/15 text-destructive"
          rotulo="Débitos"
          valor={formatarHorasBanco(resumo.debitos)}
          rodape={
            <RodapeVariacao
              variacao={comparativo.debitos}
              inverso
              rotuloJanela={comparativo.rotuloJanela}
            />
          }
        />

        <CartaoSecundario
          index={index + 4}
          icone={TriangleAlert}
          tom="bg-warning/15 text-warning"
          rotulo="Colaboradores com saldo negativo"
          valor={String(situacao.negativos)}
          destaque={situacao.negativos > 0}
          acao={
            /* "Ver lista" dividindo a linha do valor: o atalho continua ali sem
               criar uma quarta faixa (era ele que esticava este card). */
            <Button
              variant="outline"
              onClick={onVerSaldosNegativos}
              disabled={!onVerSaldosNegativos || situacao.negativos === 0}
              className="ml-auto h-[20px] shrink-0 justify-center gap-[4px] rounded-[6px] px-[7px] text-[9.5px] font-semibold"
            >
              Ver lista
              <ArrowRight className="h-[10px] w-[10px]" aria-hidden />
            </Button>
          }
          rodape={
            <span
              className="w-full truncate text-[9px] leading-none text-muted-foreground/80"
              title={`${pluralColaboradores(situacao.negativos)} · ${descricaoNegativos}`}
            >
              {descricaoNegativos}
            </span>
          }
        />
      </div>
    </EntradaPresenca>
  );
}