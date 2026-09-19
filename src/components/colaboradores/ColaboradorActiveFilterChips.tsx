import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface ActiveFilter {
  key: string;
  label: string;
  onRemove: () => void;
}

interface ColaboradorActiveFilterChipsProps {
  filters: ActiveFilter[];
  onClearAll: () => void;
}

// Segunda linha (condicional) dentro do card de ColaboradorFilters — chips
// removíveis para os filtros de Status/Departamento/Cargo (a busca por texto
// não vira chip — já tem o próprio botão de limpar no campo). Só renderiza
// quando há pelo menos 1 filtro ativo; o card pai (`bg-card`/borda/raio) cresce
// junto porque isto é só mais um filho do mesmo container flex, não um bloco
// separado por fora dele.
export function ColaboradorActiveFilterChips({ filters, onClearAll }: ColaboradorActiveFilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className="flex items-center flex-wrap gap-2">
      {filters.map((f) => (
        <Badge key={f.key} variant="outline" className="rounded-full gap-1.5 pl-3 pr-1.5 py-1 font-normal border-primary/60 text-primary bg-primary/5">
          {f.label}
          <button
            type="button"
            onClick={f.onRemove}
            aria-label={`Remover filtro ${f.label}`}
            className="rounded-full p-0.5 hover:bg-primary/10 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button variant="ghost" size="sm" className="h-7 rounded-full text-xs text-info hover:text-info hover:bg-info/10" onClick={onClearAll}>
        Limpar filtros
      </Button>
    </div>
  );
}
