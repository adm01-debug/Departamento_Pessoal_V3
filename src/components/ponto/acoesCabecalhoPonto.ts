import { cn } from '@/lib/utils';

/**
 * ============================================================================
 * AÇÕES DO CABEÇALHO DO CONTROLE DE PONTO — uma interação, quatro tons
 *
 * Os quatro controles da faixa de ações de `/ponto` passam a falar a MESMA
 * língua de hover dos botões **"Exportar"** e **"Sincronizar"** do Dashboard
 * principal (`dashboard/DashboardHeader.tsx`):
 *
 *   • o halo é o `shadow-glow*` do Design System, na MESMA régua de todos os
 *     glows do sistema (`0 0 20px -5px` + alfa do token — ver `boxShadow` em
 *     `tailwind.config.js`), surgindo ATRÁS do botão no hover;
 *   • halo é `box-shadow`: NÃO muda o tamanho do botão, NÃO entra no layout e
 *     NÃO empurra vizinho nenhum (diferente de `scale`/`width`);
 *   • some suavemente ao tirar o mouse, porque a transição é a própria
 *     transição da `box-shadow` (`transition-all` + `duration-fast` = 220ms,
 *     dentro da faixa pedida de 200–250ms);
 *   • em `prefers-reduced-motion` o deslocamento/escala é zerado por
 *     `src/index.css` (classe-gancho `ponto-acao-cabecalho`) — o halo e a cor
 *     continuam, porque nenhum dos dois é movimento.
 *
 * O que diferencia os quatro é a COR, e ela é o que estabelece a hierarquia
 * entre ação principal e secundária:
 *
 *   1. ESPELHO 671 .... `--info` (azul-ciano) — peça legal, primeiro controle
 *                        da faixa e único com borda ciano no repouso;
 *   2. IMPORTAR AFDT .. neutro (`foreground`/`border`) + `glow-neutral` —
 *                        apoio discreto, sem cor vibrante;
 *   3. GERAR AEJ ...... `--primary` (o lime "Bombon Lime" do DS) — a AÇÃO
 *                        principal da faixa: ícone/texto lime, borda que
 *                        intensifica no hover e glow lime;
 *   4. MAIS AÇÕES ..... neutro, com véu de fundo (`accent`) + halo neutro; o
 *                        dropdown continua exatamente como estava.
 *
 * POR QUE STRINGS E NÃO UM COMPONENTE NOVO: dois dos quatro botões são
 * `DialogTrigger`/`DropdownMenuTrigger` `asChild` de componentes que já
 * existem (`ImportarAFDTDialog`, `GerarAEJDialog` e o `DropdownMenu` da
 * página). Um componente `AcaoCabecalhoPonto` obrigaria os três a envolver o
 * trigger num wrapper — e wrapper em volta de `Trigger asChild` quebra o
 * repasse de `ref`/aria e, no Radix, a própria âncora do menu. Exportando as
 * classes, cada chamador continua com o MESMO elemento `<Button>` de antes e
 * só a pintura vem daqui (a função dos quatro não é tocada).
 *
 * ONDE ESTÁ CADA COISA:
 *   • geometria + movimento ................. `BASE_ACAO_CABECALHO` (comum);
 *   • cor (texto/ícone/borda/fundo/halo) .... um `TOM_*` por botão;
 *   • `ACAO_*` .............................. base + tom, prontas pro `className`.
 * ============================================================================
 */

/**
 * BASE comum — geometria, tipografia e micro-interação.
 *
 * A geometria é a ATUAL do cabeçalho (`h-9` = 36px, `rounded-lg` = raio do DS),
 * então nenhum dos quatro muda de altura. `shrink-0` impede que o `flex` da
 * faixa os esprema; o que se esconde no mobile é o RÓTULO (`hidden sm:inline`),
 * nunca o botão.
 */
const BASE_ACAO_CABECALHO = cn(
  // Altura, raio, borda e respiro internos padronizados nos QUATRO (ícone
  // sempre à esquerda do texto, 6px entre eles). O `px` NÃO é sobrescrito de
  // propósito: fica o `px-2.5` do `size="sm"`, que é a geometria que os quatro
  // já tinham — este trabalho é de hover, não de largura (`whitespace-nowrap`
  // vem do `Button`, então nenhum rótulo quebra nem é cortado).
  'h-9 shrink-0 rounded-lg gap-1.5 border',
  'font-body text-[11px] font-medium leading-none',
  // Superfície escura preservada (a MESMA do `variant="outline"`) + a elevação
  // mínima `shadow-xs` do "Exportar", que é o degrau de onde o halo parte.
  'bg-background shadow-xs',
  // Micro-interação: 220ms (`duration-fast`, o token de hover do sistema),
  // -2px no hover (o máximo pedido) e pressão de 0.98 no clique.
  // `transition-all` leva cor, borda, fundo, sombra e deslocamento numa curva
  // só (`--ease-standard`), sem saltos.
  'transition-all duration-fast',
  'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
  // Foco de teclado visível — o mesmo anel do `Button`, redeclarado aqui para
  // continuar legível também nos botões coloridos.
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
  // Gancho do `prefers-reduced-motion` em `src/index.css` (zera `translate` e
  // `scale`; halo e cor permanecem).
  'ponto-acao-cabecalho'
);

