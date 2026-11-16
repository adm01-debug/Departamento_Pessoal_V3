/**
 * ============================================================================
 * EDGE FUNCTION `training-image-dispatch` — WORKER DA FILA AUTOMÁTICA
 * ============================================================================
 * Consome `training_image_requests` (enfileiradas por TRIGGER após o cadastro
 * de curso/trilha) e executa o MESMO pipeline da geração manual.
 *
 * POR QUE UM WORKER (e não um fetch no navegador)
 *   • o trabalho vive no banco: fechar a página não perde a solicitação;
 *   • `claim_training_image_requests` usa FOR UPDATE SKIP LOCKED: várias
 *     instâncias processam sem duplicar;
 *   • o `claim_training_image` continua sendo a última barreira de custo.
 *
 * SEGURANÇA
 *   • NÃO é chamável pelo navegador: exige `X-Cron-Secret` (segredo do
 *     agendador) ou o service role key no Authorization;
 *   • NUNCA expõe chave/segredo na resposta;
 *   • desligado por padrão: `TRAINING_IMAGE_AUTOQUEUE_ENABLED` E
 *     `TRAINING_IMAGE_GENERATION_ENABLED` precisam ser "true" + OPENAI_API_KEY.
 *     Caso contrário responde 503 ANTES de reivindicar a fila (nada é perdido).
 *
 * NÃO executa geração real enquanto as flags estiverem desligadas.
 * ============================================================================
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getCorsHeaders, handlePreflight } from '../_shared/contract.ts';
import { checkRateLimitDuplo } from '../_shared/rateLimit.ts';
import { gerarCapaDeTreinamento } from '../_shared/trainingImages/pipeline.ts';
import {
  criarOpenAITrainingImageProvider,
  OPENAI_MODELO_PADRAO,
  OPENAI_TAMANHO_PADRAO,
} from '../_shared/trainingImages/openaiProvider.ts';
import { criarDepsSupabase } from '../_shared/trainingImages/supabaseDeps.ts';
import {
  consultarEstadoDaCapa,
  marcarResultadoDesconhecido,
} from '../_shared/trainingImages/estadoCapa.ts';
import {
  chaveEmpresa,
  chaveUsuario,
  envNumero,
  JANELA_QUOTA_SEG,
  LIMITE_EMPRESA_PADRAO,
  LIMITE_USUARIO_PADRAO,
  STALE_FILA_MINUTOS,
} from '../_shared/trainingImages/quotas.ts';

/**
 * Lote pequeno por padrão: a plataforma limita o wall clock da função
 * (150 s free / 400 s pago). 2 gerações cabem com folga; itens não processados
 * permanecem na fila e são recuperados na próxima execução.
 */
const BATCH_PADRAO = 2;

/** Adiamento ao encontrar quota esgotada (segundos). */
const RETRY_QUOTA_SEG = 300;

function json(payload: unknown, status: number, req: Request): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

