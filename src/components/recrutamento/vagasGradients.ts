/**
 * ============================================================================
 * VAGAS — DEGRADÊS MULTICAMADA DOS CARDS (reconstrução da referência).
 *
 * Cada identidade tem DUAS fontes de luz radiais no topo (esquerda e direita)
 * sobre uma base linear diagonal que escurece para o navy/identidade no rodapé.
 * Isso reproduz o efeito da referência: um "arco" de cor no topo do card, com
 * vale mais escuro no centro (onde ficam título/competências), transição suave
 * para baixo e canto inferior direito quase preto.
 *
 * CONFIGURAÇÃO ÚNICA: este módulo é a fonte de verdade dos cinco degradês.
 * Nada é ligado a UUID de vaga — a escolha vem do token de identidade do
 * departamento (info → tecnologia, chart-4 → RH, warning → administrativo,
 * success → comercial, aqua → dados). Trocar um parâmetro aqui vale para todas
 * as vagas daquela identidade.
 *
 * LIMITAÇÃO DE ORIGEM: a imagem de referência não está disponível como arquivo
 * local (só no chat), então as posições/opacidades abaixo são estimativas
 * visuais refinadas por captura de tela iterativa — não uma amostragem pixel a
 * pixel do original. Nenhum glow/sombra é usado: só gradientes e borda.
 * ============================================================================
 */
import type { IdentidadeVaga } from './vagasComum';

export interface GradienteVaga {
  /** Nome legível da família (organização do arquivo). */
  familia: 'tecnologia' | 'recursosHumanos' | 'administrativo' | 'comercial' | 'dados';
  /** CSS `background-image` com 2 radiais + 1 linear. */
  fundo: string;
  /** Borda em repouso (acompanha a família, transparência discreta). */
  borda: string;
  /** Borda no hover (um passo mais presente, sem glow). */
  bordaHover: string;
}

export const VAGA_GRADIENTS: Record<IdentidadeVaga['token'], GradienteVaga> = {
  // ── Tecnologia (Full Stack) — azul #38BDF8 ────────────────────────────────
  // Luz principal à esquerda do topo; segunda fonte no canto superior direito.
  info: {
    familia: 'tecnologia',
    fundo: [
      'radial-gradient(92% 82% at 14% -12%, rgba(56, 189, 248, 0.58) 0%, rgba(56, 189, 248, 0.17) 34%, rgba(0, 0, 0, 0) 69%)',
      'radial-gradient(88% 72% at 94% -16%, rgba(56, 189, 248, 0.44) 0%, rgba(56, 189, 248, 0.11) 40%, rgba(0, 0, 0, 0) 73%)',
      'linear-gradient(170deg, rgba(56, 189, 248, 0.15) 0%, rgba(56, 189, 248, 0.05) 22%, #0f1926 52%, #08131f 100%)',
    ].join(', '),
    borda: 'rgba(56, 189, 248, 0.42)',
    bordaHover: 'rgba(56, 189, 248, 0.62)',
  },

  // ── Recursos Humanos — violeta #A855F7 ────────────────────────────────────
  // A referência é um roxo vivo (não lavanda acinzentada); a 2ª fonte entra
  // quase na borda superior direita.
  'chart-4': {
    familia: 'recursosHumanos',
    fundo: [
      'radial-gradient(95% 88% at 20% -12%, rgba(168, 85, 247, 0.58) 0%, rgba(192, 132, 252, 0.18) 36%, rgba(0, 0, 0, 0) 70%)',
      'radial-gradient(88% 74% at 100% -12%, rgba(168, 85, 247, 0.42) 0%, rgba(192, 132, 252, 0.12) 42%, rgba(0, 0, 0, 0) 74%)',
      'linear-gradient(170deg, rgba(168, 85, 247, 0.16) 0%, rgba(168, 85, 247, 0.05) 22%, #101423 50%, #0d0b18 100%)',
    ].join(', '),
    borda: 'rgba(192, 132, 252, 0.44)',
    bordaHover: 'rgba(192, 132, 252, 0.64)',
  },

  // ── Administrativo — âmbar/bronze #F59E0B ─────────────────────────────────
  // Primeira fonte mais à esquerda; rodapé puxa para o bronze escuro, sem
  // marrom dominante na metade superior.
  warning: {
    familia: 'administrativo',
    fundo: [
      'radial-gradient(90% 82% at 12% -12%, rgba(245, 158, 11, 0.54) 0%, rgba(245, 158, 11, 0.16) 34%, rgba(0, 0, 0, 0) 69%)',
      'radial-gradient(87% 70% at 94% -16%, rgba(245, 158, 11, 0.40) 0%, rgba(245, 158, 11, 0.10) 40%, rgba(0, 0, 0, 0) 73%)',
      'linear-gradient(168deg, rgba(245, 158, 11, 0.16) 0%, rgba(245, 158, 11, 0.05) 22%, #101822 50%, #120d08 100%)',
    ].join(', '),
    borda: 'rgba(245, 158, 11, 0.42)',
    bordaHover: 'rgba(245, 158, 11, 0.62)',
  },

  // ── Comercial (Vendedor) — verde esmeralda #10B981 ────────────────────────
  // Verde expressivo no topo, com profundidade verde-escura no rodapé.
  success: {
    familia: 'comercial',
    fundo: [
      'radial-gradient(92% 84% at 18% -12%, rgba(16, 185, 129, 0.56) 0%, rgba(52, 211, 153, 0.17) 35%, rgba(0, 0, 0, 0) 70%)',
      'radial-gradient(88% 72% at 94% -16%, rgba(16, 185, 129, 0.42) 0%, rgba(52, 211, 153, 0.11) 40%, rgba(0, 0, 0, 0) 74%)',
      'linear-gradient(168deg, rgba(16, 185, 129, 0.16) 0%, rgba(16, 185, 129, 0.05) 22%, #0f1924 51%, #051410 100%)',
    ].join(', '),
    borda: 'rgba(52, 211, 153, 0.42)',
    bordaHover: 'rgba(52, 211, 153, 0.62)',
  },

  // ── Dados (Analista de Dados) — azul-ciano #0EA5E9 → #22D3EE ──────────────
  // Distinto do azul de Tecnologia: azul mais luminoso à esquerda e ciano na
  // fonte direita. O ícone continua teal (token `aqua`), preservado.
  aqua: {
    familia: 'dados',
    fundo: [
      'radial-gradient(92% 84% at 14% -12%, rgba(14, 165, 233, 0.56) 0%, rgba(14, 165, 233, 0.17) 35%, rgba(0, 0, 0, 0) 70%)',
      'radial-gradient(88% 72% at 92% -14%, rgba(34, 211, 238, 0.44) 0%, rgba(34, 211, 238, 0.12) 40%, rgba(0, 0, 0, 0) 73%)',
      'linear-gradient(170deg, rgba(14, 165, 233, 0.16) 0%, rgba(14, 165, 233, 0.05) 22%, #0e1a27 51%, #06131f 100%)',
    ].join(', '),
    borda: 'rgba(34, 211, 238, 0.44)',
    bordaHover: 'rgba(34, 211, 238, 0.64)',
  },
};

/** Gradiente da identidade (sempre um dos cinco configurados acima). */
export function gradienteDaVaga(token: IdentidadeVaga['token']): GradienteVaga {
  return VAGA_GRADIENTS[token];
}
