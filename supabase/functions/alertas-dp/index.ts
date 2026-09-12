/**
 * alertas-dp — Alertas automáticos do Departamento Pessoal v2
 *
 * Função acionada pelo usuário logado (JWT obrigatório) para obter alertas
 * de RH e segurança. Os alertas são escopados por empresa (tenant isolation).
 *
 * Tipos de alertas:
 *   - ASOs vencendo / vencidos
 *   - Férias próximas (período aquisitivo completando)
 *   - Contratos de experiência a vencer
 *   - Anomalias de login (brute-force, IPs bloqueados) via v_login_anomalies
 *
 * Autenticação: JWT Bearer (obrigatório).
 * Rate limit: 5 req/min por usuário.
 * Tenant scope: empresaId obrigatório + user_belongs_to_empresa ou is_admin.
 *
 * Dependências:
 *   - RESEND_API_KEY (env): e-mail via Resend API
 *   - Tabelas:asos,colaboradores,v_login_anomalies,notificacoes,user_roles
 *
 * P3-057: Integração com v_login_anomalies para alertas de segurança.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCsrf } from "../_shared/csrf.ts";
import { captureException } from "../_shared/sentry.ts";
import {
  enforceOrigin,
  getCorsHeaders,
  handlePreflight,
  parseJsonBody,
} from "../_shared/contract.ts";
import { safeFetch } from "../_shared/safe-fetch.ts";
import { requireRh } from "../_shared/authz.ts";
import { resendDeliveryId } from "../_shared/resendDelivery.ts";
import {
  ALERT_EMAIL_UNAVAILABLE_MESSAGE,
  alertDeliveryHttpStatus,
  type AlertEmailDeliveryStatus,
} from "./deliveryStatus.ts";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const forbiddenOrigin = enforceOrigin(req);
  if (forbiddenOrigin) return forbiddenOrigin;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Autenticação obrigatória" }),
        {
          status: 401,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { checkRateLimit, rateLimitResponse } = await import(
      "../_shared/rateLimit.ts"
    );
    const rl = await checkRateLimit(supabase, {
      key: `alertas-dp:${userData.user.id}`,
      limit: 5,
      windowSec: 60,
    });
    if (!rl.allowed) return rateLimitResponse(rl);

    const { body } = await parseJsonBody(req);
    const bodyObj = (body ?? {}) as Record<string, unknown>;
    const empresaId = bodyObj?.empresaId;

    if (!empresaId || typeof empresaId !== "string") {
      return new Response(
        JSON.stringify({ error: "empresaId é obrigatório" }),
        {
          status: 422,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    // Alertas carregam saúde ocupacional e anomalias de segurança. Vínculo ao
    // tenant não basta: a ação exige RH/admin e falha fechada se a RPC cair.
    const authz = await requireRh(supabase, userData.user.id, empresaId);
    if (authz.denied) return authz.denied;

    const hoje = new Date();
    const em7dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString().split("T")[0];
    const em90dias = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000)
      .toISOString().split("T")[0];
    const em83dias = new Date(hoje.getTime() - 83 * 24 * 60 * 60 * 1000)
      .toISOString().split("T")[0];
    const hojeStr = hoje.toISOString().split("T")[0];

    const alertas: {
      tipo: string;
      mensagem: string;
      urgencia: "critica" | "alta" | "media" | "baixa";
      detalhes: Record<string, string>[];
    }[] = [];

    // ── 1. ASOs vencendo em 7 dias ───────────────────────────────────────
    const { data: asosVencendo, error: asosVencendoError } = await supabase
      .from("asos")
      .select("*, colaborador:colaboradores(nome_completo, email)")
      .eq("empresa_id", empresaId)
      .lte("data_validade", em7dias)
      .gte("data_validade", hojeStr);
    if (asosVencendoError) throw asosVencendoError;

    if (asosVencendo?.length) {
      alertas.push({
        tipo: "ASOs Vencendo",
        mensagem: `${asosVencendo.length} ASO(s) vencem nos próximos 7 dias`,
        urgencia: "alta",
        detalhes: asosVencendo.slice(0, 10).map((
          a: Record<string, unknown>,
        ) => ({
          colaborador: String(
            (a.colaborador as Record<string, unknown>)?.nome_completo ?? "—",
          ),
          tipo: String(a.tipo ?? "—"),
          validade: String(a.data_validade ?? "—"),
        })),
      });
    }

    // ── 2. ASOs já vencidos ─────────────────────────────────────────────
    const { data: asosVencidos, error: asosVencidosError } = await supabase
      .from("asos")
      .select("*, colaborador:colaboradores(nome_completo)")
      .eq("empresa_id", empresaId)
      .lt("data_validade", hojeStr);
    if (asosVencidosError) throw asosVencidosError;

    if (asosVencidos?.length) {
      alertas.push({
        tipo: "ASOs Vencidos",
        mensagem: `${asosVencidos.length} ASO(s) estão vencidos!`,
        urgencia: "critica",
        detalhes: asosVencidos.slice(0, 10).map((
          a: Record<string, unknown>,
        ) => ({
          colaborador: String(
            (a.colaborador as Record<string, unknown>)?.nome_completo ?? "—",
          ),
          tipo: String(a.tipo ?? "—"),
          vencido_desde: String(a.data_validade ?? "—"),
        })),
      });
    }

    // ── 3. Férias próximas (período aquisitivo completando 11-12 meses) ─
    const { data: colabAtivos, error: colabAtivosError } = await supabase
      .from("colaboradores")
      .select("id, nome_completo, data_admissao")
      .eq("empresa_id", empresaId)
      .eq("status", "ativo");
    if (colabAtivosError) throw colabAtivosError;

    const MES_MS = 1000 * 60 * 60 * 24 * 30;
    const feriasVencendo = (colabAtivos ?? []).filter(
      (c: Record<string, unknown>) => {
        if (!c.data_admissao) return false;
        const admissao = new Date(String(c.data_admissao));
        const mesesTrabalhados = (hoje.getTime() - admissao.getTime()) / MES_MS;
        return mesesTrabalhados >= 11 && mesesTrabalhados <= 12;
      },
    );

    if (feriasVencendo.length) {
      alertas.push({
        tipo: "Férias Próximas",
        mensagem:
          `${feriasVencendo.length} colaborador(es) completam período aquisitivo em breve`,
        urgencia: "media",
        detalhes: feriasVencendo.slice(0, 10).map((
          c: Record<string, unknown>,
        ) => ({
          colaborador: String(c.nome_completo ?? "—"),
          admissao: String(c.data_admissao ?? "—"),
        })),
      });
    }

    // ── 4. Contratos de experiência a vencer ─────────────────────────────
    const contratosVencendo = (colabAtivos ?? []).filter(
      (c: Record<string, unknown>) => {
        if (!c.data_admissao) return false;
        const admDate = new Date(String(c.data_admissao));
        return admDate >= new Date(em90dias) && admDate <= new Date(em83dias);
      },
    );

    if (contratosVencendo.length) {
      alertas.push({
        tipo: "Contratos de Experiência",
        mensagem:
          `${contratosVencendo.length} contrato(s) de experiência vencem em breve`,
        urgencia: "alta",
        detalhes: contratosVencendo.slice(0, 10).map((
          c: Record<string, unknown>,
        ) => ({
          colaborador: String(c.nome_completo ?? "—"),
          admissao: String(c.data_admissao ?? "—"),
        })),
      });
    }

    // ── 5. Anomalias de login (P3-057) ───────────────────────────────────
    const { data: anomaliasIP, error: anomaliasIPError } = await supabase
      .from("v_login_anomalies")
      .select("*")
      .eq("empresa_id", empresaId)
      .limit(20);
    if (anomaliasIPError) throw anomaliasIPError;

    if (anomaliasIP?.length) {
      alertas.push({
        tipo: "Anomalias de Login",
        mensagem:
          `${anomaliasIP.length} tentativa(s) anômala(s) de login detectada(s)`,
        urgencia: "critica",
        detalhes: anomaliasIP.slice(0, 10).map((
          a: Record<string, unknown>,
        ) => ({
          ip: String(a.ip_address ?? "—"),
          falhas: String(a.failure_count ?? 0),
          tipo: String(a.anomaly_type ?? "brute_force"),
          ultima_tentativa: String(a.last_attempt ?? "—"),
        })),
      });
    }

    // ── Se nenhum alerta ─────────────────────────────────────────────────
    if (alertas.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          alertas_processados: 0,
          destinatarios: 0,
          email_delivery: "not_needed",
          message: "Nenhum alerta pendente",
          alertas: [],
        }),
        {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        },
      );
    }

    // ── Resolver destinatários: RH/admin vinculados ao mesmo tenant ──────
    // `user_roles` é global. Consultá-la sem a interseção em `user_empresas`
    // enviaria alertas desta empresa a administradores de outros tenants.
    const { data: empresaUsers, error: empresaUsersError } = await supabase
      .from("user_empresas")
      .select("user_id")
      .eq("empresa_id", empresaId)
      .limit(100);
    if (empresaUsersError) throw empresaUsersError;
    const empresaUserIds = (empresaUsers ?? []).map((item) => item.user_id);
    const { data: roles, error: rolesError } = empresaUserIds.length
      ? await supabase
        .from("user_roles")
        .select("user_id")
        .in("user_id", empresaUserIds)
        .in("role", ["admin", "rh"])
      : { data: [], error: null };
    if (rolesError) throw rolesError;
    const recipientUserIds = [
      ...new Set((roles ?? []).map((item) => item.user_id)),
    ];
    const { data: profiles, error: profilesError } = recipientUserIds.length
      ? await supabase
        .from("profiles")
        .select("user_id,email")
        .in("user_id", recipientUserIds)
        .not("email", "is", null)
      : { data: [], error: null };
    if (profilesError) throw profilesError;
    const recipientEmails = (profiles ?? [])
      .map((profile) => profile.email)
      .filter((email): email is string => Boolean(email))
      .slice(0, 50);

    // ── Construir HTML do e-mail ──────────────────────────────────────────
    const URGENCY_COLOR: Record<string, { border: string; bg: string }> = {
      critica: { border: "#ef4444", bg: "#fef2f2" },
      alta: { border: "#f59e0b", bg: "#fffbeb" },
      media: { border: "#3b82f6", bg: "#eff6ff" },
      baixa: { border: "#6b7280", bg: "#f9fafb" },
    };

    const alertasHTML = alertas.map((a) => {
      const c = URGENCY_COLOR[a.urgencia] ?? URGENCY_COLOR.baixa;
      return `
      <div style="margin-bottom:20px;padding:16px;border-radius:12px;
                  border:1px solid ${c.border};background:${c.bg}">
        <h3 style="margin:0 0 8px;font-size:16px;color:#1f2937">${
        escapeHtml(a.tipo)
      }</h3>
        <p style="margin:0 0 12px;color:#6b7280;font-size:14px">${
        escapeHtml(a.mensagem)
      }</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="border-bottom:2px solid #e5e7eb">
              ${
        Object.keys(a.detalhes[0] ?? {}).map((k) =>
          `<th style="padding:6px 8px;text-align:left;color:#374151">${
            escapeHtml(k.replace(/_/g, " "))
          }</th>`
        ).join("")
      }
            </tr>
          </thead>
          <tbody>
            ${
        a.detalhes.map((d) => `
              <tr style="border-bottom:1px solid #e5e7eb">
                ${
          Object.values(d).map((v) =>
            `<td style="padding:6px 8px;color:#374151">${escapeHtml(v)}</td>`
          ).join("")
        }
              </tr>`).join("")
      }
          </tbody>
        </table>
        ${
        a.detalhes.length > 10
          ? `<p style="color:#9ca3af;font-size:12px;margin-top:8px">+${
            a.detalhes.length - 10
          } mais</p>`
          : ""
      }
      </div>`;
    }).join("");

    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif">
        <div style="background:linear-gradient(135deg,#3b82f6,#8b5cf6);padding:24px;
                    border-radius:16px 16px 0 0">
          <h1 style="color:white;margin:0;font-size:22px">Alertas do Departamento Pessoal</h1>
          <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:14px">
            ${
      hoje.toLocaleDateString("pt-BR")
    } — ${alertas.length} alerta(s) ativo(s)
          </p>
        </div>
        <div style="padding:24px;background:#fff;border:1px solid #e5e7eb;border-top:0;
                    border-radius:0 0 16px 16px">
          ${alertasHTML}
          <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center">
            <p style="color:#9ca3af;font-size:12px">Sistema de Departamento Pessoal — Alertas automáticos</p>
          </div>
        </div>
      </div>`;

    // ── Gravar notificações na tabela ────────────────────────────────────
    const TIPO_MAP: Record<string, string> = {
      critica: "erro",
      alta: "aviso",
      media: "info",
      baixa: "info",
    };
    const notificacoes = alertas.flatMap((alerta) =>
      recipientUserIds.map((userId) => ({
        empresa_id: empresaId,
        user_id: userId,
        titulo: alerta.tipo,
        mensagem: alerta.mensagem,
        tipo: TIPO_MAP[alerta.urgencia] ?? "info",
      }))
    );
    if (notificacoes.length) {
      const { error: notificationsError } = await supabase
        .from("notificacoes")
        .insert(notificacoes);
      if (notificationsError) throw notificationsError;
    }

    // ── Enviar e-mail via Resend ─────────────────────────────────────────
    // Notificações internas não são prova de entrega externa. Qualquer estado
    // sem recibo Resend deve ser não-2xx para que o caller não exiba sucesso.
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let emailDelivery: AlertEmailDeliveryStatus = "rejected";
    let providerMessageId: string | null = null;
    if (!resendApiKey) {
      emailDelivery = "not_configured";
    } else if (recipientEmails.length === 0) {
      emailDelivery = "no_recipients";
    } else {
      try {
        const emailRes = await safeFetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "DP Alertas <onboarding@resend.dev>",
            to: recipientEmails,
            subject: `${alertas.length} Alerta(s) DP — ${
              hoje.toLocaleDateString("pt-BR")
            }`,
            html,
          }),
          timeoutMs: 8_000,
          tag: "webhook",
        });
        const receipt = await emailRes.json().catch(() => null);
        providerMessageId = emailRes.ok ? resendDeliveryId(receipt) : null;
        if (providerMessageId) {
          emailDelivery = "accepted";
        } else {
          console.error("[alertas-dp] Resend delivery was not confirmed", {
            httpStatus: emailRes.status,
          });
        }
      } catch (emailErr) {
        captureException(emailErr, { fn: "alertas-dp:email", empresaId });
      }
    }

    return new Response(
      JSON.stringify({
        success: emailDelivery === "accepted",
        alertas_processados: alertas.length,
        destinatarios: recipientEmails.length,
        email_delivery: emailDelivery,
        provider_message_id: providerMessageId,
        error: emailDelivery === "accepted"
          ? undefined
          : ALERT_EMAIL_UNAVAILABLE_MESSAGE,
        alertas,
      }),
      {
        status: alertDeliveryHttpStatus(emailDelivery),
        headers: {
          ...getCorsHeaders(req),
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error: unknown) {
    try {
      captureException(error, { fn: "alertas-dp" });
    } catch { /* noop */ }
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
