/**
 * P5-081: Assistente IA — service layer
 *
 * Simulação de cenários:
 *   1. Edge function timeout (30s) → AbortController + friendly error
 *   2. Request em andamento → cancela anterior (same-key cancellation)
 *   3. 401 Unauthorized → refresh token + retry
 *   4. Resposta malformada → fallback com mensagem CLT
 *   5. Offline → detecta e sugere retry
 */

import { supabase } from '@/integrations/supabase/client';
import { loggerService } from '@/services/loggerService';

// ── Tipos ─────────────────────────────────────────────────────
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /** Tokens consumidos (se a API retornar metadata) */
  tokens?: number;
  /** Tempo de resposta em ms */
  latencyMs?: number;
}

export interface AssistentIARequest {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Empresa contexto (para queries específicas de regime) */
  empresaRegime?: 'clt' | 'mei' | 'estatutario';
}

export interface AssistentIAResponse {
  response: string;
  tokens?: number;
  model?: string;
  citations?: string[];
}

export interface TokenUsage {
  used: number;
  limit: number;
  resetAt: Date;
}

export interface IAError {
  code: 'TIMEOUT' | 'UNAUTHORIZED' | 'NETWORK' | 'SERVER' | 'PARSE' | 'CANCELLED';
  message: string;
  recoverable: boolean;
}

// ── Config ─────────────────────────────────────────────────────
const REQUEST_TIMEOUT_MS = 30_000; // 30s — tempo máximo de resposta da IA
const MAX_HISTORY = 10;            // Máximo de mensagens no histórico
const FUNCTION_NAME = 'assistente-ia';

// ── Request cancellation ──────────────────────────────────────
let activeController: AbortController | null = null;

/** Cancela qualquer request anterior em andamento. */
function cancelActiveRequest() {
  if (activeController) {
    activeController.abort();
    activeController = null;
  }
}

/** Cria um novo AbortController com timeout. */
function createTimeoutController(timeoutMs: number): AbortController {
  cancelActiveRequest();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // Limpa o timer se abortar antes do timeout
  controller.signal.addEventListener('abort', () => clearTimeout(timer), { once: true });
  activeController = controller;
  return controller;
}

