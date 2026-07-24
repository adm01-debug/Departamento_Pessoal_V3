// V26-PERFECT: src/components/ui/data-table-toolbar.tsx
import { Input } from './input';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Search, X, Download, Plus, Filter, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface DataTableToolbarProps {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onAdd?: () => void;
  addLabel?: string;
  onExport?: () => void;
  filters?: Array<{
    key: string;
    label: string;
    options: Array<{ value: string; label: string }>;
    value?: string;
    onChange: (value: string) => void;
  }>;
  onClearFilters?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function DataTableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  onAdd,
  addLabel = 'Novo',
  onExport,
  filters,
  onClearFilters,
  onRefresh,
  isRefreshing,
  className
}: DataTableToolbarProps) {
  const hasActiveFilters = filters?.some(f => f.value && f.value !== '' && f.value !== 'all');

  return (
    <div className={cn("flex flex-col gap-4 mb-6", className)}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-card/50 border-border/40 focus:bg-background transition-all shadow-xs"
          />
          <AnimatePresence>
            {search && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg hover:bg-muted"
                  onClick={() => onSearchChange?.('')}
                  aria-label="Limpar pesquisa"
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="hidden sm:flex items-center gap-2 mr-2">
            {filters?.slice(0, 2).map((filter) => (
              <Select key={filter.key} value={filter.value} onValueChange={filter.onChange}>
                <SelectTrigger className="h-11 min-w-[140px] rounded-xl bg-card/50 border-border/40 shadow-xs">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">Todos ({filter.label})</SelectItem>
                  {filter.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {hasActiveFilters && onClearFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClearFilters}
                className="h-11 rounded-xl px-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
            
            <Button variant="outline" className="h-11 w-11 p-0 rounded-xl md:hidden">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>

            {onRefresh && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-11 w-11 p-0 rounded-xl bg-card/50 shadow-xs transition-all active:scale-95"
                title="Atualizar dados"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            )}

            {onExport && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onExport}
                className="h-11 rounded-xl px-4 gap-2 bg-card/50 shadow-xs hidden sm:flex"
              >
                <Download className="h-4 w-4" />
                <span className="hidden lg:inline">Exportar</span>
              </Button>
            )}
            
            {onAdd && (
              <Button 
                size="sm" 
                onClick={onAdd}
                className="h-11 rounded-xl px-5 gap-2 bg-primary text-primary-foreground shadow-glow hover:shadow-glow-lg transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>{addLabel}</span>
              </Button>
            )}
          </div>
        </div>
      </div>
      
      {filters && filters.length > 2 && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mr-2">
            <Filter className="h-3 w-3" /> Filtros Adicionais
          </div>
          {filters.slice(2).map((filter) => (
            <Select key={filter.key} value={filter.value} onValueChange={filter.onChange}>
              <SelectTrigger className="h-9 min-w-[140px] rounded-lg bg-muted/40 border-border/20 text-xs">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Todos ({filter.label})</SelectItem>
                {filter.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      )}
    </div>
  );
}
