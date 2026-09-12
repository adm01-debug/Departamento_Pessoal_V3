import { supabase } from '@/integrations/supabase/client';
import { loggerService } from '@/services/loggerService';
import type { Json } from '@/integrations/supabase/types';

const PII_FIELDS = new Set([
  'cpf',
  'pis',
  'rg',
  'senha',
  'password',
  'hash',
  'token',
  'conta_bancaria',
  'conta',
  'agencia',
  'numero_conta',
  'banco_agencia',
  'banco_conta',
  'chave_pix',
  'data_nascimento',
  'nascimento',
]);

const PII_FIELD_PATTERNS = [
  /^cpf$/i,
  /^pis$/i,
  /^rg$/i,
  /senha/i,
  /password/i,
  /conta.?bancaria/i,
  /\bconta\b/i,
  /\bagencia\b/i,
  /chave.?pix/i,
  /data.?nasc/i,
  /^hash/i,
  /^token/i,
];

function isPiiField(key: string): boolean {
  if (PII_FIELDS.has(key.toLowerCase())) return true;
  return PII_FIELD_PATTERNS.some((p) => p.test(key));
}

function maskValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) return value;
  const k = key.toLowerCase();
  if (/cpf/.test(k)) return '***.***.***-**';
  if (/pis/.test(k)) return '***.*****.***-*';
  if (/^rg/.test(k)) return '**.***.***-*';
  if (/conta|agencia|chave.?pix/.test(k)) {
    const s = String(value);
    return s.length > 4 ? '*'.repeat(s.length - 4) + s.slice(-4) : '****';
  }
  return '[MASKED]';
}

function maskPii(obj: unknown, depth = 0): unknown {
  if (depth > 8) return obj;
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((item) => maskPii(item, depth + 1));
  if (typeof obj !== 'object') return obj;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    result[k] = isPiiField(k) ? maskValue(k, v) : maskPii(v, depth + 1);
  }
  return result;
}

export const auditLogger = {
  async log(params: {
    tabela: string;
    registro_id: string;
    acao: 'INSERT' | 'UPDATE' | 'DELETE' | 'EXECUTE_CALC' | 'SIGN';
    dados_anteriores?: any;
    dados_novos?: any;
    empresa_id?: string;
  }) {
    try {
      const maskedPrevious = params.dados_anteriores ? maskPii(params.dados_anteriores) : null;
      const maskedNext = params.dados_novos ? maskPii(params.dados_novos) : null;
      const inferEmpresaId = (value: unknown): string | undefined => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
        const candidate = (value as Record<string, unknown>).empresa_id;
        return typeof candidate === 'string' && candidate.length > 0 ? candidate : undefined;
      };
      const empresaId =
        params.empresa_id ?? inferEmpresaId(params.dados_novos) ?? inferEmpresaId(params.dados_anteriores);

      // A RPC deriva user_id de auth.uid(), valida o tenant e grava na tabela
      // append-only. O cliente nunca controla autoria, e-mail ou timestamps.
      const { error } = await supabase.rpc('registrar_auditoria', {
        p_tabela: params.tabela,
        p_registro_id: params.registro_id,
        p_acao: params.acao,
        p_dados_anteriores: maskedPrevious as Json,
        p_dados_novos: maskedNext as Json,
        p_empresa_id: empresaId ?? null,
      });
      if (error) {
        loggerService.error(
          'Audit log error',
          { tabela: params.tabela, registro_id: params.registro_id },
          new Error(error.message)
        );
      }
    } catch (e) {
      loggerService.error(
        'Audit log exception',
        { tabela: params.tabela, registro_id: params.registro_id },
        e instanceof Error ? e : undefined
      );
    }
  },
};
