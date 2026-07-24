import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, Shield, HelpCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { toast } from 'sonner';
import { safeErrorMessage } from '@/utils/safeError';

interface UserProfileMenuProps {
  user?: { name: string; email: string; avatar?: string };
}

export function UserProfileMenu({ user }: UserProfileMenuProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'US';

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toast.success('Sessão encerrada com sucesso');
      navigate('/login');
    } catch (error: any) {
      toast.error(safeErrorMessage(error, 'Erro ao encerrar sessão.'));
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2.5 hover:bg-accent/50 rounded-xl px-2 transition-all duration-200">
          <div className="relative">
            <Avatar className="h-8 w-8 ring-2 ring-border/50 transition-all group-hover:ring-primary/30">
              {user?.avatar && <AvatarImage src={user.avatar} />}
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-card" />
          </div>
          <div className="hidden md:flex flex-col items-start">
            <span className="text-sm font-medium font-body leading-tight">{user?.name || 'Usuário'}</span>
            <span className="text-[11px] text-muted-foreground font-body leading-tight">{user?.email || ''}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 glass border-border/50 rounded-xl p-1.5">
        <div className="px-3 py-3 mb-1">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-border/30">
              {user?.avatar && <AvatarImage src={user.avatar} />}
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-sm font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-display font-semibold truncate">{user?.name || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground font-body truncate">{user?.email || ''}</p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-success/15 text-success text-[10px] font-bold uppercase tracking-wider">Online</span>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-border/30" />

        <DropdownMenuItem onClick={() => navigate('/perfil')} className="gap-3 py-2.5 rounded-lg cursor-pointer">
          <div className="p-1.5 rounded-lg bg-accent/80"><User className="h-3.5 w-3.5" /></div>
          <div>
            <p className="text-sm font-body font-medium">Meu Perfil</p>
            <p className="text-[11px] text-muted-foreground">Dados pessoais</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => navigate('/configuracoes')} className="gap-3 py-2.5 rounded-lg cursor-pointer">
          <div className="p-1.5 rounded-lg bg-accent/80"><Settings className="h-3.5 w-3.5" /></div>
          <div>
            <p className="text-sm font-body font-medium">Configurações</p>
            <p className="text-[11px] text-muted-foreground">Preferências do sistema</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => navigate('/seguranca')} className="gap-3 py-2.5 rounded-lg cursor-pointer">
          <div className="p-1.5 rounded-lg bg-accent/80"><Shield className="h-3.5 w-3.5" /></div>
          <div>
            <p className="text-sm font-body font-medium">Segurança</p>
            <p className="text-[11px] text-muted-foreground">Senha e autenticação</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuItem className="gap-3 py-2.5 rounded-lg cursor-pointer">
          <div className="p-1.5 rounded-lg bg-accent/80"><HelpCircle className="h-3.5 w-3.5" /></div>
          <div>
            <p className="text-sm font-body font-medium">Ajuda</p>
            <p className="text-[11px] text-muted-foreground">Suporte e documentação</p>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border/30" />

        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isLoggingOut}
          className="gap-3 py-2.5 rounded-lg cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <div className="p-1.5 rounded-lg bg-destructive/10">
            {isLoggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
          </div>
          <div>
            <p className="text-sm font-body font-medium">Sair</p>
            <p className="text-[11px] text-muted-foreground">Encerrar sessão</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
