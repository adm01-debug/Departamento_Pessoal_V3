/**
 * ============================================================================
 * ABA "ESTRUTURA" DO DASHBOARD EXECUTIVO — RÉGUA DAS ENTRADAS INTERNAS.
 *
 * Números em UM lugar; os cards (`MapaEstruturaCard`, `TipoVinculoCard`) só
 * consomem estas constantes. Nenhum valor solto espalhado, nenhum `setTimeout`.
 *
 * 1) Cards internos do "Mapa da Estrutura" (Departamentos, Times, Cargos,
 *    Lideranças, Níveis hierárquicos): fade + subida de 16px em **500 ms** com
 *    `cubic-bezier(0.25, 1, 0.5, 1)`; **140 ms** entre um card e o seguinte.
 *    O passo tem de ficar acima do limiar de percepção (~100 ms): abaixo disso
 *    os cinco cards parecem subir juntos, por mais longa que seja a duração
 *    individual. Com 500 ms + 140 ms cada card ainda está subindo quando o
 *    próximo começa (cascata contínua, sem espera) e a sequência é visível.
 *
 * 2) Legendas do "Tipo de Vínculo" (CLT, PJ, Estágio, Aprendiz, Temporário):
 *    slide-in da esquerda (`x: -20px → 0`) com fade, **400 ms** cada, com
 *    atraso EXPLÍCITO e sequencial por linha (não é `índice × passo`):
 *    CLT **100 ms** · PJ **300 ms** · Estágio **500 ms** · Aprendiz **700 ms** ·
 *    Temporário **900 ms** — ver `atrasoLegenda`. Só `transform` + `opacity`:
 *    o layout (o `divide-y` da lista) não se move.
 *
 * 3) Rosca: preset COMPARTILHADO `ANIMACAO_DONUT_CARD` (`donutMotion.ts`), o
 *    mesmo do card "Departamentos" do Dashboard principal.
 *
 * GATILHO: cada animação começa na MONTAGEM do respectivo `motion.*`, e a
 * montagem só acontece depois do fim da requisição (renderização condicional
 * estrita nos componentes — ver o `return` antecipado de cada um). Por isso
 * não existe `animate` condicional nem flag de "pode animar" aqui.
 * ============================================================================
 */

/** Cards internos do "Mapa da Estrutura". */
export const ESTRUTURA_MAPA_CARD = {
  /**
   * Duração do fade + subida de cada card interno (segundos) — 500 ms.
   * Curta o bastante para o próximo card entrar ainda durante o movimento
   * deste; longa o bastante para o deslocamento ser lido como subida.
   */
  duracaoS: 0.5,
  /**
   * Intervalo entre o início de um card e o do próximo (segundos) — 140 ms.
   * Acima do limiar de percepção (~100 ms) e bem menor que a duração: os cinco
   * cards se sobrepõem (cascata contínua), mas em ordem claramente visível.
   */
  intervaloS: 0.14,
  /** Deslocamento vertical inicial (px) de onde cada card sobe até a posição final. */
  deslocamentoY: 16,
  /** `cubic-bezier(0.25, 1, 0.5, 1)` — desaceleração suave de alta fidelidade. */
  curva: [0.25, 1, 0.5, 1],
} as const;

/** Legendas do "Tipo de Vínculo". */
export const VINCULO_LEGENDA = {
  /** Duração do slide-in de CADA legenda (segundos) — 400 ms. */
  duracaoS: 0.4,
  /**
   * Atraso EXPLÍCITO de cada linha, por índice (segundos):
   * CLT 100 ms · PJ 300 ms · Estágio 500 ms · Aprendiz 700 ms · Temporário 900 ms.
   */
  atrasosS: [0.1, 0.3, 0.5, 0.7, 0.9],
  /** Passo extra, só se a lista crescer além das 5 linhas acima (segundos). */
  passoExtraS: 0.2,
  /** Deslocamento inicial para a esquerda (px). */
  deslocamentoX: -20,
  /** Mesma curva de alta fidelidade da entrada dos cards. */
  curva: [0.25, 1, 0.5, 1],
} as const;

/**
 * Atraso da N-ésima linha da legenda (segundos): 0,1 / 0,3 / 0,5 / 0,7 / 0,9.
 * Lista maior que `atrasosS` continua em cascata de 200 ms após a última linha.
 */
export function atrasoLegenda(indice: number): number {
  const atrasos = VINCULO_LEGENDA.atrasosS;
  if (indice < atrasos.length) return atrasos[indice];
  return atrasos[atrasos.length - 1] + (indice - atrasos.length + 1) * VINCULO_LEGENDA.passoExtraS;
}

/**
 * Paleta das fatias/legendas do "Tipo de Vínculo" — tokens do Design System
 * (nunca hex solto): primária, aviso, sucesso, info, destrutiva e accent.
 */
export const CORES_TIPO_VINCULO = [
  'hsl(var(--primary))',
  'hsl(var(--warning))',
  'hsl(var(--success))',
  'hsl(var(--info))',
  'hsl(var(--destructive))',
  'hsl(var(--accent))',
] as const;
