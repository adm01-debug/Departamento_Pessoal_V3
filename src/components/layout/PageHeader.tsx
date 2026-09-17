import { cn } from '@/lib/utils';
interface PageHeaderProps { title: string; description?: string; actions?: React.ReactNode; className?: string; }
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (<div className={cn('flex items-center justify-between pb-4', className)}><div><h1 className="text-2xl font-medium tracking-tight">{title}</h1>{description && <p className="text-muted-foreground">{description}</p>}</div>{actions && <div className="flex items-center gap-2">{actions}</div>}</div>);
}
