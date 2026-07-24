// Onda 24 — Hardening avançado: CSRF + CSV parser RFC-4180 + anti-injection
// + caps por linha + empresa_id obrigatório para tabelas multi-tenant.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://esm.sh/zod@3.23.8';
import { corsHeaders, createErrorResponse, createValidationErrorResponse, parseJsonBody } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';

// Whitelist rígida — todas exigem empresa_id (multi-tenant)
const ALLOWED_TABLES = [
  'colaboradores', 'departamentos', 'cargos', 'beneficios',
  'dependentes', 'contatos_emergencia', 'documentos',
] as const;

// Tabelas onde empresa_id é OBRIGATÓRIO (fail-closed contra vazamento cross-tenant)
const TENANT_SCOPED_TABLES = new Set<string>([
  'colaboradores', 'departamentos', 'cargos', 'beneficios', 'documentos',
]);

const BodySchema = z.object({
  action: z.enum(['validar', 'importar', 'template']),
  tabela: z.enum(ALLOWED_TABLES),
  formato: z.enum(['csv', 'json']).optional(),
  csvContent: z.string().max(5 * 1024 * 1024).optional(), // 5MB total
  dados: z.union([z.array(z.record(z.unknown())), z.record(z.unknown())]).optional(),
  empresaId: z.string().uuid().optional(),
});

const MAX_ROWS = 5000;
const MAX_CELL_BYTES = 8 * 1024; // 8KB por célula — evita bomba em campo único
const MAX_COLUMNS = 100;

// Prefixos que Excel/Sheets interpretam como fórmula → CSV injection
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

function sanitizeCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  let s = String(v);
  if (s.length > MAX_CELL_BYTES) s = s.slice(0, MAX_CELL_BYTES);
  // Anti CSV-injection: prefixar com aspas simples se começar com char perigoso
  if (s.length > 0 && FORMULA_PREFIXES.includes(s[0])) {
    s = `'${s}`;
  }
  return s.trim();
}

