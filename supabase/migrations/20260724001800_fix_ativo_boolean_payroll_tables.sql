-- Issue 46: Adiciona coluna ativo BOOLEAN às tabelas de rubricas de folha.
--
-- Os stubs 2025122813133806_*, 2025122813133907_*, 2025122813133908_*,
-- 2025122813134009_* e 2025122813134010_* criaram atrasos, adicionais,
-- gratificacoes, comissoes e pensoes com status VARCHAR(50) DEFAULT 'ativo'
-- em vez de ativo BOOLEAN DEFAULT true (schema correto, conforme proper
-- migrations 20251228131621_* a 20251228131625_*).
--
-- As proper migrations foram NO-OPs (tabelas já existiam pelo stub).
-- Qualquer código que filtre .eq('ativo', true) retorna zero linhas —
-- a coluna não existe, o PostgREST retorna 400 para a query.
--
-- Estratégia de backfill segura:
--   - status = 'inativo' → ativo = false
--   - qualquer outro valor (incluindo 'ativo', NULL) → ativo = true
-- O valor DEFAULT true garante que novas linhas fiquem ativas por padrão,
-- igual ao schema pretendido.

DO $$
DECLARE
  t_name TEXT;
BEGIN
  FOR t_name IN SELECT unnest(ARRAY[
    'atrasos', 'adicionais', 'gratificacoes', 'comissoes', 'pensoes'
  ]) LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t_name
    ) THEN
      -- Adiciona coluna se ainda não existe
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = t_name
          AND column_name = 'ativo'
      ) THEN
        EXECUTE format(
          'ALTER TABLE public.%I ADD COLUMN ativo BOOLEAN DEFAULT true',
          t_name
        );

        -- Backfill: registros marcados explicitamente como inativo → false
        EXECUTE format(
          'UPDATE public.%I SET ativo = false WHERE status = %L',
          t_name, 'inativo'
        );

        -- Índice composto empresa + ativo para queries de listagem ativa por empresa
        EXECUTE format(
          'CREATE INDEX IF NOT EXISTS %I ON public.%I (empresa_id, ativo)',
          'idx_' || t_name || '_empresa_ativo',
          t_name
        );
      END IF;
    END IF;
  END LOOP;
END $$;
