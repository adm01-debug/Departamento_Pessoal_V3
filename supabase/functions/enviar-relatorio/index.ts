import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
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
import {
  REPORT_DELIVERY_FAILED_MESSAGE,
  REPORT_DELIVERY_UNAVAILABLE_MESSAGE,
  reportDeliveryHttpStatus,
  type ReportDeliveryStatus,
  resendDeliveryId,
} from "./deliveryStatus.ts";
import {
  hasValidReportDispatchSecret,
  requestMatchesStoredReportSchedule,
} from "./internalDispatch.ts";
import { requireCompleteReportRows, toCsv } from "./reportContent.ts";
import { reportEmailPayload, scheduledReportPath, stableJson } from './dispatchPayload.ts';

/**
 * enviar-relatorio — Onda 20 hardening
 *
 * Simulação de cenários cobertos:
 *  1. POST sem JWT → 401 (exceto o processador interno autenticado por segredo)
 *  2. JWT inválido/expirado → 401
 *  3. JWT válido mas sem vínculo à empresa (parametros.empresaId) → 403
 *  4. CSRF ausente/origem inválida → 403 para chamadas do browser
 *  5. tipoRelatorio fora do whitelist → 400
 *  6. formato inválido → 400
 *  7. email inválido → 400
 *  8. Race / storage fail → 500 c/ captureException, sem stack no body
 *  9. Ausência de RESEND_API_KEY → 503, sem criar artefato nem avançar agenda
 * 10. Resend só confirma com recibo (`id`) válido; rejeição → HTTP 502
 * 11. Todas as queries de coleta são escopadas por empresa_id (evita
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
const REPORT_MAX_ROWS = 5000;

const BodySchema = z.object({
  agendamentoId: z.string().uuid().optional(),
  claimToken: z.string().uuid().optional(),
  dispatchKey: z.string().min(1).max(200).regex(/^[A-Za-z0-9:._-]+$/).optional(),
  tipoRelatorio: z.enum(RELATORIOS_PERMITIDOS),
  formato: z.enum(FORMATOS_PERMITIDOS),
  // Canonicalize before hashing and provider submission. This keeps the
  // complete Resend payload byte-identical when a retry changes only casing
  // or surrounding whitespace in the address.
  emailDestinatario: z.string().trim().toLowerCase().email().max(254),
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

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(buf)).map((b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

async function coletarDados(
  supabase: SupabaseClient<any, "public", "public">,
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
        .limit(REPORT_MAX_ROWS + 1);
      if (error) throw error;
      const rows = requireCompleteReportRows(data, REPORT_MAX_ROWS);
      return { dados: rows, totalRegistros: rows.length };
    }
    case "folha_resumo": {
      const competencia = (parametros.competencia as string | undefined) ??
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
        .limit(REPORT_MAX_ROWS + 1);
      if (error) throw error;
      const rows = requireCompleteReportRows(data, REPORT_MAX_ROWS);
      return { dados: rows, totalRegistros: rows.length };
    }
    case "afastamentos_ativos": {
      const { data, error } = await supabase
        .from("afastamentos")
        .select("id,colaborador_id,tipo,data_inicio,data_fim,status")
        .eq("empresa_id", empresaId)
        .eq("status", "ativo")
        .limit(REPORT_MAX_ROWS + 1);
      if (error) throw error;
      const rows = requireCompleteReportRows(data, REPORT_MAX_ROWS);
      return { dados: rows, totalRegistros: rows.length };
    }
    case "indicadores_dp": {
      const { count: ativos, error: ativosError } = await supabase
        .from("colaboradores")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresaId)
        .eq("status", "ativo");
      const { count: afastados, error: afastadosError } = await supabase
        .from("colaboradores")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresaId)
        .eq("status", "afastado");
      if (ativosError) throw ativosError;
      if (afastadosError) throw afastadosError;
      return {
        dados: { total_ativos: ativos ?? 0, total_afastados: afastados ?? 0 },
        totalRegistros: 2,
      };
    }
  }
}

serve(async (req: Request): Promise<Response> => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const forbiddenOrigin = enforceOrigin(req);
  if (forbiddenOrigin) return forbiddenOrigin;
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Keep a clone before consuming the payload. The browser path validates
    // CSRF below; cloning afterwards throws because parseJsonBody reads it.
    const csrfRequest = req.clone();

    // 1. Validação do payload antes de identificar o ator. A rota interna
    // precisa do agendamento para vincular a chamada à autoria persistida.
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    const parsed = BodySchema.safeParse(_pb);
    if (!parsed.success) {
      return json(req,
        { error: "Payload inválido", details: parsed.error.flatten() },
        400,
      );
    }
    const body = parsed.data;
    const empresaId = body.parametros.empresaId;

    const admin = createClient(supabaseUrl, serviceKey);
    const internalDispatch = await hasValidReportDispatchSecret(
      req.headers.get("X-Report-Dispatch-Secret") ?? "",
      Deno.env.get("REPORT_SCHEDULER_SECRET") ?? "",
    );
    let userId: string;

    if (internalDispatch) {
      if (!body.agendamentoId || !body.claimToken || !body.dispatchKey?.startsWith(`${body.agendamentoId}:`)) {
        return json(req, { error: "Chamada interna sem agendamento" }, 403);
      }
      const { data: schedule, error: scheduleError } = await admin
        .from("relatorios_agendados")
        .select(
          "id,created_by,empresa_id,tipo_relatorio,formato,email_destinatario,ativo,dispatch_claim_token",
        )
        .eq("id", body.agendamentoId)
        .maybeSingle();
      if (
        scheduleError || !schedule ||
        !requestMatchesStoredReportSchedule(
          {
            agendamentoId: body.agendamentoId,
            claimToken: body.claimToken,
            tipoRelatorio: body.tipoRelatorio,
            formato: body.formato,
            emailDestinatario: body.emailDestinatario,
            empresaId,
          },
          schedule,
        ) || !schedule.created_by
      ) {
        return json(req,
          { error: "Chamada interna não corresponde ao agendamento" },
          403,
        );
      }
      userId = schedule.created_by;
    } else {
      // 2. Chamadas do browser mantêm CSRF + sessão humana obrigatórios.
      const csrf = await verifyCsrf(csrfRequest);
      if (!csrf.ok) return csrf.response!;
      const authHeader = req.headers.get("Authorization") ?? "";
      if (!authHeader.startsWith("Bearer ")) {
        return json(req, { error: "Autenticação obrigatória" }, 401);
      }
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: claimsData, error: claimsErr } = await userClient.auth
        .getUser();
      if (claimsErr || !claimsData?.user?.id) {
        return json(req, { error: "Sessão inválida" }, 401);
      }
      userId = claimsData.user.id;
    }

    // 3. Papel — o relatório carrega dados consolidados da empresa e é
    // despachado por e-mail. Exige RH/admin; o gate anterior (`!belongs` com
    // fallback em `isAdm`) era um OU e liberava qualquer colaborador.
    {
      const authz = await requireRh(admin, userId, empresaId, req);
      if (authz.denied) return authz.denied;
    }

    const { checkRateLimit, rateLimitResponse } = await import(
      "../_shared/rateLimit.ts"
    );
    const rl = await checkRateLimit(admin, {
      key: `enviar-relatorio:${userId}`,
      limit: 5,
      windowSec: 60,
    });
    if (!rl.allowed) return rateLimitResponse(rl, req);

    // 4b. Anti-exfiltração: emailDestinatario deve pertencer a um usuário
    // vinculado à empresa (evita envio de dados internos para email externo).
    const { data: destinationAllowed, error: destinationError } = await admin.rpc(
      "report_destination_is_allowed",
      {
        p_email: body.emailDestinatario,
        p_empresa_id: empresaId,
      },
    );
    if (destinationError) {
      throw new Error(`Falha ao validar destinatário: ${destinationError.message}`);
    }
    if (destinationAllowed !== true) {
      return json(req, { error: "Destinatário não pertence à empresa" }, 403);
    }

    // Um relatório enviado por e-mail só é uma operação concluída quando o
    // provedor está configurado. Não criar arquivo/signed URL "órfão" nem
    // retornar sucesso simulado: o caller precisa poder reagendar a entrega.
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return json(req,
        {
          success: false,
          status: "indisponivel",
          error: REPORT_DELIVERY_UNAVAILABLE_MESSAGE,
        },
        reportDeliveryHttpStatus("indisponivel"),
      );
    }

    const dispatchKeyHash = body.dispatchKey ? await sha256Hex(body.dispatchKey) : null;
    const dispatchRequestHash = body.dispatchKey
      ? await sha256Hex(stableJson({
        agendamentoId: body.agendamentoId,
        empresaId,
        tipoRelatorio: body.tipoRelatorio,
        formato: body.formato,
        emailDestinatario: body.emailDestinatario.toLowerCase(),
        parametros: body.parametros,
      }))
      : null;
    const { data: priorAttempt, error: priorAttemptError } = dispatchKeyHash
      ? await admin.from('report_dispatch_attempts')
        .select('request_hash,storage_path,signed_url,signed_url_expires_at,subject,html,content_sha256,total_registros,provider_message_id,status')
        .eq('dispatch_key_hash', dispatchKeyHash)
        .maybeSingle()
      : { data: null, error: null };
    if (priorAttemptError) throw priorAttemptError;
    if (priorAttempt && priorAttempt.request_hash !== dispatchRequestHash) {
      return json(req, { error: 'Chave de despacho reutilizada com parâmetros diferentes' }, 409);
    }
    if (
      priorAttempt && priorAttempt.status !== 'accepted' &&
      new Date(priorAttempt.signed_url_expires_at).getTime() <= Date.now()
    ) {
      return json(req, {
        error: 'Despacho indeterminado com link expirado; reconciliação manual obrigatória',
      }, 409);
    }

    let totalRegistros: number;
    let contentHash: string;
    let path: string;
    let signedUrl: string;
    let subject: string;
    let html: string;

    if (priorAttempt) {
      totalRegistros = priorAttempt.total_registros;
      contentHash = priorAttempt.content_sha256;
      path = priorAttempt.storage_path;
      signedUrl = priorAttempt.signed_url;
      subject = priorAttempt.subject;
      html = priorAttempt.html;
    } else {
      // 5. Coleta escopada por empresa
      const { dados, totalRegistros: collectedCount } = await coletarDados(
        admin, body.tipoRelatorio, empresaId, body.parametros,
      );
      totalRegistros = collectedCount;
      const conteudo = body.formato === 'csv' ? toCsv(dados) : JSON.stringify(dados, null, 2);
      contentHash = await sha256Hex(conteudo);
      path = dispatchKeyHash
        ? scheduledReportPath(
          empresaId, body.tipoRelatorio, dispatchKeyHash, contentHash, body.formato,
        )
        : `${empresaId}/${body.tipoRelatorio}/${crypto.randomUUID()}.${body.formato}`;
      const { error: upErr } = await admin.storage.from(BUCKET).upload(
        path,
        new Blob([conteudo], { type: body.formato === 'csv' ? 'text/csv' : 'application/json' }),
        { upsert: Boolean(dispatchKeyHash) },
      );
      if (upErr) throw new Error(`Falha ao subir relatório: ${upErr.message}`);
      const { data: signed, error: signErr } = await admin.storage
        .from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (signErr || !signed?.signedUrl) throw new Error(`Falha ao gerar signed URL: ${signErr?.message}`);
      signedUrl = signed.signedUrl;
      const occurrence = body.dispatchKey?.slice((body.agendamentoId?.length ?? -1) + 1);
      const occurrenceDate = occurrence && Number.isFinite(Date.parse(occurrence))
        ? new Date(occurrence) : new Date();
      ({ subject, html } = reportEmailPayload(body, totalRegistros, signedUrl, occurrenceDate));

      // Persist exactly what will be submitted before the external effect.
      if (dispatchKeyHash && dispatchRequestHash && body.agendamentoId) {
        const { error: prepareError } = await admin.from('report_dispatch_attempts').insert({
          dispatch_key_hash: dispatchKeyHash,
          request_hash: dispatchRequestHash,
          agendamento_id: body.agendamentoId,
          empresa_id: empresaId,
          storage_path: path,
          signed_url: signedUrl,
          signed_url_expires_at: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
          subject,
          html,
          content_sha256: contentHash,
          total_registros: totalRegistros,
        });
        if (prepareError) throw new Error(`Falha ao persistir despacho idempotente: ${prepareError.message}`);
      }
    }

    // Persistir a intenção antes do efeito externo. Assim uma indisponibilidade
    // de auditoria nunca permite enviar um e-mail sem ao menos um registro
    // durável do ator, tenant, conteúdo e chave de despacho.
    const attemptHash = await sha256Hex(
      contentHash + userId + empresaId + body.tipoRelatorio +
        body.emailDestinatario + (body.dispatchKey ?? "manual"),
    );
    const { error: attemptAuditError } = await admin.from("audit_log").insert({
      tabela: "relatorios_agendados",
      registro_id: body.agendamentoId ?? empresaId,
      acao: "EXPORT",
      user_id: userId,
      dados_novos: {
        evento: "SEND_REPORT_ATTEMPT",
        empresa_id: empresaId,
        tipo: body.tipoRelatorio,
        formato: body.formato,
        content_sha256: contentHash,
        email_destinatario_hash: await sha256Hex(body.emailDestinatario),
        dispatch_key_hash: body.dispatchKey ? await sha256Hex(body.dispatchKey) : null,
        attempt_hash: attemptHash,
        storage_path: path,
        prepared_at: new Date().toISOString(),
      },
    });
    if (attemptAuditError) {
      if (!dispatchKeyHash) await admin.storage.from(BUCKET).remove([path]);
      return json(req, { error: "Auditoria obrigatória indisponível" }, 500);
    }

    // 7. Envio (metadados apenas — LGPD)
    let statusEnvio: ReportDeliveryStatus = priorAttempt?.status === 'accepted' ? 'sucesso' : 'erro';
    let mensagemEnvio = statusEnvio === 'sucesso'
      ? 'E-mail com link assinado aceito pelo provedor' : REPORT_DELIVERY_FAILED_MESSAGE;
    let providerMessageId: string | null = priorAttempt?.provider_message_id ?? null;

    if (statusEnvio !== 'sucesso') try {
      const res = await safeFetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
          ...(body.dispatchKey
            ? { "Idempotency-Key": `scheduled-report/${body.dispatchKey}` }
            : {}),
        },
        body: JSON.stringify({
          from: "Sistema DP <onboarding@resend.dev>",
          to: [body.emailDestinatario],
          subject,
          html,
        }),
        timeoutMs: 8_000,
        tag: "webhook",
      });
      const receipt = await res.json().catch(() => null);
      providerMessageId = res.ok ? resendDeliveryId(receipt) : null;
      if (!providerMessageId) {
        console.error("[enviar-relatorio] Resend delivery was not confirmed", {
          httpStatus: res.status,
        });
      } else {
        if (dispatchKeyHash) {
          const { error: receiptError } = await admin.from('report_dispatch_attempts').update({
            status: 'accepted', provider_message_id: providerMessageId,
            accepted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          }).eq('dispatch_key_hash', dispatchKeyHash);
          if (receiptError) throw new Error(`Falha ao persistir recibo do provedor: ${receiptError.message}`);
        }
        // A execução agendada só pode avançar depois que o recibo durável foi
        // persistido. Em falha, a resposta é retryable e a Idempotency-Key do
        // provedor impede um segundo efeito externo.
        statusEnvio = "sucesso";
        mensagemEnvio = "E-mail com link assinado aceito pelo provedor";
      }
    } catch (error) {
      console.error("[enviar-relatorio] Resend delivery request failed", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }

    // 8. Auditoria BLOQUEANTE não-repudiável
    const auditPayloadHash = await sha256Hex(
      contentHash + userId + empresaId + body.tipoRelatorio +
        body.emailDestinatario,
    );
    const { error: auditErr } = await admin.from("audit_log").insert({
      tabela: "relatorios_agendados",
      registro_id: body.agendamentoId ?? empresaId,
      acao: "EXPORT",
      user_id: userId,
      dados_novos: {
        evento: "SEND_REPORT",
        tipo: body.tipoRelatorio,
        formato: body.formato,
        empresa_id: empresaId,
        total_registros: totalRegistros,
        status_envio: statusEnvio,
        provider_message_id: providerMessageId,
        email_destinatario_hash: await sha256Hex(body.emailDestinatario),
        content_sha256: contentHash,
        audit_hash: auditPayloadHash,
        storage_path: path,
        sent_at: new Date().toISOString(),
      },
    });
    if (auditErr) {
      console.error(
        "[enviar-relatorio] AUDIT_BLOCKING_FAILURE:",
        auditErr.message,
      );
      if (statusEnvio !== "sucesso" && !dispatchKeyHash) {
        await admin.storage.from(BUCKET).remove([path]);
      }
      return json(req, { error: "Auditoria obrigatória falhou" }, 500);
    }

    if (body.agendamentoId && internalDispatch) {
      const { error: logError } = await admin.from("log_envio_relatorios").insert({
        agendamento_id: body.agendamentoId,
        status: statusEnvio,
        mensagem: mensagemEnvio,
      });
      if (logError) {
        console.error("[enviar-relatorio] Falha ao registrar log operacional:", logError.message);
      }
      if (statusEnvio === "sucesso") {
        const { data: updatedSchedule, error: updateError } = await admin
          .from("relatorios_agendados")
          .update({ ultimo_envio: new Date().toISOString() })
          .eq("id", body.agendamentoId)
          .eq("empresa_id", empresaId)
          .eq("dispatch_claim_token", body.claimToken!)
          .select("id")
          .maybeSingle();
        if (updateError) throw updateError;
        if (!updatedSchedule) throw new Error("Lease do agendamento expirou antes de registrar a entrega");
      }
    }

    if (statusEnvio !== "sucesso") {
      const { error: cleanupError } = !dispatchKeyHash
        ? await admin.storage.from(BUCKET).remove([path])
        : { error: null };
      if (cleanupError) {
        console.error("[enviar-relatorio] Falha ao remover artefato sem entrega:", cleanupError.message);
      }
    }

    const responseStatus = reportDeliveryHttpStatus(statusEnvio);
    return json(req, {
      success: statusEnvio === "sucesso",
      status: statusEnvio,
      mensagem: statusEnvio === "sucesso"
        ? mensagemEnvio
        : REPORT_DELIVERY_FAILED_MESSAGE,
      metadados: statusEnvio === "sucesso" ? {
        tipo: body.tipoRelatorio,
        formato: body.formato,
        totalRegistros,
        expiresInSeconds: SIGNED_URL_TTL_SECONDS,
        path,
      } : undefined,
    }, responseStatus);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro enviar-relatorio:", msg);
    captureException(error, { fn: "enviar-relatorio" });
    return json(req, { error: "Erro interno ao processar relatório" }, 500);
  }
});
