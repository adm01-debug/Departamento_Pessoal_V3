import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Building2, Check, ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DROPDOWN_MOTION } from '@/components/ui/motion-presets';

// EXCEÇÃO DOCUMENTADA à arquitetura DropdownMenu/Popover do design system:
// isto é um disclosure INLINE (empurra o conteúdo da sidebar abaixo pra
// baixo via `height: auto`), não um overlay flutuante — migrar pra
// `DropdownMenu` mudaria o LAYOUT real (menu passaria a flutuar por cima da
// sidebar em vez de empurrar os itens abaixo), o que as instruções proíbem
// explicitamente. Fica como Framer Motion próprio, mas consumindo os MESMOS
// tokens de tempo do resto do sistema (`DROPDOWN_MOTION`), não números
// inventados à parte.

interface EmpresaSelectorProps {
  collapsed: boolean;
  empresaAtual: { id: string; nome_fantasia?: string | null; razao_social?: string | null; cnpj?: string | null } | null;
  userEmpresas: Array<{ empresa_id: string; empresa?: { nome_fantasia?: string | null; razao_social?: string | null } | null }> | undefined;
  temMultiplasEmpresas: boolean;
  trocarEmpresa: (id: string) => void;
  /**
   * `sidebar` (padrão) = espaçamento original da barra lateral.
   * `header` = versão compacta usada no chip do header em telas < md, sem o
   * padding externo da sidebar (que fazia o chip estourar a altura fixa do
   * header e gerar rolagem horizontal) e com a lista de empresas em overlay
   * (`absolute`), para não empurrar o conteúdo do header.
   */
  variant?: 'sidebar' | 'header';
}

export function EmpresaSelector({ collapsed, empresaAtual, userEmpresas, temMultiplasEmpresas, trocarEmpresa, variant = 'sidebar' }: EmpresaSelectorProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const empresaNome = empresaAtual?.nome_fantasia || empresaAtual?.razao_social || 'Sem empresa';
  const compacto = variant === 'header';
  const wrapperCls = compacto ? 'min-w-0 relative' : 'min-w-0 px-3 pt-3 pb-1';

  if (collapsed) {
    return (
      <div className="px-2 pt-3 pb-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-10 w-10 mx-auto rounded-xl bg-sidebar-accent/60 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right"><p>{empresaNome}</p></TooltipContent>
        </Tooltip>
      </div>
    );
  }

  if (!empresaAtual) {
    return (
      <div className={wrapperCls}>
        <Link
          to="/empresas/nova"
          className={cn(
            'w-full flex items-center rounded-xl transition-all duration-base bg-primary/10 hover:bg-primary/20 border border-dashed border-primary/40 hover:border-primary/60 group',
            compacto ? 'gap-2 px-2 py-1' : 'gap-2.5 px-3 py-2.5'
          )}
        >
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Plus className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-body font-semibold text-primary">Cadastrar Empresa</p>
            <p className="text-[10px] text-muted-foreground font-body">Clique para começar</p>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className={wrapperCls}>
      <button
        onClick={() => temMultiplasEmpresas && setMenuOpen(!menuOpen)}
        aria-expanded={menuOpen}
        aria-label={`Empresa: ${empresaNome}`}
        className={cn(
          'w-full flex items-center rounded-xl transition-all duration-base',
          compacto ? 'gap-2 px-2 py-1 bg-muted/40 hover:bg-muted/70 border border-border/40' : 'gap-2.5 px-3 py-2.5 bg-sidebar-accent/60 hover:bg-sidebar-accent border border-border/20',
          temMultiplasEmpresas && 'cursor-pointer'
        )}
      >
        <div className={cn('rounded-lg bg-primary/15 flex items-center justify-center shrink-0', compacto ? 'h-6 w-6' : 'h-8 w-8')}>
          <Building2 className={cn('text-primary', compacto ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-body font-medium text-foreground truncate">{empresaNome}</p>
          <p className="text-[10px] text-muted-foreground font-body truncate">
            {empresaAtual?.cnpj || 'Empresa ativa'}
          </p>
        </div>
        {temMultiplasEmpresas && (
          <ChevronDown
            className={cn('text-muted-foreground/50 transition-transform duration-[220ms] ease-out', compacto ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5', menuOpen && 'rotate-180')}
          />
        )}
      </button>

      <AnimatePresence>
        {menuOpen && temMultiplasEmpresas && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DROPDOWN_MOTION.openDurationMs / 1000, ease: 'easeOut' }}
            className={cn(
              'overflow-hidden',
              // No header o disclosure NÃO pode empurrar o conteúdo (o header tem
              // altura fixa via `h-14`): vira overlay flutuante ancorado no chip.
              compacto && 'absolute left-0 top-full z-50 mt-1 w-60 rounded-xl border border-border/50 bg-popover shadow-lg'
            )}
          >
            <div className={cn(compacto ? 'p-1' : 'mt-1 rounded-xl border border-border/20 bg-sidebar-accent/40 p-1')}>
              {userEmpresas?.map((ue) => (
                <button
                  key={ue.empresa_id}
                  onClick={() => { trocarEmpresa(ue.empresa_id); setMenuOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors',
                    ue.empresa_id === empresaAtual?.id
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-sidebar-accent text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="text-xs font-body truncate flex-1">
                    {ue.empresa?.nome_fantasia || ue.empresa?.razao_social}
                  </span>
                  {ue.empresa_id === empresaAtual?.id && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
