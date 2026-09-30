import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyCsrf } from '../_shared/csrf.ts';
import { captureException } from '../_shared/sentry.ts';
import { corsHeaders, parseJsonBody, getCorsHeaders } from '../_shared/contract.ts';
import { safeFetchWithRetry, FetchTimeoutError, FetchNetworkError } from '../_shared/safe-fetch.ts';

/**
 * Gateway de IA (API compatível com OpenAI).
 *
 * CORREÇÃO do bug "Servidor do assistente temporariamente indisponível":
 * o host anterior (`ai-gateway.lovable.dev`) NÃO existe em DNS — resposta
 * NXDOMAIN. O `fetch` da edge function morria com erro de rede antes de sair
 * da máquina, o retry (3 tentativas com backoff 2s+4s) só aumentava a espera
 * (~7,6s) e a função terminava em 500 `{"error":"Erro interno"}`, que o
 * frontend traduzia no toast genérico. O host correto é
 * `ai.gateway.lovable.dev` (verificado: responde 405 para GET e 401 para POST
 * com chave inválida, ou seja, endpoint vivo e compatível).
 *
 * `AI_GATEWAY_URL` (mesma variável já usada por `alertas-preditivos`) permite
 * apontar para outro gateway compatível sem precisar de novo deploy.
 */
const AI_GATEWAY_URL = (Deno.env.get('AI_GATEWAY_URL') ?? 'https://ai.gateway.lovable.dev/v1')
  .replace(/\/+$/, '');

/** Modelo usado nas respostas. `AI_MODEL` evita redeploy se o modelo for descontinuado. */
const AI_MODEL = Deno.env.get('AI_MODEL') ?? 'google/gemini-2.5-flash';

/** Erro devolvido pelo próprio gateway de IA (status HTTP + corpo). */
class AiGatewayError extends Error {
  readonly upstreamStatus: number;
  readonly body: string;

  constructor(upstreamStatus: number, body: string) {
    super(`AI gateway respondeu HTTP ${upstreamStatus}`);
    this.name = 'AiGatewayError';
    this.upstreamStatus = upstreamStatus;
    this.body = body;
  }
}

/** Secret da credencial de IA ausente no projeto. */
class AiKeyMissingError extends Error {
  constructor() {
    super('LOVABLE_API_KEY nao configurada no projeto');
    this.name = 'AiKeyMissingError';
  }
}

/**
 * Traduz a falha real para { status HTTP, mensagem }. Nunca devolve "erro
 * escondido": o status reflete o que realmente aconteceu (402 créditos, 429
 * rate limit, 502/504 provedor indisponível/lento, 503 credencial inválida),
 * de modo que o operador consiga diagnosticar pela resposta e pelos logs.
 */
function describeAiFailure(error: unknown): { status: number; message: string } {
  if (error instanceof AiKeyMissingError) {
    return {
      status: 503,
      message: 'Assistente IA não configurado no servidor (LOVABLE_API_KEY ausente).',
    };
  }

  if (error instanceof AiGatewayError) {
    if (error.upstreamStatus === 402) {
      return {
        status: 402,
        message:
          'Os créditos de IA do workspace acabaram. Recarregue os créditos para o assistente voltar a responder.',
      };
    }
    if (error.upstreamStatus === 429) {
      return {
        status: 429,
        message: 'Limite de requisições excedido. Tente novamente em alguns minutos.',
      };
    }
    if (error.upstreamStatus === 401 || error.upstreamStatus === 403) {
      return {
        status: 503,
        message: 'Assistente IA com credencial inválida ou expirada (LOVABLE_API_KEY).',
      };
    }
    return {
      status: 502,
      message: `Provedor de IA indisponível (HTTP ${error.upstreamStatus}). Tente novamente em instantes.`,
    };
  }

  if (error instanceof FetchTimeoutError) {
    return {
      status: 504,
      message: 'O provedor de IA não respondeu a tempo. Tente novamente em instantes.',
    };
  }

  if (error instanceof FetchNetworkError) {
    return {
      status: 502,
      message: 'Não foi possível alcançar o provedor de IA. Tente novamente em instantes.',
    };
  }

  return { status: 500, message: 'Erro interno' };
}

