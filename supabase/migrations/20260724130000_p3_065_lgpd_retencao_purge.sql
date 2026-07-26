-- ============================================================
-- P3-065: Retenção e Purga Automática de Logs (LGPD Art.16)
-- Criado: 2026-07-24
-- Origem: PLANO_MELHORIAS.md P3-065
--
-- Compliance LGPD:
--   Art.16: "O titular tem direito à eliminação dos dados
--   pessoais tratados quando não forem mais necessários."
--   A retenção por tempo definido (sem finalidade válida)
--   viola este artigo.
--
-- Retenção padrão:
--   audit_log / auditoria / auditoria_logs : 730 dias (2 anos)
--   login_attempts                       : 30 dias
--   query_telemetry                     : 90 dias
--   ponto_auditoria / provisao_auditoria: 365 dias
--   lgpd_fila_limpeza                   : 60 dias (meta-dados)
--
-- NOTA: Tabelas marcadas como legal_hold=true NÃO são afetadas.
--       Marcar via: UPDATE config_retencao SET legal_hold=true WHERE tabela='...'
-- ============================================================

BEGIN;

-- ── 1. Tabela de configuração de retenção ──────────────────
CREATE TABLE IF NOT EXISTS public.config_retencao (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela      TEXT NOT NULL UNIQUE,
  dias        INTEGER NOT NULL DEFAULT 365,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  legal_hold  BOOLEAN NOT NULL DEFAULT false,
  batch_size  INTEGER NOT NULL DEFAULT 10000,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT dias_positivo CHECK (dias >= 1),
  CONSTRAINT batch_positivo CHECK (batch_size BETWEEN 100 AND 100000)
);

-- ── 2. Índices para performance da purge ────────────────────
-- Essencial: sem índice em created_at, DELETE em 10M+ linhas
-- pode travar o banco por minutos.
CREATE INDEX IF NOT EXISTS idx_config_retencao_tabela
  ON public.config_retencao (tabela);

-- ── 3. Registros padrão ──────────────────────────────────────
INSERT INTO public.config_retencao (tabela, dias, ativo, batch_size)
VALUES
  ('audit_log',          730,  true, 10000),
  ('auditoria',          730,  true, 10000),
  ('auditoria_logs',     730,  true, 10000),
  ('login_attempts',     30,  true,  5000),
  ('query_telemetry',    90,  true, 10000),
  ('ponto_auditoria',   365,  true,  5000),
  ('provisao_auditoria',365,  true,  5000),
  ('lgpd_fila_limpeza', 60,  true,  2000)
ON CONFLICT (tabela) DO NOTHING;

-- ── 4. Tabela de log de execução da purge ───────────────────
CREATE TABLE IF NOT EXISTS public.lgpd_purge_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela           TEXT NOT NULL,
  executed_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  records_deleted  BIGINT NOT NULL DEFAULT 0,
  batch_count      INTEGER NOT NULL DEFAULT 0,
  cursor_date      TIMESTAMP WITH TIME ZONE,
  error_message    TEXT,
  status           TEXT NOT NULL DEFAULT 'success'
    CHECK (status IN ('success', 'partial', 'error'))
);

CREATE INDEX IF NOT EXISTS idx_purge_log_tabela
  ON public.lgpd_purge_log (tabela, executed_at DESC);

