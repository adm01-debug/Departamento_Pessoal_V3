import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface BackButtonProps {
  className?: string;
  fallbackPath?: string;
}

export function BackButton({ className, fallbackPath = '/dashboard' }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Define as rotas raiz onde o botão não deve aparecer
  const rootPaths = ['/', '/dashboard', '/login', '/auth/callback'];
  const isRootPath = rootPaths.includes(location.pathname);

  if (isRootPath) return null;

  const handleBack = () => {
    // Se o histórico estiver vazio (ex: abriu link direto), vai para o fallback
    if (window.history.length <= 2) {
      navigate(fallbackPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.25 }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className={cn(
            "flex items-center gap-1.5 px-2 h-9 text-muted-foreground hover:text-foreground hover:bg-accent/50 group transition-all rounded-lg",
            className
          )}
          aria-label="Voltar para a tela anterior"
        >
          <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="text-sm font-medium hidden sm:inline">Voltar</span>
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
