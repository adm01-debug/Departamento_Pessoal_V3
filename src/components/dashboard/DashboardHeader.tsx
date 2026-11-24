import { Button, buttonVariants } from '@/components/ui/button';
import { FlowHoverButton } from '@/components/ui/flow-hover-button';
import { RefreshCw, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  greeting: string;
  isLoading: boolean;
  onRefresh: () => void;
  /** Primeiro nome do usuario — quando presente, o cabecalho o destaca em `primary`. */
  userName?: string;
}

export function DashboardHeader({ greeting, isLoading, onRefresh, userName }: DashboardHeaderProps) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display-xl sm:text-display font-display font-bold tracking-tight flex items-center gap-2">
            {userName ? (
              <>
                {greeting}, <span className="text-primary">{userName}!</span>
              </>
            ) : (
              <>
                {greeting}! <span className="inline-block animate-fade-in">👋</span>
              </>
            )}
          </h1>
          <p className="text-body text-muted-foreground font-body mt-1">
            Gestão centralizada e analítica do seu capital humano
          </p>
        </div>

        <div className="flex items-center gap-2">
          <FlowHoverButton
            onClick={onRefresh}
            disabled={isLoading}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'gap-2 rounded-xl border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all font-body h-8 shadow-xs before:bg-primary hover:text-primary-foreground transition-colors'
            )}
            icon={<RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />}
          >
            <span className="hidden sm:inline">Sincronizar</span>
          </FlowHoverButton>

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
        <div
          aria-label="Competência exibida"
          className="h-11 inline-flex items-center rounded-xl gap-2 px-4 whitespace-nowrap border bg-card/50 shadow-xs border-primary/20 text-primary font-bold text-sm"
        >
          <Calendar className="h-4 w-4" />
          {format(new Date(), 'MM/yyyy')}
        </div>
      </div>
    </motion.div>
  );
}
