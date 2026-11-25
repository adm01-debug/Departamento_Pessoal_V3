/**
 * ============================================================================
 * CONTROLE DE PONTO — VERMELHO VIBRANTE (fonte única das classes)
 *
 * O `--destructive` do tema escuro é `0 63% 35%` (≈ #912121): sobre o navy do
 * card ele rende ~2:1 de contraste, então número, ícone, borda e selo
 * vermelhos apareciam apagados — o oposto do que a página pede, já que ali o
 * vermelho é semântica NEGATIVA (débito, horas devidas, saldo devedor, atraso,
 * saída não marcada).
 *
 * POR QUE CLASSES UTILITÁRIAS AQUI (e não um token novo no `index.css`):
 * trocar `--destructive` moveria TODAS as telas do sistema; criar outro token
 * repetiria o valor do `--destructive-vivid` (que o comentário do `index.css`
 * reserva à área de Admissões). Estas classes valem só para os componentes
 * desta página — nenhuma outra tela é afetada.
 *
 * A paleta é uma só para o módulo inteiro, o que evita o vermelho "de três
 * tons" que existia antes (`text-destructive` num card, `/15` noutro, `/30`
 * na borda de um selo):
 *
 *   principal ....... #EF4444 (números de barra/ponto/anel e preenchimentos)
 *   texto/ícone ..... #FF4545 (um degrau acima, para ler no fundo escuro)
 *   hover ........... #F87171
 *   fundo ........... rgba(239, 68, 68, 0.14) — tinge, não bloca
 *   borda ........... rgba(239, 68, 68, 0.55)
 * ============================================================================
 */

/** Texto, número, rótulo e ícone vermelhos (#FF4545). */
export const VERMELHO_TEXTO = 'text-[#FF4545]';

/** Traço de SVG (anel de progresso e séries) — vermelho principal. */
export const VERMELHO_TRACO = 'stroke-[#EF4444]';

/** Preenchimento sólido (ponto de situação, barra cheia) — vermelho principal. */
export const VERMELHO_SOLIDO = 'bg-[#EF4444]';

/** Fundo translúcido (0.14) — mantém a superfície dark do card. */
export const VERMELHO_FUNDO = 'bg-[rgba(239,68,68,0.14)]';

/** Borda translúcida (0.55) — contorno visível sobre o navy. */
export const VERMELHO_BORDA = 'border-[rgba(239,68,68,0.55)]';

/** Borda discreta (0.32) — selos e chips internos do card. */
export const VERMELHO_BORDA_SUAVE = 'border-[rgba(239,68,68,0.32)]';

/**
 * Hover do botão "Saída": fundo um degrau mais denso, contorno e texto na
 * variação clara. O botão continua dark — só a tinta vermelha acende.
 */
export const VERMELHO_HOVER = 'hover:border-[#F87171] hover:bg-[rgba(239,68,68,0.22)] hover:text-[#F87171]';
