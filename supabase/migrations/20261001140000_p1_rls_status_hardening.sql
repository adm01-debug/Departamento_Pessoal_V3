-- p1 — hardening de RLS em tabelas internas + domínio de status (auditoria 10/10)
--
-- Escopo:
--   1) Habilita RLS nas 5 tabelas internas identificadas na auditoria sem
--      `ENABLE ROW LEVEL SECURITY` em nenhuma migration/baseline.
--      São tabelas de uso interno (service role / funções SECURITY DEFINER),
--      portanto o único acesso liberado é SELECT para admin — service_role
--      segue bypassando RLS normalmente.
--   2) CHECK de domínio nas colunas de status das entidades centrais, com
--      NOT VALID: válido apenas para escritas novas, sem falhar em dados
--      legados que possam divergir (validação posterior via VALIDATE
--      CONSTRAINT quando o estado canônico estiver confirmado limpo).

BEGIN;

-- ─── 1) Tabelas internas: RLS deny-by-default + leitura apenas para admin ────
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'config_retencao',
    'lgpd_purge_log',
    'migration_naming_audit',
    'mv_refresh_log'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t AND policyname = 'admin_select_' || t
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''::public.app_role))',
          'admin_select_' || t, t
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- feriados_brasileiros é dado de referência (domínio): leitura para autenticados,
-- sem escrita fora de service_role.
DO $$
BEGIN
  IF to_regclass('public.feriados_brasileiros') IS NOT NULL THEN
    ALTER TABLE public.feriados_brasileiros ENABLE ROW LEVEL SECURITY;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'feriados_brasileiros'
        AND policyname = 'authenticated_read_feriados_brasileiros'
    ) THEN
      CREATE POLICY authenticated_read_feriados_brasileiros
        ON public.feriados_brasileiros FOR SELECT TO authenticated USING (true);
    END IF;
  END IF;
END $$;

-- ─── 2) CHECK de domínio em status (NOT VALID — enforce apenas em novas writes)
DO $$
BEGIN
  IF to_regclass('public.folha_pagamento') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'folha_pagamento_status_check') THEN
    ALTER TABLE public.folha_pagamento
      ADD CONSTRAINT folha_pagamento_status_check
      CHECK (status IN (
        'aberta', 'calculada', 'fechada', 'paga',
        'processando', 'reaberta', 'cancelada', 'enviado', 'ativo'
      )) NOT VALID;
  END IF;

  IF to_regclass('public.ferias') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ferias_status_check') THEN
    ALTER TABLE public.ferias
      ADD CONSTRAINT ferias_status_check
      CHECK (status IN (
        'pendente', 'solicitada', 'programada', 'aprovada', 'aprovado',
        'rejeitada', 'em_gozo', 'gozando', 'em_andamento',
        'concluida', 'vencida', 'cancelada', 'paga'
      )) NOT VALID;
  END IF;
END $$;

COMMIT;
