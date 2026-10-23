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
 *   5. Rate limit por usuário (proteção de custo).
 *   6. Pipeline: carrega o cadastro escopado, reconstrói briefing, faz o claim
 *      atômico, chama o provedor, valida, sobe no bucket privado e atualiza
 *      `training_images` para `succeeded` (ou `failed`, sem loop).
 *   7. Turmas e certificados NÃO geram: herdam a imagem do curso.
 *
 * NÃO usa `waitUntil` para “deixar rodando”: o estado do trabalho vive na
 * tabela e a resposta só sai depois de concluído/recusado.
 * ============================================================================
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { createErrorResponse, getCorsHeaders, handlePreflight, parseJsonBody } from '../_shared/contract.ts';
import { verifyCsrf } from '../_shared/csrf.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { gerarCapaDeTreinamento, type DepsPipelineCapa } from '../_shared/trainingImages/pipeline.ts';
import {
  criarOpenAITrainingImageProvider,
  OPENAI_MODELO_PADRAO,
  OPENAI_TAMANHO_PADRAO,
} from '../_shared/trainingImages/openaiProvider.ts';
import { montarCaminhoImagem, TRAINING_IMAGES_BUCKET } from '../_shared/trainingImages/storagePath.ts';
import type {
  ClaimTrainingImageResult,
  ConteudoTreinamento,
  TrainingContentType,
} from '../_shared/trainingImages/types.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
/** Só estes dois tipos geram imagem; os demais herdam do curso. */
const TIPOS_COM_GERACAO: readonly TrainingContentType[] = ['course', 'learning_path'];
const PAPEIS_AUTORIZADOS = new Set(['admin', 'rh']);
const RATE_LIMIT_PADRAO = 5;
const JANELA_RATE_LIMIT_SEG = 60 * 60;

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

function envNumero(nome: string, padrao: number): number {
  const valor = Number(Deno.env.get(nome));
  return Number.isFinite(valor) && valor > 0 ? valor : padrao;
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
  if (!UUID_RE.test(empresaId) || !UUID_RE.test(contentId)) return null;
  if (!TIPOS_COM_GERACAO.includes(contentType)) return null;
  return { empresa_id: empresaId, content_type: contentType, content_id: contentId };
}


/* ─── Portas do pipeline (Supabase, service role) ─────────────────────────── */

type Admin = ReturnType<typeof createClient>;

async function carregarConteudo(admin: Admin, entrada: {
  empresaId: string;
  contentType: TrainingContentType;
  contentId: string;
}): Promise<ConteudoTreinamento | null> {
  if (entrada.contentType === 'course') {
    const { data } = await admin
      .from('catalogo_cursos')
      .select('id, nome, descricao, categoria, modalidade, carga_horaria, obrigatorio, empresa_id')
      .eq('id', entrada.contentId)
      .eq('empresa_id', entrada.empresaId)
      .maybeSingle();
    if (!data) return null;
    return {
      contentType: 'course',
      contentId: String(data.id),
      empresaId: String(data.empresa_id),
      name: String(data.nome ?? ''),
      description: data.descricao ?? null,
      category: data.categoria ?? null,
      modality: data.modalidade ?? null,
      workloadHours: data.carga_horaria ?? null,
      mandatory: data.obrigatorio ?? null,
    };
  }

  if (entrada.contentType === 'learning_path') {
    // Somente colunas existentes: `trilhas_aprendizado` tem `nome` (não
    // `titulo` no schema gerado). Selecionar coluna inexistente derrubaria a
    // consulta inteira.
    const { data } = await admin
      .from('trilhas_aprendizado')
      .select('id, nome, descricao, nivel, empresa_id')
      .eq('id', entrada.contentId)
      .eq('empresa_id', entrada.empresaId)
      .maybeSingle();
    if (!data) return null;

    const { data: vinculos } = await admin
      .from('trilhas_cursos')
      .select('ordem, curso:catalogo_cursos(nome)')
      .eq('trilha_id', entrada.contentId)
      .order('ordem', { ascending: true });

    const nomes = ((vinculos ?? []) as Array<{ curso?: { nome?: string | null } | null }>)
      .map((vinculo) => String(vinculo?.curso?.nome ?? '').trim())
      .filter(Boolean);

    return {
      contentType: 'learning_path',
      contentId: String(data.id),
      empresaId: String(data.empresa_id),
      name: String(data.nome ?? ''),
      description: data.descricao ?? null,
      level: data.nivel ?? null,
      linkedCourseNames: nomes,
    };
  }

  // Defesa: a função nunca gera para turma/certificado.
  return null;
}

async function reivindicarTrabalho(admin: Admin, dados: {
  empresaId: string;
  contentType: TrainingContentType;
  contentId: string;
  contentHash: string;
  promptVersion: string;
  maxAttempts: number;
}): Promise<ClaimTrainingImageResult> {
  const { data, error } = await admin.rpc('claim_training_image', {
    p_empresa_id: dados.empresaId,

function depsDoPipeline(admin: Admin, provider: DepsPipelineCapa['provider']): DepsPipelineCapa {
  return {
    provider,
    carregarConteudo: (entrada) => carregarConteudo(admin, entrada),
    claim: (dados) => reivindicarTrabalho(admin, dados),

    async enviarImagem({ empresaId, contentType, contentId, bytes, mimeType, extensao }) {
      const caminho = montarCaminhoImagem({ empresaId, contentType, contentId, extensao });
      const { error } = await admin.storage.from(TRAINING_IMAGES_BUCKET).upload(caminho, bytes, {
        contentType: mimeType,
        upsert: true,
      });
      if (error) throw error;
      return caminho;
    },

    async atualizarSucesso({ id, storagePath, provider: providerId, model, promptVersion }) {
      const { error } = await admin
        .from('training_images')
        .update({
          status: 'succeeded',
          storage_path: storagePath,
          provider: providerId,
          model,
          prompt_version: promptVersion,
          completed_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', id);
      if (error) throw error;
    },

    async atualizarFalha({ id, erro, permanente }) {
      const { error } = await admin
        .from('training_images')
        .update({
          status: 'failed',
          last_error: erro,
          completed_at: new Date().toISOString(),
          provider: provider.id,
          // Erro permanente esgota as tentativas: repetir não resolveria.
          ...(permanente ? { attempts: 3 } : {}),
        })
        .eq('id', id);
      if (error) throw error;
    },
  };
}

function statusHttpParaResultado(motivo: string): number {
  if (motivo === 'conteudo_inexistente') return 404;
  if (motivo === 'em_processamento') return 202;

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

    // ── Rate limit por usuário (custo).
    const rateLimit = await checkRateLimit(admin, {
      key: `training-image-generate:${user.id}`,
      limit: envNumero('TRAINING_IMAGE_RATE_LIMIT', RATE_LIMIT_PADRAO),
      windowSec: JANELA_RATE_LIMIT_SEG,
    });
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

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
      depsDoPipeline(admin, provider)
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

  if (motivo === 'ja_processado') return 200;
  if (motivo === 'limite_de_tentativas') return 409;
  if (motivo === 'provedor_desativado') return 503;
  return 502;
}

    p_content_type: dados.contentType,
    p_content_id: dados.contentId,
    p_content_hash: dados.contentHash,
    p_prompt_version: dados.promptVersion,
    p_max_attempts: dados.maxAttempts,
  });
  if (error) throw error;
  const linha = Array.isArray(data) ? data[0] : data;
  return {
    reclamado: Boolean(linha?.reclamado),
    id: linha?.id ?? null,
    status: linha?.status ?? null,
    attempts: linha?.attempts ?? null,
  };
}
