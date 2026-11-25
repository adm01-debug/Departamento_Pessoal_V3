/**
 * ============================================================================
 * TOOLTIP DOS GRÁFICOS (Recharts) — POSIÇÃO DIRETA, SEM DESLIZAMENTO.
 *
 * CAUSA RAIZ do "a tooltip aparece na lateral e depois voa até o mouse":
 * o Recharts posiciona a tooltip por `transform: translate(x, y)` no wrapper
 * `.recharts-tooltip-wrapper` e, com `isAnimationActive` (padrão `'auto'`),
 * injeta `transition: transform 400ms ease` nesse wrapper
 * (`node_modules/recharts/es6/component/TooltipBoundingBox.js`,
 * `resolveTransitionProperty`). Como a posição só é conhecida após a primeira
 * medição do conteúdo, o elemento nasce na origem/anterior e DESLIZA até o
 * ponto ativo — a cada troca de ponto, de novo.
 *
 * A correção NÃO é encurtar a animação: é não animar posição nenhuma.
 * `isAnimationActive={false}` remove a `transition` do `transform`, então o
 * Recharts aplica o `translate` final direto (com os limites do `viewBox`,
 * `offset` de 10px e o `reverseDirection` de sempre). O que sobra é só o fade
 * de opacidade da régua (`--transition-duration-tooltip`), aplicado ao bloco
 * de conteúdo que MONTA quando o ponto fica ativo — some/aparece no lugar
 * certo, sem translate, sem escala, sem bounce.
 *
 * Só isso é padronizado aqui. Cores, `offset`, `cursor`, formatadores, dados e
 * o conteúdo de cada tooltip continuam sendo de cada gráfico.
 * ============================================================================
 */
import type { ComponentType } from 'react';
import { Tooltip as RechartsTooltip, DefaultTooltipContent } from 'recharts';
import type { TooltipContentProps, TooltipProps } from 'recharts';
import { cn } from '@/lib/utils';

/** Classe da entrada (só opacidade). Ver `.tooltip-grafico-entrada` em `src/index.css`. */
export const CLASSE_ENTRADA_TOOLTIP = 'tooltip-grafico-entrada';

/**
 * `DefaultTooltipContent` é público no Recharts, mas tipado com as props
 * obrigatórias: aqui ele é reusado como componente que recebe tudo do Recharts
 * via `cloneElement`, então as props entram como opcionais.
 *
 * A referência é resolvida NO RENDER (e não no topo do módulo) de propósito:
 * assim este arquivo não depende da ordem de carregamento do pacote — em
 * testes que mockam o `recharts` com um subconjunto de exports, só quem
 * realmente exibe a tooltip precisa do conteúdo padrão.
 */
function ConteudoPadrao(props: Partial<TooltipContentProps>) {
  const Padrao = DefaultTooltipContent as unknown as ComponentType<Partial<TooltipContentProps>>;
  return <Padrao {...props} />;
}

/**
 * Conteúdo padrão do Recharts + fade da régua.
 *
 * Devolve `null` quando o ponto não está ativo: é isso que faz o bloco MONTAR
 * na aparição (e o fade rodar uma vez por aparição) em vez de reanimar a cada
 * ponto por onde o mouse passa.
 */
export function ConteudoTooltipGrafico(props: Partial<TooltipContentProps>) {
  if (!props.active || !props.payload?.length) return null;
  return (
    <div className={CLASSE_ENTRADA_TOOLTIP}>
      <ConteudoPadrao {...props} />
    </div>
  );
}

/** Item de `payload` que um conteúdo de rosca recebe do Recharts por fatia. */
export interface ItemTooltipRosca {
  name?: string | number;
  value?: string | number;
  /** Cor da fatia (o `fill` do `<Cell>`), repassada pelo Recharts. */
  color?: string;
}

export interface ConteudoTooltipRoscaProps {
  active?: boolean;
  payload?: ReadonlyArray<ItemTooltipRosca>;
  /** Formatação do valor (moeda, horas…). Padrão: número em `pt-BR`. */
  formatarValor?: (valor: number) => string;
}

/** Valor padrão do conteúdo de rosca: quantidade em `pt-BR`. */
function valorPadraoRosca(valor: number) {
  return valor.toLocaleString('pt-BR');
}

/**
 * ============================================================================
 * TOOLTIP DE ROSCA — o padrão do card "Composição do Passivo", COMPARTILHADO.
 *
 * Antes existia só lá, escrita dentro da página. Aqui ela vira o único conteúdo
 * de rosca do sistema e é reutilizada pelo donut "Distribuição de Status" da
 * Gestão do Ponto (Ponto → Gestão da Equipe → Visão Geral), que até então
 * exibia o `<TooltipGrafico />` sem `content` — e, portanto, o estilo PADRÃO do
 * Recharts (`DefaultTooltipContent`: `background-color: #fff`, borda `#ccc`,
 * padding 10px, cantos retos), uma caixa branca no meio do card escuro.
 *
 * Visual (idêntico ao da referência): caixa do Design System — `bg-card`,
 * `border-border`, `rounded-lg`, `shadow-md`, `px-2.5 py-1.5` — com UMA linha
 * `categoria : valor` em `text-[11px] font-bold` na COR DA FATIA (`payload[0]
 * .color`). A caixa é do tamanho do conteúdo (sem largura fixa).
 *
 * Movimento: o da régua (`CLASSE_ENTRADA_TOOLTIP` — só opacidade, 150 ms,
 * `ease-out`). O bloco devolve `null` sem ponto ativo, então ele MONTA na
 * aparição e só o fade roda: passar o mouse entre fatias troca o texto no
 * lugar, sem `key` e sem reanimar. A posição não anima porque quem chama usa
 * `TooltipGrafico` (`isAnimationActive={false}`), que remove a `transition` de
 * `transform` do Recharts.
 * ============================================================================
 */
export function ConteudoTooltipRosca({ active, payload, formatarValor }: ConteudoTooltipRoscaProps) {
  if (!active || !payload?.length) return null;
  const fatia = payload[0];
  const bruto = Number(fatia?.value);
  const valor = Number.isFinite(bruto) ? bruto : 0;
  const formatar = formatarValor ?? valorPadraoRosca;

  return (
    <div className={cn('rounded-lg border border-border bg-card px-2.5 py-1.5 shadow-md', CLASSE_ENTRADA_TOOLTIP)}>
      <p className="text-[11px] font-bold" style={{ color: fatia?.color }}>
        {fatia?.name} : {formatar(valor)}
      </p>
    </div>
  );
}

/**
 * `<Tooltip>` do Recharts com a régua aplicada. Aceita exatamente as mesmas
 * props (`contentStyle`, `formatter`, `content`, `cursor`, `wrapperStyle`…):
 * é um substituto direto do primitivo nas telas com gráfico.
 *
 * Quem usa `content` próprio não perde nada — o conteúdo continua sendo o do
 * gráfico; basta marcar o elemento raiz com `CLASSE_ENTRADA_TOOLTIP` para ter
 * a mesma entrada (os conteúdos daqui já fazem isso).
 */
export function TooltipGrafico({ content, wrapperStyle, ...props }: TooltipProps) {
  return (
    <RechartsTooltip
      {...props}
      // Sem interpolar `transform` — ver o bloco no topo do arquivo.
      isAnimationActive={false}
      wrapperStyle={{ outline: 'none', ...wrapperStyle }}
      content={content ?? <ConteudoTooltipGrafico />}
    />
  );
}
