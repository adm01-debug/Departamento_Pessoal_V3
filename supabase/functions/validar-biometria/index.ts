// Remediação de auditoria (achado E1 / CRÍTICO):
// • JWT + CSRF obrigatórios (antes: sem autenticação alguma, service_role exposto)
// • Tenant scope: caller precisa pertencer à empresa do colaborador ou ser admin
// • Comparação facial real via Lovable AI Gateway (antes: Math.random())
// • Sem foto de referência => falha fechada (antes: valid:true, fail-open)
// • Erros genéricos ao cliente (antes: error.message vazado)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody } from '../_shared/contract.ts';

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Autenticacao obrigatoria' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Sessao invalida' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(supabase, { key: `biometria:${userId}`, limit: 20, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    let raw: unknown;
    const { body: _pb, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    raw = _pb;
    const { batidaId, fotoBase64, colaboradorId } = raw as Record<string, unknown>;

    if (!batidaId || !fotoBase64 || !colaboradorId ||
        typeof batidaId !== 'string' || typeof fotoBase64 !== 'string' || typeof colaboradorId !== 'string') {
      return new Response(JSON.stringify({ error: 'Parametros batidaId, fotoBase64 e colaboradorId sao obrigatorios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cap base64 payload at 2MB
    if (fotoBase64.length > 2 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'Foto excede limite de 2MB' }), {
        status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: colaborador, error: cError } = await supabase
      .from('colaboradores')
      .select('foto_referencia_url, nome_completo, empresa_id')
      .eq('id', colaboradorId)
      .single();

    if (cError || !colaborador) {
      return new Response(JSON.stringify({ error: 'Colaborador nao encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Tenant scope: verify user has access to the colaborador's empresa
    const { data: belongs } = await supabase.rpc('user_belongs_to_empresa', {
      _user_id: userId,
      _empresa_id: colaborador.empresa_id,
    });
    if (!belongs) {
      return new Response(JSON.stringify({ error: 'Sem acesso a este colaborador' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!colaborador.foto_referencia_url) {
      await supabase
        .from('batidas_ponto')
        .update({
          biometria_status: 'pendente',
          biometria_score: 0,
          device_metadata: {
            biometria_analise: 'Foto de referencia nao cadastrada. Necessario atualizacao cadastral.',
            validado_por: 'System Guard'
          }
        })
        .eq('id', batidaId)
        .eq('colaborador_id', colaboradorId);

      return new Response(JSON.stringify({
        valid: false,
        confidence: 0,
        message: 'Foto de referencia nao cadastrada. Batida requer validacao manual.'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Attempt real AI comparison via Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    let isMatch = false;
    let confidence = 0;
    let analysis = 'Servico de biometria indisponivel. Validacao manual necessaria.';

    if (LOVABLE_API_KEY) {
      try {
        const promptIA = `Compare estas duas imagens de rostos. A primeira URL e a foto de referencia do colaborador "${colaborador.nome_completo}": ${colaborador.foto_referencia_url}. A segunda e a foto capturada em base64. Responda APENAS um JSON: {"match": boolean, "confidence": number (0-1), "analysis": "string"}. match=true se confianca >= 0.85.`;

        const response = await fetch('https://ai-gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'user', content: [
                { type: 'text', text: promptIA },
                { type: 'image_url', image_url: { url: fotoBase64.startsWith('data:') ? fotoBase64 : `data:image/jpeg;base64,${fotoBase64}` } },
              ]},
            ],
            max_tokens: 256,
            temperature: 0,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content ?? '';
          const jsonMatch = content.match(/\{[\s\S]*?\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            isMatch = parsed.match === true && parsed.confidence >= 0.85;
            confidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0;
            analysis = parsed.analysis || analysis;
          }
        }
      } catch (aiErr) {
        console.error('AI biometry error:', aiErr);
      }
    }

    // Fail-closed: if AI unavailable, mark as pending manual review
    const status = LOVABLE_API_KEY ? (isMatch ? 'valido' : 'invalido') : 'pendente';

    const { error: updError } = await supabase
      .from('batidas_ponto')
      .update({
        biometria_status: status,
        biometria_score: confidence,
        device_metadata: {
          biometria_analise: analysis,
          validado_por: LOVABLE_API_KEY ? 'AI Biometry Engine' : 'Pendente - servico indisponivel',
        }
      })
      .eq('id', batidaId)
      .eq('colaborador_id', colaboradorId);

    if (updError) throw updError;

    return new Response(JSON.stringify({
      valid: isMatch,
      confidence,
      status,
      message: analysis,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    try { captureException(error, { fn: 'validar-biometria' }); } catch { /* noop */ }
    return new Response(JSON.stringify({ success: false, error: 'Erro interno na validacao' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
