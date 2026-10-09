/**
 * ============================================================================
 * REVELAÇÃO DOS EVENTOS DA TRILHA DE AUDITORIA — a MESMA expansão do Organograma.
 *
 * O que entra na tela (o cabeçalho de cada dia e cada evento) não chega mais por
 * fade nem por deslize: cada bloco nasce RECOLHIDO (`height: 0`) e se ABRE até a
 * altura natural (`height: 'auto'`), com a opacidade acompanhando e um `y` curto
 * dando direção — é exatamente o preset que o Organograma usa ao expandir um
 * departamento (`makeRevealVariants`, em `components/organograma/organogramaReveal.ts`).
 *
 * SEM SEGUNDA COREOGRAFIA: a duração, a curva, o deslocamento e o passo da onda
 * são IMPORTADOS do Organograma em vez de recopiados — mudar um valor lá move as
 * duas telas juntas, e a trilha nunca "descola" da referência. Este arquivo
 * acrescenta só o que a trilha tem e a árvore não tem: a COORDENAÇÃO da entrada.
 *
 * POR QUE A COORDENAÇÃO NÃO VIVE NO ORGANOGRAMA: lá a ordem é decidida por
 * INTERAÇÃO (clicar na row, "Expandir tudo"), e `buildRevealWave`/
 * `buildCascadeIndex` calculam o slot a partir da árvore visível. Aqui não há
 * clique: a entrada É a apresentação, e a ordem é simplesmente a ordem de leitura
 * (cabeçalho do dia → eventos daquele dia → cabeçalho do dia seguinte → …). O
 * coordenador (`coordenarTrilha`) é uma função PURA que devolve o atraso de cada
 * elemento dessa fila; nenhum `setTimeout` é criado em lugar nenhum — quem espera
 * é a transição do Framer de cada bloco.
 *
 * CASCATA POR GRUPO (não uma fila global): a entrada é coordenada DIA A DIA. O
 * cabeçalho do dia ocupa a posição 0 e os eventos dele entram nas posições 1..n;
 * ao começar o grupo seguinte, a contagem REINICIA em 0. A versão anterior usava
 * uma fila ÚNICA sobre toda a trilha, então o 1º evento de "Ontem" só começava
 * depois de TODOS os de "Hoje" — e, para uma trilha longa caber numa janela fixa,
 * o passo era comprimido até ~8ms por item (cascata imperceptível). Com o reset
 * por grupo, cada dia tem a própria onda, sempre com o passo cheio.
 *
 * CALIBRAÇÃO LOCAL (e por que difere da árvore): o Organograma abre em 400ms com
 * onda de 90ms — número pensado para uma árvore ABERTA sob demanda, onde cada
 * abertura responde a um clique. A trilha é outra coisa: a entrada É a
 * apresentação, ninguém clicou, e o olho precisa LER a cascata descendo a tela.
 * Por isso os dois números locais são maiores — 700ms por bloco e 150ms de
 * intervalo —, o que deixa os movimentos se SOBREPorem com clareza (a 150ms, o
 * 2º bloco começa quando o 1º ainda está em ~1/5 do caminho). A técnica, a curva
 * (`REVEAL_OPEN_EASE`, `[0.22, 1, 0.36, 1]`) e o deslocamento (`REVEAL_OFFSET_Y`)
 * continuam vindo do Organograma — só o RITMO é local.
 *
 * SAÍDA: `collapsed` também é o estado de SAÍDA, com transição curta e sem
 * atraso — ao trocar o filtro, o resultado que sai se recolhe discreto (~250ms),
 * sem esperar a onda de entrada e sem uma segunda coreografia. A COORDENAÇÃO
 * (sair ANTES de entrar) mora no componente: o atraso de entrada de um dia com
 * evento excluído pelo filtro chega somado de `TRILHA_SAIDA_DURACAO` (ver
 * `totalPorDia`/`onda`), sem `mode="wait"` — que desmontaria quem permanece e
 * causaria piscada.
 *
 * EXECUÇÃO ÚNICA: as transições estão no estado `expanded`, e o estado só é
 * disparado UMA vez, na montagem (`initial="collapsed"` → `animate="expanded"`).
 * Hover, tooltip, scroll, resize e re-render NÃO mudam o alvo, então não
 * reanimam; a `key` estável de cada evento mantém o nó montado.
 * ============================================================================
 */
