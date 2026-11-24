-- Migration: planos_saude.updated_at ausente no canonical DB
-- O trigger update_planos_saude_updated_at (BEFORE UPDATE → update_updated_at_column())
-- faz NEW.updated_at = NOW(), mas a tabela criada em 20260306005302 não tem a coluna:
-- todo UPDATE em planos_saude falha com 'record "new" has no field "updated_at"'.
-- Idempotente: ADD COLUMN IF NOT EXISTS. Preflight fail-closed: aborta se a tabela
-- ou o trigger não existirem (alvo errado / estado divergente do esperado).

-- ============================================================
-- 0. Preflight
-- ============================================================
DO $preflight$
BEGIN
  IF to_regclass('public.planos_saude') IS NULL THEN
    RAISE EXCEPTION 'preflight: tabela public.planos_saude não existe';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    WHERE t.tgrelid = 'public.planos_saude'::regclass
      AND t.tgname = 'update_planos_saude_updated_at'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'preflight: trigger update_planos_saude_updated_at não existe em public.planos_saude';
  END IF;
END
$preflight$;

-- ============================================================
-- 1. Coluna exigida pelo trigger
-- ============================================================
ALTER TABLE public.planos_saude
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
