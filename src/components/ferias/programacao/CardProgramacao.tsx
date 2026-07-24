import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, Check, MoreVertical, Shield, UserCheck, X, ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { ProgramacaoFerias, ProgramacaoStatus } from '@/hooks/ferias/useProgramacaoFerias';

const STATUS_LABEL: Record<ProgramacaoStatus, string> = {
  rascunho: 'Rascunho',
  sugerido_gestor: 'Sugerido',
  aprovado_gestor: 'Gestor OK',
  aprovado_rh: 'RH OK',
  convertido: 'Convertido',
  rejeitado: 'Rejeitado',
  cancelado: 'Cancelado',
};

const STATUS_TONE: Record<ProgramacaoStatus, string> = {
  rascunho: 'bg-muted text-muted-foreground',
  sugerido_gestor: 'bg-blue-500/15 text-blue-500',
  aprovado_gestor: 'bg-amber-500/15 text-amber-500',
  aprovado_rh: 'bg-primary/15 text-primary',
  convertido: 'bg-success/15 text-success',
  rejeitado: 'bg-destructive/15 text-destructive',
  cancelado: 'bg-muted text-muted-foreground line-through',
};

interface Props {
  programacao: ProgramacaoFerias;
  canManage: boolean;
  isRH: boolean;
  onAprovarGestor: (id: string) => void;
  onAprovarRH: (id: string) => void;
  onRejeitar: (p: ProgramacaoFerias) => void;
  onConverter: (p: ProgramacaoFerias) => void;
}

export function CardProgramacao({
  programacao: p,
  canManage,
  isRH,
  onAprovarGestor,
  onAprovarRH,
  onRejeitar,
  onConverter,
}: Props) {
  const isDraggable = canManage && !['convertido', 'cancelado', 'rejeitado'].includes(p.status);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: p.id,
    disabled: !isDraggable,
  });

  const style = { transform: CSS.Translate.toString(transform) } as React.CSSProperties;

  // Art. 137 CLT (dobra) — período estourado
  const limite = p.periodo_aquisitivo?.data_limite_concessao;
  const emDobra =
    limite &&
    new Date(`${p.ano}-${String(p.mes_previsto).padStart(2, '0')}-01`) > new Date(limite);

  const iniciais =
    p.colaborador?.nome_completo
      ?.split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() ?? '?';

  return (
    <TooltipProvider>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        aria-grabbed={isDragging}
        className={cn(
          'group relative rounded-lg border bg-card p-3 shadow-sm transition-shadow',
          isDraggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
          isDragging && 'opacity-60 ring-2 ring-primary',
          emDobra && 'border-destructive/60'
        )}
      >
        <div className="flex items-start gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={p.colaborador?.foto_url ?? undefined} />
            <AvatarFallback className="text-[10px]">{iniciais}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium leading-tight">
              {p.colaborador?.nome_completo ?? 'Colaborador'}
            </p>
            <p className="text-xs text-muted-foreground">
              {p.dias_previstos} dias
              {p.data_inicio_prevista ? ` • início ${p.data_inicio_prevista.slice(8, 10)}/${p.data_inicio_prevista.slice(5, 7)}` : ''}
            </p>
          </div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Ações da programação"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {p.status === 'sugerido_gestor' && (
                  <DropdownMenuItem onClick={() => onAprovarGestor(p.id)}>
                    <UserCheck className="mr-2 h-4 w-4" /> Aprovar (Gestor)
                  </DropdownMenuItem>
                )}
                {p.status === 'aprovado_gestor' && isRH && (
                  <DropdownMenuItem onClick={() => onAprovarRH(p.id)}>
                    <Shield className="mr-2 h-4 w-4" /> Aprovar (RH)
                  </DropdownMenuItem>
                )}
                {p.status === 'aprovado_rh' && isRH && (
                  <DropdownMenuItem onClick={() => onConverter(p)}>
                    <ArrowRight className="mr-2 h-4 w-4" /> Converter em férias
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {!['convertido', 'cancelado', 'rejeitado'].includes(p.status) && (
                  <DropdownMenuItem onClick={() => onRejeitar(p)} className="text-destructive">
                    <X className="mr-2 h-4 w-4" /> Rejeitar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className={cn('text-[10px]', STATUS_TONE[p.status])}>
            {p.status === 'aprovado_gestor' && <Check className="mr-1 h-3 w-3" />}
            {p.status === 'aprovado_rh' && <Check className="mr-1 h-3 w-3" />}
            {STATUS_LABEL[p.status]}
          </Badge>
          {emDobra && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="border-destructive/60 text-[10px] text-destructive">
                  <AlertTriangle className="mr-1 h-3 w-3" /> Dobra
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Art. 137 CLT — férias após a data limite de concessão ({limite}) geram pagamento em
                dobra.
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
