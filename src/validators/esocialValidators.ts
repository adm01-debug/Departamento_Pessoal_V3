/**
 * @fileoverview Barrel re-export — mantém compatibilidade com imports existentes.
 * Canonico: src/schemas/common.ts
 * Módulos esocial: src/validators/esocial/
 */
export * from './esocial';
// Canonical common schemas (duplicated here for backward compat with existing imports)
export { metricasSchema, webhookSchema, healthcheckSchema, cepSchema, cnpjSchema,
  holeriteSchema, calcularFolhaSchema, notificacaoSchema, auditoriaSchema } from '../schemas/common';
