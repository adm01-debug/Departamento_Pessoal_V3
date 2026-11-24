import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from './contract.ts';

export async function withMonitoring(
  req: Request,
  funcaoNome: string,
  handler: (supabase: any) => Promise<Response>
): Promise<Response> {
  const startTime = Date.now();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const response = await handler(supabase);
    const duration = Date.now() - startTime;

    // Log métricas de sucesso de forma assíncrona (não bloqueia a resposta)
    EdgeRuntime.waitUntil(
      supabase.from('metricas_processamento').insert({
        funcao_nome: funcaoNome,
        status: response.status >= 200 && response.status < 300 ? 'success' : 'error',
        tempo_execucao_ms: duration
      })
    );

    return response;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.message?.toLowerCase().includes('timeout');

    await supabase.from('metricas_processamento').insert({
      funcao_nome: funcaoNome,
      status: isTimeout ? 'timeout' : 'failure',
      tempo_execucao_ms: duration
    });

    return new Response(
      JSON.stringify({
        error: {
          code: isTimeout ? 'TIMEOUT_ERROR' : 'INTERNAL_SERVER_ERROR',
          message: error.message || 'Erro inesperado no processamento'
        }
      }),
      {
        status: isTimeout ? 504 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}