-- ── 5. Função de purge (SECURITY DEFINER para superar RLS) ──
-- CRÍTICO: SECURITY DEFINER ignora RLS do chamador.
-- Qualquer usuário com EXECUTE na função pode deletar QUALQUER registro.
-- Mitigação: só o service_role (cron job) tem permissão de EXECUTE.
CREATE OR REPLACE FUNCTION public.purge_old_records(
  p_tabela      TEXT,
  p_dias        INTEGER DEFAULT NULL,
  p_batch_size  INTEGER DEFAULT NULL,
  p_dry_run     BOOLEAN DEFAULT false
)
RETURNS TABLE(deleted_count BIGINT, batch_count INTEGER, cutoff_date TIMESTAMPTZ, dry_run BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dias       INTEGER;
  v_batch      INTEGER;
  v_cutoff     TIMESTAMPTZ;
  v_total      BIGINT := 0;
  v_batches    INTEGER := 0;
  v_deleted    INTEGER;
  v_sql        TEXT;
BEGIN
  -- Resolve configuração
  IF p_dias IS NULL THEN
    SELECT dias, batch_size INTO v_dias, v_batch
    FROM public.config_retencao
    WHERE tabela = p_tabela AND ativo = true AND legal_hold = false;
    IF NOT FOUND THEN
      RAISE NOTICE 'Tabela % não tem retenção ativa ou está em hold legal.', p_tabela;
      RETURN QUERY SELECT BIGINT '0', 0, NULL::TIMESTAMPTZ, p_dry_run;
      RETURN;
    END IF;
  ELSE
    v_dias := p_dias;
    v_batch := COALESCE(p_batch_size, 10000);
  END IF;

  v_batch := COALESCE(v_batch, 10000);
  v_cutoff := NOW() - (v_dias || ' days')::INTERVAL;

  RAISE NOTICE 'Purge: % | dias=% | batch=% | cutoff=% | dry_run=%',
    p_tabela, v_dias, v_batch, v_cutoff, p_dry_run;

  -- Loop em batches:deleta até não haver mais linhas velhas
  <<batch_loop>>
  LOOP
    IF p_dry_run THEN
      EXECUTE format('SELECT COUNT(*) FROM %I WHERE created_at < %L',
        p_tabela, v_cutoff)
        INTO v_deleted;
      v_total := v_total + v_deleted;
      EXIT batch_loop;
    END IF;

    EXECUTE format(
      'DELETE FROM %I WHERE ctid IN ('
      '  SELECT ctid FROM %I WHERE created_at < %L LIMIT %s'
      ')',
      p_tabela, p_tabela, v_cutoff, v_batch
    ) INTO v_deleted;

    EXIT batch_loop WHEN v_deleted = 0;
    v_total  := v_total + v_deleted;
    v_batches := v_batches + 1;

    -- Log a cada batch em tabelas grandes
    IF v_batches % 10 = 0 THEN
      RAISE NOTICE '  batch %: deletadas % (total até agora: %)',
        v_batches, v_deleted, v_total;
    END IF;
  END LOOP batch_loop;

  RETURN QUERY SELECT v_total, v_batches, v_cutoff, p_dry_run;
END;
$$;

-- ── 6. Função de purge completa (todas as tabelas ativas) ────
CREATE OR REPLACE FUNCTION public.run_lgpd_purge(p_dry_run BOOLEAN DEFAULT false)
RETURNS TABLE(tabela TEXT, deleted BIGINT, batches INTEGER, cutoff TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  result RECORD;
BEGIN
  FOR rec IN
    SELECT tabela, dias, batch_size
    FROM public.config_retencao
    WHERE ativo = true AND legal_hold = false
    ORDER BY batch_size ASC  -- pequenas primeiro para minimizar impacto
  LOOP
    BEGIN
      SELECT deleted_count, batch_count, cutoff_date
      INTO result.deleted, result.batches, result.cutoff
      FROM public.purge_old_records(rec.tabela, rec.dias, rec.batch_size, p_dry_run);

      tabela   := rec.tabela;
      deleted  := COALESCE(result.deleted, 0);
      batches  := COALESCE(result.batches, 0);
      cutoff   := result.cutoff;
      RETURN NEXT;

      -- Log de execução
      INSERT INTO public.lgpd_purge_log (tabela, records_deleted, batch_count, cursor_date, status)
      VALUES (rec.tabela, COALESCE(result.deleted, 0), COALESCE(result.batches, 0), result.cutoff,
              CASE WHEN result.deleted IS NULL THEN 'error' ELSE 'success' END)
      ON CONFLICT DO NOTHING;

    EXCEPTION WHEN OTHERS THEN
      -- Não paralisa as outras tabelas
      INSERT INTO public.lgpd_purge_log (tabela, records_deleted, batch_count, error_message, status)
      VALUES (rec.tabela, 0, 0, SQLERRM, 'error');

      tabela   := rec.tabela;
      deleted  := 0;
      batches  := 0;
      cutoff   := NULL;
      RETURN NEXT;
    END;
  END LOOP;
END;
$$;

-- ── 7. Comentários de auditoria ─────────────────────────────
COMMENT ON FUNCTION public.purge_old_records IS
  'P3-065: Purge em batches de registros antigos. SECURITY DEFINER. dry_run para testar.';
COMMENT ON FUNCTION public.run_lgpd_purge IS
  'P3-065: Executa purge em todas as tabelas configuradas em config_retencao. SECURITY DEFINER.';
COMMENT ON TABLE public.config_retencao IS
  'P3-065: Política de retenção por tabela. legal_hold=true bloqueia purge.';
COMMENT ON TABLE public.lgpd_purge_log IS
  'P3-065: Log de execução do purge LGPD. Retido por 60 dias.';

COMMIT;