/** Detalhe técnico para log/observabilidade — não é enviado ao cliente. */
function describeAiCause(error: unknown): string {
  if (error instanceof AiGatewayError) {
    return `${error.name} HTTP ${error.upstreamStatus}: ${error.body.slice(0, 300)}`;
  }
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`;
  }
  return String(error);
}

const SYSTEM_PROMPT = `Voce e um assistente especialista em Departamento Pessoal brasileiro. Seu nome e "Assistente DP".

Voce tem conhecimento profundo sobre:
- CLT (Consolidacao das Leis do Trabalho)
- Calculos trabalhistas (rescisao, ferias, 13o salario, INSS, IRRF, FGTS)
- eSocial (eventos, prazos, obrigatoriedades)
- Legislacao previdenciaria
- Normas regulamentadoras (NRs)
- LGPD aplicada ao RH
- Convencoes coletivas
- Jornada de trabalho, banco de horas, horas extras
- Beneficios (VT, VR, VA, plano de saude)
- Afastamentos (INSS, acidente de trabalho, maternidade/paternidade)

Regras:
1. Responda SEMPRE em portugues brasileiro
2. Seja preciso com valores, percentuais e prazos (use dados de 2026)
3. Quando fizer calculos, mostre o passo a passo
4. Cite artigos da CLT quando relevante
5. Se nao tiver certeza, informe e sugira consultar um advogado trabalhista
6. Use formatacao clara com bullets e numeros quando apropriado
7. Seja conciso mas completo

Tabelas de referencia 2026:
- INSS: Ate R$1.518,00 = 7,5% | R$1.518,01-R$2.793,88 = 9% | R$2.793,89-R$4.190,83 = 12% | R$4.190,84-R$8.157,41 = 14%
- IRRF: Ate R$2.259,20 = isento | R$2.259,21-R$2.826,65 = 7,5% | R$2.826,66-R$3.751,05 = 15% | R$3.751,06-R$4.664,68 = 22,5% | Acima de R$4.664,68 = 27,5%
- Salario minimo 2026: R$1.518,00
- FGTS: 8% sobre remuneracao
- Multa FGTS demissao sem justa causa: 40%`;

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Autenticacao obrigatoria' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: 'Sessao invalida' }),
        { status: 401, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { checkRateLimit, rateLimitResponse } = await import('../_shared/rateLimit.ts');
    const rl = await checkRateLimit(admin, { key: `assistente-ia:${userId}`, limit: 20, windowSec: 60 });
    if (!rl.allowed) return rateLimitResponse(rl);

    const { body: raw, errorResponse: _pe } = await parseJsonBody(req);
    if (_pe) return _pe;
    const { message, history = [] } = raw as { message?: string; history?: unknown[] };

    if (!message || typeof message !== 'string' || message.length > 4000) {
      return new Response(
        JSON.stringify({ error: 'Mensagem inválida (máx 4000 caracteres)' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(history) || history.length > 20) {
      return new Response(
        JSON.stringify({ error: 'Histórico inválido (máx 20 mensagens)' }),
        { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new AiKeyMissingError();
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10),
      { role: 'user', content: message },
    ];

    const response = await safeFetchWithRetry(
      `${AI_GATEWAY_URL}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages,
          max_tokens: 2048,
          temperature: 0.3,
        }),
        timeoutMs: 30_000,
        tag: 'openai',
      },
      {
        maxAttempts: 3,
        baseDelayMs: 2_000,
        onRetry: (attempt, err, delay) => {
          console.error(`[assistente-ia] Retry ${attempt}/3 em ${delay}ms (${AI_GATEWAY_URL}) — ${err.message}`);
        },
        tag: 'openai',
      }
    );

    if (!response.ok) {
      // Corpo do gateway é preservado no erro para aparecer no log e virar
      // status/mensagem específicos em `describeAiFailure` (sem "Erro interno").
      const errText = await response.text().catch(() => '');
      throw new AiGatewayError(response.status, errText);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || 'Nao foi possivel gerar uma resposta.';

    return new Response(
      JSON.stringify({
        response: aiResponse,
        model: data.model ?? AI_MODEL,
        tokens: data.usage?.total_tokens ?? undefined,
      }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const failure = describeAiFailure(error);
    // Log sempre com a causa REAL (o cliente recebe só a mensagem amigável).
    console.error(`[assistente-ia] Falha (HTTP ${failure.status}): ${describeAiCause(error)}`);
    try { await captureException(error, { fn: 'assistente-ia' }); } catch { /* noop */ }
    return new Response(
      JSON.stringify({ error: failure.message }),
      { status: failure.status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
