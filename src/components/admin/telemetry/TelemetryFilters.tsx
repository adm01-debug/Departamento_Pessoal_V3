import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';

type SeverityFilter = 'all' | 'slow' | 'very_slow' | 'error';
type TimeFilter = '1h' | '6h' | '24h' | '7d' | 'custom';

interface TelemetryFiltersProps {
  severityFilter: SeverityFilter;
  setSeverityFilter: (v: SeverityFilter) => void;
  timeFilter: TimeFilter;
  setTimeFilter: (v: TimeFilter) => void;
  customDateFrom?: Date;
  setCustomDateFrom: (d: Date | undefined) => void;
  customDateTo?: Date;
  setCustomDateTo: (d: Date | undefined) => void;
  rowCount: number;
}

export function TelemetryFilters({
  severityFilter,
  setSeverityFilter,
  timeFilter,
  setTimeFilter,
  customDateFrom,
  setCustomDateFrom,
  customDateTo,
  setCustomDateTo,
  rowCount,
}: TelemetryFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as SeverityFilter)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Severidade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          <SelectItem value="slow">🟡 Lentas</SelectItem>
          <SelectItem value="very_slow">🔴 Muito Lentas</SelectItem>
          <SelectItem value="error">❌ Erros</SelectItem>
        </SelectContent>
      </Select>
      <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1h">Última hora</SelectItem>
          <SelectItem value="6h">Últimas 6h</SelectItem>
          <SelectItem value="24h">Últimas 24h</SelectItem>
          <SelectItem value="7d">Últimos 7 dias</SelectItem>
          <SelectItem value="custom">📅 Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {timeFilter === 'custom' && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                {customDateFrom ? format(customDateFrom, 'dd/MM/yyyy') : 'De'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customDateFrom} onSelect={setCustomDateFrom} />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs">
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                {customDateTo ? format(customDateTo, 'dd/MM/yyyy') : 'Até'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customDateTo} onSelect={setCustomDateTo} />
            </PopoverContent>
          </Popover>
        </div>
      )}

      <span className="text-xs text-muted-foreground ml-auto">{rowCount} registros · auto-refresh 30s</span>
    </div>
  );
}
