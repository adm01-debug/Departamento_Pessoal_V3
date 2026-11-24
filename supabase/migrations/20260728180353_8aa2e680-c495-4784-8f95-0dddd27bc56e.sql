-- =============================================================================
-- LGPD: expurgo de logs e drenagem da fila de anonimização
-- =============================================================================
-- supabase/functions/limpeza/index.ts chamava `run_lgpd_purge` e
-- `drenar_fila_limpeza_lgpd` — ambas INEXISTENTES. Além disso a função
-- `process_lgpd_cleanup_queue` referenciava colunas que não existem em
-- public.lgpd_fila_limpeza (status/processado_em/data_prevista_limpeza, quando
-- as reais são executado/processed_at/data_programada), falhando em runtime.

-- ---------------------------------------------------------------------------
-- 1) Política de retenção de logs (dirigida por dados, não hardcoded)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lgpd_retencao_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela       text        NOT NULL UNIQUE,
  coluna_data  text        NOT NULL,
  dias         integer     NOT NULL CHECK (dias >= 1),
  ativo        boolean     NOT NULL DEFAULT true,
  observacao   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lgpd_retencao_logs TO authenticated;
GRANT ALL    ON public.lgpd_retencao_logs TO service_role;

ALTER TABLE public.lgpd_retencao_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins gerenciam retencao de logs" ON public.lgpd_retencao_logs;
CREATE POLICY "Admins gerenciam retencao de logs"
  ON public.lgpd_retencao_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_lgpd_retencao_logs_updated_at ON public.lgpd_retencao_logs;
CREATE TRIGGER trg_lgpd_retencao_logs_updated_at
  BEFORE UPDATE ON public.lgpd_retencao_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.lgpd_retencao_logs (tabela, coluna_data, dias, observacao) VALUES
  ('query_telemetry',          'created_at',  90,  'Telemetria de queries'),
  ('login_attempts',           'created_at',  30,  'Tentativas de login'),
  ('login_rate_limits',        'created_at',   7,  'Contadores de rate limit de login'),
  ('rate_limit_logs',          'created_at',   7,  'Logs de rate limit'),
  ('geo_blocked_attempts',     'created_at',  90,  'Bloqueios geográficos'),
  ('audit_log',                'created_at', 730,  'Auditoria legada'),
  ('audit_log_unified',        'occurred_at',730,  'Auditoria unificada'),
  ('audit_logs',               'created_at', 730,  'Auditoria legada'),
  ('auditoria_logs',           'created_at', 730,  'Auditoria legada'),
  ('logs_sistema',             'created_at', 180,  'Logs de sistema'),
  ('integracao_logs',          'created_at', 180,  'Logs de integração'),
  ('logs_integracoes',         'created_at', 180,  'Logs de integração'),
  ('automacao_logs',           'created_at', 180,  'Logs de automação'),
  ('bitrix24_sync_logs',       'created_at', 180,  'Sincronização Bitrix24'),
  ('esocial_transmissao_logs', 'created_at', 730,  'Transmissões eSocial'),
  ('conformidade_ponto_logs',  'timestamp',  730,  'Conformidade de ponto (Portaria 671)')
ON CONFLICT (tabela) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Expurgo em lotes (contrato: TABLE(tabela, deleted, batches))
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_lgpd_purge(p_dry_run boolean DEFAULT false)
RETURNS TABLE(tabela text, deleted integer, batches integer)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  p            record;
  v_batch      constant integer := 5000;
  v_max_batch  constant integer := 40;     -- teto por execução: evita lock longo
  v_deleted    integer;
  v_total      integer;
  v_batches    integer;
