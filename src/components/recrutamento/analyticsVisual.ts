/**
 * ============================================================================
 * CAMADAS DE SUPERFÍCIE DA ANALYTICS — a hierarquia de fundos em UM lugar
 *
 * A aba tem três degraus, do mais escuro para o mais claro:
 *
 *   1. PÁGINA .... `--background` (quase preto no tema escuro);
 *   2. PAINEL .... `--card` (`AnalyticsPainel`);
 *   3. DENTRO .... `SUPERFICIE_INTERNA` (aqui) — funil, taxa de conversão,
 *                  cards de tempo, alertas, origens, desempenho por vaga e
 *                  indicadores do rodapé.
 *
 * POR QUE `--foreground` COM ALFA (e não um token novo): no tema escuro o texto
 * é claro, então `foreground/4,5%` LIFTA a superfície acima do `--card`; no tema
 * claro o texto é escuro, então a MESMA camada escurece levemente o branco do
 * card. Um valor resolve os dois temas — criar `--surface-3` exigiria tocar os
 * dois blocos de token em `index.css` e ainda deixaria a terceira camada sem
 * contraparte no tema oposto.
 *
 * Antes da refatoração os sub-elementos usavam `bg-background/40`: no tema
 * escuro isso os deixava MAIS ESCUROS que o painel (hierarquia invertida, o
 * sintoma de "tudo espalhado e chapado" das telas 1 e 2).
 * ============================================================================
 */

/** Camada 3 — sub-elemento sobre o painel (cards, linhas, faixas). */
export const SUPERFICIE_INTERNA = 'border border-border/50 bg-[hsl(var(--foreground)/0.045)]';

/** Camada 3 mais discreta — estados vazios e notas de rodapé dos painéis. */
export const SUPERFICIE_SUAVE = 'border border-dashed border-border/40 bg-[hsl(var(--foreground)/0.025)]';

/** Trilha das barras de progresso (funil, origens, vagas). */
export const TRILHA_BARRA = 'block h-1.5 overflow-hidden rounded-full bg-border/40';

/**
 * Trilha ALTA — só a barra da linha de vaga (8px de projeto = 10px reais).
 *
 * Na linha de vaga a barra divide espaço com nome, volume e percentual dentro de
 * um card estreito, então 6px de projeto (7,5px reais) sumiam ao lado do texto.
 * É um token SEPARADO (e não uma mudança no `TRILHA_BARRA`) porque aquele é
 * compartilhado com funil e origens: mexer nele mudaria a espessura das barras
 * de outra faixa da aba. Ver `AnalyticsVagas`.
 */
export const TRILHA_BARRA_VAGA = 'block h-[8px] overflow-hidden rounded-full bg-border/40';

/**
 * Trilha CURTA — a barra que DIVIDE a linha com o texto (origens e desempenho
 * por vaga). É a leitura da referência: ícone · nome · barra · volume ·
 * percentual na MESMA linha. Como a largura vem do `flex` da linha (e não do
 * conteúdo), todas as barras do painel começam no mesmo x e o olho compara
 * comprimentos; na lista de duas linhas (rótulo em cima, barra embaixo) a
 * comparação se perdia no meio do texto.
 *
 * Espessura de 8px de projeto = 10px reais: o mesmo degrau da barra da linha de
 * vaga (`TRILHA_BARRA_VAGA`). Com 6px de projeto a barra de 20% virava um traço
 * ao lado do marcador de 30px da linha.
 */
export const TRILHA_BARRA_INLINE = 'block h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-border/40';

/** Preenchimento das barras — MESMA animação usada no resto do sistema. */
export const PREENCHIMENTO_BARRA =
  'barra-progresso-preenchimento block h-full rounded-full transition-all duration-progresso ease-out';

/**
 * GRADIENTES HORIZONTAIS DAS BARRAS — "Principais origens" e "Desempenho por
 * vaga", as duas barras que DIVIDEM a linha com o texto.
 *
 * Todos correm da esquerda para a direita, com a tonalidade MAIS INTENSA na
 * partida e a MAIS LUMINOSA na chegada: o degradê acompanha o eixo em que a
 * barra cresce, então o "acender" da ponta é lido junto com o comprimento.
 *
 * Por que CSS literal (e não classes `from-[…] to-[…]` do Tailwind): as cores
 * de plataforma (LinkedIn, Indeed, Gupy…) não são tokens do Design System, e
 * uma classe arbitrária guardada em string de módulo dependia de o scanner do
 * Tailwind extrair exatamente aquele literal — quando não extraía, a barra
 * ficava sem cor nenhuma (já aconteceu nesta aba com `var(----info)`). Em
 * `background-image` não há etapa de geração de CSS: o degradê chega ao DOM
 * como está escrito aqui.
 *
 * O degradê é aplicado SÓ no preenchimento (`PreenchimentoBarraAnalytics`), que
 * vive dentro de um trilho `overflow-hidden rounded-full` — por isso ele não
 * escapa da área preenchida, e o trilho continua com o fundo escuro de sempre.
 */
