import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { MobileQuickActions } from './MobileQuickActions';
import { Home, Users, FileText, MoreHorizontal, LayoutGrid, Scale } from 'lucide-react';
import { motion } from 'framer-motion';

const mobileItems = [
  { path: '/dashboard', label: 'Home', icon: Home, color: 'from-primary to-primary-glow' },
  { path: '/colaboradores', label: 'Equipe', icon: Users, color: 'from-primary to-primary-glow' },
  { path: '/quick-actions', label: 'Ações', icon: LayoutGrid, color: 'from-primary to-primary-glow', isSpecial: true },
  { path: '/passivo-trabalhista', label: 'Riscos', icon: Scale, color: 'from-destructive to-destructive-glow' },
  { path: '/folha', label: 'Folha', icon: FileText, color: 'from-primary-glow to-primary' },
  { path: '/configuracoes', label: 'Mais', icon: MoreHorizontal, color: 'from-muted-foreground to-foreground' },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  
  const items = isAdmin ? mobileItems : mobileItems.filter(i => i.path !== '/configuracoes');

  return (
    <>
      <nav aria-label="Navegação mobile" className="fixed bottom-0 left-0 right-0 z-sticky md:hidden">
        <div className="glass border-t border-border/50 px-2 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around h-16" role="list">
            {items.map((item) => {
              const { path, label, icon: Icon, color, isSpecial } = item as any;
              const isActive = location.pathname === path || location.pathname.startsWith(path + '/');

              if (isSpecial) {
                return (
                  <button
                    key={path}
                    onClick={() => setQuickActionsOpen(true)}
                    className="relative flex flex-col items-center justify-center gap-1 w-16 h-full text-muted-foreground"
                  >
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-primary-glow shadow-glow-sm -mt-6 mb-1 text-primary-foreground transform active:scale-90 transition-transform">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <span className="text-[10px] font-body font-bold text-primary">{label}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={path}
                  to={path}
                  role="listitem"
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={label}
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-1 w-16 h-full transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className={cn('absolute -top-[1px] left-3 right-3 h-[2px] rounded-full bg-gradient-to-r', color)}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <Icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} aria-hidden="true" />
                  <span className="text-[10px] font-body font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <MobileQuickActions open={quickActionsOpen} onOpenChange={setQuickActionsOpen} />
    </>
  );
}
