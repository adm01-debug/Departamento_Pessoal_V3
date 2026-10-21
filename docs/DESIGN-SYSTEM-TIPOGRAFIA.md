# Design System — Tipografia oficial

> **Fonte única de verdade** para famílias, escala, pesos e tipografia numérica do
> sistema. Qualquer componente novo — de qualquer módulo — deve seguir este
> documento. Alterar família sem autorização explícita é proibido.

## 1. Fontes oficiais

O sistema usa **duas famílias de interface** (Outfit e Plus Jakarta Sans) e **uma
técnica** (JetBrains Mono), carregadas em `index.html` (Google Fonts, com
`preconnect` + `preload`) e declaradas em `src/index.css` e
`tailwind.config.js`:

| Papel | Família | Onde é aplicada | Token utilitário |
|---|---|---|---|
| Títulos e display | **Outfit** | `h1`–`h6` (regra base), `.text-display*`, `.text-h1/h2/h3`, `.text-heading`, `.text-data` | `font-body`* |
| Conteúdo e números | **Plus Jakarta Sans** | `body` (regra base), controles, tabelas, valores, `.text-body*`, `.text-label`, `.text-numeric` | `font-display`* / `font-sans` |
| Técnico (exceção) | **JetBrains Mono** | hashes, códigos, JSON, logs, protocolos, atalhos de teclado | `font-mono` |

\* Os nomes `font-display`/`font-body` são **históricos** e estão invertidos em
relação ao papel visual: `font-display` renderiza Plus Jakarta Sans e
`font-body` renderiza Outfit. **Não renomear**: são ~1.700 usos e o resultado
renderizado é o aprovado nas telas. Use sempre os tokens semânticos abaixo para
código novo.

Fallbacks: `sans-serif` (Outfit/Plus Jakarta) e `ui-monospace` (JetBrains Mono).
Nenhuma outra família é permitida na interface.

## 2. Pesos permitidos

| Peso | Uso |
|---|---|
| 300 | apenas textos de destaque muito grandes (raro) |
| 400 | corpo, descrições |
| 500 | títulos de card, rótulos, valores numéricos |
| 600 | títulos de página/seção, valores em destaque |
| 700 | reservado a contadores e ênfases pontuais |

## 3. Escala tipográfica (tokens)

Definida em `src/index.css` (`:root` → `--text-*` + classes em `@layer base`).

| Categoria | Classe | Tamanho | Entrelinha | Peso | Família |
|---|---|---|---|---|---|
| Display XL | `.text-display-xl` | 36 px | 1.1 | 600 | Outfit |
| Display | `.text-display` | 30 px | 1.2 | 600 | Outfit |
| Heading XL | `.text-h1` | 24 px | 1.3 | 600 | Outfit |
| Heading LG | `.text-h2` | 20 px | 1.35 | 600 | Outfit |
| Heading MD | `.text-h3` | 18 px | 1.4 | 500 | Outfit |
| Heading MD compacto | `.text-heading` | 16 px | 1.3 | 600 | Outfit |
| Data (KPI) | `.text-data` | 24 px | 1 | 500 | Outfit |
| Body | `.text-body` | 14 px | 1.5 | 400 | Plus Jakarta Sans |
| Body Small | `.text-body-sm` | 13 px | 1.45 | herdado | Plus Jakarta Sans |
| Label | `.text-label` | 12 px | 1.4 | 500 | Plus Jakarta Sans |
| Caption | `.text-caption` | 12 px | 1.4 | herdado | Plus Jakarta Sans |
| Overline | `.text-overline` | 11 px | 1.4 | 500 + uppercase + 0.1em | Plus Jakarta Sans |
| Badge | `.text-badge` | 10 px | 1.5 | herdado | Plus Jakarta Sans |
| Controle | `.text-control` | 13 px | 1.5 | herdado | Plus Jakarta Sans |

`text-control`, `text-body-sm`, `text-label` e `text-badge` foram criados para
substituir `text-[13px]`/`text-[12px]`/`text-[10px]` soltos **sem mudar nenhum
pixel**: os valores são exatamente os já usados nas telas aprovadas.

## 4. Tipografia numérica

**Regra:** valores exibidos ao usuário (dinheiro, horas, percentuais, contagens,
datas) usam a família oficial + `tabular-nums`. **Nunca** `font-mono`.

```tsx
<dd className="text-numeric">{formatCurrency(valor)}</dd>
<span className="text-numeric">{horas}</span>
```

`.text-numeric` aplica `font-variant-numeric: tabular-nums` e
`font-feature-settings: 'tnum' 1` — o alinhamento de colunas é preservado sem
trocar de família. O `body` já nasce com `tabular-nums`, então remover
`font-mono` de um número não desalinha nada.

## 5. Herança, portais e janelas

- A família é definida no `body` e **herdada**. Não declare `font-family`
  localmente.
- `Dialog`, `Popover`, `Tooltip` e `Dropdown` renderizam em **Portal** para o
  `body`, portanto herdam a fonte oficial automaticamente. Não é preciso
  reaplicar família nesses componentes.
- `prefers-reduced-motion` e `MotionConfig` não interferem em tipografia.

## 6. Exceções justificadas (monoespaçado)

`font-mono` (JetBrains Mono) é permitido **somente** para conteúdo técnico:

- hashes, assinaturas, tokens, chaves e IDs (`ContratosGeradosPage`,
  `AssinarContratoPage`, `SystemHealthTab`, `MFA`, `TokenInput`, etc.);
- trechos de código, fórmulas, JSON e logs (`Workflows`, `RubricasPage`,
  `ESocial`, `Auditoria`);
- protocolos/códigos de catálogo (CAT, CBO, CID, CA, CEP, PIS, CNPJ, matrícula);
- atalhos de teclado (`⌘K`);
- texto de e-mail transacional (`contratacaoService.ts`) — HTML fora da
  aplicação, com `Arial` para compatibilidade com clientes de e-mail;
- rótulos de SVG do editor de workflow (`system-ui`, desenho técnico).

**Proibido** usar `font-mono` em dinheiro, horas, percentuais, contagens, datas
ou qualquer indicador de interface.

## 7. Regras para componentes novos

1. Use as classes da escala (`text-body`, `text-label`, `text-h2`, …) — não
   invente `text-[13.5px]`.
2. Números → `text-numeric` (jamais `font-mono`).
3. Não declare `font-family` em componente; herde do `body`/tokens.
4. Títulos de janela seguem `.text-h3`/`text-[17px]`; valores seguem
   `text-numeric`; rótulos seguem `text-label`/`text-caption`.
5. Antes de concluir, rode `npm run verificar:tipografia`.

## 8. Verificação automática

```bash
npm run verificar:tipografia
```

O script falha se:

- aparecer `font-family` fora de `src/index.css`/`tailwind.config.js` (salvo as
  exceções documentadas);
- um valor monetário/número de interface voltar a usar `font-mono`;
- as famílias oficiais deixarem de estar carregadas em `index.html`.

A validação visual usa `scripts/_tmp-auditar-tipografia.mjs` (Playwright):
percorre as rotas reais, coleta `font-family`/`font-size`/`font-weight`/
`line-height`/`letter-spacing`/`font-variant-numeric` e lista qualquer família
fora do conjunto oficial.
