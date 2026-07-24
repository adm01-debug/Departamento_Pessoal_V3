import { useState, useEffect, useCallback, memo } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, ChevronLeft, Sparkles, CheckCircle2 } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  targetSelector?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  emoji: string;
}

const tourSteps: TourStep[] = [
  {
    title: 'Sidebar de Navegação',
    description: 'Acesse todos os módulos do sistema: Colaboradores, Folha, Férias, Ponto, Benefícios e mais.',
    emoji: '📋',
  },
  {
    title: 'Dashboard Inteligente',
    description: 'Visualize KPIs em tempo real, indicadores de turnover e absenteísmo, e acompanhe pendências.',
    emoji: '📊',
  },
  {
    title: 'Ações Rápidas',
    description: 'Execute as operações mais frequentes direto da tela principal: admissão, folha, ponto.',
    emoji: '⚡',
  },
  {
    title: 'Busca Global (⌘K)',
    description: 'Pressione ⌘K (ou Ctrl+K) para buscar qualquer página ou ação instantaneamente.',
    emoji: '🔍',
  },
  {
    title: 'Notificações & Alertas',
    description: 'Receba avisos de férias pendentes, documentos vencidos e eventos importantes.',
    emoji: '🔔',
  },
  {
    title: 'Tema Claro / Escuro',
    description: 'Alterne entre os temas para melhor conforto visual. O sistema salva sua preferência.',
    emoji: '🎨',
  },
];

const STORAGE_KEY = 'dp-tour-completed';

export const GuidedTour = memo(function GuidedTour() {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Auto-start after 2 seconds on first visit
      const timer = setTimeout(() => setActive(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const close = useCallback(() => {
    setActive(false);
    localStorage.setItem(STORAGE_KEY, 'true');
  }, []);

  const next = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setCompleted(true);
      setTimeout(() => {
        close();
      }, 2000);
    }
  }, [currentStep, close]);

  const prev = useCallback(() => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  }, [currentStep]);

  const step = tourSteps[currentStep];

  return (
    <AnimatePresence>
      {active && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-xs z-[200]"
            onClick={close}
          />

          {/* Tour Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', bounce: 0.3 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[90vw] max-w-md"
          >
            {completed ? (
              /* Completion screen */
              <div className="bg-card border border-border/50 rounded-2xl shadow-float p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-success/20 to-finance/10 mb-4"
                >
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </motion.div>
                <h3 className="text-h1 font-display font-bold mb-2">Tour Concluído! 🎉</h3>
                <p className="text-body text-muted-foreground font-body">
                  Você está pronto para usar o sistema. Explore cada módulo no seu ritmo!
                </p>
              </div>
            ) : (
              <div className="bg-card border border-border/50 rounded-2xl shadow-float overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border/30 bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-caption font-body font-semibold text-muted-foreground">
                      Passo {currentStep + 1} de {tourSteps.length}
                    </span>
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Fechar" onClick={close} className="h-7 w-7 rounded-lg">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-muted/50">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-primary-glow"
                    initial={{ width: '0%' }}
                    animate={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentStep}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="text-center"
                    >
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', bounce: 0.5 }}
                        className="text-5xl inline-block mb-4"
                      >
                        {step.emoji}
                      </motion.span>
                      <h3 className="text-h2 font-display font-bold mb-2">{step.title}</h3>
                      <p className="text-body text-muted-foreground font-body leading-relaxed">
                        {step.description}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-border/30 bg-muted/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={prev}
                    disabled={currentStep === 0}
                    className="gap-1 font-body text-caption"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Anterior
                  </Button>

                  {/* Dots */}
                  <div className="flex gap-1.5">
                    {tourSteps.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentStep(i)}
                        className={cn(
                          'h-2 rounded-full transition-all duration-300',
                          i === currentStep
                            ? 'w-6 bg-primary'
                            : i < currentStep
                            ? 'w-2 bg-success/60'
                            : 'w-2 bg-muted-foreground/20'
                        )}
                      />
                    ))}
                  </div>

                  <Button
                    size="sm"
                    onClick={next}
                    className="gap-1 font-body text-caption bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 rounded-lg"
                  >
                    {currentStep === tourSteps.length - 1 ? 'Concluir' : 'Próximo'}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

/* Hook to restart tour */
// eslint-disable-next-line react-refresh/only-export-components
export function useGuidedTour() {
  const restart = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };
  const isCompleted = () => localStorage.getItem(STORAGE_KEY) === 'true';
  return { restart, isCompleted };
}
