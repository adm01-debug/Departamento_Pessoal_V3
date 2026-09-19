import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ColaboradorStatus } from '@/components/ui/status-badge';
import { Spinner } from '@/components/ui/spinner';
import { Eye, Edit, Briefcase, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Colaborador } from '@/types/entities';
import { VinculosResumo } from '@/services/vinculoService';
// Mesma animação de entrada dos cards do Dashboard principal — ver
// `ColaboradorKpiCards.tsx`. Índice limitado (`Math.min(i, 5)`): sem isso,
// uma grade com 20+ colaboradores levaria segundos pro último card entrar.
import { cardVariants } from '@/components/dashboard/MetricCard';
const DIRECTORY_MAX_STAGGER_INDEX = 5;

function formatAdmissao(data?: string | null) {
  if (!data) return '—';
  try {
    // `data_admissao` é uma coluna DATE (sem hora) — parse manual evita o
    // shift de fuso de `new Date('YYYY-MM-DD')` (interpretado como UTC).
    const [y, m, d] = data.split('-').map(Number);
    if (!y || !m || !d) return '—';
    return format(new Date(y, m - 1, d), 'dd/MM/yyyy');
  } catch {
    return '—';
  }
}

interface ColaboradorDirectoryGridProps {
  items: Colaborador[];
  isFetching?: boolean;
  /** Resumo de passagens por colaborador_id (ver useVinculosResumo — 1 query para a página toda). */
  passagensPorId?: Record<string, VinculosResumo>;
}

// Visão "Diretório" — grade de cards com a mesma fonte de dados e as mesmas
// ações (ver perfil/editar) da ColaboradorTable, só a apresentação muda.
export function ColaboradorDirectoryGrid({ items, isFetching, passagensPorId }: ColaboradorDirectoryGridProps) {
  const navigate = useNavigate();

  return (
    <TooltipProvider>
    <div className="relative">
      {isFetching && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10 rounded-2xl">
          <Spinner size="md" />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {items.map((c, i) => (
          <motion.div
            key={c.id}
            custom={Math.min(i, DIRECTORY_MAX_STAGGER_INDEX)}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            onClick={() => navigate(`/colaboradores/${c.id}`)}
            className="group cursor-pointer rounded-2xl border border-border/30 bg-card shadow-elevated hover:border-primary/30 hover:shadow-glow-lg transition-all p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar name={c.nome_completo} imageUrl={c.foto_url} size="lg" className="rounded-xl shadow-xs" />
                <div className="min-w-0">
                  <p className="font-display font-medium text-sm leading-tight truncate group-hover:text-primary transition-colors">
                    {c.nome_completo}
                  </p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5 truncate">
                    {c.email || 'Sem e-mail cadastrado'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Visualizar"
                      className="h-7 w-7 rounded-lg hover:bg-info/10 text-info"
                      onClick={(e) => { e.stopPropagation(); navigate(`/colaboradores/${c.id}`); }}
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ver Perfil</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar"
                      className="h-7 w-7 rounded-lg hover:bg-primary/10 text-primary"
                      onClick={(e) => { e.stopPropagation(); navigate(`/colaboradores/editar/${c.id}`); }}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs min-w-0">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-body font-medium text-foreground truncate">{c.cargo || '—'}</span>
              {c.departamento && (
                <span className="text-[10px] text-primary font-medium uppercase tracking-wider truncate">
                  · {c.departamento}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/20">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{formatAdmissao(c.data_admissao)}</span>
                {(passagensPorId?.[c.id]?.quantidadePassagens ?? 0) >= 2 && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal shrink-0">
                    {passagensPorId![c.id].quantidadePassagens}ª passagem
                  </Badge>
                )}
              </div>
              <ColaboradorStatus status={c.status} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
    </TooltipProvider>
  );
}
