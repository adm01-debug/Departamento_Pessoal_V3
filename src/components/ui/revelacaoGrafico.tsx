/**
 * ============================================================================
 * REVELAÇÃO DE GRÁFICO — o desenho que se desenha da esquerda para a direita.
 *
 * Este arquivo é a FONTE ÚNICA da revelação de séries de gráfico do sistema.
 * Nenhum gráfico repete os números nem o `<clipPath>` animado: quem precisa
 * revelar uma linha/área usa `<ClipRevelacaoGrafico>` aqui e aponta o
 * `clipPath` das séries para o id dele.
 *
 * ── DE ONDE VEM (implementação ORIGINAL) ───────────────────────────────────
 * Nasceu no card "Visão Geral da Empresa" (`dashboard/HeadcountOverviewCard.tsx`,
 * Dashboard Principal/Executivo) e é a MESMA animação usada em Admissões,
 * Passivo Trabalhista e nos gráficos do Dashboard Executivo. Antes era copiada
 * em cada arquivo; agora todos apontam para cá — mesmo id de mecanismo, mesmos
 * números, sem risco de as cópias divergirem com o tempo.
 *
 * ── O QUE É ────────────────────────────────────────────────────────────────
 * Um `<clipPath>` cujo `<rect>` cresce de 0 a 100% da largura do desenho:
 *   duracao : 2,5 s
 *   curva   : `easeInOut`
 *   eixo    : esquerda → direita (as séries aparecem progressivamente, na
 *             posição final dos pontos, sem mexer em escala, eixos ou grade)
 * A animação é do Framer Motion NO RETÂNGULO. A animação nativa do Recharts
 * fica desligada nas séries (`isAnimationActive={false}`): as duas juntas
 * brigariam pelo mesmo traçado.
 *
 * ── POR QUE CLIP-PATH (e não a animação nativa do Recharts) ────────────────
 * `strokeDasharray`/`strokeDashoffset` desenham mais devagar nos trechos
 * curvos (a velocidade acompanha o comprimento do path) e não revelam o
 * preenchimento abaixo da linha. O clip revela traçado E preenchimento juntos,
 * em velocidade constante, e é independente de bug/versão do Recharts.
 *
 * ── RECHARTS 3: `clipPath` SÓ FUNCIONA EM `<Area>` ─────────────────────────
 * O `<Line>` do Recharts 3 reescreve a prop `clipPath` internamente
 * (`cartesian/Line.js` → `StaticCurve`: `clipPath: needClip ? url(...) : undefined`),
 * descartando a que vem do chamador. O `<Area>` não: as props SVG (inclusive
 * `clipPath`) chegam ao `<path>` do traçado e ao `<path>` do preenchimento. Por
 * isso séries de linha que precisam ser reveladas usam `<Area fill="none">` —
 * o traçado aberto renderizado é o mesmo do `<Line>` (mesma `Curve`, mesmo
 * `type`, mesmo `strokeWidth`), sem área pintada.
 *
 * ── UMA VEZ POR MONTAGEM ───────────────────────────────────────────────────
 * O `motion.rect` NÃO é remontado por re-render (hover, tooltip, legenda,
 * atualização de dados): o React mantém o mesmo nó e a Motion não reinicia a
 * animação. Quem quiser um reinício explícito passa `chave` (trocar a chave
 * remonta o retângulo — é o que a referência faz quando o número de pontos
 * muda). Sair da página e voltar remonta o gráfico e a revelação roda de novo.
 *
 * ── MOVIMENTO REDUZIDO ─────────────────────────────────────────────────────
 * Quem decide é `lib/motionMode.ts` (fonte única do app). O chamador passa
 * `semMovimento` com o valor de `useMovimentoReduzido()`: o retângulo monta já
 * em 100% (`initial={false}`), sem espera e sem varredura.
 * ============================================================================
 */
import { motion } from 'framer-motion';

/**
 * Números da revelação — a régua global deste gesto.
 *
 * Calibrar a revelação de TODOS os gráficos é mexer aqui. Os mesmos valores
 * estão descritos em `docs/motion-regua-global.md`.
 */
// eslint-disable-next-line react-refresh/only-export-components
export const CONFIG_REVELACAO_GRAFICO = {
  /** Duração da varredura completa (esquerda → direita). */
  duracaoSegundos: 2.5,
  /** Curva: acelera e desacelera nas pontas (a mesma do card de referência). */
  curva: 'easeInOut' as const,
} as const;

export interface ClipRevelacaoGraficoProps {
  /** Id referenciado por `clipPath="url(#id)"` nas séries do gráfico. */
  id: string;
  /**
   * `false` mantém o desenho escondido (largura 0) e `true` dispara a
   * varredura. Serve para esperar o card entrar na tela antes de desenhar.
   * Monotônico no uso normal: uma vez `true`, não volta (não há replay).
   */
  animar?: boolean;
  /** Movimento reduzido: monta já revelado, sem animação. */
  semMovimento?: boolean;
  /** Troca de valor remonta o retângulo e reinicia a varredura. */
  chave?: string | number;
}

/**
 * Clip-path de revelação, para colocar dentro do `<defs>` do gráfico:
 *
 * ```tsx
 * <defs>
 *   <ClipRevelacaoGrafico id="meu-grafico-reveal-clip" animar={animar} />
 * </defs>
 * …
 * <Area dataKey="serie" isAnimationActive={false} clipPath="url(#meu-grafico-reveal-clip)" />
 * ```
 *
 * O retângulo usa as unidades do próprio SVG (`clipPathUnits` padrão,
 * `userSpaceOnUse`): `height="100%"` cobre a altura do desenho e a largura
 * animada é a fração revelada da esquerda para a direita.
 */
export function ClipRevelacaoGrafico({ id, animar = true, semMovimento = false, chave }: ClipRevelacaoGraficoProps) {
  return (
    <clipPath id={id}>
      <motion.rect
        key={chave}
        x="0"
        y="0"
        height="100%"
        initial={semMovimento ? false : { width: 0 }}
        animate={{ width: animar ? '100%' : 0 }}
        transition={{
          duration: CONFIG_REVELACAO_GRAFICO.duracaoSegundos,
          ease: CONFIG_REVELACAO_GRAFICO.curva,
        }}
      />
    </clipPath>
  );
}
