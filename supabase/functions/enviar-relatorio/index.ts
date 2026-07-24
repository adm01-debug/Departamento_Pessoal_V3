import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { verifyCsrf } from "../_shared/csrf.ts";
import { captureException } from "../_shared/sentry.ts";
import { corsHeaders, parseJsonBody } from "../_shared/contract.ts";

/**
 * enviar-relatorio — Onda 20 hardening
 *
 * Simulação de cenários cobertos:
 *  1. POST sem JWT → 401
 *  2. JWT inválido/expirado → 401
 *  3. JWT válido mas sem vínculo à empresa (parametros.empresaId) → 403
 *  4. CSRF ausente/origem inválida → 403
 *  5. tipoRelatorio fora do whitelist → 400
 *  6. formato inválido → 400
 *  7. email inválido → 400
 *  8. Race / storage fail → 500 c/ captureException, sem stack no body
 *  9. Ausência de RESEND_API_KEY → status "simulado", não bloqueia
 * 10. Todas as queries de coleta são escopadas por empresa_id (evita
 *     vazamento cross-tenant que existia antes com service key crua).
 */

const RELATORIOS_PERMITIDOS = [
  "lista_colaboradores",
  "folha_resumo",
  "ferias_proximas",
  "afastamentos_ativos",
  "indicadores_dp",
] as const;

const FORMATOS_PERMITIDOS = ["json", "csv"] as const;
const BUCKET = "relatorios-privados";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24h

const BodySchema = z.object({
  agendamentoId: z.string().uuid().optional(),
  tipoRelatorio: z.enum(RELATORIOS_PERMITIDOS),
  formato: z.enum(FORMATOS_PERMITIDOS),
  emailDestinatario: z.string().email().max(254),
  parametros: z
    .object({
      empresaId: z.string().uuid(),
      competencia: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional(),
    })
    .passthrough(),
});

type Body = z.infer<typeof BodySchema>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function coletarDados(
  supabase: ReturnType<typeof createClient>,
  tipo: Body["tipoRelatorio"],
  empresaId: string,
  parametros: Record<string, unknown>,
): Promise<{ dados: unknown; totalRegistros: number }> {
  switch (tipo) {
    case "lista_colaboradores": {
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id,nome_completo,email,status,cargo_id,departamento_id")
        .eq("empresa_id", empresaId)
        .eq("status", "ativo")
        .limit(5000);
      if (error) throw error;
      return { dados: data ?? [], totalRegistros: data?.length ?? 0 };
    }
    case "folha_resumo": {
      const competencia =
        (parametros.competencia as string | undefined) ??
        new Date().toISOString().slice(0, 7);
      const { data, error } = await supabase
        .from("folhas_pagamento")
        .select(
          "id,competencia,total_liquido,total_proventos,total_descontos,status",
        )
        .eq("empresa_id", empresaId)
        .eq("competencia", competencia)
        .maybeSingle();
      if (error) throw error;
      return { dados: data, totalRegistros: data ? 1 : 0 };
    }
    case "ferias_proximas": {
      const inicio = new Date();
      const fim = new Date();
      fim.setDate(fim.getDate() + 30);
      const { data, error } = await supabase
        .from("ferias")
        .select("id,colaborador_id,data_inicio,data_fim,status")
        .eq("empresa_id", empresaId)
        .gte("data_inicio", inicio.toISOString())
        .lte("data_inicio", fim.toISOString())
        .limit(5000);
      if (error) throw error;
      return { dados: data ?? [], totalRegistros: data?.length ?? 0 };
    }
    case "afastamentos_ativos": {
      const { data, error } = await supabase
        .from("afastamentos")
        .select("id,colaborador_id,tipo,data_inicio,data_fim,status")
        .eq("empresa_id", empresaId)
        .eq("status", "ativo")
        .limit(5000);
      if (error) throw error;
      return { dados: data ?? [], totalRegistros: data?.length ?? 0 };
    }
    case "indicadores_dp": {
      const { count: ativos } = await supabase
        .from("colaboradores")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresaId)
        .eq("status", "ativo");
      const { count: afastados } = await supabase
        .from("colaboradores")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresaId)
        .eq("status", "afastado");
      return {
        dados: { total_ativos: ativos ?? 0, total_afastados: afastados ?? 0 },
        totalRegistros: 2,
      };
    }
  }
}

