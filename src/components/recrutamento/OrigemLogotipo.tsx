import type { ComponentType } from 'react';

/**
 * ============================================================================
 * LOGOTIPOS DAS ORIGENS — marcas em SVG LOCAL (nada de imagem externa)
 *
 * Cada origem de captação ganha um símbolo próprio dentro de um quadrado
 * arredondado, como na referência — no lugar do ícone genérico que todas
 * dividiam. Três decisões que valem para o arquivo inteiro:
 *
 * 1. SVG INLINE (e não `<img src>`) para o desenho herdar `color` do container
 *    do tema (`currentColor`) e continuar legível nos dois temas. Também evita
 *    requisição de rede: nenhum asset novo é baixado nem versionado.
 * 2. TRAÇO MONOCROMÁTICO (`currentColor`) em vez do logotipo colorido: a cor da
 *    linha já vem dos tokens do sistema (`--info`, `--chart-4`, `--warning`…),
 *    então a marca entra em branco por cima do quadrado colorido e nenhum hex
 *    novo é criado.
 * 3. Nada de dependência: são paths de 24×24 escritos à mão, no mesmo tamanho
 *    dos ícones do lucide que eles substituem.
 *
 * QUEM NÃO TEM MARCA (Site, Indicação, "Não informada"…) continua com o ícone
 * atual do sistema — o fallback mora em `AnalyticsOrigens.tsx` (`iconeDaOrigem`)
 * e é acionado sempre que a chave não está aqui.
 * ============================================================================
 */
export type LogotipoOrigem = ComponentType<{ className?: string }>;

/** LinkedIn — o "in" da marca, sem o quadrado de fundo (o container já é ele). */
export function LogotipoLinkedin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden focusable="false">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452z" />
    </svg>
  );
}

/** Indeed — o "i" baixo da marca (ponto + haste). */
export function LogotipoIndeed({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <circle cx="12" cy="4.9" r="2" fill="currentColor" />
      <path
        d="M12 9.4v10.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Gupy — o "g" da marca (anel aberto à direita + descendente). */
export function LogotipoGupy({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      aria-hidden
      focusable="false"
    >
      <path d="M17.46 8.85A6.3 6.3 0 1 0 17.71 14.66" />
      <path d="M12 12h5.7" />
    </svg>
  );
}

/**
 * Chave normalizada (sem acento, minúscula) → componente. O mapa fica em
 * `AnalyticsOrigens.tsx` para este arquivo exportar SÓ componentes (regra
 * `react-refresh/only-export-components`).
 */