export const GRADIENTES_ORIGEM = {
  /** LinkedIn (e o token `info`, azul do painel de origens). */
  azul: 'linear-gradient(90deg, #0284C7 0%, #00C8FF 100%)',
  /** Indeed (token `chart-4`). */
  roxo: 'linear-gradient(90deg, #9333EA 0%, #C084FC 100%)',
  /** Gupy (token `warning`). */
  ambar: 'linear-gradient(90deg, #D97706 0%, #FACC15 100%)',
  /** Indicação (token `chart-5`). */
  rosa: 'linear-gradient(90deg, #DB2777 0%, #FF4D94 100%)',
  /** Site (token `success`). */
  verde: 'linear-gradient(90deg, #059669 0%, #00E89D 100%)',
} as const;

/**
 * "Desempenho por vaga" — UM gradiente para TODAS as barras do painel.
 *
 * Aqui a cor não separa mais a conversão em faixas (`tokenDaConversao`): o que
 * compara as vagas é o COMPRIMENTO da barra e o percentual colorido ao lado. A
 * leitura semântica (verde = conversão alta, âmbar = baixa) continua no
 * percentual e no ponto de status, de onde ela nunca depende de cor de barra.
 */
export const GRADIENTE_VAGA = GRADIENTES_ORIGEM.azul;

/**
 * Botão/trigger da barra de ações do topo (período, vaga, exportar).
 *
 * Superfície `--card` + borda sutil: o mesmo desenho do trigger do `Select` do
 * sistema. Medidas REVISADAS (os três controles estavam altos demais e o ícone
 * caía acima do rótulo):
 *   • altura `h-[35px]` — 35px de projeto = 43,75px reais na base de 125%,
 *     dentro da faixa dos controles compactos do sistema (`h-9` = 45px reais).
 *     O `h-12` anterior dava 60px reais: a barra virava uma faixa mais alta que
 *     os próprios KPIs logo abaixo dela;
 *   • `px-3` — 15px reais por lado (o alvo era 14–16px);
 *   • `py-0` — o respiro vertical vem da altura fixa + `items-center`, não de
 *     padding: assim ícone, rótulo e chevron ficam centrados no mesmo eixo e
 *     nada é comprimido quando o texto é maior que o padding restante;
 *   • `gap-1.5` — 7,5px reais entre ícone e rótulo (o alvo era 8px);
 *   • `text-[13px]` — 16,25px reais, exatamente o `--text-control` do sistema.
 *     O `text-[14px]` anterior (17,5px reais) ficava um degrau ACIMA do
 *     `--text-control` e, com a altura menor, brigava com o próprio controle;
 *   • `whitespace-nowrap` — o rótulo nunca quebra em duas linhas;
 *   • `shrink-0` — o controle nunca é espremido pelo flex do cabeçalho: quando
 *     a linha não cabe, o `flex-wrap` do container quebra a LINHA inteira (o
 *     controle continua inteiro), nunca o conteúdo dele.
 *
 * `rounded-[12px]`, o fundo `--card` e a borda continuam os mesmos: a identidade
 * visual desta barra não mudou, só a régua.
 *
 * A largura NÃO mora aqui: cada trigger pede a sua (`min-w-[…]`/`max-w-[…]`) e o
 * Exportar fica sem largura mínima — o miolo dos três é diferente e a largura só
 * deve crescer com o conteúdo. Ver `AnalyticsBarraFiltros`.
 */
export const BOTAO_ACAO =
  'inline-flex h-[35px] w-auto shrink-0 items-center justify-between gap-1.5 whitespace-nowrap rounded-[12px] border border-border/60 bg-card px-3 py-0 text-[13px] font-medium leading-none text-foreground/85 transition-colors hover:border-border hover:bg-muted/50 focus:outline-hidden focus:ring-2 focus:ring-ring/50';

