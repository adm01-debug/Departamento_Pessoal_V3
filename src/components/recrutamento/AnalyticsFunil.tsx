import { useId, useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { slotSequencial } from '@/components/ui/entradaGlobal';
import { useEntradaCardConcluida } from '@/hooks/useEntradaCardConcluida';
import { useMovimentoReduzido } from '@/lib/motionMode';
import { ETAPAS } from './pipelineEtapas';
import { formatarPercentual, type ConversaoFunil, type ItemFunil } from './analyticsComum';
import {
  DESLOCAMENTO_ETAPA_MOBILE_PX,
  DESLOCAMENTO_ETAPA_UNIDADES,
  FRACAO_VISIVEL_PARA_INICIAR,
  VARIANTES_DESLIZE,
  VARIANTES_MINI_CARD,
  VARIANTES_TRIAGEM,
  atrasoEtapa,
  atrasoMiniCard,
  deslocamentoEmPorcentagem,
} from './analyticsFunilAnimacao';
import { AnalyticsPainel } from './AnalyticsPainel';
import { SUPERFICIE_INTERNA, SUPERFICIE_SUAVE } from './analyticsVisual';

/**
 * FUNIL DE RECRUTAMENTO — volume e conversão por etapa.
 *
 * Desktop: cinco setas CONECTADAS desenhadas em SVG (uma única função
 * geométrica alimenta os cinco `path` e as cinco caixas de texto), nas cores
 * reais do Pipeline (os mesmos tokens de `pipelineEtapa`). Mobile: a mesma
 * leitura em linhas com faixa lateral, porque cinco rótulos não cabem lado a
 * lado no viewport estreito.
 *
 * O percentual de cada etapa é a RETENÇÃO sobre a entrada do funil (primeira
 * etapa), exatamente como na referência aprovada. A conversão etapa → etapa
 * aparece em faixa própria abaixo, para não confundir as duas leituras.
 *
 * CABEÇALHO ENXUTO (referência do funil): sem ícone, sem selo de contagem e
 * sem a faixa de destaques do rodapé — o painel mostra o funil e as taxas, e
 * só. As leituras que saíram da tela continuam no `title` de cada etapa e no
 * CSV de exportação (`analyticsRelatorio.ts`).
 *
 * ENTRADA (uma vez, quando o card aparece): o painel entra pela régua global do
 * módulo (`AnalyticsPainel` → `entradaCard(index)`) e SÓ ENTÃO o funil se
 * constrói — a Triagem expande do centro, as outras quatro etapas deslizam da
 * esquerda para a direita e, por último, os quatro mini cards de conversão
 * sobem. Números, curvas e variantes vivem em `analyticsFunilAnimacao.ts`;
 * aqui ficam apenas o gatilho (`useInView` no CARD, `once: true`, 20% visível),
 * a espera pelo fim da entrada externa (`useEntradaCardConcluida`) e a
 * conversão do deslocamento das setas para as unidades do `viewBox` (uma
 * medição, no disparo).
 */
function percentualCompacto(valor: number): string {
  return formatarPercentual(valor, Number.isInteger(valor) ? 0 : 1);
}

/** Cor cheia da etapa — faixa lateral do layout mobile. */
function corDaEtapa(token: string): string {
  return `hsl(var(--${token}))`;
}

/**
 * GEOMETRIA DO FUNIL — cinco polígonos desenhados em SVG a partir de UMA
 * função (`geometriaEtapa`).
 *
 * Por que SVG e não cinco `div` com `clip-path` (como antes): o `clip-path`
 * recebia a profundidade da ponta em `px` fixos, então a mesma seta ficava
 * pontuda num painel estreito e quase reta num painel largo — cada etapa podia
 * assumir uma geometria diferente. Aqui a profundidade é expressa na MESMA
 * unidade da largura (o `viewBox`), e `preserveAspectRatio="none"` faz o
 * desenho acompanhar a largura do painel mantendo a proporção ponta/etapa
 * (~21%) em qualquer tamanho.
 *
 * Medidas (unidades do `viewBox`, que no painel de 1440 valem ~1px de projeto):
 *   • `ALTURA_VB` ....... 112 — a faixa tem `h-[88px]` de projeto (110px reais),
 *                         então 1 unidade vertical ≈ 1px de projeto; é a altura
 *                         do bloco na referência, que ocupa a região central do
 *                         card em vez de deixar o funil pequeno no meio dele;
 *   • `PROFUNDIDADE_VB` . 18 — a ponta ocupa 18 das ~85 unidades de uma etapa
 *                         (~21%, a proporção ponta/etapa da referência). É a
 *                         MESMA medida do encaixe da etapa seguinte: diagonais
 *                         com a mesma inclinação e encaixe exato, por
 *                         construção;
 *   • `COSTURA_VB` ...... 5 — o vão entre a ponta de uma etapa e o entalhe da
 *                         seguinte. É ele que desenha o fio escuro entre as
 *                         setas (o fundo do painel aparece no vão): nenhum
 *                         `gap` de CSS, nenhuma margem negativa. Medido na
 *                         perpendicular das diagonais — o vão que o olho lê —
 *                         dá ~3,3px reais, já descontado o traço de 1px de cada
 *                         lado; na boca do vão (topo e base das setas) são
 *                         ~4,6px;
 *   • `RAIO_*_VB` ....... raios dos arredondamentos — ver bloco
 *                         ARREDONDAMENTO abaixo.
 */
const TOTAL_ETAPAS = ETAPAS.length;
const LARGURA_VB = 440;
const ALTURA_VB = 112;
const PROFUNDIDADE_VB = 18;
const COSTURA_VB = 5;

/**
 * ARREDONDAMENTO — cada vértice do polígono é trocado por um arco de raio
 * próprio (ver `caminhoArredondado`). Valores em unidades do `viewBox`
 * (≈0,92px reais na horizontal), calibrados pela referência aprovada:
 *
 *   • `RAIO_CANTO_VB` ... 7 — cantos externos: os dois da borda esquerda da
 *                         primeira etapa (90°) e as duas pontas do entalhe das
 *                         demais (69° — os vértices mais agudos do desenho);
 *   • `RAIO_DIAGONAL_VB`  6 — encontro das diagonais com as bordas horizontais,
 *                         a transição que antes era uma quina dura;
 *   • `RAIO_PONTA_VB` ... 6,5 — vértice da ponta direita. O ângulo interno da
 *                         ponta é largo (138°), então um raio pequeno quase não
 *                         apareceria no contorno: 6,5 unidades curvam o "nariz"
 *                         sem encurtar a seta (o vértice recua só 0,5 unidade);
 *   • `RAIO_ENCAIXE_VB` . 4 — vértice côncavo do entalhe esquerdo. É o único
 *                         recesso: o arco passa para o lado de dentro do
 *                         entalhe e arredonda a boca do vão.
 *
 * Nenhum raio é aplicado como `border-radius` de elemento — todos viram curva
 * no próprio `path`, inclusive o do vértice côncavo.
 */
const RAIO_CANTO_VB = 7;
const RAIO_DIAGONAL_VB = 6;
const RAIO_PONTA_VB = 6.5;
const RAIO_ENCAIXE_VB = 4;

/**
 * Passo horizontal — largura de UM bloco de etapa.
 *
 * As setas se ENCAIXAM: a ponta de uma acompanha o entalhe da seguinte e o vão
 * entre as duas diagonais paralelas é `COSTURA_VB`. Por isso o passo desconta a
 * sobreposição (`PROFUNDIDADE_VB - COSTURA_VB`): o vão mora DENTRO da largura
 * total, sem `gap` de CSS e sem encurtar o funil.
 *
 * É essa sobreposição que faz o topo das cinco setas formar uma FAIXA CONTÍNUA
 * (vão de 5 unidades) em vez de cinco blocos separados por um triângulo escuro
 * largo: sem encaixe o vão do topo vira `PROFUNDIDADE + COSTURA` (23 unidades
 * aqui, 15 na primeira versão em SVG) e as setas voltam a parecer soltas.
 */
const PASSO_VB = (LARGURA_VB - (PROFUNDIDADE_VB - COSTURA_VB)) / TOTAL_ETAPAS;

/** Traço de 1px na cor do painel — o fio que fecha o contorno de cada seta. */
const COR_COSTURA = 'hsl(var(--card))';

interface GeometriaEtapa {
  /** x da borda esquerda do bloco da etapa. */
  esquerda: number;
  /** x da base da ponta (onde o topo e a base do corpo terminam). */
  pontaBase: number;
  /** x do vértice da ponta. */
  ponta: number;
  /** x onde o corpo retangular começa — depois do encaixe. */
  corpoEsquerda: number;
  /** x onde o corpo retangular termina — base da ponta. */
  corpoDireita: number;
}

/**
 * A ÚNICA fonte da geometria: o `d` de cada `path` e a caixa de cada texto
 * saem daqui, então as cinco etapas são idênticas por construção.
 */
function geometriaEtapa(indice: number): GeometriaEtapa {
  const esquerda = indice * PASSO_VB;
  const pontaBase = esquerda + PASSO_VB - COSTURA_VB;
  return {
    esquerda,
    pontaBase,
    ponta: pontaBase + PROFUNDIDADE_VB,
    // A primeira etapa não tem encaixe à esquerda: a borda é reta.
    corpoEsquerda: indice === 0 ? esquerda : esquerda + PROFUNDIDADE_VB,
    corpoDireita: pontaBase,
  };
}

/**
 * Respiro horizontal da caixa de texto, em unidades do `viewBox`.
 *
 * A caixa nasce do corpo útil, mas as três linhas de texto moram acima e abaixo
 * da linha do meio, onde as diagonais do encaixe e da ponta já recuaram ~4,7
 * unidades de cada lado. Somar 2 unidades por lado mantém o rótulo longe do
 * recorte e devolve folga para "Contratado" no caso mais estreito em que as
 * cinco setas ainda aparecem (painel de 420px: 59,4px de caixa para 56px de
 * texto) — sem ela o nome saía como "Contrata…".
 */
const RESPIRO_TEXTO_VB = 2;

/**
 * Caixa do texto = CORPO ÚTIL da seta, entre o vértice do encaixe e a base da
 * ponta. Centrar na largura do bloco empurrava o rótulo para cima da ponta; na
 * primeira etapa — a única sem encaixe — o desvio era de ~7 unidades, o
 * suficiente para o texto parecer fora de eixo em relação às outras quatro.
 */
function caixaTexto(indice: number) {
  const { inicio, largura } = faixaTexto(indice);
  return {
    left: `${(inicio / LARGURA_VB) * 100}%`,
    width: `${(largura / LARGURA_VB) * 100}%`,
  };
}

/**
 * Faixa da caixa de texto em UNIDADES do `viewBox` — a fonte de `caixaTexto`
 * (posição e largura em %) e do deslocamento de entrada do rótulo.
 */
function faixaTexto(indice: number) {
  const { corpoEsquerda, corpoDireita } = geometriaEtapa(indice);
  const inicio = Math.max(0, corpoEsquerda - RESPIRO_TEXTO_VB);
  const fim = Math.min(LARGURA_VB, corpoDireita + RESPIRO_TEXTO_VB);
  return { inicio, fim, largura: fim - inicio };
}

/**
 * Deslocamento inicial do RÓTULO de uma etapa, em % da própria caixa.
 *
 * A seta anda `DESLOCAMENTO_ETAPA_UNIDADES` no desenho; o rótulo é HTML
 * sobreposto, então o mesmo percurso é convertido para a largura DELE — assim
 * as duas camadas deslizam grudadas em qualquer largura de painel, sem medir o
 * DOM (a largura do rótulo é conhecida: `faixaTexto`).
 */
function deslocamentoDoRotulo(indice: number): string {
  return deslocamentoEmPorcentagem(-DESLOCAMENTO_ETAPA_UNIDADES, faixaTexto(indice).largura);
}

/**
 * VÉRTICES de cada etapa, em sentido horário a partir do canto superior
 * esquerdo: topo → ponta → base da ponta → borda esquerda → entalhe.
 *
 * A PRIMEIRA etapa não tem entalhe (borda esquerda reta) e por isso tem cinco
 * vértices; as demais têm seis e fecham no vértice côncavo do entalhe. O raio
 * viaja junto do vértice para que o arredondamento não precise saber qual é
 * qual.
 */
interface Vertice {
  x: number;
  y: number;
  /** Raio do arredondamento neste vértice, em unidades do `viewBox`. */
  raio: number;
}

function verticesEtapa(indice: number): Vertice[] {
  const { esquerda, ponta, corpoEsquerda, corpoDireita } = geometriaEtapa(indice);
  const meio = ALTURA_VB / 2;
  const vertices: Vertice[] = [
    { x: esquerda, y: 0, raio: RAIO_CANTO_VB },
    { x: corpoDireita, y: 0, raio: RAIO_DIAGONAL_VB },
    { x: ponta, y: meio, raio: RAIO_PONTA_VB },
    { x: corpoDireita, y: ALTURA_VB, raio: RAIO_DIAGONAL_VB },
    { x: esquerda, y: ALTURA_VB, raio: RAIO_CANTO_VB },
  ];
  if (indice > 0) vertices.push({ x: corpoEsquerda, y: meio, raio: RAIO_ENCAIXE_VB });
  return vertices;
}

/** Direção unitária de um vértice para o seguinte. */
function direcao(de: Vertice, para: Vertice) {
  const dx = para.x - de.x;
  const dy = para.y - de.y;
  const comprimento = Math.hypot(dx, dy);
  return { x: dx / comprimento, y: dy / comprimento };
}

/** Duas casas decimais — mantém o `d` curto e estável no DOM. */
function n2(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * POLÍGONO → `d` com todos os vértices arredondados.
 *
 * Para cada vértice:
 *   1. mede o giro do traçado (`giro`, 0 = reto) entre a aresta que chega e a
 *      que sai;
 *   2. recua `t = raio · tan(giro / 2)` sobre as duas arestas — a distância em
 *      que um arco de raio `raio` fica tangente às duas. O MESMO `t` serve para
 *      quina convexa e para o recesso do entalhe: no vértice côncavo o arco
 *      apenas passa para o outro lado da aresta;
 *   3. troca o vértice por uma cúbica entre os dois pontos de tangência, com
 *      controles a `k = (4/3) · raio · tan(giro / 4)` — a aproximação padrão do
 *      arco de círculo (0,5523 · raio no quarto de volta), que mantém a
 *      inclinação original das diagonais e faz o contorno acompanhar a curva.
 *
 * Nenhuma curva invade a vizinha: cada aresta cede no máximo 90% do próprio
 * comprimento para os arredondamentos das duas pontas.
 */
function caminhoArredondado(vertices: Vertice[]): string {
  const total = vertices.length;
  const anterior = (i: number) => vertices[(i - 1 + total) % total];
  const proximo = (i: number) => vertices[(i + 1) % total];
  const giros = vertices.map((vertice, i) => {
    const entrada = direcao(anterior(i), vertice);
    const saida = direcao(vertice, proximo(i));
    const cosseno = Math.min(1, Math.max(-1, entrada.x * saida.x + entrada.y * saida.y));
    return Math.acos(cosseno);
  });
  const tangentes = vertices.map((vertice, i) => (giros[i] < 1e-6 ? 0 : vertice.raio * Math.tan(giros[i] / 2)));
  for (let i = 0; i < total; i += 1) {
    const j = (i + 1) % total;
    const comprimento = Math.hypot(vertices[j].x - vertices[i].x, vertices[j].y - vertices[i].y);
    const soma = tangentes[i] + tangentes[j];
    if (soma > comprimento * 0.9) {
      const fator = (comprimento * 0.9) / soma;
      tangentes[i] *= fator;
      tangentes[j] *= fator;
    }
  }
  const partes: string[] = [];
  vertices.forEach((vertice, i) => {
    const entrada = direcao(anterior(i), vertice);
    const saida = direcao(vertice, proximo(i));
    const t = tangentes[i];
    const inicio = { x: vertice.x - entrada.x * t, y: vertice.y - entrada.y * t };
    const fim = { x: vertice.x + saida.x * t, y: vertice.y + saida.y * t };
    partes.push(`${i === 0 ? 'M' : 'L'} ${n2(inicio.x)} ${n2(inicio.y)}`);
    if (giros[i] < 1e-6) return;
    const k = (4 / 3) * (t / Math.tan(giros[i] / 2)) * Math.tan(giros[i] / 4);
    partes.push(
      `C ${n2(inicio.x + entrada.x * k)} ${n2(inicio.y + entrada.y * k)} ${n2(fim.x - saida.x * k)} ${n2(
        fim.y - saida.y * k
      )} ${n2(fim.x)} ${n2(fim.y)}`
    );
  });
  partes.push('Z');
  return partes.join(' ');
}

/** `d` de cada seta: polígono da etapa com TODOS os cantos curvos. */
function caminhoEtapa(indice: number): string {
  return caminhoArredondado(verticesEtapa(indice));
}

/** Rótulo curto no chevron — o nome completo fica no `title` e na conversão. */
const ROTULO_CHEVRON: Record<string, string> = {
  triagem: 'Triagem',
  entrevista: 'Entrevista',
  teste: 'Teste',
  proposta: 'Proposta',
  contratado: 'Contratado',
};

export function AnalyticsFunil({
  funil,
  conversoes,
  total,
  index,
}: {
  funil: ItemFunil[];
  conversoes: ConversaoFunil[];
  total: number;
  index: number;
}) {
  const tokenPorEtapa = new Map(ETAPAS.map((etapa) => [etapa.id, etapa.token]));
  // Conversão etapa → etapa: o nome COMPLETO da etapa ("Teste Técnico") não
  // cabia na faixa de quatro colunas e quebrava a linha só naquele card; o
  // rótulo curto do chevron mantém os quatro com a mesma altura. O nome por
  // extenso continua no `title` da célula.
  const rotuloCurto = new Map(ETAPAS.map((etapa) => [etapa.label, ROTULO_CHEVRON[etapa.id] ?? etapa.label]));
  // Ids de gradiente únicos por instância: `useId` evita colisão quando a aba é
  // remontada ou quando dois funis aparecem na mesma página (vitrine/testes).
  const idBase = useId().replace(/:/g, '');
  const idGradiente = (indice: number) => `funil-${idBase}-${indice}`;

  /* ─── GATILHO DA ENTRADA INTERNA (uma vez por montagem) ────────────────────
   * Duas travas, ambas definitivas — nenhuma volta a `false`:
   *   1. `useInView(cardRef, { once: true, amount: 0.2 })` — o observador está
   *      no CARD (20% dele visível, como pede a especificação), desconecta no
   *      primeiro `isIntersecting` e nunca mais reavalia. Rolar para cima e
   *      para baixo, trocar de filtro ou re-renderizar não rearma nada.
   *   2. `entradaConcluida` (`useEntradaCardConcluida`) — a entrada do card pela
   *      régua global (14px / 520ms / slot de 480ms para o `index={4}`) termina
   *      ANTES de o funil começar. Sem esperar, os dois movimentos verticais se
   *      somariam e o conteúdo pareceria "tremer" dentro do card que ainda sobe.
   *
   * Como as duas travas são monotônicas, `animar` também é: uma vez `true`,
   * fica `true`. Hover do painel, troca de filtro (os `key` das etapas são os
   * ids, nada remonta) e atualização de dados não reanimam; um painel que saia
   * de `total === 0` depois disso monta as etapas já no estado final
   * (`initial={false}` no `entrada()` abaixo).
   *
   * MOVIMENTO REDUZIDO: `animar` nasce `true` — todos os elementos aparecem
   * imediatamente, no estado final, sem espera e sem transformação.
   * ─────────────────────────────────────────────────────────────────────── */
  const cardRef = useRef<HTMLDivElement>(null);
  const emVista = useInView(cardRef, { once: true, amount: FRACAO_VISIVEL_PARA_INICIAR });
  const reduzirMovimento = useMovimentoReduzido();
  const { entradaConcluida, aoConcluirEntrada } = useEntradaCardConcluida(index, slotSequencial);

  const animar = reduzirMovimento || (emVista && entradaConcluida);

  /**
   * Props de entrada de UM elemento da sequência. As variantes são as mesmas
   * para todos (`analyticsFunilAnimacao.ts`); o `custom` diz QUANDO cada um
   * parte e de ONDE. `initial`/`animate` ficam explícitos em cada nó — sem
   * depender de propagação de variante do container — e `initial={false}`
   * cobre o caso "já animou" (ou "movimento reduzido"): monta no estado final,
   * sem replay.
   */
  const entrada = (variants: Variants, custom?: unknown) => ({
    variants,
    custom,
    initial: animar ? (false as const) : ('oculto' as const),
    animate: animar ? ('visivel' as const) : ('oculto' as const),
  });

  /**
   * Entrada de uma etapa do funil: a Triagem (índice 0) expande do centro; as
   * demais deslizam `deslocamento` unidades de tela. O mesmo par atraso/variante
   * vale para a seta (SVG) e para o rótulo (HTML) — é o que mantém as duas
   * camadas grudadas durante o movimento.
   */
  const entradaEtapa = (indice: number, deslocamento: number | string) =>
    indice === 0
      ? entrada(VARIANTES_TRIAGEM)
      : entrada(VARIANTES_DESLIZE, { atraso: atrasoEtapa(indice), deslocamento });

  return (
    <AnalyticsPainel
      title="Funil de recrutamento"
      subtitle="Acompanhe a passagem dos candidatos por etapa"
      tom="info"
      index={index}
      contentClassName="justify-center"
      cardRef={cardRef}
      aoConcluirEntrada={aoConcluirEntrada}
    >
      {total === 0 ? (
        <div
          className={`flex flex-1 flex-col items-center justify-center gap-1.5 rounded-xl px-4 py-8 text-center ${SUPERFICIE_SUAVE}`}
        >
          <p className="text-[12px] font-medium text-foreground/80">Nenhuma candidatura no funil</p>
          <p className="max-w-[260px] text-[10.5px] leading-snug text-muted-foreground">
            Assim que houver candidaturas, o volume e a conversão de cada etapa aparecem aqui.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop — cinco setas CONECTADAS, desenhadas em SVG.
              A faixa tem 88px de projeto (110px reais, a altura do bloco na
              referência)
              e o desenho ocupa 100% da largura: quem escala é o `viewBox`, não
              as classes, então o formato é o mesmo nas cinco etapas e em
              qualquer largura de painel. O `path` sai de `caminhoEtapa` — os
              vértices vêm de `verticesEtapa` e as quinas, de
              `caminhoArredondado` (arcos em curva, não `border-radius`) —, o
              preenchimento é o gradiente do token da etapa e o contorno de 1px
              usa `vectorEffect="non-scaling-stroke"` — sem isso o traço
              engrossaria no eixo x (o SVG é esticado com
              `preserveAspectRatio="none"`) e o fio deixaria de ser uniforme.
              O texto é HTML SOBREPOSTO ao SVG: dentro do SVG ele seria
              esticado junto com o viewBox (glifos achatados) e não teria
              reticências. Cada caixa de rótulo cobre o CORPO ÚTIL da seta
              (`caixaTexto`), nunca a largura total com a ponta.

              ENTRADA: os `path` são `motion.path` e obedecem às MESMAS variantes
              dos rótulos (`entradaEtapa`) — a Triagem escala a partir do próprio
              centro e as demais deslizam da esquerda. Como o desenho é esticado
              até a largura do painel, o deslocamento é dado em UNIDADES do
              `viewBox` e o rótulo HTML recebe o equivalente em % da própria
              caixa (`deslocamentoDoRotulo`): as duas camadas andam juntas em
              qualquer largura, sem medir o DOM. */}
          <div className="relative hidden h-[88px] w-full @min-[420px]:block">
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox={`0 0 ${LARGURA_VB} ${ALTURA_VB}`}
              preserveAspectRatio="none"
              aria-hidden
              focusable="false"
            >
              <defs>
                {funil.map((item, indice) => {
                  const token = tokenPorEtapa.get(item.id) ?? 'primary';
                  return (
                    <linearGradient key={item.id} id={idGradiente(indice)} x1="88%" y1="0%" x2="12%" y2="100%">
                      <stop offset="0%" stopColor={`hsl(var(--${token}))`} />
                      <stop offset="100%" stopColor={`hsl(var(--${token}) / 0.74)`} />
                    </linearGradient>
                  );
                })}
              </defs>
              {funil.map((item, indice) => (
                <motion.path
                  key={item.id}
                  d={caminhoEtapa(indice)}
                  fill={`url(#${idGradiente(indice)})`}
                  stroke={COR_COSTURA}
                  strokeWidth={1}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  {...entradaEtapa(indice, -DESLOCAMENTO_ETAPA_UNIDADES)}
                />
              ))}
            </svg>
            <div className="absolute inset-0" role="list" aria-label="Funil por etapa">
              {funil.map((item, indice) => (
                <motion.div
                  key={item.id}
                  role="listitem"
                  className="absolute inset-y-0 flex flex-col items-center justify-center gap-[3px] overflow-hidden text-center text-white [text-shadow:0_1px_2px_hsl(var(--background)/0.45)]"
                  style={caixaTexto(indice)}
                  title={`${item.label}: ${item.total} candidaturas (${percentualCompacto(item.percentual)} da entrada)`}
                  {...entradaEtapa(indice, deslocamentoDoRotulo(indice))}
                >
                  <span className="max-w-full truncate text-[9px] font-semibold leading-none">
                    {ROTULO_CHEVRON[item.id] ?? item.label}
                  </span>
                  <span className="font-display text-[21px] font-bold leading-none tabular-nums">{item.total}</span>
                  {/* Só o percentual, como na referência: "da entrada" fica no
                      `title` — escrito por extenso ele estourava a largura do
                      corpo da seta e aparecia cortado. */}
                  <span
                    className="max-w-full truncate text-[9px] leading-none text-white/75"
                    title={`${percentualCompacto(item.percentual)} das candidaturas que entraram no funil`}
                  >
                    {percentualCompacto(item.percentual)}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile — mesmas etapas em linhas, com faixa lateral na cor da etapa.
              O corte é pelo CONTAINER (`@min-[420px]`), não pela viewport: cinco
              setas precisam de ~420px para "Contratado" caber sem reticências, e
              quem sabe essa largura é o painel — que fica com 400px ou menos em
              telas estreitas mesmo com a viewport acima de 640px. */}
          <p className="mb-1 text-[9px] uppercase tracking-widest text-muted-foreground/70 @min-[420px]:hidden">
            Retenção sobre a entrada do funil
          </p>
          <ol className="space-y-2 @min-[420px]:hidden" aria-label="Funil por etapa">
            {funil.map((item, indice) => {
              const token = tokenPorEtapa.get(item.id) ?? 'primary';
              return (
                <motion.li
                  key={item.id}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-3 ${SUPERFICIE_INTERNA}`}
                  {...entradaEtapa(indice, -DESLOCAMENTO_ETAPA_MOBILE_PX)}
                >
                  <span
                    aria-hidden
                    className="h-6 w-1 shrink-0 rounded-full"
                    style={{ background: corDaEtapa(token) }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/85">{item.label}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {percentualCompacto(item.percentual)}
                  </span>
                  <span className="w-7 shrink-0 text-right font-display text-[16px] font-semibold tabular-nums">
                    {item.total}
                  </span>
                </motion.li>
              );
            })}
          </ol>

          {/* Conversão etapa → etapa — percentual em cima e a passagem embaixo,
              na faixa de quatro colunas da referência (sem barra: o número já é
              a leitura e a barra só duplicava a informação). O respiro até os
              chevrons é de 12,5px reais (`mt-2.5`): o suficiente para separar as
              duas leituras sem abrir um vão no meio do painel. */}
          <div className="mt-2.5">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <p className="text-[10px] font-medium text-muted-foreground">Taxa de conversão entre etapas</p>
              <span className="hidden text-[9px] leading-none text-muted-foreground/70 @min-[400px]:inline">
                etapa seguinte ÷ anterior
              </span>
            </div>
            {/* Quatro retângulos compactos: percentual em cima e a passagem
                abaixo, os dois alinhados à esquerda. Altura de 44px de projeto
                (55px reais — a faixa de indicadores da referência), raio de 6px
                de projeto (7,5px reais) e `px-2` (10px reais) de respiro lateral.
                O fundo é a camada interna do painel (`SUPERFICIE_INTERNA`: 4,5%
                de `--foreground` + borda a 50%), não um bloco cheio — é o que
                mantém a faixa discreta, "quase o fundo do card", em vez do
                retângulo preenchido da versão anterior.
                A descrição quebra em DUAS linhas de propósito: no painel de 1440
                os cards ficam com 95px e o par mais longo ("Proposta →
                Contratado", 113px em 10px reais) não cabe em uma linha — em vez
                de reticências, o texto quebra e continua inteiro (medido: 73px
                úteis por card). */}
            <div className="grid grid-cols-2 gap-2 @min-[400px]:grid-cols-4">
              {conversoes.map((conversao, indice) => (
                <motion.div
                  key={`${conversao.de}-${conversao.para}`}
                  className={`flex h-[44px] min-w-0 flex-col justify-center rounded-md px-2 ${SUPERFICIE_INTERNA}`}
                  title={`${conversao.de} → ${conversao.para}: ${formatarPercentual(conversao.percentual)}`}
                  {...entrada(VARIANTES_MINI_CARD, { atraso: atrasoMiniCard(indice) })}
                >
                  <p className="font-display text-[12px] font-semibold leading-none tabular-nums text-foreground">
                    {percentualCompacto(conversao.percentual)}
                  </p>
                  <p className="mt-1 text-[8px] leading-[1.15] text-muted-foreground">
                    {rotuloCurto.get(conversao.de) ?? conversao.de} →{' '}
                    {rotuloCurto.get(conversao.para) ?? conversao.para}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}
    </AnalyticsPainel>
  );
}
