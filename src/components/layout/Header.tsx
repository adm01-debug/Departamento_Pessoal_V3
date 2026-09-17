import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Menu, Search, Cloud } from 'lucide-react';
import { NotificationCenter } from '@/components/ui/notification-center';
import { UserProfileMenu } from '@/components/ui/user-profile-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Breadcrumbs } from './Breadcrumbs';
import { BackButton } from './BackButton';
import { EmpresaSelector } from './EmpresaSelector';
import { useAuth } from '@/hooks/useAuth';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { Activity } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
  user?: { name: string; email: string; avatar?: string };
  className?: string;
}

export function Header({ onMenuClick, user, className }: HeaderProps) {
  const { isAdmin } = useAuth();
  const { empresaAtual, userEmpresas, temMultiplasEmpresas, trocarEmpresa } = useEmpresas();
  const { latency, status } = useSystemHealth();
  const handleSearchClick = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
  };

  return (
    <header role="banner" className={cn(
      'flex items-center justify-between h-14 px-4 lg:px-6',
      'border-b border-border/40 bg-background/80 backdrop-blur-xl',
      className
    )}>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden hover:bg-accent/50 rounded-lg" aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Navigation Control */}
        <div className="flex items-center gap-2">
          <BackButton />
          <div className="h-4 w-[1px] bg-border/40 mx-1 hidden md:block" />
          <Breadcrumbs className="md:flex" />
        </div>

        {/* Compact search trigger */}
        <button
          onClick={handleSearchClick}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/30 hover:border-primary/40 hover:bg-muted/80 transition-all group cursor-pointer"
          aria-label="Buscar (⌘K)"
        >
          <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          <span className="text-body font-body text-muted-foreground/60 w-28 lg:w-72 text-left truncate">Busque por colaboradores, departamentos, processos...</span>
          <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border border-border/40 bg-muted px-1.5 text-overline font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-3">
        {/* Sync Status Badge */}
        <div className={cn(
          "hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-overline font-medium",
          status === 'online' ? "bg-success/5 border-success/20 text-success" :
          status === 'slow' ? "bg-warning/5 border-warning/20 text-warning" :
          "bg-destructive/5 border-destructive/20 text-destructive"
        )}>
          <Cloud className="h-3 w-3" />
          {status === 'online' ? 'DB Conectado' : status === 'slow' ? 'Latência Alta' : 'DB Offline'}
          {latency !== null && (
            <span className="flex items-center gap-1 ml-1 pl-1 border-l border-current/20">
              <Activity className="h-2.5 w-2.5" />
              {latency}ms
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Company badge in header (mobile-visible) */}
          <div className="lg:hidden">
            <EmpresaSelector 
              collapsed={false}
              empresaAtual={empresaAtual}
              userEmpresas={userEmpresas}
              temMultiplasEmpresas={temMultiplasEmpresas}
              trocarEmpresa={trocarEmpresa}
            />
          </div>
          <ThemeToggle />
          <NotificationCenter />
          <UserProfileMenu user={user} />
        </div>
      </div>
    </header>
  );
}