BEGIN
  FOR p IN
    SELECT r.tabela AS t, r.coluna_data AS c, r.dias AS d
      FROM public.lgpd_retencao_logs r
     WHERE r.ativo
     ORDER BY r.tabela
  LOOP
    -- Defesa contra config inválida/injeção: a tabela e a coluna precisam
    -- existir de fato no schema public antes de entrar em qualquer format().
    CONTINUE WHEN to_regclass('public.' || quote_ident(p.t)) IS NULL;
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = p.t AND column_name = p.c
    );

    v_total := 0;
    v_batches := 0;

    IF p_dry_run THEN
      EXECUTE format(
        'SELECT count(*)::integer FROM public.%I WHERE %I < now() - ($1 || '' days'')::interval',
        p.t, p.c
      ) INTO v_total USING p.d;
    ELSE
      LOOP
        EXIT WHEN v_batches >= v_max_batch;
        EXECUTE format(
          'WITH vitimas AS (
             SELECT ctid FROM public.%I
              WHERE %I < now() - ($1 || '' days'')::interval
              LIMIT %s
           )
           DELETE FROM public.%I x USING vitimas v WHERE x.ctid = v.ctid',
          p.t, p.c, v_batch, p.t
        ) USING p.d;
        GET DIAGNOSTICS v_deleted = ROW_COUNT;
        v_total   := v_total + v_deleted;
        v_batches := v_batches + 1;
        EXIT WHEN v_deleted < v_batch;
      END LOOP;
    END IF;

    tabela  := p.t;
    deleted := v_total;
    batches := v_batches;
    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.run_lgpd_purge(boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_lgpd_purge(boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_lgpd_purge(boolean) TO service_role;

-- ---------------------------------------------------------------------------
-- 3) Drenagem da fila de anonimização
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.drenar_fila_limpeza_lgpd(p_limite integer DEFAULT 200)
RETURNS TABLE(id uuid, tabela text, registro_id uuid, sucesso boolean, erro text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT f.id, f.tabela, f.registro_id, f.dry_run
      FROM public.lgpd_fila_limpeza f
     WHERE f.executado = false
       AND f.data_programada <= current_date
     ORDER BY f.data_programada
     LIMIT GREATEST(COALESCE(p_limite, 200), 1)
     FOR UPDATE SKIP LOCKED
  LOOP
    id          := item.id;
    tabela      := item.tabela;
    registro_id := item.registro_id;
    erro        := NULL;

    BEGIN
      IF item.dry_run THEN
        sucesso := true;   -- simulação: não toca no dado, não marca executado
        RETURN NEXT;
        CONTINUE;
      END IF;

      IF item.tabela = 'colaboradores' THEN
        PERFORM public.anonimizar_dados_pessoais(item.registro_id);
      ELSE
        RAISE EXCEPTION 'tabela nao suportada para anonimizacao: %', item.tabela;
      END IF;

      UPDATE public.lgpd_fila_limpeza
         SET executado = true, processed_at = now()
       WHERE lgpd_fila_limpeza.id = item.id;

      sucesso := true;
    EXCEPTION WHEN others THEN
      -- Um item problemático não pode abortar a fila inteira.
      sucesso := false;
      erro    := SQLERRM;
    END;

    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.drenar_fila_limpeza_lgpd(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.drenar_fila_limpeza_lgpd(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.drenar_fila_limpeza_lgpd(integer) TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Correção de process_lgpd_cleanup_queue (colunas inexistentes)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_lgpd_cleanup_queue()
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_processed integer := 0;
BEGIN
  -- Delega para a drenagem real (que de fato anonimiza) em vez de apenas
  -- marcar linhas — o comportamento anterior perdia o dado a expurgar.
  SELECT count(*)::integer INTO v_processed
    FROM public.drenar_fila_limpeza_lgpd(500) d
   WHERE d.sucesso;
  RETURN v_processed;
END;
$$;

COMMENT ON FUNCTION public.run_lgpd_purge(boolean) IS
  'Expurga logs conforme public.lgpd_retencao_logs, em lotes de 5000 (teto 40 lotes/tabela/execução).';
COMMENT ON FUNCTION public.drenar_fila_limpeza_lgpd(integer) IS
  'Processa itens vencidos de lgpd_fila_limpeza chamando anonimizar_dados_pessoais. Isolado por item.';