import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCsrf } from "../_shared/csrf.ts";
import { captureException } from "../_shared/sentry.ts";
import { enforceOrigin, getCorsHeaders, handlePreflight } from "../_shared/contract.ts";
import { safeFetch } from "../_shared/safe-fetch.ts";
import {
  nextScheduleOccurrence,
  shouldRunSchedule,
  summarizeScheduleResults,
  type ScheduleResult,
} from "./scheduleContract.ts";

serve(async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const forbiddenOrigin = enforceOrigin(req);
  if (forbiddenOrigin) return forbiddenOrigin;
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      },
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    // Auth: either a valid cron secret OR an admin JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const cronHeader = req.headers.get("X-Cron-Secret") ?? "";

    let authorized = false;
    let triggeredBy = "cron";

    // Path 1: Cron secret (for pg_cron / external scheduler)
    // Constant-time comparison: HMAC both values with a fixed key, compare HMACs
    if (cronSecret && cronHeader) {
      const enc = new TextEncoder();
      const fixedKey = await crypto.subtle.importKey(
        "raw",
        enc.encode("dp-cron-comparison-key"),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const sigHeader = new Uint8Array(
        await crypto.subtle.sign("HMAC", fixedKey, enc.encode(cronHeader)),
      );
      const sigSecret = new Uint8Array(
        await crypto.subtle.sign("HMAC", fixedKey, enc.encode(cronSecret)),
      );
      // XOR accumulation — always runs all 32 iterations regardless of content
      let diff = 0;
      for (let i = 0; i < sigHeader.length; i++) {
        diff |= sigHeader[i] ^ sigSecret[i];
      }
      if (diff === 0) {
        authorized = true;
        triggeredBy = "cron";
      }
    }

    // Path 2: Admin JWT (for manual trigger via UI) — CSRF required
    if (!authorized && authHeader.startsWith("Bearer ")) {
      const csrf = await verifyCsrf(req.clone());
      if (!csrf.ok) return csrf.response!;

      const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: userData, error: userErr } = await userClient.auth
        .getUser();
      if (!userErr && userData?.user) {
        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { checkRateLimit, rateLimitResponse } = await import(
          "../_shared/rateLimit.ts"
        );
        const rl = await checkRateLimit(admin, {
          key: `agendamentos:${userData.user.id}`,
          limit: 5,
          windowSec: 60,
        });
        if (!rl.allowed) return rateLimitResponse(rl);

        const { data: isAdmin } = await admin.rpc("is_admin", {
          _user_id: userData.user.id,
        });
        if (isAdmin) {
          authorized = true;
          triggeredBy = userData.user.id;
        }
      }
    }

    if (!authorized) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        {
          status: 401,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    // O salto serviço-a-serviço usa um segredo exclusivo, diferente do segredo
    // que libera o cron. Sem ele não há como provar para enviar-relatorio que a
    // chamada veio deste processador; falhar aqui evita "processar" agendas que
    // jamais serão entregues.
    const reportSchedulerSecret = Deno.env.get("REPORT_SCHEDULER_SECRET") ?? "";
    if (!reportSchedulerSecret) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Configuração de entrega agendada indisponível",
        }),
        {
          status: 503,
          headers: {
            ...getCorsHeaders(req),
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const agora = new Date();

    const { data: agendamentos, error } = await supabase
      .from("relatorios_agendados")
      .select("*")
      .eq("ativo", true)
      .or(`proximo_envio.is.null,proximo_envio.lte.${agora.toISOString()}`);

    if (error) throw error;

    const CONCURRENCY = 5;
    const lista = agendamentos ?? [];
    type ProcessResult = ScheduleResult & {
      id: unknown;
      nome?: unknown;
      resultado?: unknown;
      proximo_envio?: Date;
      erro?: string;
    };
    const resultados: ProcessResult[] = [];

    const processarUm = async (agendamento: Record<string, unknown>): Promise<ProcessResult> => {
      try {
        const deveExecutar = shouldRunSchedule(agendamento as Parameters<typeof shouldRunSchedule>[0], agora);
        if (!deveExecutar) {
          return { id: agendamento.id, status: "skipped" };
        }

        const response = await safeFetch(
          `${supabaseUrl}/functions/v1/enviar-relatorio`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${serviceKey}`,
              "X-Report-Dispatch-Secret": reportSchedulerSecret,
            },
            body: JSON.stringify({
              agendamentoId: agendamento.id,
              tipoRelatorio: agendamento.tipo_relatorio,
              formato: agendamento.formato,
              emailDestinatario: agendamento.email_destinatario,
              parametros: agendamento.parametros,
            }),
            timeoutMs: 30_000,
            tag: "dbbridge",
          },
        );

        if (!response.ok) {
          throw new Error(`Falha ao enviar relatório (${response.status})`);
        }
        const resultado = await response.json().catch(() => null) as { success?: unknown } | null;
        if (resultado?.success !== true) {
          throw new Error("A entrega do relatório não foi confirmada");
        }
        const proximoEnvio = nextScheduleOccurrence(agendamento as Parameters<typeof nextScheduleOccurrence>[0], agora);

        const { error: updateError } = await supabase
          .from("relatorios_agendados")
          .update({ proximo_envio: proximoEnvio.toISOString() })
          .eq("id", agendamento.id);
        if (updateError) throw updateError;

        return {
          id: agendamento.id,
          nome: agendamento.nome,
          status: "processado",
          resultado,
          proximo_envio: proximoEnvio,
        };
      } catch (agendamentoError) {
        const msg = agendamentoError instanceof Error
          ? agendamentoError.message
          : "Erro desconhecido";
        console.error(`Erro no agendamento ${agendamento.id}:`, msg);
        await supabase.from("log_envio_relatorios").insert({
          agendamento_id: agendamento.id,
          status: "erro",
          mensagem: msg,
        });
        return {
          id: agendamento.id,
          nome: agendamento.nome,
          status: "erro",
          erro: msg,
        };
      }
    };

    for (let i = 0; i < lista.length; i += CONCURRENCY) {
      const batch = lista.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(processarUm));
      resultados.push(...results);
    }

    const resumo = summarizeScheduleResults(resultados);
    return new Response(
      JSON.stringify({
        ...resumo,
        resultados,
      }),
      {
        status: resumo.success ? 200 : 502,
        headers: {
          ...getCorsHeaders(req),
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error: unknown) {
    try {
      captureException(error, { fn: "processar-agendamentos" });
    } catch { /* noop */ }
    return new Response(
      JSON.stringify({ success: false, error: "Erro interno" }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      },
    );
  }
});
