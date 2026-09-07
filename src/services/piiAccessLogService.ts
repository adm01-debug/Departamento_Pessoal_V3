/**
 * E-036 · Trilha de acesso a PII (LGPD art. 37)
 *
 * Registra leituras pela RPC `record_pii_access`. A identidade é derivada de
 * `auth.uid()` no servidor; o navegador não pode forjar `user_id`. A view
 * `v_pii_access_suspeitos` e a
 * função `fn_alert_pii_access_anomaly` detectam padrões de exfiltração
 * (>200 leituras/h ou >50 exports/h).
 *
 * Princípios:
 *  - Observabilidade NUNCA derruba a operação de negócio (erro → silêncio).
 *  - Sem sessão → não registra (trilha é de usuário autenticado).
 */
import { supabase } from '@/integrations/supabase/client.base';

export type PiiAcao = 'select' | 'export' | 'print' | 'download';

export interface RegistrarAcessoPIIOpts {
  /** aceita null (colunas opcionais do Postgres) — convertido internamente */
  empresaId?: string | null;
  registroId?: string | null;
  registroCount?: number;
}

/** Registra UMA leitura sensível. Fire-and-forget seguro. */
export async function registrarAcessoPII(
  tabela: string,
  acao: PiiAcao,
  opts: RegistrarAcessoPIIOpts = {}
): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id || !opts.empresaId) return;

    await supabase.rpc('record_pii_access', {
      p_empresa_id: opts.empresaId,
      p_tabela: tabela,
      p_acao: acao,
      p_registro_id: opts.registroId ?? null,
      p_registro_count: opts.registroCount ?? 1,
    });
  } catch {
    // trilha é infraestrutura de auditoria: falha de rede/RLS não pode
    // quebrar a tela que o usuário está usando.
  }
}
