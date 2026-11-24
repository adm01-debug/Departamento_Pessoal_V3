import { ChevronDown, ChevronRight, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { pluralize } from '@/lib/organogramaTree';

interface DepartmentRowProps {
  nome: string;
  isRoot: boolean;
  expanded: boolean;
  onToggle: () => void;
  colaboradoresCount: number;
  subDepartamentosCount: number;
}

const COUNT_GRID_COLS = 'grid-cols-[minmax(0,1fr)_120px_168px]';

export function DepartmentRow({
  nome,
  isRoot,
  expanded,
  onToggle,
  colaboradoresCount,
  subDepartamentosCount,
}: DepartmentRowProps) {
  return (
    <div
      onClick={onToggle}
      className={cn(
        'grid items-center gap-2 px-2.5 cursor-pointer select-none transition-colors',
        COUNT_GRID_COLS,
        isRoot ? 'h-14 hover:bg-muted/20' : 'h-12 hover:bg-muted/15'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Recolher' : 'Expandir'} ${nome}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>

        {/* Tinta do ícone do departamento: a raiz mantém o lime da identidade
            (`bg-primary/10 text-primary`) e TODO nó interno da árvore (nível ≥ 1
            — "Recursos Humanos", "Financeiro", "Comercial", "Tecnologia" etc.)
            usa o azul do design system (`--info`), o mesmo par
            `bg-info/15 text-info` que o card "Departamentos" do cabeçalho e o
            contador de subdepartamentos desta própria row já usam. Só a cor
            muda: badge (w-8/w-7) e ícone (h-4/h-3.5) seguem exatamente como
            estavam, e nada aqui alcança o avatar do colaborador (EmployeeRow). */}
        <span
          className={cn(
            'shrink-0 rounded-md flex items-center justify-center',
            isRoot ? 'w-8 h-8 bg-primary/10 text-primary' : 'w-7 h-7 bg-info/15 text-info'
          )}
        >
          <Building2 className={isRoot ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        </span>

        <span className={cn('truncate font-display', isRoot ? 'text-[14px] font-semibold' : 'text-[13px] font-medium')}>
          {nome}
        </span>
      </div>

      <span className="text-[11px] text-muted-foreground text-right shrink-0">
        {colaboradoresCount} {pluralize(colaboradoresCount, 'colaborador', 'colaboradores')}
      </span>

      <span className="text-[11px] text-info text-right shrink-0">
        {subDepartamentosCount} {pluralize(subDepartamentosCount, 'subdepartamento', 'subdepartamentos')}
      </span>
    </div>
  );
}