/** Parser CSV RFC-4180-compliant (aspas, escape "", CRLF, vírgulas em campos). */
function parseCSVStrict(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < n && text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { cur.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') {
      cur.push(field); field = '';
      if (cur.some((x) => x !== '')) rows.push(cur);
      cur = []; i++; continue;
    }
    field += c; i++;
  }
  if (field !== '' || cur.length > 0) {
    cur.push(field);
    if (cur.some((x) => x !== '')) rows.push(cur);
  }

  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => sanitizeCell(h).toLowerCase());
  if (headers.length > MAX_COLUMNS) {
    throw new Error(`CSV excede ${MAX_COLUMNS} colunas`);
  }
  const out: Record<string, string>[] = [];
  for (let r = 1; r < rows.length; r++) {
    const values = rows[r];
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (!h) return;
      row[h] = sanitizeCell(values[idx]);
    });
    out.push(row);
  }
  return out;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return createErrorResponse('Método não permitido', 405, 'METHOD_NOT_ALLOWED');

  try {
    // 1) CSRF fail-closed
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    // 2) Auth obrigatório
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return createErrorResponse('Autenticação obrigatória', 401, 'UNAUTHORIZED');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return createErrorResponse('Sessão inválida', 401, 'UNAUTHORIZED');
    const userId = userData.user.id;

    // 3) Validação de input via Zod (com limite de payload 512 KB para importações CSV)
    let raw: unknown;
    const { body: _body, errorResponse: _plErr } = await parseJsonBody(req, 512 * 1024);
    if (_plErr) return _plErr;
    raw = _body;
    const parsed = BodySchema.safeParse(raw);
    if (!parsed.success) return createValidationErrorResponse(parsed.error);
    const { action, tabela, dados, formato, csvContent, empresaId } = parsed.data;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Rate limit — importações são custosas: 10 execuções / min / usuário
    if (action !== 'template') {
      const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
      const rl = await checkRateLimit(admin, { key: `importacao:${userId}`, limit: 10, windowSec: 60 });
      if (!rl.allowed) return rateLimitResponse(rl);
    }


    // 4) Tenant scope — obrigatório para tabelas multi-tenant
    if (TENANT_SCOPED_TABLES.has(tabela) && !empresaId && action !== 'template') {
      return createErrorResponse('empresaId é obrigatório para esta tabela', 400, 'EMPRESA_REQUIRED');
    }
    if (empresaId) {
      const { data: belongs } = await admin.rpc('user_belongs_to_empresa', {
        _user_id: userId, _empresa_id: empresaId,
      });
      const { data: isAdm } = await admin.rpc('is_admin', { _user_id: userId });
      if (!belongs && !isAdm) return createErrorResponse('Sem acesso a esta empresa', 403, 'FORBIDDEN');
    }

    // 5) Handlers
    if (action === 'template') {
      const templates: Record<string, string> = {
        colaboradores: 'nome_completo,cpf,email,telefone,data_nascimento,data_admissao,cargo,departamento,salario',
        departamentos: 'nome,descricao',
        cargos: 'nome,cbo,salario_base',
        beneficios: 'nome,tipo,valor,valor_empresa,valor_colaborador',
        dependentes: 'colaborador_cpf,nome,cpf,data_nascimento,parentesco',
        contatos_emergencia: 'colaborador_cpf,nome,telefone,parentesco',
        documentos: 'colaborador_cpf,tipo,numero,orgao_emissor,data_emissao',
      };
      return json({ success: true, data: { template: templates[tabela] ?? '', tabela } });
    }

    // Materializa linhas
    let rows: Record<string, unknown>[] = [];
    if (formato === 'csv' && csvContent) {
      try { rows = parseCSVStrict(csvContent); }
      catch (e) {
        return createErrorResponse(
          e instanceof Error ? e.message : 'CSV inválido', 400, 'INVALID_CSV',
        );
      }
    } else if (dados) {
      rows = Array.isArray(dados) ? dados as Record<string, unknown>[] : [dados as Record<string, unknown>];
    } else {
      return createErrorResponse('Forneça csvContent (csv) ou dados (json)', 400, 'MISSING_PAYLOAD');
    }

    if (action === 'validar') {
      const errors: string[] = [];
      rows.forEach((row, idx) => {
        const line = idx + 2; // +1 header, +1 base-1
        if (tabela === 'colaboradores') {
          if (!row.nome && !row.nome_completo) errors.push(`Linha ${line}: nome é obrigatório`);
          if (!row.cpf && !row.email) errors.push(`Linha ${line}: cpf ou email é obrigatório`);
        }
        if (tabela === 'departamentos' && !row.nome) errors.push(`Linha ${line}: nome é obrigatório`);
        if (tabela === 'cargos' && !row.nome) errors.push(`Linha ${line}: nome é obrigatório`);
      });
      return json({
        success: true,
        data: { total: rows.length, errors, valid: errors.length === 0, preview: rows.slice(0, 5) },
      });
    }

    // action === 'importar'
    if (rows.length === 0) return createErrorResponse('Nenhum dado para importar', 400, 'EMPTY_PAYLOAD');
    if (rows.length > MAX_ROWS) {
      return createErrorResponse(`Máximo ${MAX_ROWS} linhas por importação`, 413, 'TOO_MANY_ROWS');
    }

    // Normaliza campo 'nome' → 'nome_completo' em colaboradores (backward-compat com CSVs antigos)
    if (tabela === 'colaboradores') {
      rows = rows.map((r) => {
        const mapped = { ...r };
        if ('nome' in mapped && !('nome_completo' in mapped)) {
          (mapped as Record<string, unknown>).nome_completo = mapped.nome;
          delete (mapped as Record<string, unknown>).nome;
        }
        return mapped;
      });
    }

    // Injeta empresa_id server-side — cliente NUNCA sobrescreve
    if (empresaId) {
      rows = rows.map((r) => {
        const clean = { ...r };
        delete (clean as Record<string, unknown>).empresa_id;
        return { ...clean, empresa_id: empresaId };
      });
    }

    let inserted = 0, errorsCount = 0;
    const batchErrors: string[] = [];
    const BATCH = 50;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { data, error } = await admin.from(tabela).insert(batch).select('id');
      if (error) {
        errorsCount += batch.length;
        batchErrors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${error.message}`);
      } else {
        inserted += data?.length ?? 0;
      }
    }

    // Audit: registro_id UUID válido, ação IMPORT
    await admin.from('audit_log').insert({
      tabela,
      registro_id: crypto.randomUUID(),
      acao: 'IMPORT',
      user_id: userId,
      dados_novos: {
        total: rows.length, inserted, errors: errorsCount,
        empresa_id: empresaId ?? null, batches: batchErrors.slice(0, 20),
      },
    });

    return json({
      success: true,
      data: { total: rows.length, inserted, errors: errorsCount, details: batchErrors.slice(0, 20) },
    });
  } catch (error: unknown) {
    try { captureException(error, { fn: 'importacao' }); } catch { /* noop */ }
    return createErrorResponse('Erro interno', 500, 'INTERNAL_SERVER_ERROR');
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
