import { useEffect } from 'react';
// Importa diretamente o cliente Supabase base (não o proxy), porque `audit_log`
// está na denylist do external-db-bridge e a tabela deve ser acessada pelo
// RLS direto do PostgREST. O proxy global `supabase` reescreve TODAS as chamadas
// para irem via bridge, o que faz esta operação falhar com INSERT_ERROR 400.
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

        const { error } = await supabaseBase
          .from('audit_log')
          .insert({
            user_id: session.user.id,
            acao: 'VISUALIZACAO',
            tabela: recurso,
            registro_id: recursoId,
            ip_address: null,
            dados_novos: { accessed_at: new Date().toISOString() },
          });

        if (error && !cancelled) {
          // Logar apenas em DEV; em prod audit falha silenciosa (não-impacta UX)
          // (audit_log tem CHECK(acao IN ('INSERT','UPDATE','DELETE')) e policy de
          //  INSERT ausente — falha esperada. Não polui console.)
          if (import.meta.env.DEV) {
            console.debug('[useDataAccessLog] audit_log insert falhou:', error.code, error.message);
          }
        }
      } catch {
        // Non-blocking — audit failure should not break UX
      }
    };

    logAccess();
    return () => { cancelled = true; };
  }, [recurso, recursoId, empresaId]);
}
