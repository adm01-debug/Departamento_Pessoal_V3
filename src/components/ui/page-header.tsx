// V15-181: src/components/ui/page-header.tsx
import { cn } from '@/lib/utils';
import { Button } from './button';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  description?: string;
  backUrl?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, backUrl, actions, children, className }: PageHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6', className)}>
      <div className="flex items-center gap-4">
        {backUrl && (
          <Button variant="ghost" size="icon" onClick={() => navigate(backUrl)} aria-label="Voltar">
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      </div>
      {(actions || children) && <div className="flex items-center gap-2">{children || actions}</div>}
    </div>
  );
}
