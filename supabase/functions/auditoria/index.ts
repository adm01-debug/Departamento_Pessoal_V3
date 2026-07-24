// Onda 35 — Hardening crítico:
// • JWT via getUser() + CSRF fail-closed
// • Ignora usuario_id/ip vindos do cliente (fraude); usa claims + IP real do request
// • Tenant scope obrigatório para empresa_id em todas as ações
// • Cap de payload em campos JSON (dados_anteriores/novos ≤ 64KB serializado)
// • Filtros restritos (regex) em entidade; datas ISO validadas
// • Cache-Control: no-store
// • Erros genéricos + tratamento robusto
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';
import { corsHeaders, createErrorResponse, parseJsonBody } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';

const NO_STORE = { 'Cache-Control': 'no-store' };

const MAX_JSON_BYTES = 64 * 1024;

const DadosSchema = z.object({
  acao: z.string().min(1).max(64).regex(/^[A-Z0-9_]+$/, 'ACAO deve ser UPPER_SNAKE'),
  entidade: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/, 'entidade deve ser snake_case'),
  entidade_id: z.string().min(1).max(64).optional(),
  descricao: z.string().max(1000).optional(),
  dados_anteriores: z.unknown().optional(),
  dados_novos: z.unknown().optional(),
}).refine((d) => {
  const a = d.dados_anteriores ? JSON.stringify(d.dados_anteriores).length : 0;
  const n = d.dados_novos ? JSON.stringify(d.dados_novos).length : 0;
  return a <= MAX_JSON_BYTES && n <= MAX_JSON_BYTES;
}, { message: `Campos JSON excedem ${MAX_JSON_BYTES} bytes` });

const ListarSchema = z.object({
  entidade: z.string().max(64).regex(/^[a-z0-9_]+$/).optional(),
  data_inicio: z.string().datetime().optional(),
  data_fim: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(500).optional().default(100),
}).optional();

const BodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('registrar'), empresaId: z.string().uuid(), data: DadosSchema }),
  z.object({ action: z.literal('listar'), empresaId: z.string().uuid(), data: ListarSchema }),
  z.object({ action: z.literal('resumo'), empresaId: z.string().uuid() }),
]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...NO_STORE, 'Content-Type': 'application/json' },
  });
}

function clientIp(req: Request): string {
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return createErrorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');

  try {
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
    const { data: claims, error: claimsErr } = await userClient.auth.getUser();
    if (claimsErr || !claims?.user?.id) {
      return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');
    }
    const userId = claims.user.id;
    const userEmail = (claims.user.email as string | undefined) ?? null;

    let raw: unknown;
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    raw = _pb;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) {
      return createErrorResponse('Payload inválido', 422, 'VALIDATION_ERROR');
    }
    const body = parsed.data;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(supabase, { key: `auditoria:${userId}`, limit: 30, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Tenant scope obrigatório
    const [{ data: belongs }, { data: isAdm }] = await Promise.all([
      supabase.rpc('user_belongs_to_empresa', { _user_id: userId, _empresa_id: body.empresaId }),
      supabase.rpc('is_admin', { _user_id: userId }),
    ]);
    if (!belongs && !isAdm) {
      return createErrorResponse('Sem acesso a esta empresa', 403, 'FORBIDDEN');
    }

    if (body.action === 'registrar') {
      const d = body.data;
      // NUNCA usar usuario_id/ip do cliente — usar claims + IP real
      const { error } = await supabase.from('auditoria').insert({
        acao: d.acao,
        entidade: d.entidade,
        entidade_id: d.entidade_id ?? null,
        usuario_id: userId,
        usuario_nome: userEmail,
        empresa_id: body.empresaId,
        descricao: d.descricao ?? null,
        dados_anteriores: d.dados_anteriores ?? null,
        dados_novos: d.dados_novos ?? null,
        ip_address: clientIp(req),
      });
      if (error) throw error;
      return json({ success: true });
    }

    if (body.action === 'listar') {
      const f = body.data ?? {};
      let q = supabase.from('auditoria')
        .select('id, created_at, acao, entidade, entidade_id, usuario_nome, descricao')
        .eq('empresa_id', body.empresaId)
        .order('created_at', { ascending: false })
        .limit(f.limit ?? 100);
      if (f.entidade) q = q.eq('entidade', f.entidade);
      if (f.data_inicio) q = q.gte('created_at', f.data_inicio);
      if (f.data_fim) q = q.lte('created_at', f.data_fim);
      const { data: logs, error } = await q;
      if (error) throw error;
      return json({ logs });
    }

    // resumo
    const { data: resLogs, error } = await supabase
      .from('auditoria')
      .select('acao')
      .eq('empresa_id', body.empresaId)
      .limit(10_000);
    if (error) throw error;
    const acoes: Record<string, number> = {};
    (resLogs ?? []).forEach((l: { acao: string }) => { acoes[l.acao] = (acoes[l.acao] || 0) + 1; });
    return json({ total: resLogs?.length ?? 0, acoes });
  } catch (error: unknown) {
    try { captureException(error, { fn: 'auditoria' }); } catch { /* noop */ }
    return createErrorResponse('Erro interno na auditoria', 500, 'INTERNAL_SERVER_ERROR');
  }
});
