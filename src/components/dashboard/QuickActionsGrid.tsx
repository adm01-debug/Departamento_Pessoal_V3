import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import {
  Zap, UserPlus, DollarSign, Clock, 
  Calendar, BarChart3, Scale
} from 'lucide-react';

const MotionCard = motion.create(Card);

const actions = [
  { label: 'Novo Colaborador', icon: UserPlus, gradient: 'from-primary to-primary-glow', path: '/colaboradores/novo', desc: 'Cadastrar funcionário' },
  { label: 'Lançar Ponto', icon: Clock, gradient: 'from-primary/80 to-primary', path: '/ponto', desc: 'Batida manual' },
  { label: 'Calcular Folha', icon: DollarSign, gradient: 'from-primary/60 to-primary/90', path: '/folha/calcular', desc: 'Processamento mensal' },
  { label: 'Férias / Ausências', icon: Calendar, gradient: 'from-primary-glow to-primary', path: '/ferias', desc: 'Gestão de tempo' },
  { label: 'Passivo Trabalhista', icon: Scale, gradient: 'from-destructive to-destructive/80', path: '/passivo-trabalhista', desc: 'Análise de risco' },
  { label: 'Relatórios DP', icon: BarChart3, gradient: 'from-primary to-primary-glow', path: '/relatorios', desc: 'Extração de BI' },
];

export function QuickActionsGrid() {
  const navigate = useNavigate();

  return (
    <MotionCard
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="border border-border/30 shadow-elevated rounded-2xl overflow-hidden"
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2.5 text-h3 font-display">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary to-primary-glow">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          Ações Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {actions.map((a, i) => (
            <motion.button
              key={a.path}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.06 }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(a.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl glass border border-border/30 hover:border-primary/30 hover:shadow-glow-sm transition-all group text-center"
            >
              <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shadow-lg group-hover:scale-110 transition-transform", a.gradient)}>
                <a.icon className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-caption font-display font-semibold leading-tight">{a.label}</p>
                <p className="text-[9px] text-muted-foreground/50 font-body mt-0.5 hidden sm:block">{a.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </CardContent>
    </MotionCard>
  );
}
