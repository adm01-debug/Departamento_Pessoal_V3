import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { tomDoAvatar } from '@/lib/avatarTons';
import { cn } from '@/lib/utils';

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
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function UserAvatar({ name, imageUrl, size = 'md', className }: UserAvatarProps) {
  const initials = getInitials(name);

  return (
    <Avatar className={cn(sizeClasses[size], 'ring-1 ring-border/20', className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
      {/* Fallback com a paleta estável de `lib/avatarTons` (fundo translúcido +
          texto na cor cheia do token). Antes usava `bg-gradient-to-br` com
          `from-/to-`, sintaxe da v3 do Tailwind que não gera CSS nenhum na v4 —
          o avatar ficava sem fundo e com tinta quase preta sobre o navy. */}
      <AvatarFallback className={cn('font-semibold', tomDoAvatar(name))}>{initials}</AvatarFallback>
    </Avatar>
  );
}
