// Edge Function: gerar-contrato-pdf
// Renderiza contrato de trabalho a partir de contrato_templates + variáveis da admissão,
// calcula SHA-256, faz upload no bucket privado 'contratos-trabalho' e grava em contratos_gerados.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import { corsHeaders, createErrorResponse, parseJsonBody, enforceOrigin, handlePreflight } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { captureException } from '../_shared/sentry.ts';

const BodySchema = z.object({
  admissao_id: z.string().uuid(),
  template_id: z.string().uuid().optional(),
});

const PLACEHOLDER_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
const COND_RE = /^([a-zA-Z0-9_.]+)\s*(==|!=)\s*(.+)$/;

function esc(s: unknown): string {
  if (s === null || s === undefined) return '';
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function get(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, obj);
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number') return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    try { return new Date(v).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }); } catch { return v; }
  }
  return String(v);
}

function render(template: string, vars: Record<string, unknown>): string {
  return template.replace(PLACEHOLDER_RE, (_m, path: string) => esc(formatValue(get(vars, path))));
}

function evalCondicional(expr: string, vars: Record<string, unknown>): boolean {
  const m = COND_RE.exec(expr.trim());
  if (!m) return false;
  const [, path, op, raw] = m;
  const left = formatValue(get(vars, path));
  const right = raw.trim().replace(/^['"]|['"]$/g, '');
  return op === '==' ? left === right : left !== right;
}

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function wrapDocument(bodyHtml: string, titulo: string, hash: string, geradoEm: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"/>
<title>${esc(titulo)}</title>
<style>
@page { size: A4; margin: 2cm; }
body { font-family: 'Helvetica', Arial, sans-serif; font-size: 11pt; color: #111; line-height: 1.55; max-width: 780px; margin: 0 auto; }
h1 { font-size: 15pt; margin: 0 0 12pt; }
h3 { font-size: 12pt; margin-top: 14pt; border-bottom: 1px solid #ccc; padding-bottom: 3pt; }
p  { text-align: justify; margin: 6pt 0; }
.footer { margin-top: 36pt; font-size: 8pt; color: #666; border-top: 1px solid #ccc; padding-top: 6pt; text-align: center; }
.sign  { margin-top: 40pt; display: flex; justify-content: space-between; gap: 24pt; }
.sign > div { flex: 1; text-align: center; border-top: 1px solid #000; padding-top: 4pt; font-size: 10pt; }
</style></head>
<body>
${bodyHtml}
<div class="sign">
  <div>EMPREGADO(A) — Ciência e recebimento</div>
  <div>EMPREGADOR — Representante</div>
</div>
<div class="footer">
  Documento gerado eletronicamente em ${esc(geradoEm)}<br/>
  Hash SHA-256 (autenticidade): <code>${esc(hash)}</code>
</div>
</body></html>`;
}

serve(async (req: Request): Promise<Response> => {
  const pf = handlePreflight(req); if (pf) return pf;
  const og = enforceOrigin(req); if (og) return og;

  const csrf = await verifyCsrf(req.clone());
  if (!csrf.ok) return csrf.response!;

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return createErrorResponse('Autenticação obrigatória', 401, 'UNAUTHORIZED');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');
  const userId = userData.user.id;

  const { body, errorResponse } = await parseJsonBody(req);
  if (errorResponse) return errorResponse;
  const parsed = BodySchema.safeParse(body ?? {});
  if (!parsed.success) return createErrorResponse('Parâmetros inválidos', 400, 'VALIDATION_ERROR');
  const { admissao_id, template_id } = parsed.data;

  try {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const rl = await checkRateLimit(admin, { key: `gerar-contrato:${userId}`, limit: 30, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Resolve template + variáveis via RPCs (herdam RLS/permissão do usuário)
    let tmplId = template_id ?? null;
    if (!tmplId) {
      const { data: resolved, error } = await userClient.rpc('contrato_resolver_template', { p_admissao_id: admissao_id });
      if (error) return createErrorResponse(error.message, 403, 'FORBIDDEN');
      tmplId = resolved as string | null;
    }
    if (!tmplId) return createErrorResponse('Nenhum modelo de contrato aplicável — cadastre um em Configurações › Contratos.', 404, 'TEMPLATE_NOT_FOUND');

    const { data: varsData, error: varsErr } = await userClient.rpc('contrato_montar_variaveis', { p_admissao_id: admissao_id });
    if (varsErr) return createErrorResponse(varsErr.message, 403, 'FORBIDDEN');
    const vars = (varsData ?? {}) as Record<string, unknown>;

    const { data: tmpl, error: tErr } = await admin
      .from('contrato_templates')
      .select('*')
      .eq('id', tmplId)
      .maybeSingle();
    if (tErr || !tmpl) return createErrorResponse('Modelo não encontrado', 404, 'NOT_FOUND');

    const empresaId = (vars.admissao as Record<string, unknown> | undefined)?.empresa_id as string | undefined;
    if (!empresaId || empresaId !== tmpl.empresa_id) {
      return createErrorResponse('Modelo pertence a outra empresa', 403, 'FORBIDDEN');
    }

    // Corpo + cláusulas condicionais
    let body = render(tmpl.corpo_html as string, vars);
    const clausulas = (tmpl.clausulas_condicionais ?? []) as Array<{ if?: string; html: string }>;
    for (const c of clausulas) {
      if (!c || typeof c.html !== 'string') continue;
      if (c.if && !evalCondicional(c.if, vars)) continue;
      body += '\n' + render(c.html, vars);
    }

    const geradoEm = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const html = wrapDocument(body, tmpl.nome as string, '__HASH__', geradoEm);
    const hash = await sha256(html.replace('__HASH__', ''));
    const htmlFinal = html.replace('__HASH__', hash);

    const path = `${empresaId}/${admissao_id}/contrato-${Date.now()}.html`;
    const { error: upErr } = await admin.storage
      .from('contratos-trabalho')
      .upload(path, new Blob([htmlFinal], { type: 'text/html; charset=utf-8' }), {
        upsert: true, contentType: 'text/html; charset=utf-8',
      });
    if (upErr) {
      await captureException(upErr, { fn: 'gerar-contrato-pdf', step: 'upload' });
      return createErrorResponse('Falha ao armazenar contrato', 500, 'STORAGE_ERROR');
    }

    const { data: signed } = await admin.storage
      .from('contratos-trabalho')
      .createSignedUrl(path, 3600);

    const { data: inserted, error: insErr } = await admin
      .from('contratos_gerados')
      .insert({
        empresa_id: empresaId,
        admissao_id,
        template_id: tmpl.id,
        template_versao: tmpl.versao,
        variaveis_snapshot: vars,
        html_final: htmlFinal,
        storage_path: path,
        sha256: hash,
        status: 'gerado',
        gerado_por: userId,
      })
      .select('id')
      .single();

    if (insErr) {
      await captureException(insErr, { fn: 'gerar-contrato-pdf', step: 'insert' });
      return createErrorResponse('Falha ao registrar contrato', 500, 'DB_ERROR');
    }

    // Referencia o template usado na admissão para auditoria
    await admin.from('admissoes').update({ template_contrato_id: tmpl.id }).eq('id', admissao_id);

    return new Response(
      JSON.stringify({
        success: true,
        contrato_id: inserted.id,
        template_id: tmpl.id,
        template_nome: tmpl.nome,
        template_versao: tmpl.versao,
        path,
        hash,
        signed_url: signed?.signedUrl,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    await captureException(err, { fn: 'gerar-contrato-pdf' });
    return createErrorResponse('Erro interno ao gerar contrato', 500, 'INTERNAL_SERVER_ERROR');
  }
});