import type { Variants } from 'framer-motion';
import { REVEAL_OFFSET_Y, REVEAL_OPEN_EASE } from '@/components/organograma/organogramaReveal';

/** Duração da expansão de UM bloco (evento ou cabeçalho de dia), em segundos. */
export const TRILHA_EVENTO_DURACAO = 0.7;

/**
 * Intervalo entre o INÍCIO de dois blocos consecutivos DO MESMO GRUPO (s).
 * Menor que a duração de propósito: as expansões se SOBREPÕEM (o 2º bloco começa
 * com o 1º ainda em movimento) — é isso que se lê como cascata, não como fila.
 */
export const TRILHA_EVENTO_PASSO = 0.15;

/**
 * Teto de passos com atraso CRESCENTE dentro de um grupo: do 9º em diante o
 * atraso congela (a MESMA régua de `MAX_ENTRADA_INDEX`, em `ui/entrada-cards.tsx`),
 * para um dia com dezenas de eventos não arrastar a entrada por segundos.
 */
export const TRILHA_PASSOS_MAX = 8;

/** Duração da SAÍDA de um resultado removido pelo filtro (s) — curta e discreta. */
export const TRILHA_SAIDA_DURACAO = 0.25;

/** Curva da expansão e da saída — a MESMA do Organograma. */
export const TRILHA_EASE = REVEAL_OPEN_EASE;

/** Alias do passo pelo nome curto (mesmo valor de `TRILHA_EVENTO_PASSO`). */
export const TRILHA_PASSO = TRILHA_EVENTO_PASSO;

/**
 * Atraso (em segundos) da posição `indice` DENTRO de um grupo (0 = cabeçalho do
 * dia, 1 = 1º evento, …). Puro e determinístico: a mesma posição devolve sempre
 * o mesmo atraso. Acima do teto, o atraso para de crescer.
 */
export function atrasoDoGrupo(indice: number): number {
  const i = Math.floor(Number.isFinite(indice) ? indice : 0);
  return Math.min(Math.max(i, 0), TRILHA_PASSOS_MAX) * TRILHA_EVENTO_PASSO;
}

/**
 * Coordenador da cascata: recebe o número de EVENTOS de cada grupo, na ordem de
 * leitura, e devolve para cada grupo a fila de atrasos começando pelo CABEÇALHO
 * — `[cabeçalho, evento1, evento2, …]`. Cada grupo começa do zero (reset por
 * grupo), então nenhum dia espera a fila do anterior.
 *
 * Puro e determinístico: a mesma entrada devolve sempre a mesma saída, então o
 * resultado é testável e não depende de efeito colateral. Quem espera é a
 * transição do Framer de cada bloco (o `custom`), nunca um `setTimeout`.
 */
export function coordenarTrilhaPorGrupo(contagens: number[]): number[][] {
  return contagens.map((qtd) => {
    const n = Math.max(Math.floor(Number.isFinite(qtd) ? qtd : 0), 0);
    return Array.from({ length: n + 1 }, (_, i) => atrasoDoGrupo(i));
  });
}

/**
 * Os estados de um bloco da trilha (cabeçalho de dia OU evento).
 *
 * `collapsed` é o RECOLHIDO — altura zero, invisível e 4px acima (o mesmo
 * `REVEAL_OFFSET_Y` do bloco recolhido do Organograma). Ele serve de estado
 * INICIAL e de SAÍDA (`exit="collapsed"`): a transição declarada aqui é a que a
 * Motion usa ao SAIR (curta, sem atraso); na entrada o estado é aplicado
 * instantaneamente e vale a transição do `expanded`.
 *
 * `expanded` é a altura NATURAL (`'auto'` — a Motion mede), opaco e no lugar. O
 * atraso chega pelo `custom` (o coordenador, acima); a duração e a curva são as
 * desta calibração local (700ms/150ms).
 */
export const trilhaRevealVariants: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    y: REVEAL_OFFSET_Y,
    transition: { delay: 0, duration: TRILHA_SAIDA_DURACAO, ease: TRILHA_EASE },
  },
  expanded: (delay: number) => ({
    height: 'auto',
    opacity: 1,
    y: 0,
    transition: {
      delay: Number.isFinite(delay) ? Math.max(delay, 0) : 0,
      duration: TRILHA_EVENTO_DURACAO,
      ease: TRILHA_EASE,
    },
  }),
};
