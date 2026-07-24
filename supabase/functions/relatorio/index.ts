// relatorio — Onda 38: hardening completo
// - CSRF fail-closed + JWT via getUser()
// - Zod strict com discriminated union por tipo de relatório (rejeita campos extras)
// - Tenant scope obrigatório em toda ação: empresaId validado via
//   user_belongs_to_empresa / is_admin
// - Filtros de data/paginação com caps rígidos (max 10.000 linhas, janela max 366 dias)
// - Auditoria BLOQUEANTE não-repudiável: hash SHA-256 (empresaId + tipo + filtros
//   canonicalizados + userId + timestamp) persistido antes do retorno.
// - No-store em todas as respostas
//
// Nota sobre rate limiting: o backend não possui primitiva padrão de rate
// limiting. A camada de rate limiting deve ser adicionada quando a
// infraestrutura estiver disponível (fora do escopo desta função).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';
import {
  corsHeaders, createErrorResponse, validateRequest,
} from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const MAX_ROWS = 10_000;
const MAX_WINDOW_DAYS = 366;

const NO_STORE = {
  ...corsHeaders,
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const jsonOk = (body: Record<string, unknown>, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: NO_STORE });

// ---------- Schemas Zod (strict, discriminated union) ----------
const DateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser AAAA-MM-DD');
const Competencia = z.string().regex(/^\d{4}-\d{2}$/, 'Competência AAAA-MM');

const CommonFilter = {
  empresaId: z.string().uuid(),
  formato: z.enum(['json', 'csv']).default('json'),
  limit: z.number().int().min(1).max(MAX_ROWS).default(1000),
  offset: z.number().int().min(0).max(1_000_000).default(0),
};

const BodySchema = z.discriminatedUnion('tipo', [
  z.object({
    tipo: z.literal('folha'),
    ...CommonFilter,
    competencia: Competencia,
  }).strict(),
  z.object({
    tipo: z.literal('ponto'),
    ...CommonFilter,
    dataInicio: DateStr,
    dataFim: DateStr,
    colaboradorId: z.string().uuid().optional(),
  }).strict(),
  z.object({
    tipo: z.literal('ferias'),
    ...CommonFilter,
    dataInicio: DateStr,
    dataFim: DateStr,
  }).strict(),
  z.object({
    tipo: z.literal('colaboradores'),
    ...CommonFilter,
    status: z.enum(['ativo', 'inativo', 'ferias', 'afastado', 'todos']).default('ativo'),
  }).strict(),
  z.object({
    tipo: z.literal('auditoria'),
    ...CommonFilter,
    dataInicio: DateStr,
    dataFim: DateStr,
    entidade: z.string().regex(/^[a-z_][a-z0-9_]{1,60}$/i).optional(),
  }).strict(),
]);
type ReqBody = z.infer<typeof BodySchema>;

// ---------- Helpers ----------
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Canonicaliza objeto (chaves ordenadas) para hash determinístico.
function canonicalize(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalize).join(',') + ']';
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalize((obj as Record<string, unknown>)[k])).join(',') + '}';
}