/**
 * 1. ESPELHO 671 — azul-ciano.
 *
 * `--info` (199 89% 48%/50%) é o MESMO ciano da badge "BIOMETRIA ATIVA" logo
 * abaixo, no banner de certificação: a faixa lê como um bloco só. Borda ciano
 * em alfa baixo (`/30`) porque o botão ainda é secundário — quem manda na
 * hierarquia é o lime do "Gerar AEJ".
 */
const TOM_ESPELHO_671 = cn(
  'text-info',
  'border-info/30',
  'hover:text-info',
  'hover:bg-info/10',
  'hover:border-info/50',
  'hover:shadow-glow-info'
);

/**
 * 2. IMPORTAR AFDT/ACJEF — neutro.
 *
 * Texto/ícone neutros (herdam o `foreground` do tema), borda discreta igual à
 * do repouso e `glow-neutral` no hover: luz difusa SEM cor, do jeito que uma
 * ação de apoio deve se comportar ao lado das duas destacadas.
 */
const TOM_IMPORTAR = cn(
  'text-foreground/90',
  'border-border/60',
  'hover:text-foreground',
  'hover:bg-accent/60',
  'hover:border-border',
  'hover:shadow-glow-neutral'
);

/**
 * 3. GERAR AEJ — verde-lime (`--primary`).
 *
 * A única ação PRINCIPAL da faixa: ícone e rótulo no lime da marca, fundo
 * escuro preservado no repouso (nada de botão cheio — o preenchimento lime
 * continua sendo exclusivo do CTA do Dashboard) e borda que intensifica de
 * `/30` para `/60` na interação, junto do `shadow-glow` lime.
 */
const TOM_GERAR_AEJ = cn(
  'text-primary',
  'border-primary/30',
  'hover:text-primary',
  'hover:bg-primary/10',
  'hover:border-primary/60',
  'hover:shadow-glow'
);

/**
 * 4. MAIS AÇÕES — neutro com véu de fundo.
 *
 * Mesmo neutro do "Importar", com um degrau a mais de fundo no hover
 * (`hover:bg-accent`, o `--accent` do tema — o mesmo que o `variant="outline"`
 * já dava) porque este botão ABRE um menu: precisa parecer clicável. O
 * `DropdownMenu` em si não muda (mesmo trigger, mesmo conteúdo).
 */
const TOM_MAIS_ACOES = cn(
  'text-foreground/90',
  'border-border/60',
  'hover:text-foreground',
  'hover:bg-accent',
  'hover:border-border',
  'hover:shadow-glow-neutral'
);

/** Espelho 671 (azul-ciano) — primeiro controle da faixa. */
export const ACAO_ESPELHO_671 = cn(BASE_ACAO_CABECALHO, TOM_ESPELHO_671);

/** Importar AFDT/ACJEF (neutro) — trigger do `ImportarAFDTDialog`. */
export const ACAO_IMPORTAR_AFDT = cn(BASE_ACAO_CABECALHO, TOM_IMPORTAR);

/** Gerar AEJ (verde-lime) — trigger do `GerarAEJDialog`. */
export const ACAO_GERAR_AEJ = cn(BASE_ACAO_CABECALHO, TOM_GERAR_AEJ);

/** Mais ações (neutro + véu de fundo) — trigger do `DropdownMenu` da página. */
export const ACAO_MAIS_ACOES = cn(BASE_ACAO_CABECALHO, TOM_MAIS_ACOES);

/**
 * Os quatro tons reunidos — consumido pelo teste de contrato
 * (`components/__tests__/PontoAcoesCabecalho.test.tsx`), que confere base
 * compartilhada, régua de glow e ausência de cor vibrante nas ações neutras.
 */
export const ACOES_CABECALHO_PONTO = {
  espelho671: ACAO_ESPELHO_671,
  importarAfdt: ACAO_IMPORTAR_AFDT,
  gerarAej: ACAO_GERAR_AEJ,
  maisAcoes: ACAO_MAIS_ACOES,
} as const;
