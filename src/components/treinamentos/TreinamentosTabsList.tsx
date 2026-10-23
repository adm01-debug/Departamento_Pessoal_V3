import { motion } from 'framer-motion';
import { Award, BookOpen, CalendarDays, Layers, List, Users } from 'lucide-react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Barra de abas de Treinamentos — MESMO padrão visual e de animação da
 * TabList do Dashboard Executivo (`DashboardExecutivoPage.tsx`):
 *
 *   • lista plana, sem container segmentado (sem fundo, borda externa,
 *     padding ou raio de botão);
 *   • grid ocupando toda a largura, com divisória inferior contínua; no
 *     desktop são 6 colunas iguais e, abaixo de `xl`, a mesma escada
 *     responsiva do Dashboard (2 → 3 colunas), sem sobreposição;
 *   • ícone + texto centralizados, inativos em `muted-foreground` e ativos
 *     em `foreground` sem fundo individual;
 *   • indicador Lime de 2 px ocupando toda a região da aba, na base;
 *   • `layoutId` compartilhado + a MESMA mola do Dashboard
 *     (`stiffness: 500`, `damping: 40`) para o indicador deslizar (FLIP)
 *     entre as abas, sem desmontar/remontar.
 *
 * O `<Tabs>`/`<TabsContent>` do Radix continua no consumidor: este componente
 * cuida apenas da navegação visual. Nenhum handler, rota ou conteúdo é
 * alterado. O `layoutId` é isolado por módulo para não animar entre telas.
 */

const ABAS_TREINAMENTOS = [
  { value: 'treinamentos', label: 'Treinamentos', Icon: List },
  { value: 'catalogo', label: 'Catálogo', Icon: BookOpen },
  { value: 'trilhas', label: 'Trilhas', Icon: Layers },
  { value: 'inscricoes', label: 'Inscrições', Icon: Users },
  { value: 'turmas', label: 'Turmas / Instâncias', Icon: CalendarDays },
  { value: 'certificados', label: 'Certificados', Icon: Award },
] as const;

/**
 * Skin do gatilho. Os `data-[state=active]` sobrescrevem o fundo/sombra que o
 * wrapper Radix (`components/ui/tabs.tsx`) aplica por padrão — por isso não
 * sobra nenhum retângulo atrás da aba ativa.
 */
const ABA_CLASS =
  'relative flex w-full items-center justify-center gap-1 whitespace-nowrap rounded-none bg-transparent px-2 py-3 text-[13px] font-medium text-muted-foreground shadow-none outline-none transition-colors hover:bg-transparent hover:text-foreground/80 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-border data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:hover:text-foreground sm:text-sm';

export interface TreinamentosTabsListProps {
  /** Aba ativa — o mesmo `value` do `<Tabs>` do Radix. */
  value: string;
  onValueChange: (value: string) => void;
}

export function TreinamentosTabsList({ value, onValueChange }: TreinamentosTabsListProps) {
  return (
    <TabsList
      data-treinamentos-tablist
      className="mb-4 grid h-auto w-full grid-cols-2 items-stretch justify-start gap-0 rounded-none border-b border-border/30 bg-transparent p-0 text-muted-foreground sm:grid-cols-3 xl:grid-cols-6"
    >
      {ABAS_TREINAMENTOS.map(({ value: aba, label, Icon }) => (
        <TabsTrigger key={aba} value={aba} className={ABA_CLASS}>
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {label}
          {value === aba && (
            <motion.div
              data-aba-indicador
              aria-hidden="true"
              layoutId="treinamentos-aba-ativa"
              className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
