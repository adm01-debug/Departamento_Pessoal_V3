/**
 * ============================================================================
 * EDGE FUNCTION `training-image-generate`
 *
 * Gera (ou reivindica) a capa de UM curso/trilha. Toda a lógica de geração vive
 * no backend: a chave da OpenAI existe apenas aqui (`Deno.env`), nunca no
 * bundle do navegador.
 *
 * FLUXO
 *   1. CORS + CSRF; exige POST autenticado (JWT via `getUser`).
 *   2. Corpo estrito: `{ empresa_id, content_type, content_id }` (UUIDs).
 *   3. Geração desligada por padrão (`TRAINING_IMAGE_GENERATION_ENABLED`) e sem
 *      chave ⇒ 503, SEM reivindicar trabalho e SEM custo.
 *   4. Vínculo real com a empresa (`user_empresas`) + papel autorizado
 *      (`admin`/`rh`). UUID do cliente nunca é confiado.
 *   5. Allowlist TEMPORÁRIA de teste (`TRAINING_IMAGE_ALLOWED_EMPRESA_ID` +
 *      `TRAINING_IMAGE_ALLOWED_CONTENT_ID`): proteção ADICIONAL, server-side.
 *      Sem os dois IDs configurados ⇒ 503; empresa/curso diferente ⇒ 403.
 *      Aplicada ANTES de idempotência, quota, claim e provedor.
 *   6. Rate limit por usuário (proteção de custo).
 *   7. Pipeline: carrega o cadastro escopado, reconstrói briefing, faz o claim
 *      atômico, chama o provedor, valida, sobe no bucket privado e atualiza
 *      `training_images` para `succeeded` (ou `failed`, sem loop).
 *   8. Turmas e certificados NÃO geram: herdam a imagem do curso.
 *
 * NÃO usa `waitUntil` para “deixar rodando”: o estado do trabalho vive na
 * tabela e a resposta só sai depois de concluído/recusado.
 * ============================================================================
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { createErrorResponse, getCorsHeaders, handlePreflight, parseJsonBody } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { checkRateLimitDuplo, rateLimitDuploResponse } from '../_shared/rateLimit.ts';
import { validarAllowlist } from '../_shared/trainingImages/allowlist.ts';
import { isUuid } from '../_shared/trainingImages/uuid.ts';
import { gerarCapaDeTreinamento } from '../_shared/trainingImages/pipeline.ts';
import {
  criarOpenAITrainingImageProvider,
  OPENAI_MODELO_PADRAO,
  OPENAI_TAMANHO_PADRAO,
} from '../_shared/trainingImages/openaiProvider.ts';
import { criarDepsSupabase } from '../_shared/trainingImages/supabaseDeps.ts';
import { consultarEstadoDaCapa } from '../_shared/trainingImages/estadoCapa.ts';
import {
  chaveEmpresa,
  chaveUsuario,
  envNumero,
  JANELA_QUOTA_SEG,
  LIMITE_EMPRESA_PADRAO,
  LIMITE_USUARIO_PADRAO,
} from '../_shared/trainingImages/quotas.ts';
import type { TrainingContentType } from '../_shared/trainingImages/types.ts';

/** Só estes dois tipos geram imagem; os demais herdam do curso. */
const TIPOS_COM_GERACAO: readonly TrainingContentType[] = ['course', 'learning_path'];
const PAPEIS_AUTORIZADOS = new Set(['admin', 'rh']);

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

interface CorpoGeracao {
  empresa_id: string;
  content_type: TrainingContentType;
  content_id: string;
}

function lerCorpo(body: unknown): CorpoGeracao | null {
  if (!body || typeof body !== 'object') return null;
  const dados = body as Record<string, unknown>;
  const empresaId = String(dados.empresa_id ?? '').trim();
  const contentType = String(dados.content_type ?? '').trim() as TrainingContentType;
  const contentId = String(dados.content_id ?? '').trim();
  if (!isUuid(empresaId) || !isUuid(contentId)) return null;
  if (!TIPOS_COM_GERACAO.includes(contentType)) return null;
  return { empresa_id: empresaId, content_type: contentType, content_id: contentId };
}


/* ─── Portas do pipeline ──────────────────────────────────────────────────── */
// Implementação compartilhada com o worker automático:
// `_shared/trainingImages/supabaseDeps.ts`.

