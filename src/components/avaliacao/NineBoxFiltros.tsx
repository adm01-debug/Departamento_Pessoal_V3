import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchInput } from '@/components/ui/search-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, FilterX, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { entradaCard } from './entradaCards';

/**
 * ============================================================================
 * BUSCA E FILTROS — Nine-Box.
 *
 * Tudo client-side sobre as listas já carregadas pela página. Os selects nascem
 * dos valores REALMENTE presentes nos registros (departamentos e cargos das
 * pessoas classificadas) — nenhuma opção fixa copiada da referência.
 *
 * ── POR QUE NÃO EXISTEM "GESTOR" NEM "UNIDADE" ──────────────────────────────
 * A referência traz esses dois selects, mas a consulta de colaboradores que a
 * página usa devolve apenas `id, nome_completo, cpf, email, status,
 * data_admissao, empresa_id, matricula, foto_url, telefone, cargo,
 * departamento` — não há `supervisor_id` nem local de trabalho. Um filtro que
 * só funciona no modo demonstração seria dado inventado, então ele não existe.
 *
 * ── "MAIS FILTROS" ──────────────────────────────────────────────────────────
 * Dois recortes que o dado sustenta: com PDI vinculado e "em atenção" (quadrante
 * de atenção OU sem PDI). Nenhum filtro decorativo.
 *
 * ── "COMPARAR CICLOS" ───────────────────────────────────────────────────────
 * Liga/desliga o comparativo com o ciclo anterior que alimenta os KPIs de
 * movimentação e o widget "Movimentações". É um controle real: desligado, os
 * KPIs de evolução ficam indisponíveis em vez de mostrarem zero.
 * ============================================================================
 */

/** Sentinela dos selects: Radix não aceita `value=""` em `SelectItem`. */
const TODOS = '__todos';

interface NineBoxFiltrosProps {
  indice?: number;
  busca: string;
  onBusca: (valor: string) => void;
  departamento: string;
  onDepartamento: (valor: string) => void;
  departamentos: string[];
  cargo: string;
  onCargo: (valor: string) => void;
  cargos: string[];
  comPdi: boolean;
  onComPdi: (valor: boolean) => void;
  emAtencao: boolean;
  onEmAtencao: (valor: boolean) => void;
  comparar: boolean;
  onComparar: (valor: boolean) => void;
  ciclos: { id: string; nome: string }[];
  cicloId: string;
  onCicloId: (valor: string) => void;
  filtrosAtivos: number;
  onLimpar: () => void;
}

export function NineBoxFiltros({
  indice = 2,
  busca,
  onBusca,
  departamento,
  onDepartamento,
  departamentos,
  cargo,
  onCargo,
  cargos,
  comPdi,
  onComPdi,
  emAtencao,
  onEmAtencao,
  comparar,
  onComparar,
  ciclos,
  cicloId,
  onCicloId,
  filtrosAtivos,
  onLimpar,
}: NineBoxFiltrosProps) {
  const temFiltroAtivo = busca.trim() !== '' || departamento !== '' || cargo !== '' || comPdi || emAtencao;

  return (
    <motion.div {...entradaCard(indice)} className="flex flex-wrap items-center gap-2">
      <SearchInput
        value={busca}
        onChange={onBusca}
        placeholder="Buscar colaborador, cargo, departamento..."
        className="min-w-[220px] flex-1"
      />

      <Select value={departamento || TODOS} onValueChange={(v) => onDepartamento(v === TODOS ? '' : v)}>
        <SelectTrigger aria-label="Departamento" className="h-9 w-full rounded-lg sm:w-[180px]">
          <SelectValue placeholder="Departamento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos</SelectItem>
          {departamentos.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={cargo || TODOS} onValueChange={(v) => onCargo(v === TODOS ? '' : v)}>
        <SelectTrigger aria-label="Cargo" className="h-9 w-full rounded-lg sm:w-[180px]">
          <SelectValue placeholder="Cargo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TODOS}>Todos</SelectItem>
          {cargos.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 shrink-0 gap-1.5 rounded-lg border-border/40 px-2.5 text-[13px] font-normal text-muted-foreground hover:text-foreground"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Mais filtros
            {filtrosAtivos > 0 && (
              <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-primary">
                {filtrosAtivos}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 space-y-1 p-2">
          <button
            type="button"
            aria-pressed={comPdi}
            onClick={() => onComPdi(!comPdi)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-accent"
          >
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                comPdi ? 'border-primary bg-primary/20 text-primary' : 'border-border/60'
              )}
            >
              {comPdi && <Check className="h-3 w-3" />}
            </span>
            Somente com PDI vinculado
          </button>
          <button
            type="button"
            aria-pressed={emAtencao}
            onClick={() => onEmAtencao(!emAtencao)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] transition-colors hover:bg-accent"
          >
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                emAtencao
                  ? 'border-destructive-vivid bg-destructive-vivid/20 text-destructive-vivid'
                  : 'border-border/60'
              )}
            >
              {emAtencao && <Check className="h-3 w-3" />}
            </span>
            Somente em atenção
          </button>
        </PopoverContent>
      </Popover>

      {temFiltroAtivo && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onLimpar}
          className="h-9 shrink-0 gap-1.5 rounded-lg border-primary/40 bg-primary/10 px-2.5 text-[13px] font-normal text-primary transition-colors duration-200 hover:border-primary/60 hover:bg-primary/20 hover:text-primary"
        >
          <FilterX className="h-3.5 w-3.5" />
          Limpar filtros
        </Button>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={comparar}
          onClick={() => onComparar(!comparar)}
          className={cn(
            'h-9 shrink-0 gap-2 rounded-lg px-2.5 text-[13px] font-normal transition-colors',
            comparar
              ? 'border-info/50 bg-info/10 text-info hover:bg-info/15 hover:text-info'
              : 'border-border/40 text-muted-foreground hover:text-foreground'
          )}
        >
          <span
            aria-hidden
            className={cn(
              'relative h-3.5 w-6 shrink-0 rounded-full transition-colors',
              comparar ? 'bg-info/40' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-2.5 w-2.5 rounded-full bg-foreground/80 transition-all',
                comparar ? 'left-3' : 'left-0.5'
              )}
            />
          </span>
          Comparar ciclos
        </Button>

        <Select value={cicloId || TODOS} onValueChange={(v) => onCicloId(v === TODOS ? '' : v)}>
          <SelectTrigger aria-label="Ciclo em visão" className="h-9 w-full rounded-lg sm:w-[200px]">
            <SelectValue placeholder="Visão atual" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os ciclos</SelectItem>
            {ciclos.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </motion.div>
  );
}