function validateWindow(dataInicio: string, dataFim: string): Response | null {
  const ini = new Date(dataInicio + 'T00:00:00Z').getTime();
  const fim = new Date(dataFim + 'T00:00:00Z').getTime();
  if (!Number.isFinite(ini) || !Number.isFinite(fim)) {
    return createErrorResponse('Datas inválidas', 422, 'INVALID_DATES');
  }
  if (fim < ini) {
    return createErrorResponse('dataFim < dataInicio', 422, 'INVALID_WINDOW');
  }
  const days = (fim - ini) / 86_400_000;
  if (days > MAX_WINDOW_DAYS) {
    return createErrorResponse(
      `Janela máxima ${MAX_WINDOW_DAYS} dias`,
      422, 'WINDOW_TOO_LARGE',
    );
  }
  return null;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

// ---------- Handler ----------
serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  try {
    // 1) CSRF fail-closed
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    // 2) JWT (getUser — validação server-side da sessão)
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return createErrorResponse('Não autenticado', 401, 'UNAUTHORIZED');

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getUser();
    if (claimsErr || !claimsData?.user?.id) {
      return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');
    }
    const userId = claimsData.user.id;

    // 3) Rate-limit
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `relatorio:${userId}`, limit: 10, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // 4) Validação Zod strict
    const { data: body, errorResponse } = await validateRequest(req, BodySchema);
    if (errorResponse) return errorResponse;
    const filtros = body as ReqBody;

    // 5) Tenant scope obrigatório
    const { data: belongs } = await admin.rpc('user_belongs_to_empresa', {
      _user_id: userId, _empresa_id: filtros.empresaId,
    });
    if (belongs !== true) {
      const { data: isAdmin } = await admin.rpc('is_admin', { _user_id: userId });
      if (isAdmin !== true) {
        return createErrorResponse('Sem acesso a esta empresa', 403, 'FORBIDDEN');
      }
    }

    // 6) Validação de janela temporal (quando aplicável)
    if ('dataInicio' in filtros && 'dataFim' in filtros) {
      const bad = validateWindow(filtros.dataInicio, filtros.dataFim);
      if (bad) return bad;
    }

    // 7) Execução do relatório (queries parametrizadas, sempre com empresa_id)
    const from = filtros.offset;
    const to = filtros.offset + filtros.limit - 1;
    let rows: Record<string, unknown>[] = [];

    if (filtros.tipo === 'folha') {
      const { data, error } = await admin
        .from('folhas_pagamento')
        .select('*')
        .eq('empresa_id', filtros.empresaId)
        .eq('competencia', filtros.competencia)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) return createErrorResponse('Falha na query', 500, 'QUERY_FAILED');
      rows = (data ?? []) as Record<string, unknown>[];
    } else if (filtros.tipo === 'ponto') {
      let q = admin.from('registros_ponto')
        .select('*')
        .eq('empresa_id', filtros.empresaId)
        .gte('data', filtros.dataInicio)
        .lte('data', filtros.dataFim)
        .order('data', { ascending: false })
        .range(from, to);
      if (filtros.colaboradorId) q = q.eq('colaborador_id', filtros.colaboradorId);
      const { data, error } = await q;
      if (error) return createErrorResponse('Falha na query', 500, 'QUERY_FAILED');
      rows = (data ?? []) as Record<string, unknown>[];
    } else if (filtros.tipo === 'ferias') {
      const { data, error } = await admin
        .from('ferias_solicitacoes')
        .select('*')
        .eq('empresa_id', filtros.empresaId)
        .gte('data_inicio', filtros.dataInicio)
        .lte('data_fim', filtros.dataFim)
        .order('data_inicio', { ascending: false })
        .range(from, to);
      if (error) return createErrorResponse('Falha na query', 500, 'QUERY_FAILED');
      rows = (data ?? []) as Record<string, unknown>[];
    } else if (filtros.tipo === 'colaboradores') {
      let q = admin.from('colaboradores')
        .select('id, nome_completo, cpf, cargo, departamento, data_admissao, status')
        .eq('empresa_id', filtros.empresaId)
        .order('nome_completo', { ascending: true })
        .range(from, to);
      if (filtros.status !== 'todos') q = q.eq('status', filtros.status);
      const { data, error } = await q;
      if (error) return createErrorResponse('Falha na query', 500, 'QUERY_FAILED');
      rows = (data ?? []) as Record<string, unknown>[];
    } else if (filtros.tipo === 'auditoria') {
      let q = admin.from('auditoria_logs')
        .select('*')
        .eq('empresa_id', filtros.empresaId)
        .gte('created_at', filtros.dataInicio + 'T00:00:00Z')
        .lte('created_at', filtros.dataFim + 'T23:59:59Z')
        .order('created_at', { ascending: false })
        .range(from, to);
      if (filtros.entidade) q = q.eq('entidade', filtros.entidade);
      const { data, error } = await q;
      if (error) return createErrorResponse('Falha na query', 500, 'QUERY_FAILED');
      rows = (data ?? []) as Record<string, unknown>[];
    }

    // 8) Auditoria BLOQUEANTE não-repudiável
    const timestamp = new Date().toISOString();
    const canonical = canonicalize({
      tipo: filtros.tipo,
      empresaId: filtros.empresaId,
      filtros,
      userId,
      timestamp,
      total: rows.length,
    });
    const auditHash = await sha256Hex(canonical);

    const { error: auditErr } = await admin.from('audit_log').insert({
      user_id: userId,
      empresa_id: filtros.empresaId,
      acao: 'GENERATE_REPORT',
      entidade: 'relatorio',
      dados_novos: {
        tipo: filtros.tipo,
        filtros_canonical: canonical.slice(0, 4000),
        total_linhas: rows.length,
        formato: filtros.formato,
        audit_hash: auditHash,
        generated_at: timestamp,
      },
    });
    if (auditErr) {
      console.error('[relatorio] AUDIT_BLOCKING_FAILURE:', auditErr.message);
      return createErrorResponse(
        'Auditoria obrigatória falhou — geração abortada',
        500, 'AUDIT_FAILED',
      );
    }

    // 9) Retorno (JSON ou CSV)
    if (filtros.formato === 'csv') {
      return new Response(toCsv(rows), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv; charset=utf-8',
          'Cache-Control': 'no-store',
          'Content-Disposition': `attachment; filename="relatorio_${filtros.tipo}_${timestamp}.csv"`,
          'X-Audit-Hash': auditHash,
        },
      });
    }

    return jsonOk({
      success: true,
      tipo: filtros.tipo,
      total: rows.length,
      limit: filtros.limit,
      offset: filtros.offset,
      generated_at: timestamp,
      audit_hash: auditHash,
      data: rows,
    });
  } catch (err) {
    console.error('[relatorio] error:', err instanceof Error ? err.message : err);
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  }
});
