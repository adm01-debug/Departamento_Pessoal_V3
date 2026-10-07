import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { STATUS_LABELS, TIPO_LABELS } from './desligamentosComum';

interface FiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  tipoFilter: string;
  onTipoChange: (v: string) => void;
  /** Departamento (vem do colaborador). Opcional para retrocompatibilidade. */
  departamentoFilter?: string;
  onDepartamentoChange?: (v: string) => void;
  departamentoOptions?: string[];
  /** Período (recorte por data de desligamento), exposto em "Mais filtros". */
  periodoFilter?: string;
  onPeriodoChange?: (v: string) => void;
  /** Limpa todos os filtros (mostrado quando há algum ativo). */
  onLimpar?: () => void;
  /** Há algum filtro ativo? Controla a visibilidade de "Limpar filtros". */
  filtroAtivo?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'todos', label: 'Todos os Status' },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const TIPO_OPTIONS = [
  { value: 'todos', label: 'Todos os Tipos' },
  ...Object.entries(TIPO_LABELS).map(([value, label]) => ({ value, label })),
];

const PERIODO_OPTIONS = [
  { value: 'todos', label: 'Todo o período' },
  { value: '3', label: 'Últimos 3 meses' },
  { value: '6', label: 'Últimos 6 meses' },
  { value: '12', label: 'Últimos 12 meses' },
];

/**
 * Célula de filtro: rótulo em caixa de frase sobre o valor atual — nunca usa o
 * "Todos os..." como rótulo do trigger e nunca trunca o rótulo. O corte (quando
 * o espaço aperta) cai só sobre o VALOR, via `[&>span:last-child]` no pai (o
 * `SelectValue` do Radix descarta `className`).
 */
function FiltroSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; label: string }[];
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`h-10 rounded-lg border-border/40 bg-card px-3 ${className ?? ''}`}>
        <div className="flex min-w-0 flex-col items-start gap-0.5 text-left [&>span:last-child]:w-full [&>span:last-child]:truncate">
          <span className="text-[10px] uppercase leading-none tracking-wide text-muted-foreground">{label}</span>
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent side="bottom" align="start" avoidCollisions={false} className="max-h-[var(--radix-select-content-available-height)]">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Barra de filtros compacta (uma linha no desktop) da Gestão de Desligamentos. */
export function DesligamentoFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  tipoFilter,
  onTipoChange,
  departamentoFilter = 'todos',
  onDepartamentoChange,
  departamentoOptions = [],
  periodoFilter = 'todos',
  onPeriodoChange,
  onLimpar,
  filtroAtivo = false,
}: FiltersProps) {
  const [maisFiltros, setMaisFiltros] = useState(false);

  const departamentoOpts = [
    // Rótulo curto de propósito: o valor vive num trigger estreito e o rótulo
    // de filtro não pode ser truncado (só o "Todos" curto cabe em uma linha).
    { value: 'todos', label: 'Todos' },
    ...departamentoOptions.map((d) => ({ value: d, label: d })),
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="relative min-w-[140px] flex-1"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por colaborador, cargo, departamento..."
            aria-label="Buscar desligamentos"
            className="h-10 rounded-lg border-border/40 bg-card pl-9"
          />
        </motion.div>

        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
          <FiltroSelect label="Status" value={statusFilter} onChange={onStatusChange} options={STATUS_OPTIONS} className="w-[168px] min-w-[120px]" />
        </motion.div>
        <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
          <FiltroSelect label="Tipo de Desligamento" value={tipoFilter} onChange={onTipoChange} options={TIPO_OPTIONS} className="w-[190px] min-w-[130px]" />
        </motion.div>
        <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible">
          <FiltroSelect
            label="Departamento"
            value={departamentoFilter}
            onChange={onDepartamentoChange ?? (() => {})}
            options={departamentoOpts}
            className="w-[176px] min-w-[124px]"
          />
        </motion.div>

        {filtroAtivo && onLimpar && (
          <Button
            variant="default"
            size="sm"
            onClick={onLimpar}
            className="h-10 w-[168px] shrink-0 gap-1.5 rounded-lg font-body"
          >
            <X className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setMaisFiltros((v) => !v)}
          className="h-10 w-[168px] shrink-0 gap-2 rounded-lg border-border/40 bg-card font-body"
          aria-expanded={maisFiltros}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Mais filtros
        </Button>
      </div>

      {maisFiltros && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/30 bg-muted/20 p-2.5">
            <FiltroSelect
              label="Período"
              value={periodoFilter}
              onChange={onPeriodoChange ?? (() => {})}
              options={PERIODO_OPTIONS}
              className="w-[168px] min-w-[120px]"
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
