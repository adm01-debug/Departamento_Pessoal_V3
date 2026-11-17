import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { tomDoAvatar } from '@/lib/avatarTons';

interface UserAvatarProps {
  name: string;
  imageUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// O gradiente anterior (`bg-gradient-to-br` + `from-chart-N to-chart-M`) nao
// gerava CSS: `--color-chart-*` nao esta registrado no tema do Tailwind v4,
// entao 4 dos 5 tons sorteados saiam SEM fundo nenhum — iniciais soltas sobre
// o navy. Conferido no CSS compilado: `from-chart-1` tem 0 ocorrencias,
// enquanto os 5 tons de `avatarTons` (`bg-primary/20`, `bg-info/20`,
// `bg-success/20`, `bg-xp/20`, `bg-warning/20`) tem 1 cada.
//
// `tomDoAvatar` ja existia em `src/lib/avatarTons.ts`, documentado como a
// paleta do UserAvatar, e era usado so pela pilha de participantes das
// campanhas. Aqui ele passa a servir o componente para o qual foi escrito.

export function UserAvatar({ name, imageUrl, size = 'md', className }: UserAvatarProps) {
  const initials = getInitials(name);
  const tom = tomDoAvatar(name);

  return (
    <Avatar className={cn(sizeClasses[size], 'ring-1 ring-border/20', className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
      <AvatarFallback className={cn('font-medium', tom)}>{initials}</AvatarFallback>
    </Avatar>
  );
}
