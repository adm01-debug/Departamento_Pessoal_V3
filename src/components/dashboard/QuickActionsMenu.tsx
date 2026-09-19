import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import {
  Zap, UserPlus, DollarSign, Clock,
  Calendar, BarChart3, Scale,
  Layers, Target, Database, ChevronDown,
} from 'lucide-react';

/**
 * Atalhos do dashboard.
 *
 * Antes ocupavam uma faixa de 6 cards + uma barra de 4 cards de acesso rápido
 * dentro do AnalyticsSection. A composição de referência do dashboard não tem
 * essas faixas, então os 10 destinos foram concentrados neste menu, no cluster
 * de botões do cabeçalho: nenhum atalho foi perdido e as duas linhas liberadas
 * ficaram para o conteúdo analítico.
 */
const acoesRapidas = [
  { label: 'Novo Colaborador', icon: UserPlus, path: '/colaboradores/novo' },
  { label: 'Lançar Ponto', icon: Clock, path: '/ponto' },
  { label: 'Calcular Folha', icon: DollarSign, path: '/folha/calcular' },
  { label: 'Férias / Ausências', icon: Calendar, path: '/ferias' },
  { label: 'Passivo Trabalhista', icon: Scale, path: '/passivo-trabalhista' },
  { label: 'Relatórios DP', icon: BarChart3, path: '/relatorios' },
];

const explorar = [
  { label: 'Workflows', icon: Layers, path: '/workflows' },
  { label: 'BI e Metas', icon: Target, path: '/relatorios' },
  { label: 'Auditoria', icon: Database, path: '/auditoria' },
  { label: 'IA Insights', icon: Zap, path: '/assistente-ia' },
];

export function QuickActionsMenu() {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 rounded-xl gap-2 shadow-xs hover:bg-background hover:text-foreground hover:shadow-glow">
          <Zap className="h-4 w-4 text-primary" />
          <span className="hidden sm:inline">Ações Rápidas</span>
          <ChevronDown className="dp-dropdown-anim-chevron h-3.5 w-3.5 opacity-60 transition-transform duration-[165ms] ease-out group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <DropdownMenuLabel>Ações Rápidas</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {acoesRapidas.map((a) => (
          <DropdownMenuItem key={a.label} className="cursor-pointer gap-2" onClick={() => navigate(a.path)}>
            <a.icon className="h-4 w-4 text-primary" />
            {a.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Explorar</DropdownMenuLabel>
        {explorar.map((a) => (
          <DropdownMenuItem key={a.label} className="cursor-pointer gap-2" onClick={() => navigate(a.path)}>
            <a.icon className="h-4 w-4 text-muted-foreground" />
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
