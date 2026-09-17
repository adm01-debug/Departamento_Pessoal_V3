import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Breadcrumbs } from './Breadcrumbs';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  loading?: boolean;
  className?: string;
  icon?: React.ReactNode;
  gradient?: string;
  /** Override the default back behavior. Pass false to hide the back button. */
  backTo?: string | false;
}

export function PageLayout({
  children,
  title,
  description,
  actions,
  loading,
  className,
  icon,
  gradient = 'from-primary to-primary-glow',
  backTo,
}: PageLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  const isSubPage = segments.length > 1;
  const showBack = backTo !== false && (isSubPage || backTo);

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else if (segments.length > 1) {
      const parentPath = '/' + segments.slice(0, -1).join('/');
      navigate(parentPath);
    } else {
      navigate(-1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('space-y-6 max-w-[1400px] mx-auto', className)}
    >
      {(title || actions) && (
        <div className="space-y-2">
          <Breadcrumbs className="mb-2" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {showBack && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBack}
                        className="h-9 w-9 rounded-xl border border-border/30 hover:border-primary/30 hover:bg-primary/5 shrink-0 transition-all"
                        aria-label="Voltar à página anterior"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Voltar
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {icon && (
                <div className={cn('p-2.5 rounded-xl bg-gradient-to-br shadow-lg', gradient)}>
                  {icon}
                </div>
              )}
              <div>
                {title && <h1 className="text-2xl font-display font-medium tracking-tight">{title}</h1>}
                {description && <p className="text-muted-foreground font-body mt-0.5">{description}</p>}
              </div>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>
      )}
      {children}
    </motion.div>
  );
}