/**
 * ANIMAÇÃO DO "EXPORTAR" — a MESMA onda do botão "Sincronizar" do Dashboard.
 *
 * O Sincronizar (`dashboard/DashboardHeader.tsx`) não tem animação própria: ele
 * usa `ui/flow-hover-button.tsx`, que opera em DUAS camadas —
 *   1. o componente (irredutível, não se copia): `relative z-0 overflow-hidden`
 *      + a onda `before:absolute before:inset-0 before:-z-10
 *      before:translate-x-[150%] before:translate-y-[150%] before:scale-[2.5]
 *      before:rounded-[100%]` com `before:transition-transform
 *      before:duration-700` + `hover:scale-[1.02] hover:before:translate-*`
 *      `active:scale-[0.98]` + `transition-all duration-slower`;
 *   2. a COR da onda e o contraste do conteúdo, que o próprio componente delega
 *      ao `className` do call site (ver o doc dele).
 *
 * Este token é a camada 2, copiada 1:1 do Sincronizar:
 *   `before:bg-primary` ............ a onda é o primary (o lime do tema);
 *   `hover:bg-primary/5` ........... o véu de 5% que acompanha a onda;
 *   `hover:border-primary/30` ...... a borda acende no mesmo tom;
 *   `hover:text-primary-foreground` o rótulo inverte para ler sobre o primary.
 *
 * `[&>svg]:*` — no Sincronizar o ícone NÃO tem cor própria: ele herda o
 * `color` do botão e por isso inverte junto (é `currentColor`). No Exportar o
 * download é `text-muted-foreground` em repouso (identidade que fica), e uma cor
 * explícita não herda. O seletor de filho direto resolve só isso, sem tocar no
 * ícone: mesma inversão, na MESMA duração da troca de cor do rótulo
 * (`duration-slower`, 500 ms — a que o `transition-all` do componente deixa
 * valendo). `[&>svg]` só acerta o download: ele é o único `svg` filho direto
 * (a ressalva sobre esse seletor está no doc de `BOTAO_ACAO_SELECT`).
 *
 * NÃO entra aqui nada da IDENTIDADE do Sincronizar: `h-8`, `rounded-xl`, `gap-2`,
 * `font-body`, `shadow-xs` e a variante `outline` continuam sendo do Exportar
 * (`BOTAO_ACAO`) — este token só liga o movimento.
 *
 * ORDEM IMPORTA: o consumidor precisa montar o className com `cn()` e passar
 * este token DEPOIS de `BOTAO_ACAO` — `hover:bg-primary/5` e
 * `hover:border-primary/30` substituem `hover:bg-muted/50` e
 * `hover:border-border` daquele token, e `cn` (tailwind-merge) é quem garante
 * que sobre um de cada grupo.
 */
export const FLOW_BOTAO_ACAO =
  'before:bg-primary hover:border-primary/30 hover:bg-primary/5 hover:text-primary-foreground [&>svg]:transition-colors [&>svg]:duration-slower hover:[&>svg]:text-primary-foreground';

/**
 * `BOTAO_ACAO` + o chevron do `Select` no tamanho do sistema (14px de projeto =
 * 17,5px reais, o mesmo `h-3.5` do trigger padrão): no trigger do filtro o
 * desenho é "ícone · rótulo ……… chevron", com o chevron empurrado à direita
 * pelo `justify-between` do token e centrado no eixo vertical pelo
 * `items-center`.
 *
 * `[&>svg]:shrink-0` é obrigatório, não enfeite: quando o rótulo é maior que a
 * `max-w` do trigger (título de vaga longo), o flex distribuía a sobra entre o
 * grupo do rótulo E o chevron — o chevron era comprimido de 17,5px para 12,2px
 * (medido no navegador em 1440). Com o chevron rígido, quem encolhe é só o
 * texto, que termina em reticências.
 *
 * O `[&>svg]` fica SÓ neste token. No botão Exportar o ícone de download também é
 * filho direto, e `svg:last-child` não resolve (o rótulo "Exportar" é nó de
 * texto, não conta como filho de elemento): o seletor pegava o download e o
 * encolhia. No trigger os únicos filhos diretos são o grupo do rótulo (um `div`,
 * ver `AnalyticsBarraFiltros`) e o chevron, então aqui o seletor só pode acertar
 * o chevron.
 */
export const BOTAO_ACAO_SELECT = `${BOTAO_ACAO} [&>svg]:h-[14px] [&>svg]:w-[14px] [&>svg]:shrink-0`;

/**
 * Seletor INTERNO de painel (janela da evolução). Mora na LINHA DA LEGENDA, no
 * rodapé do painel, ao lado das séries que ele controla — no cabeçalho ele
 * consumia ~96px dos ~220px disponíveis em 1440 e o título do painel caía em
 * reticências (medido). Mesma superfície da camada 3 e um degrau menor que o
 * `BOTAO_ACAO` do topo para não competir com ele.
 */
export const SELECT_PAINEL =
  'inline-flex h-7 w-auto items-center justify-between gap-1 rounded-lg border border-border/50 bg-[hsl(var(--foreground)/0.045)] px-2 text-[10.5px] font-medium leading-none text-muted-foreground transition-colors hover:text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring/50';

