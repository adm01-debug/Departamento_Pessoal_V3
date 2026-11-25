import { cn } from '@/lib/utils';

/**
 * ============================================================================
 * AÇÕES SECUNDÁRIAS DOS CARDS DO CONTROLE DE PONTO — o MESMO lime nos três
 *
 * Os três links de canto de card do dashboard de `/ponto` — **"Ver detalhes"**
 * (Banco de Horas), **"Ver relatório"** (Horas Trabalhadas) e **"Ver todas"**
 * (Últimas Batidas) — passam a usar UMA única pintura, em vez de repetir a
 * mesma string de classes em três arquivos (que foi como os três divergirem
 * ficou fácil: qualquer ajuste em um deles deixava os outros para trás).
 *
 * O QUE MUDA: só a COR do texto e da seta. O lime é o oficial do sistema —
 * `--primary` (o mesmo "Bombon Lime" de `bg-primary/15 text-primary` no ícone
 * do cabeçalho desses cards, da aba ativa e do CTA do Dashboard), então os
 * três botões passam a ler como parte da identidade, e não como texto neutro.
 *
 * O QUE NÃO MUDA: geometria, tipografia, peso, posicionamento, fundo e
 * comportamento. A base abaixo é EXATAMENTE o className que os três já tinham
 * (`h-6 shrink-0 gap-1 rounded-lg px-2 font-body text-[10px]`) — `h-6`,
 * `rounded-lg`, `px-2`, `font-body` e `text-[10px]` continuam vindo daqui (a
 * escala de 125% do `<html>` só os converte em 30px / 15px / 10px / 12,5px na
 * tela), então nenhum botão troca de tamanho, de peso, de fonte ou de lugar na
 * linha do título. `bg-transparent` só torna explícito o repouso que o
 * `variant="ghost"` já entregava: nada de preenchimento nem de borda.
 *
 * HOVER: preservado. O véu `hover:bg-accent` é o mesmo que o `ghost` já dava
 * (o `twMerge` mantém um só), e a cor NÃO sai do lime — ela sobe um degrau para
 * `--primary-glow`, que é a variação clara do MESMO matiz já usada em
 * `from-primary to-primary-glow` nos CTAs premium. Nada de voltar ao
 * `hover:text-accent-foreground` do ghost: o lime sobrevive à interação.
 * A transição continua sendo a do próprio `Button` (`transition-all`, a régua
 * do sistema) — nenhuma classe de duração foi adicionada ou removida aqui.
 *
 * A SETA: `<ArrowRight className="h-3 w-3" />` não tem cor própria; ícone do
 * lucide desenha com `stroke="currentColor"`, ou seja, herda o lime do botão
 * EXATO (mesmo matiz, mesmo alfa). Por isso a seta NÃO recebe classe de cor
 * aqui: declarar uma cor própria seria justamente o caminho para as duas
 * pontas divergirem no futuro.
 *
 * POR QUE CLASSE E NÃO UMA VARIANTE NOVA EM `ui/button.tsx`: uma variante é
 * global e passaria a valer para toda a aplicação, quando o pedido é o padrão
 * dos cards de Ponto — o mesmo motivo que levou `acoesCabecalhoPonto.ts` a
 * exportar strings (ver o comentário de lá). Os três chamadores continuam com
 * o MESMO `<Button variant="ghost" size="sm">` de antes; só a pintura vem
 * daqui.
 *
 * MOVIMENTO REDUZIDO: nada a fazer. Cor não é movimento — a troca de matiz no
 * hover continua sob `prefers-reduced-motion`, do mesmo jeito que já acontecia
 * com o `hover:text-accent-foreground` do ghost.
 * ============================================================================
 */

/**
 * BASE — geometria, tipografia e repouso transparente, idênticos nos três.
 *
 * Cada utilitário aqui já existia nos três botões; foram apenas reunidos num
 * lugar só. `shrink-0` segue impedindo que o `flex` do cabeçalho esprema o
 * botão quando o título do card é longo, e `whitespace-nowrap` (do `Button`)
 * continua garantindo rótulo em uma linha.
 */
const BASE_ACAO_CARD = cn(
  'h-6',
  'shrink-0',
  'gap-1',
  'rounded-lg',
  'px-2',
  'font-body',
  'text-[10px]',
  // Fundo transparente no repouso — requisito do pedido e comportamento que o
  // `variant="ghost"` já tinha.
  'bg-transparent'
);

/**
 * TOM — o lime da marca no repouso e um degrau mais claro no hover.
 *
 * `text-primary` = `--primary` (68 100% 48% — o mesmo valor nos dois temas).
 * `hover:text-primary-glow` = `--primary-glow` (68 100% 58% no claro, 60% no
 * escuro), a "variação ligeiramente mais clara" sem trocar de matiz.
 */
const TOM_LIME_ACAO_CARD = cn('text-primary', 'hover:text-primary-glow', 'hover:bg-accent');

/**
 * A ação secundária de card do Controle de Ponto — texto e seta em lime.
 *
 * Usada por "Ver detalhes", "Ver relatório" e "Ver todas"; os três nomes abaixo
 * existem só para o teste de contrato apontar cada botão pelo seu rótulo.
 */
export const ACAO_CARD_LIME = cn(BASE_ACAO_CARD, TOM_LIME_ACAO_CARD);

/** Os três botões, com a MESMA classe — consumido pelo teste de contrato. */
export const ACOES_CARDS_PONTO = {
  verDetalhes: ACAO_CARD_LIME,
  verRelatorio: ACAO_CARD_LIME,
  verTodas: ACAO_CARD_LIME,
} as const;
