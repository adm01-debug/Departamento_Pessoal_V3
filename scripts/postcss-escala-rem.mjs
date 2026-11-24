/**
 * Plugin PostCSS — ESCALA GLOBAL DAS UTILITIES EM `px` ABSOLUTO.
 *
 * ─── PROBLEMA QUE ELE RESOLVE ───
 * A densidade do produto é governada pela base rem do `<html>` (ver o bloco
 * "ESCALA GLOBAL DO DESIGN SYSTEM" em `src/index.css`). Tudo o que está em
 * `rem` — o espaçamento do Tailwind, a escala tipográfica `--text-*`, os
 * raios, `--space-page`, `w-64`… — acompanha essa base automaticamente.
 *
 * Mas o código tem classes com medida ABSOLUTA em `px` (`w-[150px]`,
 * `min-w-[140px]`, `text-[11px]`, `h-[38px]`, `shadow-[0_0_0_4px_…]`). Essas
 * ficavam congeladas no valor original enquanto o resto crescia — e caixas
 * pequenas com texto maior passavam a truncar ("Todos os…", "Última…",
 * "Ver / detalhes" em duas linhas). Ou seja: o sistema ficava com duas réguas
 * de densidade convivendo na mesma tela.
 *
 * Este plugin fecha a lacuna sem editar ~1.500 classes espalhadas por ~650
 * arquivos (inclusive em áreas de layout congelado): no CSS já gerado pelo
 * Tailwind, toda declaração cujo SELETOR é uma utility com `px` arbitrário
 * passa de `Npx` para `(N/16)rem`. Com a base de 20px, `150px` vira
 * `9,375rem` = 187,5px — exatamente o que o navegador faria a 125% de zoom.
 *
 * ─── O QUE ELE *NÃO* TOCA (de propósito) ───
 * • Regras sem `px` arbitrário no seletor: todo o CSS de componente, tokens
 *   (`--radius`, `--space-*`, `--organograma-line-width`), scrollbars e
 *   animações escritas à mão seguem intactos.
 * • Hairlines (`0px`/`1px`/`1,5px`): continuam em px para não virar borda
 *   subpixel borrada. O corte é `MIN_PX` abaixo.
 * • `@media`, `@supports` e `@keyframes`: `walkDecls` não alcança parâmetros
 *   de at-rule nem os `0%/100%` de keyframes, então os breakpoints do
 *   Tailwind continuam declarados em px (responsividade inalterada).
 * • `style={{ … '150px' }}` inline em TSX: não passa por CSS. É o caso das
 *   larguras de coluna de tabela — resolvido no componente quando importa.
 */

/** Base de conversão: 16px = 1rem (o `px` do CSS é sempre absoluto). */
const BASE_PX = 16;

/** Só converte declarações cujo seletor é uma utility com `px` arbitrário. */
const SELETOR_PX_ARBITRARIO = /\[[^\]]*\d*\.?\d+px[^\]]*\]/;

/** Números seguidos de `px` dentro do valor da declaração. */
const VALOR_PX = /(-?\d*\.?\d+)px/g;

/** Abaixo disso o valor é hairline: mantém em px para não borrar. */
const MIN_PX = 2;

const pxParaRem = (valor) =>
  valor.replace(VALOR_PX, (trecho, numero) => {
    const n = Number(numero);
    if (!Number.isFinite(n) || Math.abs(n) < MIN_PX) return trecho;
    // 4 casas: 11px → 0.6875rem, 150px → 9.375rem, 2px → 0.125rem.
    return `${Math.round((n / BASE_PX) * 10000) / 10000}rem`;
  });

export default function escalaRemArbitraria() {
  return {
    postcssPlugin: 'dp-escala-rem-arbitraria',
    // `OnceExit`: roda depois de o Tailwind emitir as utilities, então o CSS
    // que chega aqui já é o final (o Tailwind é o plugin anterior na cadeia).
    OnceExit(root) {
      root.walkRules((rule) => {
        if (!SELETOR_PX_ARBITRARIO.test(rule.selector)) return;
        rule.walkDecls((decl) => {
          if (!decl.value.includes('px')) return;
          const convertido = pxParaRem(decl.value);
          if (convertido !== decl.value) decl.value = convertido;
        });
      });
    },
  };
}

escalaRemArbitraria.postcss = true;
