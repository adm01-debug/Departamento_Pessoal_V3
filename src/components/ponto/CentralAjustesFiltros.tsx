/**
 * ============================================================================
 * BARRA DE FILTROS DA CENTRAL DE AJUSTES — chips coloridos de status +
 * seletor de período.
 *
 * ── OS CHIPS SÃO O PADRÃO DO RESTO DO SISTEMA ──────────────────────────────
 * A faixa usa o componente ÚNICO de filtros coloridos do Design System —
 * `ColoredFilterChip` (`avaliacao/ColoredFilterChip`) com os temas de
 * `PALETAS_CHIP`: exatamente a MESMA pílula de Metas & OKRs, Auditoria,
 * Feedbacks, PDI, Premiações e Pesquisas de Clima. Nada de desenho paralelo.
 *
 * Anatomia (a mesma em todas essas telas):
 *   • bolinha sólida à esquerda na cor da categoria;
 *   • rótulo em `text-[12px] font-medium`;
 *   • contador numa cápsula à direita (`rounded-full px-1.5`, `tabular-nums`);
 *   • `rounded-full`, `border`, `px-3`, `gap-2` e altura `h-8`;
 *   • hover temático só no repouso, glow do tema no selecionado
 *     (`transition-all duration-200`, desligado em `prefers-reduced-motion`).
 *
 * Os ícones antigos (lista, relógio, check e X) SAÍRAM: a leitura agora é a
 * bolinha colorida, como nas outras áreas. Nenhum glifo novo foi inventado.
 *
 * A cor de cada chip é a do KPI correspondente, para o topo e a barra falarem
 * a mesma língua:
 *
 *   Todos       lime     (`TEMA_TODOS`           → `--primary`)
 *   Pendentes   âmbar    (`PALETAS_CHIP.amber`   → `--warning`)
 *   Aprovadas   verde    (`PALETAS_CHIP.emerald` → `--success`)
 *   Rejeitadas  vermelho (`PALETAS_CHIP.red`     → `--destructive-vivid`)
 *
 * O contador vem de `contagem`, calculada sobre o período + a busca ativa:
 * clicar em "Pendentes (3)" mostra exatamente três linhas.
 *
 * ── GEOMETRIA: 40 px E 10 px DE FOLGA ──────────────────────────────────────
 * O brief pedia 38–40 px de altura e ~10 px entre os filtros. O DS entrega
 * exatamente isso nesta base: o `index.css` fixa `html { font-size: 125% }`,
 * então `h-8` (2rem) = 40 px e `gap-2` (0.5rem) = 10 px. Nada de medida nova —
 * é a régua que TODAS as telas com esta pílula já usam.
 *
 * ── DIAGRAMAÇÃO ────────────────────────────────────────────────────────────
 * Os quatro filtros ficam em UMA linha e nunca quebram texto (os rótulos são
 * palavras únicas e o chip não encolhe abaixo do próprio conteúdo). Em telas
 * estreitas a faixa rola na horizontal (`overflow-x-auto` + `no-scrollbar`,
 * utilitário do `index.css`) em vez de empilhar em duas linhas. O
 * `py-3`/`-my-3` abre a calha vertical do halo `shadow-glow*` para que o
 * `overflow` não corte o glow do chip selecionado — e o par de margens
 * negativas devolve a altura que a faixa ocupava antes, então o alinhamento
 * das linhas da página não muda.
 *
 * ── O PERÍODO ──────────────────────────────────────────────────────────────
 * `SelectTrigger` com o calendário à esquerda e o texto sempre em UMA linha. O
 * ícone e o texto vão dentro de um `div` porque o trigger aplica
 * `[&>span]:line-clamp-1` nos filhos diretos, e `line-clamp-1` grava
 * `display:-webkit-box`, anulando o `flex` do wrapper (o calendário subia para
 * cima do texto). Mesmo desenho do seletor do painel de Geofencing.
 * ============================================================================
 */
import { CalendarDays } from 'lucide-react';
import { ColoredFilterChip } from '@/components/avaliacao/ColoredFilterChip';
import { PALETAS_CHIP, TEMA_TODOS, type TemaChip } from '@/components/avaliacao/chipFiltroComum';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PERIODOS_AJUSTES, type ContagemAjustes, type FiltroStatusAjuste, type PeriodoAjustes } from './centralAjustes';

interface CentralAjustesFiltrosProps {
  contagem: ContagemAjustes;
  status: FiltroStatusAjuste;
  onStatus: (status: FiltroStatusAjuste) => void;
  periodo: PeriodoAjustes;
  onPeriodo: (periodo: PeriodoAjustes) => void;
}

interface ChipStatus {
  valor: FiltroStatusAjuste;
  rotulo: string;
  /** Família de cor do chip — a MESMA paleta do Design System de Desempenho. */
  tema: TemaChip;
  chave: keyof ContagemAjustes;
}

/** Ordem e cor dos chips — a mesma do fluxo de uma solicitação. */
const CHIPS: readonly ChipStatus[] = [
  { valor: 'todos', rotulo: 'Todos', tema: TEMA_TODOS, chave: 'todos' },
  { valor: 'pendente', rotulo: 'Pendentes', tema: PALETAS_CHIP.amber, chave: 'pendentes' },
  { valor: 'aprovado', rotulo: 'Aprovadas', tema: PALETAS_CHIP.emerald, chave: 'aprovadas' },
  { valor: 'rejeitado', rotulo: 'Rejeitadas', tema: PALETAS_CHIP.red, chave: 'rejeitadas' },
] as const;

export function CentralAjustesFiltros({ contagem, status, onStatus, periodo, onPeriodo }: CentralAjustesFiltrosProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div
        className="no-scrollbar -my-3 flex min-w-0 items-center gap-2 overflow-x-auto py-3"
        role="group"
        aria-label="Filtrar solicitações por status"
      >
        {CHIPS.map(({ valor, rotulo, tema, chave }) => (
          <ColoredFilterChip
            key={valor}
            label={rotulo}
            count={contagem[chave]}
            tema={tema}
            selected={status === valor}
            onClick={() => onStatus(valor)}
            // O contador é um badge visual (só o número): o leitor de tela
            // recebe "Pendentes (6)" em vez de "Pendentes 6".
            ariaLabel={`${rotulo} (${contagem[chave]})`}
          />
        ))}
      </div>

      <Select value={periodo} onValueChange={(valor) => onPeriodo(valor as PeriodoAjustes)}>
        <SelectTrigger
          aria-label="Período das solicitações"
          className="h-[30px] w-[176px] shrink-0 gap-2 rounded-[10px] border-border/60 bg-background/70 px-3 text-[11px] font-medium"
        >
          <div className="flex min-w-0 items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <SelectValue className="whitespace-nowrap" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {PERIODOS_AJUSTES.map((opcao) => (
            <SelectItem key={opcao.valor} value={opcao.valor} className="text-xs">
              {opcao.rotulo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
