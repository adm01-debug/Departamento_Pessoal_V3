import { useEffect } from 'react';
// Usa o cliente Supabase base (não o proxy do bridge) para chamar a RPC de
// auditoria. A escrita direta em `audit_log` foi revogada por segurança —
// eventos de auditoria agora passam por `registrar_auditoria`, que deriva o
// autor de `auth.uid()` no servidor e valida o escopo de empresa.
import { supabase as supabaseBase } from '@/integrations/supabase/client.base';

export function useDataAccessLog(
  recurso: string,
  recursoId: string | undefined,
  empresaId: string | undefined
) {
  useEffect(() => {
    if (!recursoId || !empresaId) return;

    let cancelled = false;
    const logAccess = async () => {
      try {
        const { data: { session } } = await supabaseBase.auth.getSession();
        if (!session?.user?.id) return;

        const { error } = await supabaseBase.rpc('registrar_auditoria', {
          p_tabela: recurso,
          p_registro_id: recursoId,
          p_acao: 'VISUALIZACAO',
          p_dados_anteriores: null,
          p_dados_novos: { accessed_at: new Date().toISOString() },
          p_empresa_id: empresaId,
        });

        if (error && !cancelled && import.meta.env.DEV) {
          console.debug('[useDataAccessLog] registrar_auditoria falhou:', error.message);
        }
      } catch {
        // Non-blocking — audit failure should not break UX
      }
    };

    logAccess();
    return () => { cancelled = true; };
  }, [recurso, recursoId, empresaId]);
}

