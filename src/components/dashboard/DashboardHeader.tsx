import type { ReactNode } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { FlowHoverButton } from '@/components/ui/flow-hover-button';
import { RefreshCw, Calendar, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  /** Primeiro nome do usuário — destacado em `primary`, como na referência. */
  userName?: string;
  /** Slot para ações extras (ex.: menu de Ações Rápidas), renderizado antes de Configurações. */
  actionsSlot?: ReactNode;
}

/** Capitaliza a primeira letra (date-fns/ptBR devolve mês e dia da semana em minúsculas). */
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function DashboardHeader({ greeting, isLoading, onRefresh, userName, actionsSlot }: DashboardHeaderProps) {
  const hoje = new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-display font-semibold tracking-tight leading-tight text-foreground dark:text-[hsl(0_0%_82%)] truncate">
          {userName ? `${greeting}, ` : `${greeting}!`}
          {userName && <span className="text-primary">{userName}!</span>}
        </h1>
        <p className="text-sm font-normal tracking-normal leading-relaxed text-muted-foreground dark:text-[hsl(0_0%_60%)] font-body mt-0.5">
          Gestão centralizada e analítica do seu capital humano
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden xl:flex items-center gap-2.5 pr-2 mr-1 border-r border-border/40">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <div className="leading-tight">
            <p className="text-xs font-medium tracking-normal leading-snug font-body whitespace-nowrap">
              {capitalize(format(hoje, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }))}
            </p>
            <p className="text-xs font-normal tracking-wide leading-snug text-muted-foreground normal-case">
              {capitalize(format(hoje, 'EEEE', { locale: ptBR }))}
            </p>
          </div>
        </div>

        <FlowHoverButton
          onClick={onRefresh}
          disabled={isLoading}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'gap-2 rounded-xl border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all font-body h-8 shadow-xs before:bg-primary hover:text-primary-foreground transition-colors',
          )}
          icon={<RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />}
        >
          <span className="hidden sm:inline">Sincronizar</span>
        </FlowHoverButton>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 rounded-xl gap-2 shadow-xs hover:bg-background hover:text-foreground hover:shadow-glow">
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

        {actionsSlot}

        <Button
          variant="premium"
          size="sm"
          className="h-8 rounded-xl px-5 shadow-glow"
          onClick={() => window.location.assign('/configuracoes')}
        >
          Configurações
        </Button>
      </div>
    </motion.div>
  );
}
