import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

function getAvatarColor(name: string): string {
  const colors = [
    'from-primary to-primary-glow',
    'from-chart-1 to-chart-2',
    'from-chart-3 to-chart-4',
    'from-chart-2 to-chart-5',
    'from-chart-4 to-chart-1',
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

export function UserAvatar({ name, imageUrl, size = 'md', className }: UserAvatarProps) {
  const initials = getInitials(name);
  const gradient = getAvatarColor(name);

  return (
    <Avatar className={cn(sizeClasses[size], 'ring-1 ring-border/20', className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name} />}
      <AvatarFallback className={cn('bg-gradient-to-br text-primary-foreground font-medium', gradient)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
