import { useRef, type ReactNode } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ColaboradorStatus } from '@/components/ui/status-badge';
import { Spinner } from '@/components/ui/spinner';
import { Eye, Edit } from 'lucide-react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Colaborador } from '@/types/entities';
import { VinculosResumo } from '@/services/vinculoService';
import { cardVariants } from '@/components/dashboard/MetricCard';

// Mesmas classes base que `TableRow` (ui/table.tsx) aplicaria — replicadas
// aqui porque a linha usa `motion.tr` direto (não `motion.create(TableRow)`):
// `useInView` precisa observar o `<tr>` real via um `ref` próprio por linha,
// e um `ref` só chega ao DOM de forma inequívoca quando não passa por mais
// nenhuma camada de wrapping/forwardRef no meio do caminho.
const ROW_BASE_CLASSNAME = 'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted';

// Entrada baseada no "Animated List" do React Bits (AnimatedItem): cada linha
// observa sua própria visibilidade (`useInView`, `once: false`) — anima ao
// entrar no viewport, volta ao estado inicial ao sair de forma significativa
// e reanima ao reentrar (rolar pra baixo e voltar mostra o efeito de novo).
// Só `opacity`/`transform` (scale+y), nada de width/height/top/left.
const ROW_HIDDEN = { opacity: 0, scale: 0.88, y: 10 };
const ROW_VISIBLE = { opacity: 1, scale: 1, y: 0 };
const ROW_DURATION = 0.28;
// Acima da 8ª linha o atraso para de crescer — sem isso, uma página de 25
// colaboradores levaria mais de 1s só pra última linha começar a entrar.
const ROW_MAX_STAGGER_INDEX = 7;
const ROW_STAGGER_STEP = 0.05;

interface ColaboradorRowProps {
  index: number;
  className: string;
  onClick: () => void;
  children: ReactNode;
}

// Equivalente ao `AnimatedItem` do React Bits: ref + `useInView` próprios por
// linha (por isso precisa ser um componente de verdade instanciado via JSX —
// hooks não podem ser chamados dentro do `.map()` do componente pai).
function ColaboradorRow({ index, className, onClick, children }: ColaboradorRowProps) {
  const ref = useRef<HTMLTableRowElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isInView = useInView(ref, { amount: 0.3, once: false });

  return (
    <motion.tr
      ref={ref}
      className={cn(ROW_BASE_CLASSNAME, className)}
      onClick={onClick}
      initial={prefersReducedMotion ? false : ROW_HIDDEN}
      animate={prefersReducedMotion ? undefined : (isInView ? ROW_VISIBLE : ROW_HIDDEN)}
      transition={{ duration: ROW_DURATION, ease: 'easeOut', delay: Math.min(index, ROW_MAX_STAGGER_INDEX) * ROW_STAGGER_STEP }}
    >
      {children}
    </motion.tr>
  );
}

const COLUMNS = [
  { header: 'Colaborador', className: 'pl-6' },
  { header: 'Identificação', className: 'hidden sm:table-cell text-center' },
  { header: 'Posição', className: 'hidden md:table-cell text-center' },
  { header: 'Vínculo', className: 'hidden lg:table-cell text-center' },
  { header: 'Status', className: 'text-center' },
  { header: 'Ações', className: 'text-center', width: '96px' },
];

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

interface ColaboradorTableProps {
  items: Colaborador[];
  isFetching?: boolean;
  /** Resumo de passagens por colaborador_id (ver useVinculosResumo — 1 query para a página toda). */
  passagensPorId?: Record<string, VinculosResumo>;
}

// Tabela densa (6 colunas) — substitui a tabela embutida do
// EntityPageContainer só nesta página, para controlar padding/linha sem
// afetar Departamentos/Cargos/LocaisTrabalho (que continuam usando o
// container genérico).
export function ColaboradorTable({ items, isFetching, passagensPorId }: ColaboradorTableProps) {
  const navigate = useNavigate();

  return (
    // Mesma animação de entrada dos cards do Dashboard principal (ver
    // `cardVariants` em `MetricCard.tsx`) — índice 6: continua o stagger da
    // página depois dos 5 KPIs + do card de filtros. As linhas de dentro têm
    // sua própria animação por scroll (`ColaboradorRow`, ver mais abaixo) —
    // esta aqui é só o "envelope" da tabela.
    <motion.div
      custom={6}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="rounded-2xl border border-border/30 overflow-hidden shadow-elevated bg-card relative"
    >
      {isFetching && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-10">
          <Spinner size="md" />
        </div>
      )}
      <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/20">
            {COLUMNS.map((col) => (
              <TableHead
                key={col.header}
                className={`font-display font-semibold text-xs py-2.5 ${col.className}`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((c, i) => (
            <ColaboradorRow
              key={c.id}
              index={i}
              className="hover:bg-muted/40 border-border/10 last:border-0 cursor-pointer group"
              onClick={() => navigate(`/colaboradores/${c.id}`)}
            >
              <TableCell className="py-2.5 pl-6">
                <div className="flex items-center gap-3">
                  <UserAvatar name={c.nome_completo} imageUrl={c.foto_url} size="sm" className="rounded-xl shadow-xs" />
                  <div className="min-w-0">
                    <p className="font-display font-medium text-sm leading-tight truncate group-hover:text-primary transition-colors">
                      {c.nome_completo}
                    </p>
                    <p className="text-xs text-muted-foreground font-body mt-0.5 truncate">{c.email || 'Sem e-mail cadastrado'}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell py-2.5 text-center">
                <div className="flex flex-col items-center">
                  <span className="font-body text-xs text-foreground">CPF: {c.cpf}</span>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">MAT: {c.matricula || 'N/A'}</span>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell py-2.5 text-center">
                <div className="flex flex-col items-center">
                  <span className="font-body font-medium text-sm">{c.cargo}</span>
                  <span className="text-[10px] text-primary font-medium uppercase tracking-wider">{c.departamento}</span>
                </div>
              </TableCell>
              <TableCell className="hidden lg:table-cell py-2.5 text-center">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Admissão</span>
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="font-body text-xs">{formatAdmissao(c.data_admissao)}</span>
                    {(passagensPorId?.[c.id]?.quantidadePassagens ?? 0) >= 2 && (
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                        {passagensPorId![c.id].quantidadePassagens}ª passagem
                      </Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-2.5 text-center">
                <div className="flex justify-center">
                  <ColaboradorStatus status={c.status} />
                </div>
              </TableCell>
              <TableCell className="py-2.5 text-center">
                <div className="flex justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Visualizar"
                        className="h-8 w-8 rounded-lg hover:bg-info/10 text-info"
                        onClick={(e) => { e.stopPropagation(); navigate(`/colaboradores/${c.id}`); }}
                      >
                        <Eye className="h-4 w-4" />
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
                        className="h-8 w-8 rounded-lg hover:bg-primary/10 text-primary"
                        onClick={(e) => { e.stopPropagation(); navigate(`/colaboradores/editar/${c.id}`); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Editar</TooltipContent>
                  </Tooltip>
                </div>
              </TableCell>
            </ColaboradorRow>
          ))}
        </TableBody>
      </Table>
      </TooltipProvider>
    </motion.div>
  );
}