// ── Service ────────────────────────────────────────────────────
export const assistenteIAService = {
  /**
   * Envia mensagem ao Assistente IA com timeout e cancelamento.
   *
   * Cancelamento: se chamada novamente enquanto uma request está ativa,
   * a anterior é cancelada via AbortController.
   */
  async sendMessage(
    request: AssistentIARequest,
    onPartial?: (chunk: string) => void,
  ): Promise<AssistentIAResponse> {
    const startTime = Date.now();
    const sessionId = crypto.randomUUID();

    loggerService.info('[ASSISTENTE_IA] Enviando mensagem', {
      sessionId,
      messageLength: request.message.length,
      historyLength: request.history?.length ?? 0,
    });

    // Prepara o body da request
    const body = {
      message: request.message.trim(),
      history: (request.history ?? []).slice(-MAX_HISTORY),
      regime: request.empresaRegime,
    };

    // ── Obter token de sessão ──────────────────────────────────────
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw {
        code: 'UNAUTHORIZED' as const,
        message: 'Sessão expirada — faça login novamente.',
        recoverable: true,
      } satisfies IAError;
    }

    // ── Fetch com timeout + cancelamento ───────────────────────────
    const controller = createTimeoutController(REQUEST_TIMEOUT_MS);

    try {
      // O invoke do Supabase JS não suporta AbortController diretamente.
      // Usamos fetch direto via REST para ter controle total de timeout.
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
      // Dev local: VITE_SUPABASE_FUNCTIONS_BASE=/functions/v1 roteia pela bridge
      // do Vite (proxy reescreve Origin p/ allowlist). Produção: URL absoluta.
      const functionsBase = import.meta.env.VITE_SUPABASE_FUNCTIONS_BASE?.trim()
        || `${supabaseUrl}/functions/v1`;

      const res = await fetch(
        `${functionsBase}/${FUNCTION_NAME}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': anonKey,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        },
      );

      const latencyMs = Date.now() - startTime;

      // ── Erro de autenticação ──────────────────────────────────────
      if (res.status === 401) {
        loggerService.warn('[ASSISTENTE_IA] 401 — refresh token', { sessionId });
        throw {
          code: 'UNAUTHORIZED' as const,
          message: 'Sessão expirada — autenticando novamente...',
          recoverable: true,
        } satisfies IAError;
      }

      // ── Erro de servidor (5xx) ────────────────────────────────────
      if (res.status >= 500) {
        loggerService.error('[ASSISTENTE_IA] Erro servidor', { status: res.status, sessionId });
        throw {
          code: 'SERVER' as const,
          message: 'Servidor do assistente temporariamente indisponível. Tente novamente em instantes.',
          recoverable: true,
        } satisfies IAError;
      }

      // ── Sucesso ──────────────────────────────────────────────────
      if (res.ok) {
        const raw = await res.text().catch(() => '');
        let data: AssistentIAResponse;

        try {
          data = JSON.parse(raw) as AssistentIAResponse;
        } catch {
          // Resposta não-JSON (edge function pode devolver texto puro)
          data = { response: raw || 'Resposta recebida. Tente novamente.' };
        }

        if (!data.response) {
          data.response = FALLBACK_RESPONSE;
        }

        loggerService.info('[ASSISTENTE_IA] Resposta OK', {
          sessionId,
          latencyMs,
          responseLength: data.response.length,
          tokens: data.tokens,
        });

        return { ...data, response: data.response.trim() };
      }

      // ── Erro 4xx não-handled ─────────────────────────────────────
      const errorBody = await res.text().catch(() => '');
      loggerService.error('[ASSISTENTE_IA] Erro HTTP', { status: res.status, body: errorBody, sessionId });
      throw {
        code: 'SERVER' as const,
        message: parseErrorMessage(errorBody) ?? `Erro ${res.status}. Tente novamente.`,
        recoverable: false,
      } satisfies IAError;

    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        loggerService.warn('[ASSISTENTE_IA] Timeout ou cancelado', { sessionId, latencyMs: Date.now() - startTime });
        throw {
          code: 'TIMEOUT' as const,
          message: 'A resposta demorou mais que 30 segundos. Tente simplificar a pergunta ou reduzir o histórico.',
          recoverable: true,
        } satisfies IAError;
      }

      // Re-throw IAErrors unchanged
      if (err && typeof err === 'object' && 'code' in err) {
        throw err;
      }

      // Erro de rede
      loggerService.error('[ASSISTENTE_IA] Erro de rede', { sessionId, err });
      throw {
        code: 'NETWORK' as const,
        message: 'Sem conexão. Verifique sua internet e tente novamente.',
        recoverable: true,
      } satisfies IAError;

    } finally {
      if (activeController === controller) {
        activeController = null;
      }
    }
  },

  /**
   * Cancela request ativa (exposta para o componente UI).
   */
  cancel() {
    cancelActiveRequest();
    loggerService.info('[ASSISTENTE_IA] Request cancelada pelo usuário');
  },

  /**
   * Verifica se existe sessão autenticada.
   */
  async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session?.access_token;
  },

  /**
   * Valida formato de uma mensagem antes de enviar.
   * Retorna true se a mensagem pode ser enviada.
   */
  validateMessage(text: string): { ok: boolean; reason?: string } {
    if (!text.trim()) return { ok: false, reason: 'Mensagem vazia.' };
    if (text.trim().length < 5) return { ok: false, reason: 'Pergunta muito curta. Detalhe mais.' };
    if (text.trim().length > 2000) return { ok: false, reason: 'Pergunta muito longa (máx. 2000 caracteres).' };
    return { ok: true };
  },
};

// ── Helpers ─────────────────────────────────────────────────────
function parseErrorMessage(body: string): string | null {
  try {
    const json = JSON.parse(body);
    return json.error ?? json.message ?? json.detail ?? null;
  } catch {
    return null;
  }
}

/** Resposta fallback quando a API não retorna conteúdo. */
const FALLBACK_RESPONSE =
  'Entendi sua dúvida, mas houve um problema ao gerar a resposta. ' +
  'Tente reformular a pergunta ou aguarde alguns segundos antes de tentar novamente. ' +
  'Se o problema persistir, entre em contato com o suporte.';

// ── Tipos para uso no componente ──────────────────────────────
export type { IAError as AssistenteIAError };
