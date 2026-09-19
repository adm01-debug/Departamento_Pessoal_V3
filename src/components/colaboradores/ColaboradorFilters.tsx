import { Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColaboradorViewSwitcher, ColaboradorViewMode } from './ColaboradorViewSwitcher';
import { ColaboradorActiveFilterChips, ActiveFilter } from './ColaboradorActiveFilterChips';
// Mesma animação de entrada dos cards do Dashboard principal — ver
// `ColaboradorKpiCards.tsx`. Índice 5: continua o stagger logo depois dos 5
// KPIs acima dele na página.
import { cardVariants } from '@/components/dashboard/MetricCard';

export function ColaboradorFilters({
  onSearchChange,
  onStatusChange,
  onDeptoChange,
  onCargoChange,
  departamentos = [],
  cargos = [],
  currentFilters,
  viewMode,
  onViewModeChange,
  activeFilterChips = [],
  onClearAllFilters = () => {},
}: {
  onSearchChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onDeptoChange: (v: string) => void;
  onCargoChange: (v: string) => void;
  departamentos?: string[];
  cargos?: string[];
  currentFilters: {
    search: string;
    status: string;
    departamento: string;
    cargo: string;
  };
  viewMode: ColaboradorViewMode;
  onViewModeChange: (mode: ColaboradorViewMode) => void;
  /** Chips de filtro ativo (Status/Departamento/Cargo), renderizados como 2ª linha dentro deste mesmo card. */
  activeFilterChips?: ActiveFilter[];
  onClearAllFilters?: () => void;
}) {
  return (
    <motion.div
      custom={5}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-4 mb-4 bg-card p-4 rounded-2xl border border-border/40 shadow-xs"
    >
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF ou e-mail..."
            value={currentFilters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 rounded-xl border-border/40 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select onValueChange={onStatusChange} value={currentFilters.status}>
            <SelectTrigger className="w-[168px] rounded-xl border-border/40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="desligado">Desligado</SelectItem>
              <SelectItem value="ferias">Férias</SelectItem>
              <SelectItem value="afastado">Afastado</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={onDeptoChange} value={currentFilters.departamento}>
            <SelectTrigger className="w-[240px] rounded-xl border-border/40">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Departamentos</SelectItem>
              {departamentos.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={onCargoChange} value={currentFilters.cargo}>
            <SelectTrigger className="w-[180px] rounded-xl border-border/40">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Cargos</SelectItem>
              {cargos.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="lg:ml-auto">
          <ColaboradorViewSwitcher value={viewMode} onChange={onViewModeChange} />
        </div>
      </div>

      <ColaboradorActiveFilterChips filters={activeFilterChips} onClearAll={onClearAllFilters} />
    </motion.div>
  );
}
