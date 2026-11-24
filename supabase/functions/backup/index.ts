// Remediação de auditoria (achado E4 / ALTO):
// • JWT + is_admin obrigatórios (antes: sem autenticação alguma,
//   service_role exposto; qualquer um obtinha contagens de todas as
//   empresas quando empresaId era omitido)
// • Erros genéricos ao cliente (antes: error.message por tabela vazado)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody } from '../_shared/contract.ts';

const TABLES = [
  'colaboradores', 'folhas_pagamento', 'itens_folha', 'ferias',
  'afastamentos', 'registros_ponto', 'batidas_ponto', 'beneficios',
  'asos', 'admissoes', 'cargos', 'departamentos', 'jornadas',
];

function jsonError(status: number, code: string, message: string) {
  return new Response(JSON.stringify({ success: false, error: message, code }), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Autenticação obrigatória' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(adminClient, { key: `backup:${userData.user.id}`, limit: 3, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const { data: roles } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .limit(1);

    if (!roles?.length) {
      return new Response(JSON.stringify({ error: 'Permissão negada: requer role admin' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { body: _pb } = await parseJsonBody(req);
    const { empresaId } = (_pb as Record<string, unknown>) ?? { empresaId: null };
    const results: Record<string, any> = {};
    let totalRecords = 0;

    for (const table of TABLES) {
      try {
        let query = adminClient.from(table).select('*');
        if (empresaId) query = query.eq('empresa_id', empresaId);
        const { count, error } = await query;
        if (error) {
          console.error(`[backup] table ${table} error:`, error.message);
          results[table] = { error: 'Falha ao exportar tabela', count: 0 };
        } else {
          results[table] = { count: count ?? 0 };
          totalRecords += count ?? 0;
        }
      } catch {
        results[table] = { count: 0, error: 'Tabela não acessível' };
      }
    }

    await adminClient.from('audit_log').insert({
      tabela: 'backup',
      registro_id: 'system',
      acao: 'BACKUP',
      user_id: userData.user.id,
      dados_novos: { tables: results, total: totalRecords, empresa_id: empresaId },
    });

    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      tables: results,
      total_records: totalRecords,
      message: `Backup de ${TABLES.length} tabelas concluído (${totalRecords} registros)`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    captureException(error, { fn: 'backup' });
    return new Response(JSON.stringify({ success: false, error: 'Erro interno no backup' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
