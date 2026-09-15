/**
 * @fileoverview Schemas canônicos para Edge Functions e bridge.
 * CANONICO: src/schemas/common.ts
 *
 * ATENÇÃO: ao editar este arquivo, sincronize com src/schemas/common.ts.
 * Deno não pode importar diretamente do src/ (formato diferente de módulo).
 * Manter manualmente em sincronia — usar grep para comparar periodicamente:
 *   diff <(grep -v 'deno.land' src/schemas/common.ts) <(grep -v 'deno.land' supabase/functions/_shared/schemas/common.ts)
 *
 * Zod versão Deno: 3.23.8 (pinned para consistência)
 */
import { z } from 'https://deno.land/x/zod@v3.23.8/mod.ts';

export const metricasSchema = z.object({
  empresaId: z.string().uuid('ID da empresa deve ser um UUID válido'),
});

export const webhookSchema = z.object({
  event_id: z.string().min(1, 'event_id é obrigatório para idempotência').max(128),
  event: z.string().min(1, 'Evento é obrigatório').max(128),
  data: z.record(z.any()),
  timestamp: z.string().datetime().optional(),
  version: z.string().optional().default('v1'),
}).strict();

export const healthcheckSchema = z.object({}).strict();

export const cepSchema = z.object({
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP deve ter 8 dígitos (pode conter hífen)'),
});

export const cnpjSchema = z.object({
  cnpj: z.string().regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, 'CNPJ inválido'),
});

export const holeriteSchema = z.object({
  colaboradorId: z.string().uuid('ID do colaborador deve ser um UUID válido'),
  competencia: z.string()
    .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/, 'Competência deve estar no formato AAAA-MM')
    .refine((value) => value.startsWith('2025-') || value.startsWith('2026-'), {
      message: 'Tabela INSS homologada somente para competências de 2025 e 2026',
    }),
});

export const calcularFolhaSchema = z.object({
  empresa_id: z.string().uuid('ID da empresa inválido'),
  competencia: z.string().regex(/^\d{4}-\d{2}$/, 'Formato de competência inválido (AAAA-MM)'),
});

export const notificacaoSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('enviar'),
    empresaId: z.string().uuid(),
    tipo: z.enum(['info', 'aviso', 'erro', 'sucesso']).default('info'),
    destinatarios: z.array(
      z.object({ user_id: z.string().uuid() }).strict()
    ).min(1).max(500),
    assunto: z.string().trim().min(1).max(200),
    conteudo: z.string().trim().min(1).max(5000),
  }).strict(),
  z.object({
    action: z.literal('listar'),
    empresaId: z.string().uuid().optional(),
  }).strict(),
]);

export const auditoriaSchema = z.object({
  action: z.enum(['registrar', 'listar', 'resumo']),
  empresaId: z.string().uuid().optional(),
  data: z.object({
    acao: z.string(),
    entidade: z.string(),
    entidade_id: z.string().optional(),
    usuario_id: z.string().optional(),
    usuario_nome: z.string().optional(),
    descricao: z.string().optional(),
    dados_anteriores: z.any().optional(),
    dados_novos: z.any().optional(),
    ip_address: z.string().ip().optional(),
    data_inicio: z.string().datetime().optional(),
    data_fim: z.string().datetime().optional(),
  }).optional(),
}).strict();
