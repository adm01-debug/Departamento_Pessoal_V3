import { 
  Zap, UserPlus, DollarSign, Clock, Calendar, 
  FileText, BarChart3, X, ChevronRight,
  ClipboardList, Calculator, Settings, Network
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  icon: any;
  path: string;
  desc: string;
  gradient: string;
}

const actions: QuickAction[] = [
  { label: 'Novo Colaborador', icon: UserPlus, gradient: 'from-primary to-primary-glow', path: '/colaboradores/novo', desc: 'Cadastrar funcionário' },
  { label: 'Calcular Folha', icon: DollarSign, gradient: 'from-primary/80 to-primary', path: '/folha/calcular', desc: 'Processamento mensal' },
  { label: 'Registrar Ponto', icon: Clock, gradient: 'from-primary/60 to-primary/90', path: '/ponto', desc: 'Batida manual' },
  { label: 'Solicitar Férias', icon: Calendar, gradient: 'from-primary-glow to-primary', path: '/ferias', desc: 'Nova solicitação' },
  { label: 'Obrigações Fiscais', icon: FileText, gradient: 'from-info to-info/70', path: '/obrigacoes-fiscais', desc: 'S-1000, S-2200, etc' },
  { label: 'Relatórios DP', icon: BarChart3, gradient: 'from-primary to-primary-glow', path: '/relatorios', desc: 'Extração de dados' },
  { label: 'Pesquisas Clima', icon: ClipboardList, gradient: 'from-info to-info/70', path: '/pesquisas-clima', desc: 'Feedbacks equipe' },
  { label: 'Rescisão', icon: Calculator, gradient: 'from-destructive/80 to-destructive', path: '/calculadora-rescisao', desc: 'Simulador' },
  { label: 'Configurações', icon: Settings, gradient: 'from-muted-foreground to-foreground', path: '/configuracoes', desc: 'Ajustes sistema' },
  { label: 'Organograma', icon: Network, gradient: 'from-primary to-info', path: '/organograma', desc: 'Estrutura' },
];

export function MobileQuickActions({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();

  const handleAction = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-md md:hidden"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-card rounded-t-[2.5rem] border-t border-border/50 shadow-2xl p-6 pb-12 md:hidden"
          >
            {/* Handle */}
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-8" />

            <div className="flex items-center justify-between mb-6 px-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-h2 font-display font-bold">Ações Rápidas</h2>
                  <p className="text-caption text-muted-foreground">O que você deseja fazer agora?</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full bg-muted/30" aria-label="Fechar">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {actions.map((action, i) => (
                <motion.button
                  key={action.path}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => handleAction(action.path)}
                  className="flex items-center gap-3 p-4 rounded-2xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-all text-left active:scale-95"
                >
                  <div className={cn("shrink-0 p-2.5 rounded-xl bg-gradient-to-br shadow-md text-white", action.gradient)}>
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{action.label}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{action.desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            <Button 
              variant="outline" 
              className="w-full h-12 rounded-2xl border-dashed border-primary/30 text-primary hover:bg-primary/5 mt-2"
              onClick={() => onOpenChange(false)}
            >
              Fechar Painel
            </Button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
