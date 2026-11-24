/**
 * CHIP DE FILTRO RÁPIDO — peça compartilhada de filtros do produto.
 *
 * Nasceu dentro de `AuditoriaAdmissoesContent.tsx`; com a Jornada de Onboarding
 * passando a ter a mesma faixa de chips, virou helper de `ui/` para que as duas
 * telas não mantenham duas cópias que possam divergir (a regra de ouro da
 * consolidação: uma implementação, dois consumidores).
 *
 * Só APRESENTAÇÃO: rótulo, contagem real, pontinho de cor, ícone e estado ativo.
 * Quem decide o que o clique faz é a tela.
 *
 * TRÊS VARIANTES — mesma peça, linguagens diferentes (o motivo de a geometria
 * NÃO morar fixa no botão):
 *  - `padrao`   o chip é o CONTEÚDO de um wrapper Motion que carrega a geometria
 *               (`flex-1 min-w-fit`): preenche o wrapper por igual e o ativo é a
 *               tinta CHEIA do `primary`. É o chip de Admissões e Onboarding.
 *  - `compacto` vive DIRETO na faixa flex da barra de filtros da Trilha de
 *               Auditoria de Desligamentos, como um item `flex-1 min-w-fit`: os
 *               chips absorvem a folga da linha (crescem por igual e a barra não
 *               fica com faixa vazia à direita), mas nunca encolhem abaixo do
 *               próprio texto — sem espaço, a barra rola por dentro. O ativo é
 *               contorno + tinta suave do `primary` com o contador em badge; o
 *               inativo é um casulo escuro discreto com o contador em texto — os
 *               seis chips e os três controles ficam colados na MESMA linha, sem
 *               o vão morto da versão anterior.
 *  - `brilho`   o chip dos filtros rápidos da Jornada de Onboarding — a MESMA
 *               anatomia de `padrao` (32px, `rounded-full`, `px-3`,
 *               `text-[11.5px]`, contador entre parênteses), pintado com o
 *               MESMO tema dos chips do Hub de Premiações (`avaliacao/
 *               ColoredFilterChip` + `PALETAS_CHIP`): a cor do STATUS aparece
 *               nos DOIS estados — repouso = borda 25% + tinta 10% + texto 90%
 *               + pílula do contador a 15%; selecionado = a MESMA família um
 *               degrau acima (borda 55–60%, tinta 20%, texto cheio) + o HALO
 *               `shadow-glow*` do tema. O repouso NÃO é mais um casulo cinza (a
 *               faixa deixa de ser um bloco apagado com um único ponto de cor) e
 *               o aceso nunca vira fundo sólido opaco. A família entra por
 *               `tom`; a bolinha continua usando a classe do `ponto`.
 */
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Geometria/linguagem visual do chip — ver o comentário do topo do arquivo. */
export type VarianteFilterChip = 'padrao' | 'compacto' | 'brilho';

/**
 * FAMÍLIA SEMÂNTICA do chip `brilho` — é a cor do STATUS do filtro, não a cor do
 * módulo.
 *
 * `primary`     verde/lima    → tudo em ordem (Todos, Em dia, No prazo)
 * `success`     verde         → resultado POSITIVO já confirmado (Aprovadas em
 *                               Central de Ajustes). Acrescentado à lista
 *                               original a pedido daquela tela: o chip precisava
 *                               do mesmo verde do `Badge variant="success"` que
 *                               o status da linha usa, e o `primary` (lima) já
 *                               estava tomado pelos "Pendentes". É só mais um
 *                               valor do union — nenhum call site existente muda.
 * `warning`     laranja/âmbar → atenção (Em risco)
 * `destructive` vermelho      → prazo estourado (Atrasados, Fora do prazo)
 * `neutro`      cinza/slate   → sem juízo de valor (Sem próxima ação, Este mês)
 *
 * A cor sai dos TOKENS do design system (`--primary`, `--success`, `--warning`,
 * `--destructive-vivid`), os MESMOS que o `PALETAS_CHIP` do Hub consome: os dois
 * chips de filtro do produto acendem no mesmo matiz e acompanham claro/escuro
 * sozinhos. Escrever hex/lime-500 aqui criaria uma segunda paleta — foi o que
 * deixou o chip da Jornada com um verde de outra família.
 */
export type TomChipBrilho = 'primary' | 'success' | 'warning' | 'destructive' | 'neutro';

