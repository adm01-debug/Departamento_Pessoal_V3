import { useQuery } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEmpresas } from '@/hooks/useEmpresas';
import { loggerService } from '@/services/loggerService';

/**
 * Resolve o `colaboradores.id` da pessoa autenticada dentro da empresa atual.
 *
 * Por que existe: o Portal do Colaborador precisa do id do CADASTRO
 * trabalhista (colaboradores), não do id do perfil de login (profiles).
 * Antes desta unificação, algumas abas passavam `profiles.id` como
 * `colaborador_id` — o que viola a FK `documentos_colaborador_id_fkey`
 * (REFERENCES colaboradores(id)) e derruba upload/assinatura em runtime.
 *
 * O vínculo é conciliado no servidor pela RPC `vincular_colaborador_ao_usuario`,
 * que casa o e-mail derivado de `auth.uid()` com cadastros ainda sem dono
 * (`user_id IS NULL`). Ela nunca rouba vínculo existente, portanto é
 * idempotente e segura para rodar a cada montagem do portal.
 */
export function useColaboradorVinculo() {
  const { user } = useAuth();
  const { empresaAtual } = useEmpresas();
  const empresaId = empresaAtual?.id;

  const query = useQuery({
    queryKey: ['colaborador-vinculo', user?.id, empresaId],
    enabled: !!user?.id && !!empresaId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const db = supabase as unknown as SupabaseClient;

      const { error: vincErr } = await db.rpc('vincular_colaborador_ao_usuario');
      if (vincErr) {
        // Falha de conciliação não deve derrubar o portal inteiro: a pessoa
        // segue lendo conteúdo, apenas sem as ações que exigem cadastro.
        loggerService.error('Falha ao autovincular colaborador ao usuário', {
          userId: user!.id,
          empresaId,
          code: (vincErr as { code?: string }).code,
          error: vincErr,
        });
      }

      const { data, error } = await db
        .from('colaboradores')
        .select('id')
        .eq('user_id', user!.id)
        .eq('empresa_id', empresaId!)
        .maybeSingle();

      if (error) {
        loggerService.error('Falha ao resolver vínculo colaborador↔usuário', {
          userId: user!.id,
          empresaId,
          code: (error as { code?: string }).code,
          error,
        });
        throw error;
      }

      return (data as { id: string } | null)?.id ?? null;
    },
  });

  return {
    colaboradorId: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
