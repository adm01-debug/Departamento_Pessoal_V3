import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContratoTokenEvento {
  id: string;
  empresa_id: string;
  contrato_id: string;
  token_id: string;
  evento:
    | 'gerado'
    | 'reenviado'
    | 'revogado'
    | 'estendido'
    | 'lembrete_enviado'
    | 'acesso_link'
    | 'tentativa_invalida'
    | 'assinado'
    | 'expirado';
  detalhes: Record<string, unknown>;
  ator_id: string | null;
  ator_nome: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export function useContratoTokenTimeline(tokenId: string | null | undefined) {
  return useQuery({
    queryKey: ['contrato-token-timeline', tokenId],
    queryFn: async (): Promise<ContratoTokenEvento[]> => {
      if (!tokenId) return [];
      const { data, error } = await supabase
        .from('v_contrato_token_timeline' as any)
        .select('*')
        .eq('token_id', tokenId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as ContratoTokenEvento[];
    },
    enabled: !!tokenId,
    staleTime: 30_000,
  });
}