/**
 * TEMA DO CHIP `brilho` — a MESMA escada de tinta dos chips do Hub de Premiações
 * (`avaliacao/chipFiltroComum` → `PALETAS_CHIP`, a referência aprovada), agora
 * aplicada aos DOIS estados:
 *
 *   repouso      borda 25% + tinta 10% + texto 90% + pílula do contador a 15%
 *   selecionado  borda 55–60% + tinta 20% + texto cheio + halo `shadow-glow*`
 *
 * As duas pontas ficam na MESMA família: é o que faz a faixa ler como um mapa de
 * status (lima = em dia, âmbar = em risco, vermelho = atrasado) em vez de um
 * bloco cinza com um único chip colorido. A primeira versão apagava a cor no
 * repouso e o resultado era exatamente esse bloco cinza — o chip aceso ficava
 * sozinho, e o pedido virou "igual ao Hub de Premiações".
 *
 * As classes são LITERAIS de propósito: o scanner do Tailwind lê este arquivo em
 * build-time, então uma classe montada por interpolação (`bg-${tom}/10`) não
 * geraria CSS nenhum.
 */
interface TemaChipBrilho {
  /** Texto no repouso (colorido, um degrau abaixo do selecionado). */
  texto: string;
  /** Borda no repouso (colorida, discreta). */
  borda: string;
  /** Fundo no repouso: tinta de 10% da família. */
  fundo: string;
  hoverFundo: string;
  hoverBorda: string;
  hoverTexto: string;
  /** Pílula do contador no repouso (tinta 15% + número na cor da família). */
  contador: string;
  /** Fundo no selecionado: tinta de 20% (vidro, nunca preenchimento opaco). */
  fundoAtivo: string;
  /** Borda no selecionado (bem mais forte que a do repouso). */
  bordaAtiva: string;
  /** Texto no selecionado (cor cheia). */
  textoAtivo: string;
  /** Pílula do contador no selecionado (tinta 25% + número na cor cheia). */
  contadorAtivo: string;
  /** Halo do selecionado — token `shadow-glow*` de `tailwind.config.js`. */
  glow: string;
}

