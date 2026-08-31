/**
 * E-036 · Trilha de acesso a PII (LGPD art. 37)
 *
 * Registra leituras de dados pessoais em `pii_access_logs` (RLS: o insert só
 * é aceito com user_id = auth.uid()). A view `v_pii_access_suspeitos` e a
 * função `fn_alert_pii_access_anomaly` detectam padrões de exfiltração
 * (>200 leituras/h ou >50 exports/h).
 *
 * Princípios:
 *  - Observabilidade NUNCA derruba a operação de negócio (erro → silêncio).
 *  - Sem sessão → não registra (trilha é de usuário autenticado).
 */
import { supabase } from '@/integrations/supabase/client';

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
  opts: RegistrarAcessoPIIOpts = {},
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;

    await supabase.from('pii_access_logs').insert({
      user_id: session.user.id,
      empresa_id: opts.empresaId ?? null,
      tabela,
      acao,
      registro_id: opts.registroId ?? null,
      registro_count: opts.registroCount ?? 1,
    });
  } catch {
    // trilha é infraestrutura de auditoria: falha de rede/RLS não pode
    // quebrar a tela que o usuário está usando.
  }
}
