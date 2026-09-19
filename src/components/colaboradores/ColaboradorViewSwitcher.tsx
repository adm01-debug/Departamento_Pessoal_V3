import { Table2, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ColaboradorViewMode = 'tabela' | 'diretorio';

interface ColaboradorViewSwitcherProps {
  value: ColaboradorViewMode;
  onChange: (mode: ColaboradorViewMode) => void;
}

// Controle visual Tabela/Diretório — ver ColaboradorDirectoryGrid para a
// grade de cards renderizada quando value === 'diretorio'.
export function ColaboradorViewSwitcher({ value, onChange }: ColaboradorViewSwitcherProps) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl border border-border/40 bg-card/50">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn(
          'h-8 rounded-lg gap-1.5 px-3 border border-transparent text-muted-foreground',
          value === 'tabela' && 'border-primary text-primary bg-transparent hover:bg-primary/10 hover:text-primary'
        )}
        onClick={() => onChange('tabela')}
        aria-pressed={value === 'tabela'}
      >
        <Table2 className="h-3.5 w-3.5" />
        Tabela
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={cn(
          'h-8 rounded-lg gap-1.5 px-3 border border-transparent text-muted-foreground',
          value === 'diretorio' && 'border-primary text-primary bg-transparent hover:bg-primary/10 hover:text-primary'
        )}
        onClick={() => onChange('diretorio')}
        aria-pressed={value === 'diretorio'}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        Diretório
      </Button>
    </div>
  );
}
