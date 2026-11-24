/**
 * ============================================================================
 * BARRA DE FILTROS DA CENTRAL DE AUDITORIA — duas linhas compactas sob os KPIs.
 *
 *   [ 🔍 Buscar na trilha...                              ] [ Limpar filtros ]
 *   [Operação: Todas]      [Entidade: Todas]      [Responsável: Todos]
 *
 * ── DUAS LINHAS, SEMPRE ────────────────────────────────────────────────────
 * A barra mora na coluna esquerda (~69% do grid da Central), não na largura da
 * página: em uma linha só, busca + três recortes + botão pedem ~1.000 px e algo
 * sempre sobrava de fora. A quebra é fixa — não depende de breakpoint:
 *
 *   linha 1 · `flex` — a busca é `flex-1 min-w-0` e come o vão inteiro até o
 *             botão (`gap-3` = 12–15 px de intervalo); o botão é `shrink-0`,
 *             então mantém a largura do próprio conteúdo e fica na ponta
 *             direita. Como a busca tem `min-w-0`, em tela estreita é ELA que
 *             encolhe — nunca aparece rolagem horizontal.
 *   linha 2 · `grid` — os três recortes dividindo a largura em partes iguais
 *             (2 colunas até `lg`, 3 daí para cima).
 *
 * Os desktops pequenos (1280) recebem exatamente o mesmo desenho da referência;
 * o que muda com a largura é só quanto a busca estica.
 *
 * ── COMPONENTES ────────────────────────────────────────────────────────────
 * A busca é o `Input` do sistema e os três recortes são o `Select` oficial
 * (`ui/select`) com o rótulo DENTRO do gatilho ("Operação: Todas"), como na
 * referência. Altura única de 36 px (`h-9`) para os quatro controles e o botão,
 * borda `border-border/60`, chevron do próprio `SelectTrigger`.
 *
 * ── O QUE O USUÁRIO ESCOLHE ────────────────────────────────────────────────
 * As opções de entidade, responsável e operação são DERIVADAS dos eventos do
 * período (ver `entidadesDosEventos`/`responsaveisDosEventos`), nunca de uma
 * lista fixa: filtrar por uma entidade que não existe no recorte só produziria
 * uma tela vazia. `Todas`/`Todos` é a ausência de filtro.
 *
 * A barra só APRESENTA: quem recorta é `filtrarEventos`, no componente pai.
 * ============================================================================
 */
import { Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { rotuloDoRecurso, type FiltroOperacao, type OperacaoAuditoria } from './centralAuditoria';

interface CentralAuditoriaFiltrosProps {
  busca: string;
  onBusca: (texto: string) => void;
  operacao: FiltroOperacao;
  onOperacao: (operacao: FiltroOperacao) => void;
  entidade: string;
  onEntidade: (entidade: string) => void;
  responsavel: string;
  onResponsavel: (responsavel: string) => void;
  /** Entidades presentes no período (valores técnicos da coluna `tabela`). */
  entidades: readonly string[];
  /** Responsáveis presentes no período (e-mail ou `Sistema (automático)`). */
  responsaveis: readonly string[];
  /** Operações presentes no período. */
  operacoes: readonly OperacaoAuditoria[];
  /** Quantos filtros estão fora do padrão — habilita o "Limpar filtros". */
  filtrosAtivos: number;
  onLimpar: () => void;
}

/** Nome amigável da operação no menu. */
const ROTULO_OPERACAO: Record<OperacaoAuditoria, string> = {
  INSERT: 'INSERT · criação',
  UPDATE: 'UPDATE · alteração',
  DELETE: 'DELETE · exclusão',
  OUTRA: 'Outras operações',
};

/** Gatilho de 36 px de todos os controles da barra. */
const CLASSE_GATILHO = 'h-9 rounded-lg border-border/60 bg-background/70 px-2.5 text-[11.5px] font-medium';

export function CentralAuditoriaFiltros({
  busca,
  onBusca,
  operacao,
  onOperacao,
  entidade,
  onEntidade,
  responsavel,
  onResponsavel,
  entidades,
  responsaveis,
  operacoes,
  filtrosAtivos,
  onLimpar,
}: CentralAuditoriaFiltrosProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* LINHA 1 — busca elástica + ação alinhada à direita.
          `flex-1 min-w-0` na busca faz ela ocupar TODO o vão até o botão
          (12–15 px de intervalo, do `gap-3`) e ainda encolher sem estourar a
          linha; `shrink-0` no botão o impede de esticar ou de ser espremido —
          ele mantém exatamente a largura do próprio conteúdo. */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={busca}
            onChange={(evento) => onBusca(evento.target.value)}
            placeholder="Buscar na trilha..."
            aria-label="Buscar na trilha"
            className="h-9 w-full rounded-lg border-border/60 bg-background/70 pl-8 text-[11.5px]"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onLimpar}
          disabled={filtrosAtivos === 0}
          className="h-9 shrink-0 gap-1.5 rounded-lg px-2.5 text-[11.5px] font-medium"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
          Limpar filtros
          {filtrosAtivos > 0 && (
            <span className="ml-0.5 rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary tabular-nums">
              {filtrosAtivos}
            </span>
          )}
        </Button>
      </div>

      {/* LINHA 2 — os três recortes dividindo a largura em partes iguais. */}
      <div className="grid min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <FiltroSelect
          rotulo="Operação"
          valor={operacao}
          onChange={(valor) => onOperacao(valor as FiltroOperacao)}
          ariaLabel="Filtrar por operação"
          opcoes={[
            { valor: 'todas', rotulo: 'Todas' },
            ...operacoes.map((valor) => ({ valor, rotulo: ROTULO_OPERACAO[valor] })),
          ]}
        />

        <FiltroSelect
          rotulo="Entidade"
          valor={entidade}
          onChange={onEntidade}
          ariaLabel="Filtrar por entidade"
          opcoes={[
            { valor: 'todas', rotulo: 'Todas' },
            ...entidades.map((valor) => ({ valor, rotulo: rotuloDoRecurso(valor) })),
          ]}
        />

        <FiltroSelect
          rotulo="Responsável"
          valor={responsavel}
          onChange={onResponsavel}
          ariaLabel="Filtrar por responsável"
          opcoes={[{ valor: 'todos', rotulo: 'Todos' }, ...responsaveis.map((valor) => ({ valor, rotulo: valor }))]}
        />
      </div>
    </div>
  );
}

interface FiltroSelectProps {
  /** Rótulo curto exibido à esquerda do valor ("Operação"). */
  rotulo: string;
  valor: string;
  onChange: (valor: string) => void;
  ariaLabel: string;
  opcoes: readonly { valor: string; rotulo: string }[];
}

/**
 * Um recorte da barra — mesmo desenho do seletor de período do cabeçalho, com o
 * rótulo em `text-muted-foreground` à esquerda do valor. A largura vem da
 * célula do grid (o `w-full` do `SelectTrigger`), e os três recortes têm sempre
 * a mesma largura — o gatilho não "pula" ao trocar o valor.
 */
function FiltroSelect({ rotulo, valor, onChange, ariaLabel, opcoes }: FiltroSelectProps) {
  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger aria-label={ariaLabel} className={cn(CLASSE_GATILHO, 'min-w-0')}>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="shrink-0 text-muted-foreground">{rotulo}:</span>
          <SelectValue className="truncate" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {opcoes.map((opcao) => (
          <SelectItem key={opcao.valor} value={opcao.valor} className="text-xs">
            <span className="truncate">{opcao.rotulo}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
