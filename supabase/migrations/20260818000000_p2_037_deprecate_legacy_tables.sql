-- =============================================================================
-- P2-037: Deprecar tabelas legado do schema 003
--
-- Análise: docs/P2-037_TABELAS_DUPLICADAS_ANALISE.md
-- Conclusão: tables `folha_pagamento`, `ferias`, `ponto_registros` do schema 003
-- NUNCA foram populadas pelo app (app nasceu usando schema 20250102+).
--
-- AÇÃO: Rename para _legacy_003 (não DROP) — 30 dias de observação antes de DROP.
-- Para confirmar que estão vazias:
--   SELECT count(*) FROM public.folha_pagamento;   -- deve retornar 0
--   SELECT count(*) FROM public.ferias;             -- verificar
--   SELECT count(*) FROM public.ponto_registros;   -- deve retornar 0
--
-- Após 30 dias sem incidentes, rodar DROP:
--   DROP TABLE IF EXISTS public.folha_pagamento_legacy_003;
--   DROP TABLE IF EXISTS public.ferias_legacy_003;
--   DROP TABLE IF EXISTS public.ponto_registros_legacy_003;
-- =============================================================================

-- Renomear apenas se a tabela ainda existir com o nome legado
-- (pode já ter sido renomeada em produção por outro processo)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'folha_pagamento' AND table_schema = 'public') THEN
    ALTER TABLE public.folha_pagamento RENAME TO folha_pagamento_legacy_003;
    RAISE NOTICE 'Renamed folha_pagamento -> folha_pagamento_legacy_003';
  ELSE
    RAISE NOTICE 'folha_pagamento already renamed or does not exist — skipping.';
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ponto_registros' AND table_schema = 'public') THEN
    ALTER TABLE public.ponto_registros RENAME TO ponto_registros_legacy_003;
    RAISE NOTICE 'Renamed ponto_registros -> ponto_registros_legacy_003';
  ELSE
    RAISE NOTICE 'ponto_registros already renamed or does not exist — skipping.';
  END IF;
END;
$$;

-- ferias (003): manter observação — pode ter dados de transição entre schemas
-- Renomear SOMENTE se confirmada vazia OU após backup
DO $$
DECLARE
  ferias_count BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ferias' AND table_schema = 'public') THEN
    -- Verificar se a coluna empresa_id existe (003) vs data_inicio (20250102)
    -- Se tem empresa_id, é a tabela legado 003
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'ferias' AND column_name = 'empresa_id'
    ) THEN
      SELECT count(*) INTO ferias_count FROM public.ferias;
      RAISE NOTICE 'ferias (003 legacy) has % rows', ferias_count;
      IF ferias_count = 0 THEN
        ALTER TABLE public.ferias RENAME TO ferias_legacy_003;
        RAISE NOTICE 'Renamed ferias -> ferias_legacy_003 (was empty)';
      ELSE
        -- Manter como backup — não renomear automaticamente
        RAISE WARNING 'ferias (003 legacy) has % rows — NOT renamed automatically. Review before renaming.';
      END IF;
    ELSE
      RAISE NOTICE 'ferias is the modern table (20250102+ schema) — skipping rename.';
    END IF;
  ELSE
    RAISE NOTICE 'ferias does not exist or already renamed — skipping.';
  END IF;
END;
$$;

COMMENT ON TABLE public.folha_pagamento_legacy_003 IS
  'P2-037: Legado schema 003 — não é mais usada pelo app desde 2025. Aguardando DROP após 30d.';
COMMENT ON TABLE public.ponto_registros_legacy_003 IS
  'P2-037: Legado schema 003 — não é mais usada pelo app desde 2025. Aguardando DROP após 30d.';
COMMENT ON TABLE public.ferias_legacy_003 IS
  'P2-037: Legado schema 003 — só renomeada se confirmada vazia. Aguardando DROP após 30d.';
