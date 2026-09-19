import { memo } from 'react';
import { Building2, Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEmpresas, Empresa } from "@/hooks/useEmpresas";
import { Badge } from "@/components/ui/badge";

interface EmpresaItem {
  empresa: Empresa;
  is_default: boolean;
  vinculada: boolean;
}

export const EmpresaSelector = memo(function EmpresaSelector() {
  const { userEmpresas, todasEmpresas, empresaAtual, trocarEmpresa } = useEmpresas();
  
  // Lista unificada: empresas vinculadas + empresas globais (removendo duplicatas)
  const map = new Map<string, EmpresaItem>();
  
  // Adiciona todas as empresas (como não vinculadas inicialmente)
  (todasEmpresas || []).forEach(e => {
    map.set(e.id, { empresa: e, is_default: false, vinculada: false });
  });
  
  // Sobrescreve com as vinculadas (para ter o status correto)
  (userEmpresas || []).forEach(ue => {
    if (ue.empresa) {
      map.set(ue.empresa_id, { empresa: ue.empresa, is_default: ue.is_default, vinculada: true });
    }
  });

  const empresasVisiveis = Array.from(map.values());

  if (empresasVisiveis.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled className="bg-destructive/10 text-destructive border-destructive/20">
        <Building2 className="h-4 w-4 mr-2" />
        Nenhuma Empresa
      </Button>
    );
  }

  if (empresasVisiveis.length === 1 && empresaAtual) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
        <Building2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium truncate max-w-[150px]">
          {empresaAtual.nome_fantasia || empresaAtual.razao_social}
        </span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 w-full justify-between">
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="truncate">
              {empresaAtual?.nome_fantasia || empresaAtual?.razao_social || "Selecionar"}
            </span>
          </div>
          <ChevronDown className="dp-dropdown-anim-chevron h-3 w-3 opacity-50 transition-transform duration-[165ms] ease-out group-data-[state=open]:rotate-180" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[260px] max-h-[400px] overflow-y-auto">
        {empresasVisiveis.map((item) => (
          <DropdownMenuItem
            key={item.empresa.id}
            onClick={() => trocarEmpresa(item.empresa.id)}
            className="flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Building2 className={item.vinculada ? "h-4 w-4 text-primary shrink-0" : "h-4 w-4 text-muted-foreground shrink-0 opacity-50"} />
              <div className="flex flex-col min-w-0">
                <span className="truncate font-medium text-sm">
                  {item.empresa.nome_fantasia || item.empresa.razao_social}
                </span>
                {!item.vinculada && (
                  <span className="text-[10px] text-muted-foreground leading-tight">Acesso Admin</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {item.empresa.id === empresaAtual?.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
              {item.is_default && (
                <Badge variant="secondary" className="text-[9px] px-1 h-4">
                  Padrão
                </Badge>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
