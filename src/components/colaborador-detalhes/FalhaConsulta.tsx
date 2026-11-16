import { AlertTriangle } from 'lucide-react';

/**
 * Estado de FALHA de consulta, distinto do estado VAZIO.
 *
 * "Não há pendência" e "não foi possível verificar" são afirmações diferentes:
 * um card de compliance que pinta "Conforme" em verde porque a consulta falhou
 * leva o RH a concluir que está tudo certo quando ninguém olhou. Mesmo critério
 * já aplicado em historico/UpcomingEvents.tsx.
 */
export function FalhaConsulta({ o = 'estes dados' }: { o?: string }) {
  return (
    <div className="flex items-start gap-2 py-2" role="status">
      <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-destructive">Não foi possível carregar {o}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Isto não significa que não há registros. Recarregue a página antes de usar esta tela para decidir algo.
        </p>
      </div>
    </div>
  );
}