/**
 * GEOMETRIA do toggle de lista longa — a mesma em todas as cores.
 *
 * Fica separada da TINTA porque o botão existe em duas leituras e só a cor
 * muda: a neutra (`BOTAO_VER_TODOS`, painel de pontos de atenção) e a de
 * ACENTO lime (`BOTAO_VER_TODOS_PRIMARIO`, "Desempenho por vaga"). Tamanho,
 * tipografia e espaçamento são literalmente a mesma string nas duas — é isso
 * que garante que a troca de cor não mexa em nada de layout.
 */
const BASE_BOTAO_VER_TODOS =
  'inline-flex items-center gap-0.5 rounded-md px-0.5 py-1 text-[10.5px] font-medium leading-none focus:outline-hidden focus:ring-2 focus:ring-ring/50';

/**
 * Toggle "Ver todos / Ver menos" das listas longas (painel de pontos de
 * atenção).
 *
 * É um botão-fantasma: existe para ABRIR a lista, não para competir com o
 * cabeçalho do painel — mesma tinta do texto secundário, sem borda e sem
 * preenchimento, ganhando contraste só no hover/focus. Mora no CANTO SUPERIOR
 * DIREITO do cabeçalho, como na referência (abaixo da lista ele custava uma
 * linha inteira e desalinhava a altura dos três cards da faixa) e com o rótulo
 * CURTO ("Ver todos" / "Ver todas"): a contagem vive no subtítulo do painel, no
 * rodapé e no `aria-label` do botão.
 *
 * `text-[10.5px]` (13px reais): um degrau acima do antigo `text-[9px]`, para não
 * parecer um selo ao lado do título de 15px que os dois painéis da faixa usam.
 *
 * `px-0.5` e `gap-0.5` (2,5px reais cada): o rótulo mais o chevron ocupavam
 * ~95px e, com `px-1`/`gap-1`, o título "Desempenho por vaga" (190px reais) caía
 * em reticências por ~4px no painel de ~379px. O botão é um apoio do cabeçalho —
 * a folga extra vale mais no texto do painel do que no respiro interno dele.
 */
export const BOTAO_VER_TODOS = `${BASE_BOTAO_VER_TODOS} text-muted-foreground transition-colors hover:text-foreground`;

/**
 * A MESMA base acima, com a tinta de AÇÃO do tema: o verde-lime do Design
 * System (`--primary`, 68 100% 48% nos dois temas — o "Bombon Lime" da marca).
 *
 * Usado só pelo "Ver todas" do painel **Desempenho por vaga**, que abre a janela
 * com a base completa de vagas. O painel de pontos de atenção continua na versão
 * neutra: lá o botão só abre uma lista, aqui ele é a porta de um detalhamento —
 * e a cor é o que anuncia isso no canto superior direito do card.
 *
 * Regras da troca de cor (nada de layout):
 *   • `text-primary` ..... rótulo E ícone de seta na mesma cor (o chevron é
 *                         `currentColor`, herda sem precisar de classe própria);
 *   • `hover:bg-primary/10` véu lime de baixa opacidade, o mesmo degrau de
 *                         `primary/10` dos chips de ícone da aba — sem borda
 *                         nova, sem sombra e sem alterar as dimensões;
 *   • `duration-200` ..... 200ms (a régua pedida para esta transição), só no
 *                         `hover` do fundo; a cor já vinha em `transition-colors`.
 *
 * A cor é declarada AQUI, e não como override sobre `BOTAO_VER_TODOS`, de
 * propósito: duas classes de hover de texto no mesmo elemento (`hover:
 * text-foreground` + `hover:text-primary`) não têm ordem garantida no CSS
 * gerado e o vencedor dependeria da ordem de escrita do Tailwind.
 */
export const BOTAO_VER_TODOS_PRIMARIO = `${BASE_BOTAO_VER_TODOS} text-primary transition-colors duration-200 hover:bg-primary/10 hover:text-primary`;

/** Rótulo em caixa alta de 10px — o menor degrau tipográfico dos painéis. */
export const ROTULO_MINI = 'text-[10px] font-semibold uppercase tracking-widest text-muted-foreground';

/**
 * TOKEN do percentual de conversão de uma vaga — a leitura semântica que
 * acompanha a barra (o comprimento é a comparação; a cor do NÚMERO é o
 * veredito).
 *
 * A regra nasceu no card "Desempenho por vaga" e passou a ser consumida também
 * pela janela "Ver todas" (que repete o percentual em cada linha da tabela).
 * Ficou aqui para existir UMA faixa de corte no módulo:
 *   ≥ 50% → `success` · ≥ 20% → `info` · > 0 → `warning` · 0 → `muted-foreground`.
 *
 * Devolve o NOME do token (sem `--`): quem consome monta `hsl(var(--${token}))`.
 */
export function tokenDaConversao(conversao: number): string {
  if (conversao >= 50) return 'success';
  if (conversao >= 20) return 'info';
  if (conversao > 0) return 'warning';
  return 'muted-foreground';
}
