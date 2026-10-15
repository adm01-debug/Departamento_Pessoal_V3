/**
 * ============================================================================
 * DESIGN SYSTEM DOS CHIPS COLORIDOS DE FILTRO — Gestão de Desempenho.
 *
 * Esta é a configuração ÚNICA das cores dos chips de filtro coloridos do
 * módulo: a MESMA usada pela Auditoria (referência aprovada) e por todas as
 * abas que têm chips da mesma categoria (Metas & OKRs, Feedbacks, PDI).
 *
 * A identidade de COR de cada categoria vive SÓ aqui — o componente do chip
 * (`ColoredFilterChip`) não conhece nenhum nome de cor, só consome `TemaChip`.
 * Assim os estados repouso, hover e selecionado ficam consistentes entre si
 * (bolinha, texto, contador, fundo e borda sempre na MESMA família).
 *
 * ── POR QUE OS TOKENS MORAM NUM MÓDULO PRÓPRIO ──────────────────────────────
 * Nascido dentro de `auditoriaComum.ts` (a aba Auditoria foi a primeira a usar
 * este desenho), o tema foi EXTRAÍDO para cá quando as demais abas passaram a
 * consumir o mesmo padrão. `auditoriaComum` continua reexportando tudo, então
 * a aparência/funcionamento originais da Auditoria não mudam.
 *
 * As classes são LITERAIS de propósito: o scanner do Tailwind lê este arquivo
 * em build-time e uma classe montada por interpolação (`bg-${cor}/10`) não
 * geraria CSS nenhum. As cores saem dos tokens do design system (`--primary`,
 * `--info`, `--success`, `--warning`, `--destructive-vivid`, `--chart-4`), que
 * já mudam por tema — o chip acompanha claro/escuro sozinho.
 * ============================================================================
 */
export interface TemaChip {
  /** Bolinha indicadora — sólida, na cor da categoria, em TODOS os estados. */
  ponto: string;
  /** Texto no repouso (leve coloração temática, sem parecer "apagado"). */
  texto: string;
  /** Borda no repouso (levemente colorida). */
  borda: string;
  /** Fundo no repouso (tint/transparência da cor da categoria). */
  fundo: string;
  /** Fundo no hover (intensidade discretamente maior). */
  hoverFundo: string;
  /** Borda no hover (reforçada). */
  hoverBorda: string;
  /** Texto no hover (mais legível, ainda na cor da categoria). */
  hoverTexto: string;
  /** Contador no repouso, na mesma linguagem visual da categoria. */
  contador: string;
  /** Fundo no selecionado (mais intenso que o repouso). */
  fundoAtivo: string;
  /** Borda no selecionado (mais forte). */
  bordaAtiva: string;
  /** Texto no selecionado (mais destacado). */
  textoAtivo: string;
  /** Contador no selecionado (mais destacado). */
  contadorAtivo: string;
  /** Brilho/sombra temática do estado selecionado. */
  glow: string;
}

/** Paletas disponíveis para os chips — a configuração ÚNICA das cores. */
export type PaletaChip = 'lime' | 'blue' | 'emerald' | 'amber' | 'red' | 'violet';

