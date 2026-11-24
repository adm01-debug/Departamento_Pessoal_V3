import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useGuidedTour } from '@/components/onboarding/GuidedTour';

interface SidebarFooterProps {
  collapsed: boolean;
  user: { name?: string; email?: string } | null;
  userInitials: string;
  onSignOut: () => void;
}

export function SidebarFooter({ collapsed, user, userInitials, onSignOut }: SidebarFooterProps) {
  const { restart } = useGuidedTour();
  return (
    <div className="border-t border-sidebar-border p-3">
      {!collapsed ? (
        <div className="space-y-2">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-9 w-9 ring-2 ring-border/30">
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-xs font-medium">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-body font-medium text-foreground truncate">
                {user?.name || user?.email || 'Usuário'}
              </p>
              <p className="text-[10px] text-muted-foreground font-body truncate">
                {user?.email || ''}
              </p>
            </div>
          </div>
          <button
            onClick={restart}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors text-sm font-body"
          >
            <HelpCircle className="h-4 w-4" />
            <span>Tour do Sistema</span>
          </button>
          <button
            onClick={onSignOut}
            aria-label="Sair do sistema"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm font-body"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </button>
        </div>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onSignOut}
              aria-label="Sair do sistema"
              className="w-full flex items-center justify-center py-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right"><p>Sair</p></TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
