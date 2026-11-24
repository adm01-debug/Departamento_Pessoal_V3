# Escala global do Design System (base rem + px→rem)

Status: **ativo**. Vale para o sistema inteiro, inclusive para as áreas de
layout congelado (`docs/protegido/`).

## O que define a densidade do produto

São **três** peças, e só elas:

| Peça | Arquivo | Papel |
|---|---|---|
| Base rem | `src/index.css` → `html { font-size: 125% }` | 1 rem = 20px. Toda a escala em `rem` (espaçamento, `--text-*`, `--space-*`, raios) acompanha. |
| px arbitrário → rem | `scripts/postcss-escala-rem.mjs` (ligado em `postcss.config.js`, logo depois do `@tailwindcss/postcss`) | `w-[150px]` vira `9.375rem`; com a base acima, renderiza 187,5px — igual ao navegador a 125% de zoom. |
| Largura do conteúdo | `PAGE_WIDTH` em `src/components/layout/PageLayout.tsx` (`space-y-6 w-full`) | Conteúdo ocupa a largura disponível; não existe mais teto `max-w-[1400px] mx-auto` (era ele que deixava espaço morto nas laterais em monitores largos). |

Resultado: em **100% de zoom**, a tela tem o mesmo dimensionamento e a mesma
proporção visual que se obtinha a **125% de zoom** antes. Não há `zoom:` nem
`transform: scale()` em lugar nenhum — a escala é a própria régua do CSS.

## Regras ao mexer em UI

1. **Prefira `rem`.** `px` em classe utilitária (`w-[150px]`, `text-[11px]`,
   `h-[38px]`) é aceitável porque o plugin converte — mas `px` **inline**
   (`style={{ width: '150px' }}`, largura de coluna de tabela, `col.width`) não
   passa por CSS e NÃO escala. Se a medida precisa acompanhar a densidade,
   use `rem`/`em`/`%`/`fr`, não `px` inline.
2. **Medidas abaixo de 2px ficam em px** (hairlines: `1px`, `0.5px`). O plugin
   ignora esses valores de propósito, para não gerar borda subpixel borrada.
3. **Não adicione `zoom` ou `transform: scale()`** no shell, no `main` ou em
   containers de página: quebra `position: fixed` (modais, toasts), sombras e
   o cálculo de área de gráficos (`recharts`).
4. **Páginas com coluna estreita** (formulários, leitura) continuam usando
   `max-w-* mx-auto` local — o que saiu foi o teto **global** de 1400px.
5. **Breakpoints continuam em px** (`@media (width >= 640px)`); o plugin só
   processa declarações, nunca parâmetros de at-rule. Responsividade inalterada.

## O que isso significa para as áreas congeladas

A mudança é de **escala**, não de estrutura: nenhuma âncora visual de
`docs/protegido/` foi tocada (`npm run verificar:layout` continua OK). O efeito
em `/avaliacao` é o mesmo de estar com o navegador a 125% — que é exatamente
como o layout aprovado foi validado. Não há autorização para mudar o desenho
daquela área por causa disso.

## Como validar

```bash
npm run verificar:escala      # régua íntegra: base 125%, sem teto, plugin na cadeia
npm run verificar:layout      # âncoras da área protegida intactas
npm run verificar:tipografia  # famílias/escala tipográfica oficiais
```

Conferência manual rápida no navegador (DevTools → Console, com o app aberto):

```js
getComputedStyle(document.documentElement).fontSize        // "20px"
getComputedStyle(document.querySelector('main[role="main"]')).paddingLeft // "30px"
document.querySelector('#main-content > div > * > *').getBoundingClientRect().width // ≈ largura disponível (sem teto)
document.documentElement.scrollWidth > window.innerWidth   // false
```

Teste de regressão de layout da área protegida (requer dev server + sessão E2E):
`npm run test:e2e:layout`.

## Histórico

- O sintoma original ("tudo pequeno, sobra preta nas laterais" em 1920/1900px)
  tinha duas causas somadas: base `rem` em 16px (padrão do navegador, e não a
  densidade pretendida) e o teto global de 1400px no `PageLayout`.
- Corrigir só a base rem deixava glitches pontuais (rótulos truncando, botão
  quebrando em duas linhas) porque as utilities em `px` absoluto não escalavam
  junto — daí o passo px→rem no build.
