import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useDataAccessLog(
  recurso: string,
  recursoId: string | undefined,
  empresaId: string | undefined
) {
  useEffect(() => {
    if (!recursoId || !empresaId) return;

    const logAccess = async () => {
      try {
        const { data: { session } } = await (supabase as any).auth.getSession();
        if (!session?.user?.id) return;

        await (supabase as any).from('audit_log').insert({
          usuario_id: session.user.id,
          acao: 'VISUALIZACAO',
          tabela: recurso,
          registro_id: recursoId,
          empresa_id: empresaId,
          ip: null,
          dados_novos: { accessed_at: new Date().toISOString() },
        });
      } catch {
        // Non-blocking — audit failure should not break UX
      }
    };

    logAccess();
  }, [recurso, recursoId, empresaId]);
}
