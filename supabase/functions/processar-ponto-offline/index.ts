import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { integrityHash, sha256Hex } from '../_shared/integrityHash.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody } from '../_shared/contract.ts';

async function computeExpectedHash(payload: {
  colaborador_id: string;
  timestamp: string;
  tipo: string;
  dispositivoId: string;
}): Promise<string> {
  const secret = Deno.env.get('PONTO_HASH_SECRET') ?? '';
  const canonical = `${payload.colaborador_id}|${payload.timestamp}|${payload.tipo}|${payload.dispositivoId}`;
  if (!secret) return sha256Hex(canonical);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
    });
  }

  try {
    // CSRF fail-closed
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    // JWT auth obrigatória
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Autenticação obrigatória', code: 'UNAUTHORIZED' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida', code: 'UNAUTHORIZED' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401,
      });
    }
    const userId = userData.user.id;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let rawBody: any;
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    rawBody = _pb;

    const { registros } = rawBody ?? {};
    if (!registros || !Array.isArray(registros) || registros.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum registro fornecido', code: 'VALIDATION_ERROR' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422,
      });
    }

    // Cap batch size to prevent abuse
    if (registros.length > 100) {
      return new Response(JSON.stringify({ error: 'Máximo 100 registros por lote', code: 'PAYLOAD_TOO_LARGE' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 413,
      });
    }

    // Tenant scope: validate that user belongs to the empresas referenced
    const empresaIds = [...new Set(registros.map((r: any) => r.empresa_id).filter(Boolean))];
    for (const empId of empresaIds) {
      const [{ data: belongs }, { data: isAdm }] = await Promise.all([
        supabase.rpc('user_belongs_to_empresa', { _user_id: userId, _empresa_id: empId }),
        supabase.rpc('is_admin', { _user_id: userId }),
      ]);
      if (!belongs && !isAdm) {
        return new Response(JSON.stringify({ error: 'Sem acesso a esta empresa', code: 'FORBIDDEN' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403,
        });
      }
    }

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(supabase, { key: `ponto-offline:${userId}`, limit: 30, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    // Achado N7 da auditoria: o INSERT abaixo omitia `ordem` (NOT NULL, sem
    // default, parte de UNIQUE(colaborador_id, data, ordem)) — toda batida
    // offline falhava a constraint e ficava presa na fila para sempre.
    // `empresa_id` também nunca era gravado; embora a coluna seja nullable,
    // uma linha com empresa_id NULL fica invisível às policies de RLS.
    const colaboradorIds: string[] = [...new Set(
      registros.map((r: any) => r?.colaborador_id).filter((v: unknown): v is string => typeof v === 'string' && v.length > 0),
    )];
    const datasEnvolvidas: string[] = [...new Set(
      registros
        .map((r: any) => (typeof r?.timestamp === 'string' ? r.timestamp.split('T')[0] : null))
        .filter((v: unknown): v is string => typeof v === 'string' && v.length > 0),
    )];

    const empresaPorColaborador = new Map<string, string | null>();
    if (colaboradorIds.length > 0) {
      const { data: colabs } = await supabase
        .from('colaboradores')
        .select('id, empresa_id')
        .in('id', colaboradorIds);
      for (const c of colabs ?? []) {
        empresaPorColaborador.set(c.id as string, (c as any).empresa_id ?? null);
      }
    }

    // Semente do contador de ordem = MAX(ordem) já existente por (colaborador_id, data)
    const ordemAtual = new Map<string, number>();
    if (colaboradorIds.length > 0 && datasEnvolvidas.length > 0) {
      const { data: existentes } = await supabase
        .from('batidas_ponto')
        .select('colaborador_id, data, ordem')
        .in('colaborador_id', colaboradorIds)
        .in('data', datasEnvolvidas);
      for (const b of existentes ?? []) {
        const key = `${b.colaborador_id}|${b.data}`;
        const atual = ordemAtual.get(key) ?? 0;
        if ((b.ordem as number) > atual) ordemAtual.set(key, b.ordem as number);
      }
    }

    // Enforcement de assinatura só é obrigatório quando o segredo está configurado
    const enforceHash = !!Deno.env.get('PONTO_HASH_SECRET');

    const results: {
      success: number;
      errors: number;
      rejected_invalid_hash: number;
      details: Array<{ id?: string; error: string; code?: string }>;
      batch_integrity_hash?: string;
    } = { success: 0, errors: 0, rejected_invalid_hash: 0, details: [] };

    const processedIds: string[] = [];

    for (const reg of registros) {
      try {
        if (!reg?.colaborador_id || !reg?.timestamp || !reg?.tipo || !reg?.dispositivoId) {
          throw new Error('Campos obrigatórios ausentes (colaborador_id, timestamp, tipo, dispositivoId)');
        }

        const expected = await computeExpectedHash({
          colaborador_id: reg.colaborador_id,
          timestamp: reg.timestamp,
          tipo: reg.tipo,
          dispositivoId: reg.dispositivoId,
        });

        if (enforceHash) {
          if (!reg.hash || !safeEqual(String(reg.hash), expected)) {
            results.rejected_invalid_hash++;
            results.errors++;
            results.details.push({
              id: reg.id,
              error: 'Assinatura de integridade inválida',
              code: 'INVALID_SIGNATURE',
            });
            continue;
          }
        }

        const timestampDate = reg.timestamp.split('T')[0];
        const timestampTime = reg.timestamp.split('T')[1].split('.')[0].substring(0, 5);
        const tipoMapped = reg.tipo === 'entrada' || reg.tipo === 'retorno_almoco' ? 'entrada' : 'saida';

        // Deduplicação
        const { data: duplicate } = await supabase
          .from('batidas_ponto')
          .select('id')
          .eq('colaborador_id', reg.colaborador_id)
          .eq('data', timestampDate)
          .eq('hora', timestampTime)
          .eq('tipo', tipoMapped)
          .maybeSingle();

        if (duplicate) {
          results.success++;
          processedIds.push(String(duplicate.id));
          continue;
        }

        // Tenant (empresa_id) + próxima ordem sequencial (N7 fix)
        const empresaId = empresaPorColaborador.get(reg.colaborador_id);
        if (!empresaId) {
          throw new Error('Colaborador sem empresa associada — batida rejeitada');
        }
        const ordemKey = `${reg.colaborador_id}|${timestampDate}`;
        const proximaOrdem = (ordemAtual.get(ordemKey) ?? 0) + 1;
        ordemAtual.set(ordemKey, proximaOrdem);

        // Upload seguro de foto (opcional)
        let finalFotoUrl: string | null = null;
        if (reg.foto_base64 && reg.colaborador_id) {
          const fileName = `${reg.colaborador_id}/offline-${Date.now()}.jpg`;
          const parts = String(reg.foto_base64).split(',');
          const b64 = parts.length > 1 ? parts[1] : parts[0];
          try {
            const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
            const { error: storageError } = await supabase.storage
              .from('ponto-biometria')
              .upload(fileName, binary, { contentType: 'image/jpeg' });
            if (!storageError) {
              const { data: pub } = supabase.storage.from('ponto-biometria').getPublicUrl(fileName);
              finalFotoUrl = pub.publicUrl;
            }
          } catch {
            // foto inválida não bloqueia a batida
          }
        }

        const { data: inserted, error } = await supabase
          .from('batidas_ponto')
          .insert({
            colaborador_id: reg.colaborador_id,
            empresa_id: empresaId,
            tipo: tipoMapped,
            data: timestampDate,
            hora: timestampTime,
            ordem: proximaOrdem,
            latitude: reg.latitude,
            longitude: reg.longitude,
            precisao_metros: reg.precisao,
            dispositivo_id: reg.dispositivoId,
            is_offline: true,
            sync_at: new Date().toISOString(),
            hash_integridade: expected,
            foto_biometria_url: finalFotoUrl,
            metadata: {
              offline_original_type: reg.tipo,
              offline_timestamp: reg.timestamp,
              client_hash: reg.hash ?? null,
              hash_enforced: enforceHash,
              synced_by: userId,
            },
          })
          .select('id')
          .maybeSingle();

        if (error) throw error;
        if (inserted?.id) processedIds.push(String(inserted.id));
        results.success++;
      } catch (err) {
        console.error('[processar-ponto-offline] item error:', err instanceof Error ? err.message : err);
        results.errors++;
        results.details.push({ id: reg?.id, error: 'Falha ao processar registro' });
      }
    }

    results.batch_integrity_hash = await integrityHash({
      total: registros.length,
      success: results.success,
      errors: results.errors,
      rejected_invalid_hash: results.rejected_invalid_hash,
      processed_ids: processedIds.sort(),
      enforce_hash: enforceHash,
      user_id: userId,
    });

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    try { captureException(error, { fn: 'processar-ponto-offline' }); } catch { /* noop */ }
    return new Response(JSON.stringify({ success: false, error: 'Erro interno no processamento offline', code: 'INTERNAL_SERVER_ERROR' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