/** Comparação em tempo constante (HMAC de 32 bytes, sempre percorre tudo). */
async function iguaisEmTempoConstante(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const chave = await crypto.subtle.importKey(
    'raw',
    enc.encode('dp-training-image-dispatch-comparison'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const assinaturaA = new Uint8Array(await crypto.subtle.sign('HMAC', chave, enc.encode(a)));
  const assinaturaB = new Uint8Array(await crypto.subtle.sign('HMAC', chave, enc.encode(b)));
  let diff = 0;
  for (let i = 0; i < assinaturaA.length; i += 1) diff |= assinaturaA[i] ^ assinaturaB[i];
  return diff === 0;
}

async function estaAutorizado(req: Request, serviceKey: string, cronSecret: string): Promise<boolean> {
  const auth = req.headers.get('Authorization') ?? '';
  const cron = req.headers.get('X-Cron-Secret') ?? '';

  if (serviceKey) {
    const esperado = `Bearer ${serviceKey}`;
    if (await iguaisEmTempoConstante(auth, esperado)) return true;
  }
  if (cronSecret && cron) {
    if (await iguaisEmTempoConstante(cron, cronSecret)) return true;
  }
  return false;
}


Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') return json({ error: 'METODO_NAO_PERMITIDO' }, 405, req);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const cronSecret = Deno.env.get('TRAINING_IMAGE_DISPATCH_SECRET') ?? '';
    const apiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
    const autoqueue = Deno.env.get('TRAINING_IMAGE_AUTOQUEUE_ENABLED') === 'true';
    const geracao = Deno.env.get('TRAINING_IMAGE_GENERATION_ENABLED') === 'true';

    if (!(await estaAutorizado(req, serviceKey, cronSecret))) {
      return json({ error: 'NAO_AUTORIZADO' }, 401, req);
    }

    // Flags DESLIGADAS por padrão: fila intacta, zero custo, zero claim.
    if (!autoqueue || !geracao || !apiKey) {
      return json(
        {
          ok: false,
          motivo: !autoqueue
            ? 'autoqueue_desativado'
            : !geracao
              ? 'geracao_desativada'
              : 'chave_ausente',
          processados: 0,
          fila_preservada: true,
        },
        503,
        req
      );
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const provider = criarOpenAITrainingImageProvider({
      apiKey,
      model: Deno.env.get('TRAINING_IMAGE_MODEL') || OPENAI_MODELO_PADRAO,
      size: Deno.env.get('TRAINING_IMAGE_SIZE') || OPENAI_TAMANHO_PADRAO,
      quality: Deno.env.get('TRAINING_IMAGE_QUALITY') || 'medium',
      timeoutMs: envNumero('TRAINING_IMAGE_TIMEOUT_MS', 90_000),
    });

    const lote = envNumero('TRAINING_IMAGE_DISPATCH_BATCH', BATCH_PADRAO);
    const { data: pedidos, error } = await admin.rpc('claim_training_image_requests', {
      p_limit: lote,
    });
    if (error) throw error;

    const resultados: Array<{
      id: string;
      empresa_id: string;
      content_type: string;
      content_id: string;
      status: 'done' | 'skipped' | 'failed' | 'queued';
      motivo?: string;
    }> = [];

    for (const pedido of (pedidos ?? []) as Array<{
      id: string;
      empresa_id: string;
      content_type: 'course' | 'learning_path';
      content_id: string;
      requested_by: string | null;
      attempts: number;
    }>) {
      const entrada = {
        empresaId: pedido.empresa_id,
        contentType: pedido.content_type,
        contentId: pedido.content_id,
      };

      const finalizar = async (
        status: 'done' | 'skipped' | 'failed' | 'queued',
        motivo: string | null,
        retryAfterSeconds?: number
      ) => {
        await admin.rpc('finish_training_image_request', {
          p_id: pedido.id,
          p_status: status,
          p_error: motivo,
          ...(retryAfterSeconds ? { p_retry_after_seconds: retryAfterSeconds } : {}),
        });
        resultados.push({
          id: pedido.id,
          empresa_id: pedido.empresa_id,
          content_type: pedido.content_type,
          content_id: pedido.content_id,
          status,
          motivo: motivo ?? undefined,
        });
      };

      // ── Idempotência ANTES de quota/provedor (mesma regra da geração manual).
      const estado = await consultarEstadoDaCapa(admin, entrada);
      if (!estado) {
        await finalizar('skipped', 'conteudo_inexistente');
        continue;
      }
      if (estado.jaConcluida) {
        await finalizar('skipped', 'ja_processado');
        continue;
      }
      if (estado.emAndamento) {
        await finalizar('skipped', 'em_processamento');
        continue;
      }
      if (estado.incerto) {
        await finalizar('skipped', 'resultado_desconhecido');
        continue;
      }
      if (estado.esgotado) {
        await finalizar('skipped', 'limite_de_tentativas');
        continue;
      }

      /**
       * ── RECUPERAÇÃO SEGURA (Risco B) ─────────────────────────────────────
       * Item reivindicado mais de uma vez com linha de imagem pending/processing
       * significa que o worker anterior pode ter chamado o provedor. NÃO
       * chamamos o provedor de novo: marcamos resultado desconhecido e
       * deixamos a reconciliação manual decidir. Nunca há retentativa paga
       * automática nesse cenário.
       */
      if (
        pedido.attempts > 1 &&
        estado.imagemId &&
        (estado.status === 'pending' || estado.status === 'processing')
      ) {
        await marcarResultadoDesconhecido(
          admin,
          estado.imagemId,
          'recuperacao_apos_interrupcao'
        );
        await finalizar('skipped', 'resultado_desconhecido: recuperacao_apos_interrupcao');
        continue;
      }

      /**
       * ── QUOTA (PASSO 4) ──────────────────────────────────────────────────
       * Todo trabalho automático passa pelo MESMO rate limit da geração manual:
       *   • empresa: sempre aplicada (20/h padrão);
       *   • usuário: quando o trigger registrou `requested_by` (nunca inventado).
       * Se estourou, devolve à fila com adiamento — sem chamar o provedor.
       */
      const quota = await checkRateLimitDuplo(admin, {
        empresaKey: chaveEmpresa(pedido.empresa_id),
        empresaLimit: envNumero('TRAINING_IMAGE_RATE_LIMIT_EMPRESA', LIMITE_EMPRESA_PADRAO),
        usuarioKey: pedido.requested_by ? chaveUsuario(pedido.requested_by) : null,
        usuarioLimit: pedido.requested_by
          ? envNumero('TRAINING_IMAGE_RATE_LIMIT', LIMITE_USUARIO_PADRAO)
          : null,
        windowSec: JANELA_QUOTA_SEG,
      });
      if (!quota.allowed) {
        await finalizar('queued', `rate_limit_${quota.reason ?? 'geral'}`, RETRY_QUOTA_SEG);
        continue;
      }

      const resultado = await gerarCapaDeTreinamento(
        entrada,
        criarDepsSupabase(admin, provider, {
          claimStaleAfter: `${STALE_FILA_MINUTOS} minutes`,
        })
      );

      const status: 'done' | 'skipped' | 'failed' = resultado.gerado
        ? 'done'
        : MOTIVOS_SEM_NOVA_TENTATIVA.has(resultado.motivo)
          ? 'skipped'
          : 'failed';

      const erro = resultado.gerado
        ? null
        : `${resultado.motivo}${'erro' in resultado && resultado.erro ? `: ${resultado.erro}` : ''}`;

      await finalizar(status, erro);
    }

    return json({ ok: true, processados: resultados.length, resultados }, 200, req);
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message.slice(0, 200) : 'erro_desconhecido';
    return json(
      {
        error: 'FALHA_INTERNA',
        detalhe: mensagem.replace(/sk-[A-Za-z0-9-_]{6,}/g, '[redigido]'),
      },
      500,
      req
    );
  }
});

/** Motivos que NÃO devem ser repetidos automaticamente pela fila. */
const MOTIVOS_SEM_NOVA_TENTATIVA = new Set([
  'ja_processado',
  'em_processamento',
  'provedor_desativado',
  'limite_de_tentativas',
  'resultado_desconhecido',
]);
