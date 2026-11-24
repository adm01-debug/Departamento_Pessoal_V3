import { Search, ListFilter, Plus, ArrowDownAZ, ArrowUpAZ } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TimelineEventType } from '@/types/timelineEvent';
import { EVENT_TYPE_CONFIG } from './eventTypeConfig';

interface HistoryToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  availableTypes: TimelineEventType[];
  activeTypes: Set<TimelineEventType>;
  onToggleType: (type: TimelineEventType) => void;
  years: string[];
  selectedYear: string;
  onYearChange: (year: string) => void;
  sortDir: 'desc' | 'asc';
  onSortChange: (dir: 'desc' | 'asc') => void;
  onCreateSalario: () => void;
  onCreateContrato: () => void;
}

export function HistoryToolbar({
  search, onSearchChange, availableTypes, activeTypes, onToggleType,
  years, selectedYear, onYearChange, sortDir, onSortChange,
  onCreateSalario, onCreateContrato,
}: HistoryToolbarProps) {
  const filtersActive = activeTypes.size < availableTypes.length;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-lg font-display font-semibold text-foreground">Histórico do Colaborador</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Linha do tempo completa da jornada do colaborador na empresa.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar no histórico..."
            className="h-9 w-full rounded-lg pl-8 text-sm sm:w-52"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-lg">
              <ListFilter className="h-3.5 w-3.5" /> Filtrar eventos
              {filtersActive && <Badge variant="secondary" size="sm" className="ml-0.5 rounded-full px-1.5">{activeTypes.size}</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Tipos de evento</p>
            <div className="grid gap-1.5 max-h-72 overflow-y-auto">
              {availableTypes.map((type) => (
                <Label key={type} className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm font-normal cursor-pointer hover:bg-muted/50">
                  <Checkbox checked={activeTypes.has(type)} onCheckedChange={() => onToggleType(type)} />
                  {EVENT_TYPE_CONFIG[type].label}
                </Label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Select value={selectedYear} onValueChange={onYearChange}>
          <SelectTrigger className="h-9 w-[140px] rounded-lg text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os anos</SelectItem>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={sortDir} onValueChange={(v) => onSortChange(v as 'desc' | 'asc')}>
          <SelectTrigger className="h-9 w-[190px] rounded-lg text-sm">
            {sortDir === 'desc' ? <ArrowDownAZ className="h-3.5 w-3.5 shrink-0" /> : <ArrowUpAZ className="h-3.5 w-3.5 shrink-0" />}
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Mais recentes primeiro</SelectItem>
            <SelectItem value="asc">Mais antigos primeiro</SelectItem>
          </SelectContent>
        </Select>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg shrink-0" aria-label="Registrar alteração">
              <Plus className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCreateSalario}>Registrar alteração salarial</DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateContrato}>Registrar alteração contratual</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
