import { Button } from '@/components/ui/button';
import { RefreshCw, Search, Calendar, Filter, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel} from '@/components/ui/dropdown-menu';

interface DashboardHeaderProps {
  greeting: string;
  isLoading: boolean;
  onRefresh: () => void;
}

export function DashboardHeader({ greeting, isLoading, onRefresh }: DashboardHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display-xl sm:text-display font-display font-bold tracking-tight flex items-center gap-2">
            {greeting}! <span className="inline-block animate-fade-in">👋</span>
          </h1>
          <p className="text-body text-muted-foreground font-body mt-1">
            Gestão centralizada e analítica do seu capital humano
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-2 rounded-xl border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all font-body h-10 shadow-xs"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">Sincronizar</span>
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 rounded-xl gap-2 shadow-xs">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuLabel>Relatórios Executivos</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer gap-2">PDF - Resumo Mensal</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2">Excel - KPIs Headcount</DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2 text-primary font-medium">Dashboard Completo</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="premium" 
            size="sm" 
            className="h-10 rounded-xl px-5 shadow-glow"
            onClick={() => window.location.assign('/configuracoes')}
          >
            Configurações
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Pesquisar colaboradores, departamentos ou processos..." 
            className="pl-10 h-11 rounded-xl bg-card/50 border-border/40 focus:bg-background transition-all shadow-xs"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          <Button variant="outline" className="h-11 rounded-xl gap-2 px-4 whitespace-nowrap bg-card/50 shadow-xs border-primary/20 text-primary font-bold">
            <Calendar className="h-4 w-4" />
            05/2026
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-11 rounded-xl gap-2 px-4 whitespace-nowrap bg-card/50 shadow-xs">
                <Filter className="h-4 w-4 text-primary" />
                Todos os Departamentos
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-xl">
              <DropdownMenuItem>RH</DropdownMenuItem>
              <DropdownMenuItem>Operações</DropdownMenuItem>
              <DropdownMenuItem>Financeiro</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.div>
  );
}

