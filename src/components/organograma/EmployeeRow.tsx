import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mail } from 'lucide-react';
import type { OrgColaborador } from '@/lib/organogramaTree';

interface EmployeeRowProps {
  colaborador: OrgColaborador;
}

function getInitials(name: string) {
  return (
    name
      ?.split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

export function EmployeeRow({ colaborador }: EmployeeRowProps) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_260px] items-center gap-2 h-10 px-2.5 rounded-md hover:bg-muted/5 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarImage src={colaborador.foto_url || undefined} />
          <AvatarFallback className="text-[9px] bg-primary/5 text-primary font-medium">
            {getInitials(colaborador.nome_completo)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 flex items-baseline gap-3">
          <p className="text-[12px] font-medium truncate leading-none">{colaborador.nome_completo}</p>
          <p className="text-[10px] text-muted-foreground truncate uppercase tracking-wide leading-none shrink-0">
            {colaborador.cargo || 'Membro'}
          </p>
        </div>
      </div>

      {colaborador.email ? (
        <a
          href={`mailto:${colaborador.email}`}
          className="flex items-center justify-end gap-1.5 text-muted-foreground hover:text-primary transition-colors shrink-0"
        >
          <Mail className="h-3 w-3 shrink-0" />
          <span className="hidden lg:inline text-[11px] whitespace-nowrap">{colaborador.email}</span>
        </a>
      ) : (
        <span />
      )}
    </div>
  );
}
