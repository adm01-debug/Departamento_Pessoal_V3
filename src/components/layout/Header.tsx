import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Menu, Search, Cloud } from 'lucide-react';
import { NotificationCenter } from '@/components/ui/notification-center';
import { UserProfileMenu } from '@/components/ui/user-profile-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageSelector } from '@/components/i18n/LanguageSelector';
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
      'flex items-center justify-between gap-3 h-14 px-4 lg:px-6',
      'border-b border-border/40 bg-background/80 backdrop-blur-xl',
      className
    )}>
      {/* min-w-0 nos dois grupos: permite que o chip da empresa encolha/trunque
          em vez de empurrar o header além da viewport (<sm), que gerava rolagem
          horizontal em toda página. */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <Button variant="ghost" size="icon" onClick={onMenuClick} className="lg:hidden hover:bg-accent/50 rounded-lg" aria-label="Abrir menu">
          <Menu className="h-5 w-5" />
        </Button>
        
        {/* Navigation Control */}
        <div className="flex items-center gap-2">
          <BackButton />
          <div className="h-4 w-[1px] bg-border/40 mx-1 hidden md:block" />
          <Breadcrumbs className="md:flex" />
        </div>

        {/* Compact search trigger — em lg+ a sidebar (Search) continua disponível
            em md; aqui o gatilho largo só entra quando há folga. */}
        <button
          onClick={handleSearchClick}
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg border border-border/30 hover:border-primary/40 hover:bg-muted/80 transition-all group cursor-pointer min-w-0 shrink"
          aria-label="Buscar (⌘K)"
        >
          <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          {/* Rótulo em dois degraus: em lg o pill tem 128px (w-32) e o texto
              longo aparecia cortado em "Busque p…"; o texto completo só entra
              em xl, onde o pill cresce para w-60. O nome acessível do botão é
              o `aria-label` acima — isto é só rótulo visual. */}
          <span className="text-body font-body text-muted-foreground/60 w-28 lg:w-32 xl:w-60 min-w-0 text-left truncate">
            <span className="xl:hidden">Buscar…</span>
            <span className="hidden xl:inline">Busque por colaboradores…</span>
          </span>
          <kbd className="hidden lg:inline-flex shrink-0 h-5 items-center gap-1 rounded border border-border/40 bg-muted px-1.5 text-overline font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 min-w-0 justify-end lg:shrink-0">
        {/* Sync Status Badge — o mesmo status já aparece no rodapé da sidebar
            (SystemStatus) em todos os tamanhos em que a sidebar existe; aqui só
            entra a partir de 2xl, quando o header tem folga de sobra. Antes
            (lg+) ele espremia o avatar e gerava rolagem horizontal. */}
        <div className={cn(
          "hidden 2xl:flex shrink-0 items-center gap-1.5 px-2 py-0.5 rounded-full border text-overline font-medium whitespace-nowrap",
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

        <div className="flex items-center gap-1.5 min-w-0">
          {/* Company chip in header: só abaixo de md, onde a sidebar (que tem o
              seletor de empresa completo) está recolhida. */}
          <div className="md:hidden min-w-0 max-w-[14rem]">
            <EmpresaSelector 
              collapsed={false}
              empresaAtual={empresaAtual}
              userEmpresas={userEmpresas}
              temMultiplasEmpresas={temMultiplasEmpresas}
              trocarEmpresa={trocarEmpresa}
              variant="header"
            />
          </div>
          <ThemeToggle className="hidden sm:inline-flex" />
          <NotificationCenter />
          <UserProfileMenu user={user} />
        </div>
      </div>
    </header>
  );
}
