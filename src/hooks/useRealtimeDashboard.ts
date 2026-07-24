import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEmpresas } from './useEmpresas';

const TABLE_LABELS: Record<string, string> = {
  admissoes: '📋 Nova admissão registrada',
  desligamentos: '👋 Novo desligamento registrado',
  ferias: '🏖️ Atualização de férias',
  afastamentos: '🏥 Atualização de afastamento',
  notificacoes: '🔔 Nova notificação',
  colaboradores: '👤 Atualização de colaborador',
  batidas_ponto: '⏰ Novo registro de ponto',
  comunicados: '📢 Novo comunicado',
  folhas_pagamento: '💰 Folha atualizada',
  beneficios: '🎁 Benefício atualizado',
  metas_okrs: '🎯 Meta / OKR atualizada',
  feedbacks_360: '📈 Novo feedback registrado',
  inscricoes_cursos: '🎓 Nova inscrição em curso',
  treinamentos: '📚 Treinamento atualizado',
};

export function useRealtimeDashboard() {
  const { empresaAtualId } = useEmpresas();
  const queryClient = useQueryClient();
  const timeouts = useRef<Record<string, NodeJS.Timeout>>({});

  const debounceInvalidate = (keys: string[][], delay = 2000) => {
    const keyString = JSON.stringify(keys);
    if (timeouts.current[keyString]) {
      clearTimeout(timeouts.current[keyString]);
    }
    timeouts.current[keyString] = setTimeout(() => {
      keys.forEach(key => void queryClient.invalidateQueries({ queryKey: key }));
      delete timeouts.current[keyString];
    }, delay);
  };

  useEffect(() => {
    // Captura a referência atual para uso seguro no cleanup (evita ref defasada)
    const pendingTimeouts = timeouts.current;
    // Escuta mudanças em tabelas críticas para o Dashboard
    const tables = ['admissoes', 'desligamentos', 'ferias', 'folhas_pagamento', 'registros_ponto'];
    const channelName = `dashboard-updates-${empresaAtualId ?? 'global'}-${crypto.randomUUID()}`;
    
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public',
        filter: empresaAtualId ? `empresa_id=eq.${empresaAtualId}` : undefined
      }, (payload) => {
        if (payload.table && tables.includes(payload.table)) {
          debounceInvalidate([['dashboard-stats'], ['dashboard-pendencias']]);
          
          const label = TABLE_LABELS[payload.table] || 'Dados atualizados';
          toast.info(label, {
            description: 'O painel será atualizado em instantes.',
            duration: 3000
          });
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      Object.values(pendingTimeouts).forEach(clearTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient, empresaAtualId]);

  return { empresaAtualId };
}
