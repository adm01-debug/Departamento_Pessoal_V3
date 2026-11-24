/**
 * ============================================================================
 * INTERAÇÃO DE CARD — a régua única do HOVER do sistema.
 *
 * FONTE DE VERDADE: `dashboard/MetricCard.tsx` — o card do Dashboard
 * Principal, a rota de referência. É o ÚNICO hover de card que existe naquela
 * página (os cards de conteúdo — Headcount, Departamentos, Status do Sistema,
 * Resumo Operacional, Próximas Atividades — são `Card` puros, sem hover), então
 * é ele que define "o hover de card do Dashboard Principal". O que ele faz:
 *
 *   elevação : −2px em Y, 250ms (`whileHover` da Motion)
 *   borda    : `border-border/60` → `primary/40` a 500ms (`duration-slower`,
 *              o passo do `@theme` para transição de componente) — a MESMA
 *              transição que suaviza fundo e cor
 *   ícone    : o chip escala 1.05 em 360ms (`duration-slow`) via `group-hover`
 *   sombra   : NENHUMA mudança — o card mantém o `shadow-card` do repouso
 *   cursor   : só vira `pointer` quando o card realmente navega
 *
 * O QUE NÃO EXISTE AQUI (e por isso não deve ser inventado em nenhum módulo):
 * `hover:shadow-*`, escala do card inteiro, rotação, `whileTap`, mola/spring.
 * O `variant="interactive"` de `ui/card.tsx` (shadow-elevated + `-translate-y-0.5`
 * + `cursor-pointer` sempre) é outra coisa e NÃO é o que o Dashboard usa.
 *
 * ── POR QUE UMA CLASSE DE CSS E NÃO `whileHover` ───────────────────────────
 * Medido no navegador: com `whileHover`, a SAÍDA do hover não usa a duração do
 * hover — ela usa a transição da variante de ENTRADA (`entradaCard(index)`),
 * que carrega o `delay` do slot da cascata. Nos cards do Dashboard (slots 0–4)
 * isso passa despercebido, mas um painel no slot 7 ficaria 840ms parado no ar
 * antes de descer, e o do rodapé (slot 10) 1,2s. A classe abaixo dá entrada e
 * saída na mesma duração, sem tocar na régua global de entrada.
 *
 * `transform` também não podia ser usado: a entrada do card é `transform`
 * inline escrita pela Motion. `.card-interacao` (`index.css`) anima `translate`,
 * a propriedade independente — as duas convivem sem `!important` e sem
 * briga de cascata (o `transition-all` do `Card` é sobrescrito por estar fora
 * de `@layer`).
 *
 * `translate` no hover não afeta layout: nenhuma caixa muda de tamanho, altura
 * ou posição no fluxo (o grid não reflui), então é seguro em card que hospeda
 * gráfico, botão, `Select` ou barra de progresso — nada é deslocado dentro
 * dele, o conteúdo sobe junto.
 *
 * MOVIMENTO REDUZIDO: o deslocamento é desligado pelo bloco
 * `@media (prefers-reduced-motion: reduce)` do `index.css` (junto do
 * `.animate-squash`); a troca de borda continua, porque cor não é movimento.
 * A decisão de modo continua sendo só do `lib/motionMode.ts`.
 * ============================================================================
 */
/**
 * Números do hover — os mesmos medidos no `MetricCard` do Dashboard Principal.
 * Quem os aplica de fato é a classe `.card-interacao` do `index.css` (única
 * camada que consegue vencer o `transition-all` do `Card` e dar durações
 * diferentes por propriedade). Este objeto existe para que a régua tenha UM
 * lugar de leitura/documentação no TypeScript.
 */
export const CONFIG_INTERACAO_CARD = {
  /** Deslocamento vertical do card no hover (px). */
  elevacaoY: -2,
  /** Duração da elevação — entrada e saída (ms). */
  duracaoElevacaoMs: 250,
  /** Duração da troca de borda (`--transition-duration-slower`, 500ms). */
  duracaoBordaMs: 500,
  /** Escala do chip de ícone dentro do card. */
  escalaIcone: 1.05,
} as const;

/**
 * Classes do CONTAINER do card. Entram em `cn(...)` junto do resto do desenho:
 * a borda de repouso (`border-border/XX`) continua sendo do call site — o que
 * esta constante soma é a TRANSIÇÃO + a elevação (`.card-interacao`) e o
 * destino da borda no hover (`hover:border-primary/40`).
 *
 * `hover:border-primary/40` fica como UTILITY (e não dentro da classe de CSS)
 * porque a borda de repouso também é utility (`border-border/55`): as duas
 * disputam na mesma camada e a pseudo-classe (`:hover`, especificidade 0,2,0)
 * vence a de repouso (0,1,0), independente da ordem no `className`.
 */
export const CARD_INTERACAO = 'card-interacao hover:border-primary/40';

/**
 * Classes do CHIP DE ÍCONE — só para cards que têm um (KPI, indicador). Exige
 * `group` no container do card (o Dashboard põe o `group` no próprio card).
 *
 * Não é um efeito novo: é o mesmo do `MetricCard`, e existe para o card ganhar
 * um ponto de vida sem animar número, texto ou gráfico.
 */
export const CARD_INTERACAO_ICONE = 'transition-transform duration-slow group-hover:scale-105';

/* ──────────────────────────────────────────────────────────────────────────
 * PERFIL ESTÁTICO — o OPT-OUT da régua, decidido pela ÁREA, não pelo sistema
 *
 * Uma tela pode optar por NÃO ter hover de card. É o caso da aba **Analytics
 * de Recrutamento** (`components/recrutamento/Analytics*`): são 15 superfícies
 * desenhadas com a régua (4 KPIs + 7 painéis + 4 indicadores) e o hover
 * decorativo delas competia com o que a tela realmente oferece ao mouse — o
 * `InfoTooltip` dos KPIs, os ladrilhos coloridos do funil e do tempo, e as
 * linhas de origem e vaga. A revisão de UI/UX pediu cards visualmente PARADOS:
 * sem elevação, sem o contorno `primary` (o verde-lime do tema) e sem fundo
 * mudando ao passar o mouse.
 *
 * POR QUE UMA CONSTANTE VAZIA E NÃO A AUSÊNCIA DO TOKEN NO CALL SITE: assim o
 * `className` continua lendo "aqui existe uma decisão de interação" — e não
 * parece que alguém esqueceu o hover —, e a área inteira volta a animar
 * trocando DOIS identificadores nos três arquivos que a consomem. Também não
 * serve `hover:border-primary/0`: um valor com alfa mantém a transição de
 * `border-color` do `Card` viva e o contorno pisca no primeiro quadro.
 *
 * O QUE ESTES TOKENS **NÃO** DESLIGAM (de propósito): hover/focus de botão,
 * filtro, `Select` e `InfoTooltip`; a ENTRADA dos cards (`entradaCard` /
 * `.animate-squash`); e a animação das barras de progresso. Só o container do
 * card fica em repouso — a borda neutra e a superfície de repouso continuam
 * vindo do call site, intactas.
 * ------------------------------------------------------------------------ */

/** Container do card SEM hover: sem `.card-interacao`, sem `hover:border-*`. */
export const CARD_INTERACAO_ESTATICO = '';

/** Chip de ícone em repouso — o par de `CARD_INTERACAO_ESTATICO` (sem o `scale-105`). */
export const CARD_INTERACAO_ICONE_ESTATICO = '';
