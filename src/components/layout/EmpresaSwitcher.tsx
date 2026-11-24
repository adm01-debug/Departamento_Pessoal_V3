/**
 * EmpresaSwitcher — toggle Grupo Consolidado ↔ Empresa Única.
 *
 * Substitui o seletor antigo apresentando dois modos:
 *  - Grupo: visão agregada de todas as empresas do escopo (RLS).
 *  - Empresa: filtra pela empresa selecionada.
 *
 * Mostra bolinhas coloridas por empresa (cor_identificacao) e badge
 * com regime tributário, atendendo ao requisito de "informações na mesma
 * tela para facilitar a gestão do grupo".
 */
import { useMemo, useState } from 'react';
import { Building2, Check, ChevronDown, Layers, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useGrupo } from '@/hooks/useGrupo';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface EmpresaSwitcherProps {
  collapsed?: boolean;
}

export function EmpresaSwitcher({ collapsed = false }: EmpresaSwitcherProps) {
  const {
    empresaAtual,
    empresaAtualId,
    modo,
    isConsolidado,
    setModo,
    trocarEmpresa,
    temMultiplasEmpresas,
  } = useEmpresas();
  const { empresas, coresPorEmpresa, regimePorEmpresa, totalAtivas } = useGrupo();
  const [open, setOpen] = useState(false);

  const empresasVisiveis = useMemo(
    () => empresas.filter((e) => e.ativa),
    [empresas],
  );

  const labelPrincipal = isConsolidado
    ? 'Grupo Consolidado'
    : empresaAtual?.nome_fantasia || empresaAtual?.razao_social || 'Selecionar empresa';

  const labelSecundario = isConsolidado
    ? `${totalAtivas} empresa${totalAtivas !== 1 ? 's' : ''} ativa${totalAtivas !== 1 ? 's' : ''}`
    : empresaAtual?.cnpj ?? '—';

  const IconePrincipal = isConsolidado ? Layers : Building2;

  if (collapsed) {
    return (
      <div className="px-2 pt-3 pb-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="h-10 w-10 mx-auto rounded-xl bg-sidebar-accent/60 hover:bg-sidebar-accent flex items-center justify-center transition-colors"
              aria-label={labelPrincipal}
            >
              <IconePrincipal className="h-4 w-4 text-primary" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p className="font-medium">{labelPrincipal}</p>
            <p className="text-xs text-muted-foreground">{labelSecundario}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="px-3 pt-3 pb-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all',
              'bg-sidebar-accent/60 hover:bg-sidebar-accent border border-sidebar-border/40',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            )}
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: isConsolidado
                  ? 'hsl(var(--primary) / 0.15)'
                  : `${coresPorEmpresa[empresaAtualId ?? ''] ?? 'hsl(var(--primary))'}26`,
              }}
            >
              <IconePrincipal
                className="h-4 w-4"
                style={{
                  color: isConsolidado
                    ? 'hsl(var(--primary))'
                    : coresPorEmpresa[empresaAtualId ?? ''] ?? 'hsl(var(--primary))',
                }}
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate text-sidebar-foreground">
                {labelPrincipal}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {labelSecundario}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={8}
          className="w-[320px] p-0 overflow-hidden"
        >
          {/* Toggle modo */}
          <div className="p-2 bg-muted/40 border-b">
            <div
              role="tablist"
              aria-label="Modo de visualização"
              className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-background/80"
            >
              <button
                role="tab"
                aria-selected={isConsolidado}
                type="button"
                onClick={() => setModo('consolidado')}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all',
                  isConsolidado
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Layers className="h-3.5 w-3.5" />
                Grupo
              </button>
              <button
                role="tab"
                aria-selected={!isConsolidado}
                type="button"
                onClick={() => {
                  setModo('empresa_unica');
                  if (!empresaAtualId && empresasVisiveis[0]) {
                    trocarEmpresa(empresasVisiveis[0].id);
                  }
                }}
                className={cn(
                  'flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all',
                  !isConsolidado
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Building2 className="h-3.5 w-3.5" />
                Empresa
              </button>
            </div>
          </div>

          {/* Lista de empresas */}
          <ScrollArea className="max-h-[320px]">
            <div className="p-2 space-y-0.5">
              {isConsolidado && (
                <div className="flex items-center gap-2 px-2 py-2 rounded-md bg-primary/5 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Dados agregados de {totalAtivas} CNPJ
                  {totalAtivas !== 1 ? 's' : ''}.
                </div>
              )}

              {empresasVisiveis.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  Nenhuma empresa disponível no seu escopo.
                </p>
              )}

              {empresasVisiveis.map((e) => {
                const ativa = !isConsolidado && e.id === empresaAtualId;
                const regime = regimePorEmpresa[e.id];
                const cor = coresPorEmpresa[e.id];
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      setModo('empresa_unica');
                      trocarEmpresa(e.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2 py-2 rounded-md text-left transition-colors',
                      'hover:bg-accent focus-visible:outline-none focus-visible:bg-accent',
                      ativa && 'bg-accent',
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-background"
                      style={{ background: cor }}
                      aria-hidden
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {e.nome_fantasia ?? e.razao_social}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {e.cnpj ?? 'Sem CNPJ'}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 font-medium shrink-0"
                      style={{ borderColor: cor, color: cor }}
                    >
                      {regime?.labelCurto ?? '—'}
                    </Badge>
                    {ativa && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {!temMultiplasEmpresas && empresasVisiveis.length <= 1 && (
            <div className="px-3 py-2 border-t bg-muted/30 text-[11px] text-muted-foreground">
              Cadastre mais empresas para habilitar a visão consolidada.
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