function toCsv(dados: unknown): string {
  const arr = Array.isArray(dados) ? dados : [dados];
  if (arr.length === 0 || !arr[0] || typeof arr[0] !== "object") return "";
  const headers = Object.keys(arr[0] as Record<string, unknown>);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...arr.map((r) =>
      headers
        .map((h) => escape((r as Record<string, unknown>)[h]))
        .join(","),
    ),
  ].join("\n");
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    // 1. CSRF fail-closed
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    // 2. Auth JWT obrigatória
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Autenticação obrigatória" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getUser();
    if (claimsErr || !claimsData?.user?.id) {
      return json({ error: "Sessão inválida" }, 401);
    }
    const userId = claimsData.user.id;

    // 3. Validação do payload
    let raw: unknown;
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    raw = _pb;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return json(
        { error: "Payload inválido", details: parsed.error.flatten() },
        400,
      );
    }
    const body = parsed.data;
    const empresaId = body.parametros.empresaId;

    // 4. Tenant scope — admin bypass permitido
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: belongs } = await admin.rpc("user_belongs_to_empresa", {
      _user_id: userId,
      _empresa_id: empresaId,
    });
    if (!belongs) {
      const { data: isAdm } = await admin.rpc("is_admin", { _user_id: userId });
      if (!isAdm) return json({ error: "Sem acesso a esta empresa" }, 403);
    }

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `enviar-relatorio:${userId}`, limit: 5, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // 4b. Anti-exfiltração: emailDestinatario deve pertencer a um usuário
    // vinculado à empresa (evita envio de dados internos para email externo).
    const { data: destinatarioUser } = await admin
      .from("profiles")
      .select("user_id, email")
      .eq("email", body.emailDestinatario)
      .maybeSingle();
    if (!destinatarioUser?.user_id) {
      return json({ error: "Destinatário não é usuário do sistema" }, 403);
    }
    const { data: destBelongs } = await admin.rpc("user_belongs_to_empresa", {
      _user_id: destinatarioUser.user_id, _empresa_id: empresaId,
    });
    if (destBelongs !== true) {
      const { data: destIsAdm } = await admin.rpc("is_admin", { _user_id: destinatarioUser.user_id });
      if (destIsAdm !== true) {
        return json({ error: "Destinatário não pertence à empresa" }, 403);
      }
    }

    // 5. Coleta escopada por empresa
    const { dados, totalRegistros } = await coletarDados(
      admin,
      body.tipoRelatorio,
      empresaId,
      body.parametros,
    );

    // 6. Persistência em bucket privado + hash do conteúdo (não-repúdio)
    const conteudo =
      body.formato === "csv" ? toCsv(dados) : JSON.stringify(dados, null, 2);
    const contentHash = await sha256Hex(conteudo);
    const path = `${empresaId}/${body.tipoRelatorio}/${crypto.randomUUID()}.${body.formato}`;
    const { error: upErr } = await admin.storage.from(BUCKET).upload(
      path,
      new Blob([conteudo], {
        type: body.formato === "csv" ? "text/csv" : "application/json",
      }),
      { upsert: false },
    );
    if (upErr) throw new Error(`Falha ao subir relatório: ${upErr.message}`);

    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (signErr || !signed?.signedUrl) {
      throw new Error(`Falha ao gerar signed URL: ${signErr?.message}`);
    }

    // 7. Envio (metadados apenas — LGPD)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let statusEnvio: "sucesso" | "erro" | "simulado" = "simulado";
    let mensagemEnvio = "Envio simulado (RESEND_API_KEY não configurada)";

    if (resendApiKey) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "Sistema DP <onboarding@resend.dev>",
            to: [body.emailDestinatario],
            subject: `Relatório: ${body.tipoRelatorio} — ${new Date().toLocaleDateString("pt-BR")}`,
            html: `
              <h1>Relatório disponível</h1>
              <p><strong>Tipo:</strong> ${body.tipoRelatorio}</p>
              <p><strong>Formato:</strong> ${body.formato}</p>
              <p><strong>Total de registros:</strong> ${totalRegistros}</p>
              <p><strong>Gerado em:</strong> ${new Date().toLocaleString("pt-BR")}</p>
              <p><strong>Validade do link:</strong> 24 horas</p>
              <p>
                <a href="${signed.signedUrl}"
                   style="background:#84cc16;color:#111;padding:10px 16px;border-radius:6px;text-decoration:none;">
                  Baixar relatório
                </a>
              </p>
              <p style="color:#666;font-size:12px;">
                Este e-mail contém apenas metadados. Os dados sensíveis estão
                protegidos por link assinado e requerem acesso autorizado.
              </p>
            `,
          }),
        });
        if (!res.ok) throw new Error(`Resend API: ${res.status}`);
        statusEnvio = "sucesso";
        mensagemEnvio = "Email com link assinado enviado";
      } catch (e) {
        statusEnvio = "erro";
        mensagemEnvio = e instanceof Error ? e.message : "erro desconhecido no envio";
        console.error("Erro Resend:", mensagemEnvio);
      }
    }

    // 8. Auditoria BLOQUEANTE não-repudiável
    const auditPayloadHash = await sha256Hex(
      contentHash + userId + empresaId + body.tipoRelatorio + body.emailDestinatario,
    );
    const { error: auditErr } = await admin.from("audit_log").insert({
      tabela: "relatorios_agendados",
      registro_id: body.agendamentoId ?? empresaId,
      acao: "SEND_REPORT",
      user_id: userId,
      dados_novos: {
        tipo: body.tipoRelatorio,
        formato: body.formato,
        empresa_id: empresaId,
        total_registros: totalRegistros,
        status_envio: statusEnvio,
        email_destinatario_hash: await sha256Hex(body.emailDestinatario),
        content_sha256: contentHash,
        audit_hash: auditPayloadHash,
        storage_path: path,
        sent_at: new Date().toISOString(),
      },
    });
    if (auditErr) {
      console.error("[enviar-relatorio] AUDIT_BLOCKING_FAILURE:", auditErr.message);
      return json({ error: "Auditoria obrigatória falhou" }, 500);
    }

    if (body.agendamentoId) {
      await admin.from("log_envio_relatorios").insert({
        agendamento_id: body.agendamentoId,
        status: statusEnvio,
        mensagem: mensagemEnvio,
      });
      await admin
        .from("relatorios_agendados")
        .update({ ultimo_envio: new Date().toISOString() })
        .eq("id", body.agendamentoId)
        .eq("empresa_id", empresaId);
    }

    return json({
      success: true,
      status: statusEnvio,
      mensagem: mensagemEnvio,
      metadados: {
        tipo: body.tipoRelatorio,
        formato: body.formato,
        totalRegistros,
        expiresInSeconds: SIGNED_URL_TTL_SECONDS,
        path,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro enviar-relatorio:", msg);
    captureException(error, { fn: "enviar-relatorio" });
    return json({ error: "Erro interno ao processar relatório" }, 500);
  }
});
