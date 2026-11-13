import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { safeErrorMessage } from '@/utils/safeError';
import { formatDateTime } from '@/utils/format';
import { resumoSimulacao } from '@/components/obrigacoes/simulacaoResumo';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(value);
}

function ListaSimulacoes({ empresaId }: { empresaId: string }) {
  // Mesma queryKey da aba "Simulações" de Obrigações Fiscais: o cache é compartilhado e invalidado ao salvar.
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['simulacoes-fiscais', empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('simulacoes_fiscais')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchOnMount: 'always',
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando simulações...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center text-sm">
        <p className="text-destructive">{safeErrorMessage(error, 'Erro ao carregar simulações.')}</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  const simulacoes = data ?? [];
  if (simulacoes.length === 0) {
    return (
      <div className="p-10 text-center border border-dashed rounded-2xl text-sm text-muted-foreground">
        Nenhuma simulação salva para esta empresa.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {simulacoes.map((s) => {
        const resumo = resumoSimulacao(s.resultado);
        return (
          <li key={s.id} className="flex items-center justify-between gap-4 rounded-xl border border-border/40 p-3">
            <div className="min-w-0">
              <p className="font-semibold truncate">{s.titulo}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(s.created_at)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-muted-foreground">{resumo.rotulo}</p>
              <p className="font-bold text-primary">{formatCurrency(resumo.valor)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function HistoricoSimulacoesDialog({ empresaId }: { empresaId?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="rounded-lg p-2"
          aria-label="Histórico de simulações"
          title="Histórico de simulações"
          disabled={!empresaId}
        >
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg overflow-y-auto max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <History className="h-5 w-5 text-primary" />
            Histórico de Simulações
          </DialogTitle>
        </DialogHeader>
        {open && empresaId ? <ListaSimulacoes empresaId={empresaId} /> : null}
      </DialogContent>
    </Dialog>
  );
}
