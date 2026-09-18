import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function ColaboradorFilters({ 
  onSearchChange, 
  onStatusChange, 
  onDeptoChange,
  onCargoChange,
  departamentos = [],
  cargos = [],
  currentFilters
}: { 
  onSearchChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onDeptoChange: (v: string) => void;
  onCargoChange: (v: string) => void;
  departamentos?: any[];
  cargos?: any[];
  currentFilters: {
    search: string;
    status: string;
    departamento: string;
    cargo: string;
  };
}) {
  return (
    <div className="flex flex-col gap-4 mb-6 bg-card p-4 rounded-2xl border border-border/40 shadow-xs">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por nome, CPF ou e-mail..." 
            value={currentFilters.search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 rounded-xl border-border/40 focus:ring-primary/20"
          />
        </div>
        <div className="flex gap-2 flex-wrap md:flex-nowrap">
          <Select onValueChange={onStatusChange} value={currentFilters.status}>
            <SelectTrigger className="w-[140px] rounded-xl border-border/40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="desligado">Desligado</SelectItem>
              <SelectItem value="ferias">Férias</SelectItem>
              <SelectItem value="afastado">Afastado</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={onDeptoChange} value={currentFilters.departamento}>
            <SelectTrigger className="w-[180px] rounded-xl border-border/40">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Departamentos</SelectItem>
              {departamentos.map(d => (
                <SelectItem key={d.id} value={d.nome}>{d.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={onCargoChange} value={currentFilters.cargo}>
            <SelectTrigger className="w-[180px] rounded-xl border-border/40">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Cargos</SelectItem>
              {cargos.map(c => (
                <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
