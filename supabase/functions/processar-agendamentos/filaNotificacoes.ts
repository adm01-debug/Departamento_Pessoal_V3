import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmailResend } from "../_shared/outboundDelivery.ts";

// Dreno real da fila de notificações (fila_notificacoes). O edge `notificacao`
// enfileira 'email' e 'push' a cada envio, mas nada consumia a fila — linhas
// ficavam 'pendente' para sempre. Aqui cada linha sai com desfecho verdadeiro:
//   - email  → Resend (destinatário resolvido via auth.users pelo user_id;
//              `profiles` não tem coluna de e-mail)
//   - push   → 'falha' honesta: não existe sender VAPID no sistema — fingir
//              envio seria a simulação que a auditoria flagou
//   - outro  → 'falha' (sem canal implementado)
// Falhas transitórias voltam a 'pendente' com backoff até MAX_TENTATIVAS.

const MAX_TENTATIVAS = 5;
const RETRY_DELAY_MS = 5 * 60_000;
const CLAIM_STALE_MS = 10 * 60_000;
const BATCH = 50;

export interface FilaResumo {
  enviados: number;
  falhas: number;
  reagendados: number;
  /** linhas devolvidas a 'pendente' porque RESEND_API_KEY não está configurada */
  sem_config: number;
}

type FilaRow = {
  id: string;
  user_id: string;
  tipo: string;
  titulo: string;
  conteudo: string;
  tentativas: number | null;
};

export async function drenarFilaNotificacoes(supabase: SupabaseClient): Promise<FilaResumo> {
  const resumo: FilaResumo = { enviados: 0, falhas: 0, reagendados: 0, sem_config: 0 };
  const agora = new Date().toISOString();
  const claimStale = new Date(Date.now() - CLAIM_STALE_MS).toISOString();

  // Seleciona pendências devidas + claims 'processando' expirados (worker que
  // morreu entre o claim e o desfecho recupera na próxima execução).
  const { data: itens, error } = await supabase
    .from("fila_notificacoes")
    .select("id, user_id, tipo, titulo, conteudo, tentativas")
    .or(`status.eq.pendente,and(status.eq.processando,scheduled_for.lt.${claimStale})`)
    .lte("scheduled_for", agora)
    .order("scheduled_for", { ascending: true })
    .limit(BATCH);
  if (error) throw error;

  for (const item of (itens ?? []) as FilaRow[]) {
    // Claim atômico single-statement: duas invocações concorrentes não
    // processam a mesma linha.
    const { data: claimed, error: claimErr } = await supabase
      .from("fila_notificacoes")
      .update({ status: "processando" })
      .eq("id", item.id)
      .or(`status.eq.pendente,and(status.eq.processando,scheduled_for.lt.${claimStale})`)
      .select("id");
    if (claimErr) throw claimErr;
    if (!claimed?.length) continue;

    const tentativas = (item.tentativas ?? 0) + 1;
    let update: Record<string, unknown>;

    if (item.tipo === "push") {
      update = { status: "falha", tentativas, erro_ultimo: "push_sem_vapid" };
      resumo.falhas++;
    } else if (item.tipo !== "email") {
      update = { status: "falha", tentativas, erro_ultimo: `tipo_sem_canal:${item.tipo}` };
      resumo.falhas++;
    } else {
      const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(item.user_id);
      const destinatario = userErr ? null : (userData?.user?.email ?? null);
      if (!destinatario) {
        update = { status: "falha", tentativas, erro_ultimo: "destinatario_sem_email" };
        resumo.falhas++;
      } else {
        const envio = await sendEmailResend({
          to: destinatario,
          subject: item.titulo,
          text: item.conteudo,
          idempotencyKey: `fila-notificacao/${item.id}`,
        });
        if (envio.ok) {
          update = { status: "enviado", tentativas, erro_ultimo: null };
          resumo.enviados++;
        } else if (!envio.configured) {
          // Sem RESEND_API_KEY não adianta queimar tentativas: devolve a
          // 'pendente' sem incremento e com o diagnóstico no erro_ultimo.
          update = {
            status: "pendente",
            erro_ultimo: envio.error,
            scheduled_for: new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
          };
          resumo.sem_config++;
        } else if (tentativas >= MAX_TENTATIVAS) {
          update = { status: "falha", tentativas, erro_ultimo: envio.error };
          resumo.falhas++;
        } else {
          update = {
            status: "pendente",
            tentativas,
            erro_ultimo: envio.error,
            scheduled_for: new Date(Date.now() + RETRY_DELAY_MS).toISOString(),
          };
          resumo.reagendados++;
        }
      }
    }

    const { error: upErr } = await supabase
      .from("fila_notificacoes")
      .update(update)
      .eq("id", item.id);
    if (upErr) throw upErr;
  }

  return resumo;
}
