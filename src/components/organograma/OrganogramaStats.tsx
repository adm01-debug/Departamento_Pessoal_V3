import { Building2, Users, Layers } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { cardVariants } from '@/components/dashboard/MetricCard';
import { HEADER_REVEAL } from './organogramaHeaderReveal';

interface OrganogramaStatsProps {
  totalDeptos: number;
  totalColabs: number;
  niveis: number;
}

/**
 * Cada indicador tem a sua própria cor de ícone, mas só a TINTA muda: tamanho,
 * raio, espaçamento e estrutura do card continuam idênticos. As três cores saem
 * de tokens que já existem no design system, no mesmo par "fundo suave + tinta"
 * usado pelos badges de ícone do projeto (ex.: `info` no cabeçalho de
 * "Amplitude de Liderança" e `success` no "Mapa da Estrutura, ambos no
 * DashboardExecutivoPage):
 *   - Departamentos ......... azul/ciano → `--info`
 *   - Colaboradores ......... verde      → `--success`
 *   - Níveis hierárquicos ... roxo       → `--chart-4` (token do roxo
 *                             categórico, o mesmo par já usado no AssistenteIAPage)
 * `--chart-4` não está registrado no tema do Tailwind, então é consumido pela
 * notação arbitrária `[hsl(var(--chart-4)/0.15)]` — que é o padrão existente no
 * projeto para esse token.
 *
 * Entrada: cada card entra com a MESMA animação dos KPI Cards do Dashboard
 * Executivo — `cardVariants`, importado de `dashboard/MetricCard.tsx` (fade +
 * subida de 20px, 0.4s, `delay = índice × 0.08s`) — na ordem da esquerda para a
 * direita declarada em `organogramaHeaderReveal.ts` (slots 0, 1 e 2; a busca e
 * os dois botões da toolbar continuam a fila em 3, 4 e 5). Só o `custom` muda
 * por card: `initial`, `animate` e `variants` são os do Dashboard, sem cópia
 * local.
 */
const ITEMS = (props: OrganogramaStatsProps) => [
  {
    label: 'Departamentos',
    value: props.totalDeptos,
    icon: Building2,
    iconClass: 'bg-info/15 text-info',
    reveal: HEADER_REVEAL.departamentos,
  },
  {
    label: 'Colaboradores',
    value: props.totalColabs,
    icon: Users,
    iconClass: 'bg-success/15 text-success',
    reveal: HEADER_REVEAL.colaboradores,
  },
  {
    label: 'Níveis hierárquicos',
    value: props.niveis,
    icon: Layers,
    iconClass: 'bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))]',
    reveal: HEADER_REVEAL.niveis,
  },
];

export function OrganogramaStats(props: OrganogramaStatsProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {ITEMS(props).map(({ label, value, icon: Icon, iconClass, reveal }) => (
        <motion.div
          key={label}
          custom={reveal}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-2.5 h-11 px-3 rounded-lg border border-border/60 bg-card/50 shrink-0"
        >
          <span className={cn('w-6 h-6 rounded-md flex items-center justify-center shrink-0', iconClass)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-sm font-display font-semibold -mt-0.5">{value}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