/** Famílias do `brilho`, na mesma ordem e degraus do `PALETAS_CHIP`. */
const TEMA_CHIP_BRILHO: Record<TomChipBrilho, TemaChipBrilho> = {
  // Verde/lima da marca — "Todos", "Em dia", "No prazo".
  primary: {
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
  // Âmbar — "Em risco".
  warning: {
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

  // Verde de resultado confirmado — "Aprovadas". Mesma escada do `warning`, no
  // token `--success` e com o halo `shadow-glow-success` do tema.
  success: {
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

  // Vermelho — "Atrasados", "Fora do prazo". Usa `destructive-vivid`, o vermelho
  // vivo do tema (o `--destructive` puro fica apagado sobre o navy), o MESMO
  // token do chip vermelho do Hub.
  destructive: {
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
  // Cinza/slate — "Sem próxima ação", "Este mês". Esta família NÃO existe no
  // `PALETAS_CHIP` (todas as categorias de Desempenho têm cor), então é
  // declarada aqui na MESMA régua das outras — inclusive o halo
  // (`0 0 20px -5px` a 0.4), em slate no lugar do matiz de status.
  //
  // `dark:` nas cores de TEXTO: a família nasceu com os degraus do tema escuro
  // (slate-300 sobre o navy). No tema claro o mesmo slate-300 fica quase
  // invisível sobre o card branco, então o texto ganha um degrau escuro em
  // `:root` e mantém o tom aprovado no `.dark` — nenhuma tela escura muda.
  neutro: {
    texto: 'text-slate-600/90 dark:text-slate-300/90',
    borda: 'border-slate-500/25',
    fundo: 'bg-slate-500/10',
    hoverFundo: 'hover:bg-slate-500/15',
    hoverBorda: 'hover:border-slate-500/45',
    hoverTexto: 'hover:text-slate-700 dark:hover:text-slate-300',
    contador: 'bg-slate-500/15 text-slate-700/90 dark:text-slate-300/90',
    fundoAtivo: 'bg-slate-500/20',
    bordaAtiva: 'border-slate-500/55',
    textoAtivo: 'text-slate-700 dark:text-slate-300',
    contadorAtivo: 'bg-slate-500/25 text-slate-700 dark:text-slate-200',
    glow: 'shadow-[0_0_20px_-5px_rgba(148,163,184,0.4)]',
  },
};

export interface FilterChipProps {
  label: string;
  total: number;
  ativo: boolean;
  /** Classe do pontinho de cor (`bg-*`); omitida nos chips neutros. */
  ponto?: string;
  /**
   * Família de cor do chip `brilho` — define borda, tinta, texto e contador nos
   * DOIS estados e o halo do selecionado. Omitido, cai no NEUTRO. Nas variantes
   * `padrao`/`compacto` é ignorada (a cor vem do `primary`).
   */
  tom?: TomChipBrilho;
  icone?: LucideIcon;
  variante?: VarianteFilterChip;
  /**
   * APARÊNCIA SÓLIDA do `brilho` — opt-in, usada pela Central de Ajustes.
   *
   * A variante `brilho` acende em VIDRO (tinta de 20% + halo) porque nas telas
   * de Onboarding e Premiações o selecionado convive com vários chips coloridos
   * na mesma faixa. Na barra de status de uma fila de trabalho a leitura pedida
   * é outra: o chip SELECIONADO é o lime CHEIO do sistema com texto escuro
   * (`primary` + `primary-foreground`, o mesmo par do botão primário e da
   * página ativa da paginação) e os NÃO selecionados são casulos escuros com a
   * cor semântica no ícone.
   *
   * Só muda o PREENCHIMENTO dos estados — rótulo, contagem real, `aria-pressed`
   * e área de clique seguem idênticos. Default `false`: nenhum call site
   * existente muda de aparência.
   */
  solido?: boolean;
  onClick: () => void;
  /**
   * Ajustes de geometria do CHAMADOR (altura, respiro, `flex-none`) — entram por
   * último no `cn`, então vencem a geometria da variante via tailwind-merge.
   * Existe para que uma tela mais densa (Hub de Premiações, barra de filtros de
   * 48–52 px) use a MESMA peça sem que as demais telas mudem de tamanho.
   */
  className?: string;
}

/** Atalho arredondado de filtro com contagem real. */
export function FilterChip({
  label,
  total,
  ativo,
  ponto,
  tom,
  icone: Icone,
  variante = 'padrao',
  solido = false,
  onClick,
  className,
}: FilterChipProps) {
  // `compacto` vive em faixa flex SEM wrapper: precisa medir o próprio texto
  // (`w-auto shrink-0`). Sem isso o `w-full` herdado faria cada chip ocupar a
  // linha inteira — era exatamente esse o defeito da barra da Trilha.
  const compacto = variante === 'compacto';
  // `brilho` é a linguagem colorida + halo (Onboarding). A família é resolvida
  // SEMPRE (é só um lookup de objeto, sem custo): sem `tom`, cai no NEUTRO —
  // proteção para o chamador esquecido nunca herdar o lime da marca por engano.
  const brilho = variante === 'brilho';
  const tema = TEMA_CHIP_BRILHO[tom ?? 'neutro'];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        // `flex` (não `inline-flex`) evita o respiro de linha do formato inline,
        // mantendo a altura exata do chip. Comportamento de hover, foco e estado
        // ativo intactos nas três variantes.
        'flex items-center justify-center whitespace-nowrap border font-medium',
        // A transição é o que faz o HALO entrar/sair suave no `brilho` (a
        // box-shadow é interpolada); nas outras duas variantes o custo é só a cor.
        brilho ? 'transition-all duration-200 motion-reduce:transition-none' : 'transition-colors',
        compacto
          ? // Dimensões do chip compacto: 38px de altura, raio 10px, 10px de
            // respiro lateral e 6px entre rótulo e contador. `flex-1 min-w-fit`:
            // na barra de filtros os chips ABSORVEM a folga da linha e crescem por
            // igual (a barra não pode ter faixa vazia à direita), mas nunca
            // encolhem abaixo do próprio texto — quando não cabe, a barra rola.
            'h-[38px] min-w-fit flex-1 gap-1.5 rounded-[10px] px-2.5 text-[11px]'
          : // `w-full`: o chip é o CONTEÚDO de um wrapper Motion que carrega a
            // geometria (`flex-1 min-w-fit`) — o botão só preenche o wrapper. A
            // geometria é a MESMA em `padrao` e `brilho`: padronizar a tinta não
            // pode mexer em altura, raio, respiro nem tipografia.
            'h-8 w-full min-w-fit gap-2 rounded-full px-3 text-[11.5px]',
        ativo
          ? brilho
            ? solido
              ? // ATIVO SÓLIDO (Central de Ajustes): lime CHEIO do sistema com
                // texto escuro — o mesmo par `primary`/`primary-foreground` do
                // botão primário e da página ativa da paginação. É o chip que
                // domina a faixa, e é para dominar: é a fila em que se está
                // trabalhando.
                'border-primary bg-primary text-primary-foreground shadow-glow'
              : // ATIVO BRILHO = a MESMA família do repouso um degrau acima (tinta
                // 20%, borda 55–60%, texto cheio) + o HALO do tema. Quem destaca é
                // a cor acesa + o glow — nunca um fundo sólido opaco, que apagaria
                // o vidro e voltaria a dominar a faixa.
                cn(tema.fundoAtivo, tema.bordaAtiva, tema.textoAtivo, tema.glow)
            : compacto
              ? // ATIVO COMPACTO = contorno fino + tinta suave do `primary` (lime):
                // destaca sem a faixa sólida que dominava a barra.
                'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15'
              : // ATIVO PADRÃO = tinta cheia do `primary` com texto escuro — o
                // destaque forte da referência de Admissões/Onboarding.
                'border-primary bg-primary text-primary-foreground shadow-sm'
          : brilho
            ? solido
              ? // INATIVO SÓLIDO: casulo escuro com borda discreta. A cor
                // semântica do status NÃO desaparece — ela vai para o ÍCONE
                // (ver o bloco do ícone abaixo), o que mantém o mapa de cores
                // da faixa sem transformar os chips em pílulas translúcidas.
                'border-border/60 bg-muted/25 text-muted-foreground hover:border-border/80 hover:bg-muted/40 hover:text-foreground'
              : // INATIVO BRILHO = casulo COLORIDO da mesma família (borda 25%,
                // tinta 10%, texto 90%): o repouso não pode virar cinza, senão a
                // faixa perde o mapa de status e sobra um único chip colorido —
                // exatamente o defeito corrigido aqui.
                cn(tema.borda, tema.fundo, tema.texto, tema.hoverBorda, tema.hoverFundo, tema.hoverTexto)
            : compacto
              ? // INATIVO COMPACTO: casulo escuro próprio (`bg-muted/25` + borda
                // visível) para a faixa ler como UMA barra de filtros, como na
                // referência — e não como rótulos soltos sobre o fundo do card.
                'border-border/60 bg-muted/25 text-muted-foreground hover:border-border/80 hover:bg-muted/40 hover:text-foreground'
              : // INATIVO PADRÃO (Admissões/Onboarding): fundo do próprio card.
                'border-border/40 bg-card text-muted-foreground hover:border-border/70 hover:bg-muted/50 hover:text-foreground',
        className
      )}
    >
      {ponto && (
        <span
          className={cn(
            'h-1.5 w-1.5 shrink-0 rounded-full',
            // No `brilho` a bolinha é SÓLIDA na cor do status nos DOIS estados,
            // como no Hub de Premiações: o repouso já carrega a tinta da família,
            // então apagar a bolinha (50%) tiraria dela o ponto de referência do
            // matiz — e o chip deixaria de ler como "verde/âmbar/vermelho".
            brilho ? ponto : ativo ? (compacto ? 'bg-primary' : 'bg-primary-foreground/60') : ponto
          )}
        />
      )}
      {Icone && (
        <Icone
          className={cn(
            // `solido` pede ícone menor (12 px) — a faixa densa da Central de
            // Ajustes não pode gastar 14 px por glifo.
            solido ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0',
            ativo && !compacto && !brilho && 'text-primary-foreground',
            // No `solido` a cor semântica vive no ÍCONE: escuro sobre o lime
            // aceso, cor cheia da família no repouso.
            brilho && solido && (ativo ? 'text-primary-foreground' : tema.texto)
          )}
        />
      )}
      {label}
      {/* Espaço só no `brilho`: em `flex` um nó de whitespace puro não vira
          item (não ocupa pixel), mas mantém o nome acessível legível —
          "Todos 13" em vez de "Todos13". */}
      {brilho && ' '}
      {compacto ? (
        <span
          className={cn(
            // Contador com padding mínimo: a caixa do contador ativo fica justa
            // no número e o chip mantém exatamente a mesma largura nos dois
            // estados (a barra de filtros nunca quebra, então não pode haver
            // salto de largura ao alternar ativo/inativo).
            'rounded-md px-0.5 py-0.5 text-center text-[10px] font-semibold tabular-nums',
            ativo ? 'bg-primary/20 text-primary' : 'text-muted-foreground/70'
          )}
        >
          {total}
        </span>
      ) : brilho ? (
        // CONTADOR DO `brilho` — SÓ o número, sem parênteses: a faixa fica
        // limpa e o espaço entre o rótulo e a contagem já vem do `gap-2` do
        // botão. O número mora na pílula translúcida da família (tinta 15% no
        // repouso, 25% no aceso) na cor do status — a MESMA leitura dos chips
        // do Hub de Premiações.
        <span
          className={cn(
            // Padding idêntico nos dois estados: alternar ativo/inativo não
            // muda a largura do chip, então a faixa nunca dá "pulo".
            'rounded-full px-1.5 py-px leading-none tabular-nums transition-colors',
            ativo
              ? solido
                ? 'bg-primary-foreground/20 font-semibold text-primary-foreground'
                : cn('font-semibold', tema.contadorAtivo)
              : solido
                ? 'bg-foreground/5 text-muted-foreground'
                : tema.contador
          )}
        >
          {total}
        </span>
      ) : (
        <span
          className={cn(
            // `padrao`: contador no formato `(n)`, herdando `primary-foreground`
            // no chip de tinta cheia.
            'tabular-nums',
            ativo ? 'text-primary-foreground/70' : 'text-muted-foreground/60'
          )}
        >
          ({total})
        </span>
      )}
    </button>
  );
}
