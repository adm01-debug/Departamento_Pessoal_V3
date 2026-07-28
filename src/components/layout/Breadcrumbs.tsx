import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { motion } from 'framer-motion';

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  colaboradores: 'Colaboradores',
  novo: 'Novo',
  editar: 'Editar',
  detalhes: 'Detalhes',
  empresas: 'Empresas',
  nova: 'Nova',
  folha: 'Folha de Pagamento',
  calcular: 'Calcular',
  ferias: 'Férias',
  ponto: 'Ponto Eletrônico',
  beneficios: 'Benefícios',
  relatorios: 'Relatórios',
  esocial: 'eSocial',
  configuracoes: 'Configurações',
  'design-system': 'Design System',
  admissoes: 'Admissões',
  afastamentos: 'Afastamentos',
  cargos: 'Cargos',
  departamentos: 'Departamentos',
  desligamentos: 'Desligamentos',
  documentos: 'Documentos',
  auditoria: 'Auditoria',
  feriados: 'Feriados',
  usuarios: 'Usuários',
  perfil: 'Perfil',
  notificacoes: 'Notificações',
  integracoes: 'Integrações',
  backup: 'Backup',
  organograma: 'Organograma',
  portal: 'Portal',
  avaliacao: 'Avaliação',
  treinamentos: 'Treinamentos',
  recrutamento: 'Recrutamento',
  onboarding: 'Onboarding',
  assinaturas: 'Assinaturas',
  'horas-extras': 'Horas Extras',
  'locais-trabalho': 'Locais de Trabalho',
  'pesquisas-clima': 'Pesquisas de Clima',
  workflows: 'Workflows',
  turnos: 'Turnos',
  comunicacao: 'Comunicação Interna',
  despesas: 'Despesas',
  'controle-acesso': 'Controle de Acesso',
  lgpd: 'LGPD',
  'banco-horas': 'Banco de Horas',
  epis: 'EPIs',
  faltas: 'Faltas',
  'medidas-disciplinares': 'Medidas Disciplinares',
  jornadas: 'Jornadas',
  'centros-custo': 'Centros de Custo',
  times: 'Times',
  movimentacoes: 'Movimentações',
  sindicatos: 'Sindicatos',
  'obrigacoes-fiscais': 'Obrigações Fiscais',
  'planos-saude': 'Planos de Saúde',
  'canal-etica': 'Canal de Ética',
  convenios: 'Convênios',
  escalas: 'Escalas',
  'seguros-vida': 'Seguros de Vida',
  pensoes: 'Pensões',
  vales: 'Vales',
  exames: 'Exames',
  holerites: 'Holerites',
  lotacoes: 'Lotações',
  contratacao: 'Contratação',
};

export function Breadcrumbs({ className }: { className?: string }) {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  const crumbs = segments.map((seg, i) => {
    const path = '/' + segments.slice(0, i + 1).join('/');
    const isLast = i === segments.length - 1;
    // Detecção de identificadores para breadcrumbs legíveis.
    // Além de UUID/numérico, tratamos como "Detalhes" qualquer segmento
    // desconhecido que seja filho de uma rota conhecida (ex.: /colaboradores/col-1),
    // pois nesses casos o segmento é sempre um ID opaco e nunca um rótulo.
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg);
    const isNumericId = /^\d+$/.test(seg);
    const parentIsKnownRoute = i > 0 && !!routeLabels[segments[i - 1]];
    const isOpaqueChildId = parentIsKnownRoute && !routeLabels[seg];

    let label: string;
    if (isUuid || isNumericId || isOpaqueChildId) {
      label = 'Detalhes';
    } else {
      label = routeLabels[seg] || seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
    }


    return { path, label, isLast };
  }).filter(c => c.label);

  return (
    <motion.nav
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex items-center gap-1 text-caption font-body', className)}
      aria-label="Breadcrumb"
    >
      <Link
        to="/dashboard"
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Home"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.path}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </motion.nav>
  );
}
