import { Search, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { HEADER_REVEAL } from './organogramaHeaderReveal';

interface OrganogramaToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

/**
 * Destaque lime das duas ações do cabeçalho, no mesmo vocabulário dos botões de
 * destaque que já existem no projeto (fundo, borda, texto e halo saem TODOS do
 * token `primary`), mas com os quatro estados (repouso, hover, active/pressed e
 * focus) declarados um a um.
 *
 * Por que estado a estado, e não só "no hover": o `variant="outline"` traz
 * `hover:bg-accent hover:text-accent-foreground`, e no tema escuro
 * `--accent-foreground` é QUASE BRANCO (`60 10% 92%`) — sobre o lime claro isso
 * apaga rótulo e ícone. Deixar `bg`/`text`/`border` repetidos em cada estado
 * garante que nenhum fallback do variant (ou de um estado que eu não previ)
 * volte a pintar o texto de claro em cima do lime.
 *
 *   Tinta    `text-primary-foreground` em todos os estados =
 *            `hsl(240 20% 6%)` nos DOIS temas (light e dark), ou seja
 *            near-black sobre o lime: contraste 15,6:1 no repouso e 17,3:1 no
 *            lime claro do hover/active (medido por luminância relativa WCAG).
 *            É o par do `variant="default"`/`premium`, e o ícone segue a mesma
 *            tinta porque o lucide desenha com `stroke="currentColor"` — não
 *            existe caso de ícone sumir sem o rótulo sumir junto.
 *   Fundo    `bg-primary` no repouso/foco, `bg-primary-glow` no hover e no
 *            pressionado (lime um passo mais claro, texto continua near-black).
 *   Borda    `border-primary` no lugar do `border-input` cinza do
 *            `variant="outline"` — mesma espessura, altura h-11 preservada.
 *   Foco     anel INTEIRO dentro do botão (`ring-inset` do design system) com
 *            `ring-primary-foreground`: o `:focus-visible { ring-ring }` global
 *            de src/index.css é lime e desapareceria por cima do lime.
 *   Halo     `shadow-glow` (`boxShadow.glow`), o mesmo brilho lime que
 *            `variant="premium"`/`gradient-success` usam.
 *
 * Como é só classe de cor (+ o `active:scale` padrão do `premium`), tamanho,
 * raio, espaçamento e ordem dos elementos do cabeçalho ficam como estavam.
 *
 * Entrada: os três itens da toolbar entram na MESMA cascata dos KPI Cards do
 * Dashboard Executivo — `cardVariants`, importado de `dashboard/MetricCard.tsx`
 * (fade + subida de 20px, 0.4s, `delay = índice × 0.08s`) — continuando a fila
 * do cabeçalho da esquerda para a direita: busca (slot 3), "Expandir tudo" (4) e
 * "Recolher tudo" (5), declarados em `organogramaHeaderReveal.ts`.
 *
 * A busca anima em cima do próprio wrapper do campo (o `relative flex-1` que já
 * existia — segue sendo ele o item do flex, então nada muda de layout). Os dois
 * botões animam por um wrapper próprio (um `div` sem cor, borda ou tamanho, como
 * o que o `OrganogramaNode` usa para a `DepartmentRow`): ao fim da entrada a
 * Motion deixa `transform: none` inline, e estilo inline vence o
 * `:active { scale(.99) }` de `LIME_DESTAQUE` — se o `motion.*` fosse o próprio
 * botão, o feedback de pressionar sumiria. Com o wrapper, o box, a borda, o lime
 * e os estados do botão continuam exatamente os mesmos; o wrapper só entra no
 * lugar dele como item do flex, por isso leva o `shrink-0` (senão, em tela
 * estreita, o botão poderia transbordar por cima da busca).
 */
const LIME_DESTAQUE = [
  'h-11 shrink-0 border-primary bg-primary text-primary-foreground shadow-glow',
  'hover:border-primary hover:bg-primary-glow hover:text-primary-foreground hover:shadow-glow',
  'active:border-primary active:bg-primary-glow active:text-primary-foreground active:scale-[0.99]',
  'focus-visible:border-primary focus-visible:bg-primary focus-visible:text-primary-foreground focus-visible:ring-primary-foreground',
].join(' ');

export function OrganogramaToolbar({ search, onSearchChange, onExpandAll, onCollapseAll }: OrganogramaToolbarProps) {
  return (
    <div className="flex items-center gap-2 h-11 flex-1 min-w-[280px]">
      <motion.div
        custom={HEADER_REVEAL.busca}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="relative flex-1 min-w-[220px]"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar na estrutura..."
          className="pl-9 h-11"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </motion.div>

      <motion.div
        custom={HEADER_REVEAL.expandirTudo}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="shrink-0"
      >
        <Button variant="outline" size="default" className={LIME_DESTAQUE} onClick={onExpandAll}>
          <ChevronsUpDown className="h-3.5 w-3.5 mr-1.5" />
          Expandir tudo
        </Button>
      </motion.div>

      <motion.div
        custom={HEADER_REVEAL.recolherTudo}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="shrink-0"
      >
        <Button variant="outline" size="default" className={LIME_DESTAQUE} onClick={onCollapseAll}>
          <ChevronsDownUp className="h-3.5 w-3.5 mr-1.5" />
          Recolher tudo
        </Button>
      </motion.div>
    </div>
  );
}
