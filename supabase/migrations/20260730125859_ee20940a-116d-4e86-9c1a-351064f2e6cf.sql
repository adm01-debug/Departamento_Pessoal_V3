-- =====================================================================
-- FIX: sst_regimento_assinar() quebraria em runtime
--
-- A função é SECURITY DEFINER com `SET search_path = public` (correto do
-- ponto de vista de segurança: impede sequestro de search_path). Porém ela
-- chama digest() do pgcrypto, que vive no schema `extensions`. Com o
-- search_path fixado apenas em `public`, a resolução do nome falha:
--   ERROR: function digest(text, unknown) does not exist
--
-- Correção: adicionar `extensions` ao search_path fixado. Continua sendo um
-- search_path explícito e imutável — a propriedade de segurança é mantida.
-- Detectada pelo gate de CI scripts/audit-db-search-path.mjs.
-- =====================================================================

ALTER FUNCTION public.sst_regimento_assinar(uuid, uuid, text, text)
  SET search_path = public, extensions;