export const PALETAS_CHIP: Record<PaletaChip, TemaChip> = {
  // Todos / Feedbacks — lime da marca.
  lime: {
    ponto: 'bg-primary',
    texto: 'text-primary/90',
    borda: 'border-primary/25',
    fundo: 'bg-primary/10',
    hoverFundo: 'hover:bg-primary/15',
    hoverBorda: 'hover:border-primary/45',
    hoverTexto: 'hover:text-primary',
    contador: 'bg-primary/15 text-primary/90',
    fundoAtivo: 'bg-primary/20',
    bordaAtiva: 'border-primary/60',
    textoAtivo: 'text-primary',
    contadorAtivo: 'bg-primary/25 text-primary',
    glow: 'shadow-glow',
  },
  // Ciclos / PDI em andamento / Feedbacks (pares) — azul.
  blue: {
    ponto: 'bg-info',
    texto: 'text-info/90',
    borda: 'border-info/25',
    fundo: 'bg-info/10',
    hoverFundo: 'hover:bg-info/15',
    hoverBorda: 'hover:border-info/45',
    hoverTexto: 'hover:text-info',
    contador: 'bg-info/15 text-info/90',
    fundoAtivo: 'bg-info/20',
    bordaAtiva: 'border-info/55',
    textoAtivo: 'text-info',
    contadorAtivo: 'bg-info/25 text-info',
    glow: 'shadow-glow-info',
  },
  // Metas & OKRs / "Em dia" / Feedbacks (gestor) / PDI concluído — verde/teal.
  emerald: {
    ponto: 'bg-success',
    texto: 'text-success/90',
    borda: 'border-success/25',
    fundo: 'bg-success/10',
    hoverFundo: 'hover:bg-success/15',
    hoverBorda: 'hover:border-success/45',
    hoverTexto: 'hover:text-success',
    contador: 'bg-success/15 text-success/90',
    fundoAtivo: 'bg-success/20',
    bordaAtiva: 'border-success/55',
    textoAtivo: 'text-success',
    contadorAtivo: 'bg-success/25 text-success',
    glow: 'shadow-glow-success',
  },
  // PDI / "Em risco" — laranja/âmbar.
  amber: {
    ponto: 'bg-warning',
    texto: 'text-warning/90',
    borda: 'border-warning/25',
    fundo: 'bg-warning/10',
    hoverFundo: 'hover:bg-warning/15',
    hoverBorda: 'hover:border-warning/45',
    hoverTexto: 'hover:text-warning',
    contador: 'bg-warning/15 text-warning/90',
    fundoAtivo: 'bg-warning/20',
    bordaAtiva: 'border-warning/55',
    textoAtivo: 'text-warning',
    contadorAtivo: 'bg-warning/25 text-warning',
    glow: 'shadow-glow-warning',
  },
  // Nine-Box / "Atrasadas" — vermelho.
  red: {
    ponto: 'bg-destructive-vivid',
    texto: 'text-destructive-vivid/90',
    borda: 'border-destructive-vivid/30',
    fundo: 'bg-destructive-vivid/10',
    hoverFundo: 'hover:bg-destructive-vivid/15',
    hoverBorda: 'hover:border-destructive-vivid/50',
    hoverTexto: 'hover:text-destructive-vivid',
    contador: 'bg-destructive-vivid/15 text-destructive-vivid/90',
    fundoAtivo: 'bg-destructive-vivid/20',
    bordaAtiva: 'border-destructive-vivid/60',
    textoAtivo: 'text-destructive-vivid',
    contadorAtivo: 'bg-destructive-vivid/25 text-destructive-vivid',
    glow: 'shadow-glow-destructive',
  },
  // Feedbacks (autoavaliação) — violeta do tema (`--chart-4`).
  // `--chart-4` não é utilitário registrado no `tailwind.config.js`, então entra
  // por valor arbitrário — o MESMO padrão já usado no restante do módulo. A
  // opacidade vai DENTRO do `hsl()` (não pelo modificador `/opacity`), porque o
  // Tailwind não compõe opacidade sobre uma cor `hsl(var(--token))` arbitrária.
  violet: {
    ponto: 'bg-[hsl(var(--chart-4))]',
    texto: 'text-[hsl(var(--chart-4)/0.9)]',
    borda: 'border-[hsl(var(--chart-4)/0.25)]',
    fundo: 'bg-[hsl(var(--chart-4)/0.10)]',
    hoverFundo: 'hover:bg-[hsl(var(--chart-4)/0.16)]',
    hoverBorda: 'hover:border-[hsl(var(--chart-4)/0.45)]',
    hoverTexto: 'hover:text-[hsl(var(--chart-4))]',
    contador: 'bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4)/0.9)]',
    fundoAtivo: 'bg-[hsl(var(--chart-4)/0.20)]',
    bordaAtiva: 'border-[hsl(var(--chart-4)/0.60)]',
    textoAtivo: 'text-[hsl(var(--chart-4))]',
    contadorAtivo: 'bg-[hsl(var(--chart-4)/0.25)] text-[hsl(var(--chart-4))]',
    glow: 'shadow-glow-chart-4',
  },
};

/**
 * Tema do chip "Todos" — o lime da marca, o mesmo slot de Feedbacks (o "Todos"
 * é o filtro agregador, não uma categoria; o que precisa ficar distinguível são
 * as categorias, que têm uma cor própria cada).
 */
export const TEMA_TODOS: TemaChip = PALETAS_CHIP.lime;