function statusHttpParaResultado(motivo: string): number {
  if (motivo === 'conteudo_inexistente') return 404;
  if (motivo === 'em_processamento') return 202;
  if (motivo === 'ja_processado') return 200;
  if (motivo === 'limite_de_tentativas') return 409;
  // Resultado pago desconhecido: NÃO é retentável automaticamente (custo).
  if (motivo === 'resultado_desconhecido') return 409;
  if (motivo === 'provedor_desativado') return 503;
  return 502;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return json({ error: 'METODO_NAO_PERMITIDO' }, 405, req);
  }

  try {
    const csrf = await verifyCsrf(req.clone());
    if (!csrf.ok) return csrf.response!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'NAO_AUTENTICADO' }, 401, req);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: 'NAO_AUTENTICADO' }, 401, req);

    const { body, errorResponse } = await parseJsonBody(req, 4 * 1024);
    if (errorResponse) return errorResponse;

    const entrada = lerCorpo(body);
    if (!entrada) {
      return createErrorResponse(
        'Informe empresa_id, content_type (course|learning_path) e content_id válidos.',
        422,
        'DADOS_INVALIDOS',
        undefined,
        req
      );
    }

    // ── Integração desligada por padrão: nada é reivindicado, nada é cobrado.
    const apiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
    const habilitado = Deno.env.get('TRAINING_IMAGE_GENERATION_ENABLED') === 'true';
    if (!habilitado || !apiKey) {
      return json(
        {
          ok: false,
          motivo: 'integracao_desativada',
          detalhe: !habilitado ? 'TRAINING_IMAGE_GENERATION_ENABLED ausente' : 'OPENAI_API_KEY ausente',
        },
        503,
        req
      );
    }

    // ── Vínculo real com a empresa (nunca confiar no body).
    const { data: vinculo } = await admin
      .from('user_empresas')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('empresa_id', entrada.empresa_id)
      .maybeSingle();
    if (!vinculo) return json({ error: 'SEM_ACESSO_A_EMPRESA' }, 403, req);

    // ── Papel autorizado a acionar geração paga.
    const { data: papeis } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    const autorizado = ((papeis ?? []) as Array<{ role?: string | null }>).some((linha) =>
      PAPEIS_AUTORIZADOS.has(String(linha?.role ?? ''))
    );
    if (!autorizado) return json({ error: 'SEM_PERMISSAO_PARA_GERAR' }, 403, req);

    // ── Allowlist TEMPORÁRIA de teste: proteção ADICIONAL, server-side.
    //    Aplicada depois de JWT/vínculo/papel e ANTES de idempotência, quota,
    //    claim e provedor. Sem os dois IDs configurados, nada é gerado.
    const allowlist = validarAllowlist(
      { empresaId: entrada.empresa_id, contentId: entrada.content_id },
      {
        empresaId: Deno.env.get('TRAINING_IMAGE_ALLOWED_EMPRESA_ID'),
        contentId: Deno.env.get('TRAINING_IMAGE_ALLOWED_CONTENT_ID'),
      }
    );
    if (!allowlist.ok) {
      return json(
        { ok: false, motivo: allowlist.motivo, detalhe: allowlist.detalhe },
        allowlist.status,
        req
      );
    }

    /**
     * ── IDEMPOTÊNCIA ANTES DA QUOTA (proteção de custo) ────────────────────
     * Mesma decisão usada pelo worker automático (`consultarEstadoDaCapa`):
     * capa concluída, trabalho em andamento, falha definitiva e resultado
     * desconhecido são resolvidos aqui, sem consumir quota e sem chamar o
     * provedor. O hash é o MESMO do pipeline (edição libera nova versão).
     */
    const estado = await consultarEstadoDaCapa(admin, {
      empresaId: entrada.empresa_id,
      contentType: entrada.content_type,
      contentId: entrada.content_id,
    });
    if (!estado) return json({ error: 'CONTEUDO_INEXISTENTE' }, 404, req);

    if (estado.jaConcluida) {
      return json({ ok: true, motivo: 'ja_processado' }, 200, req);
    }
    if (estado.emAndamento) {
      return json({ ok: false, motivo: 'em_processamento' }, 202, req);
    }
    if (estado.incerto) {
      return json(
        {
          ok: false,
          motivo: 'resultado_desconhecido',
          detalhe:
            'A geração anterior pode ter sido concluída e cobrada; reconciliação manual necessária para evitar cobrança duplicada.',
        },
        409,
        req
      );
    }
    if (estado.esgotado) {
      return json({ ok: false, motivo: 'limite_de_tentativas' }, 409, req);
    }

    // ── Rate limit DUPLO (empresa + usuário), atômico e persistente.
    //    Só consome quota quando os DOIS baldes permitem: nenhum usuário
    //    consegue ignorar o teto do tenant trocando de conta, e uma empresa não
    //    consome a quota de outra.
    const rateLimit = await checkRateLimitDuplo(admin, {
      empresaKey: chaveEmpresa(entrada.empresa_id),
      empresaLimit: envNumero('TRAINING_IMAGE_RATE_LIMIT_EMPRESA', LIMITE_EMPRESA_PADRAO),
      usuarioKey: chaveUsuario(user.id),
      usuarioLimit: envNumero('TRAINING_IMAGE_RATE_LIMIT', LIMITE_USUARIO_PADRAO),
      windowSec: JANELA_QUOTA_SEG,
    });
    if (!rateLimit.allowed) return rateLimitDuploResponse(rateLimit);

    const provider = criarOpenAITrainingImageProvider({
      apiKey,
      model: Deno.env.get('TRAINING_IMAGE_MODEL') || OPENAI_MODELO_PADRAO,
      size: Deno.env.get('TRAINING_IMAGE_SIZE') || OPENAI_TAMANHO_PADRAO,
      quality: Deno.env.get('TRAINING_IMAGE_QUALITY') || 'medium',
      timeoutMs: envNumero('TRAINING_IMAGE_TIMEOUT_MS', 90_000),
    });

    const resultado = await gerarCapaDeTreinamento(
      {
        empresaId: entrada.empresa_id,
        contentType: entrada.content_type,
        contentId: entrada.content_id,
      },
      criarDepsSupabase(admin, provider)
    );

    if (resultado.gerado) {
      return json(
        {
          ok: true,
          status: 'succeeded',
          storage_path: resultado.storagePath,
          mime_type: resultado.mimeType,
          provider: resultado.provider,
          model: resultado.model,
        },
        200,
        req
      );
    }

    return json(
      { ok: false, motivo: resultado.motivo, erro: 'erro' in resultado ? resultado.erro : undefined },
      statusHttpParaResultado(resultado.motivo),
      req
    );
  } catch (erro) {
    // Nunca devolver stack/chave ao cliente.
    const mensagem = erro instanceof Error ? erro.message.slice(0, 200) : 'erro_desconhecido';
    return json(
      { error: 'FALHA_INTERNA', detalhe: mensagem.replace(/sk-[A-Za-z0-9-_]{6,}/g, '[redigido]') },
      500,
      req
    );
  }
});
