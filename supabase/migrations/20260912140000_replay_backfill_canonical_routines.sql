-- =============================================================================
-- Backfill de rotinas canônicas ausentes do replay (Supabase Preview)
-- =============================================================================
--
-- CONTEXTO: as migrations 20260912150000 / 151000 / 152000 aplicam
-- ALTER FUNCTION ... SET search_path numa allowlist fail-closed de rotinas
-- que existem no canônico (frjbfeamybqsejlvmqbl) mas que nunca foram criadas
-- por migration — entraram no banco por aplicação manual/migrate-helper e só
-- constam nos dumps supabase/baseline|rebaseline. No replay sequencial do
-- Supabase Preview (banco zerado + migrations em ordem) a allowlist aborta
-- com `requires routine ...` — é exatamente a falha que o Preview reporta em
-- `public.dp_audit_log_immutable()`.
--
-- O QUE ESTE ARQUIVO FAZ: cria, com os corpos canônicos extraídos de
-- supabase/rebaseline/20260831_corrected_public.sql, todas as rotinas que a
-- allowlist exige e que o replay não produz:
--   - tipos public.dp_pii_sensitivity e public.dp_user_role (enum, DO-guarded);
--   - 21 funções public.dp_* (infra/auditoria/PII)
--   - 3 funções fill_*_empresa (tenant backfill trigger helpers);
--   - public.contrato_assinar_por_token(text,text,text,inet,text) — dropada por
--     20260724130004 e recriada só em 20260912204000 (depois do checkpoint);
--     corpo = versão canônica atual (20261006100000), tornando o apply no
--     canônico um no-op semântico (CREATE OR REPLACE idempotente).
--
-- POR QUE VERSIONADA ANTES DE 20260912150000: precisa existir quando a
-- allowlist rodar. No canônico todas essas rotinas já existem com estes mesmos
-- corpos — o apply é no-op. Forward-only: nada é dropado.
--
-- check_function_bodies=off: alguns corpos referenciam objetos que só existem
-- no canônico (partições dp_audit_log, etc.); a validação passaria no canônico
-- mas reprovaria num replay parcial. Os corpos já são os validados em produção.
SET check_function_bodies = off;

-- Tipos exigidos pelas assinaturas acima. DO-guard: CREATE TYPE não tem IF NOT EXISTS.
DO $t$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                 WHERE t.typname='dp_pii_sensitivity' AND n.nspname='public') THEN
    CREATE TYPE public.dp_pii_sensitivity AS ENUM ('publico','interno','confidencial','sensivel','critico');
  END IF;
END $t$;
DO $t$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
                 WHERE t.typname='dp_user_role' AND n.nspname='public') THEN
    CREATE TYPE public.dp_user_role AS ENUM ('colaborador','gestor','rh','auditoria','admin','dpo');
  END IF;
END $t$;


CREATE OR REPLACE FUNCTION "public"."dp_assert_rls"("p_table" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = p_table AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'dp_assert_rls: RLS NAO HABILITADO em public.%', p_table;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."dp_audit_log_immutable"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 
      'dp_audit_log IMUTAVEL: UPDATE proibido em registros de auditoria. '
      'Retencao via pg_cron. Para emergencia: DROP TRIGGER e registrar incidente.'
      USING ERRCODE = '55000';
  ELSIF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 
      'dp_audit_log IMUTAVEL: DELETE proibido. Use dp_run_retention() para expurgo controlado.'
      USING ERRCODE = '55000';
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."dp_audit_log_prevent_future"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.created_at > NOW() + INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'dp_audit_log: created_at não pode ser no futuro (drift: %)', 
      (NEW.created_at - NOW());
  END IF;
  -- Garantir que updated_at e actor_user_id sejam consistentes
  IF NEW.actor_user_id IS NULL AND NEW.actor_role = 'colaborador' THEN
    RAISE EXCEPTION 'dp_audit_log: actor_role=colaborador exige actor_user_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."dp_catalog_pii"("p_table" "text", "p_column" "text", "p_sensitivity" "public"."dp_pii_sensitivity", "p_category" "text", "p_basis" "text", "p_retention" integer DEFAULT NULL::integer) RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  INSERT INTO public.dp_data_catalog (table_name, column_name, sensitivity, lgpd_category, legal_basis, retention_days)
  VALUES (p_table, p_column, p_sensitivity, p_category, p_basis, p_retention)
  ON CONFLICT (table_name, column_name) DO UPDATE SET
    sensitivity=EXCLUDED.sensitivity,
    lgpd_category=EXCLUDED.lgpd_category,
    legal_basis=EXCLUDED.legal_basis,
    retention_days=EXCLUDED.retention_days,
    updated_at=NOW();
$$;

CREATE OR REPLACE FUNCTION "public"."dp_check_log_rotation"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_settings JSONB;
  v_warning TEXT := '';
BEGIN
  SELECT jsonb_build_object(
    'log_rotation_age', current_setting('log_rotation_age'),
    'log_rotation_size', current_setting('log_rotation_size'),
    'log_filename', current_setting('log_filename'),
    'log_directory', current_setting('log_directory'),
    'logging_collector', current_setting('logging_collector')
  ) INTO v_settings;
  
  IF current_setting('log_rotation_age') = '0' AND current_setting('log_rotation_size') = '0' THEN
    v_warning := 'CRITICO: Rotacao de log desabilitada! Disco pode encher. '
              || 'Configurar via Supabase Dashboard > Database > Configuration > '
              || 'log_rotation_age=1d, log_rotation_size=100MB';
  END IF;
  
  RETURN jsonb_build_object(
    'settings', v_settings,
    'warning', v_warning,
    'action_required', v_warning != '',
    'dashboard_url', 'https://supabase.com/dashboard/project/frjbfeamybqsejlvmqbl/database/configuration',
    'settings_to_apply', jsonb_build_object(
      'log_rotation_age', '1d',
      'log_rotation_size', '102400',
      'log_truncate_on_rotation', 'on',
      'log_filename', 'postgresql-%Y-%m-%d_%H%M%S.log'
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION "public"."dp_check_rls_index_coverage"() RETURNS TABLE("table_name" "text", "policy_name" "text", "policy_qual" "text", "has_index" boolean, "recommendation" "text")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT 
    p.tablename::TEXT,
    p.policyname::TEXT,
    COALESCE(p.qual, p.with_check)::TEXT as policy_qual,
    EXISTS (
      SELECT 1 FROM pg_indexes i 
      WHERE i.tablename = p.tablename
    ) AS has_index,
    CASE 
      WHEN NOT EXISTS (SELECT 1 FROM pg_indexes i WHERE i.tablename=p.tablename)
      THEN 'CRIAR INDEX em ' || p.tablename || ' para suportar a policy RLS'
      ELSE 'OK'
    END AS recommendation
  FROM pg_policies p
  WHERE p.schemaname = 'public'
    AND p.tablename LIKE 'dp_%'
  ORDER BY p.tablename, p.policyname;
$$;

CREATE OR REPLACE FUNCTION "public"."dp_connection_health"() RETURNS "jsonb"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
SELECT jsonb_build_object(
  'max_connections', current_setting('max_connections')::int,
  'active_connections', (SELECT count(*) FROM pg_stat_activity WHERE state='active'),
  'idle_connections', (SELECT count(*) FROM pg_stat_activity WHERE state='idle'),
  'total_connections', (SELECT count(*) FROM pg_stat_activity),
  'waiting_connections', (SELECT count(*) FROM pg_stat_activity WHERE wait_event IS NOT NULL),
  'db_size_mb', round((pg_database_size(current_database())::numeric / 1024 / 1024)::numeric, 2),
  'cache_hit_ratio', round((
    SELECT 100.0 * sum(blks_hit) / nullif(sum(blks_hit)+sum(blks_read),0)
    FROM pg_stat_database WHERE datname=current_database()
  )::numeric, 2),
  'checked_at', NOW()
)
$$;

CREATE OR REPLACE FUNCTION "public"."dp_create_next_partition"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_next DATE:=date_trunc('month',NOW()+INTERVAL '2 months');
  v_after DATE:=date_trunc('month',NOW()+INTERVAL '3 months');
  v_name TEXT:='dp_audit_log_'||to_char(v_next,'YYYY_MM');
BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_class WHERE relname=v_name) THEN
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.dp_audit_log FOR VALUES FROM (''%s'') TO (''%s'')',v_name,v_next,v_after);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."dp_decrypt_pii"("p_ciphertext" "text", "p_key" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF current_user NOT IN ('postgres','supabase_admin') AND
     current_setting('request.jwt.claim.role', true) NOT IN ('service_role') THEN
    RAISE EXCEPTION 'dp_decrypt_pii: Unauthorized. Requires service_role.';
  END IF;
  RETURN pgp_sym_decrypt(decode(p_ciphertext,'base64'), p_key);
END;
$$;

CREATE OR REPLACE FUNCTION "public"."dp_encrypt_pii"("p_plaintext" "text", "p_key" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF current_user NOT IN ('postgres','supabase_admin') AND
     current_setting('request.jwt.claim.role', true) NOT IN ('service_role') THEN
    RAISE EXCEPTION 'dp_encrypt_pii: Unauthorized. Requires service_role.';
  END IF;
  RETURN encode(pgp_sym_encrypt(p_plaintext, p_key, 'compress-algo=0, cipher-algo=aes256'), 'base64');
END;
$$;

CREATE OR REPLACE FUNCTION "public"."dp_has_role"("p_role" "public"."dp_user_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dp_user_roles
    WHERE user_id = auth.uid()
    AND role = p_role
    AND active = true
    AND (expires_at IS NULL OR expires_at > NOW())
  )
$$;

CREATE OR REPLACE FUNCTION "public"."dp_hash_pii"("p_value" "text", "p_context" "text" DEFAULT 'generic'::"text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT SECURITY DEFINER
    SET "search_path" TO 'public', 'extensions'
    AS $$
  SELECT encode(
    digest(
      'DEPTOPESSOAL:' || p_context || ':' || 
      regexp_replace(upper(p_value), '[^A-Z0-9]', '', 'g'),
      'sha256'
    ), 'hex'
  )
$$;

CREATE OR REPLACE FUNCTION "public"."dp_missing_indexes"() RETURNS TABLE("table_name" "text", "seq_scans" bigint, "seq_tup_read" bigint, "idx_scans" bigint, "suggestion" "text")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
SELECT 
  relname::TEXT,
  seq_scan,
  seq_tup_read,
  idx_scan,
  'Considerar index em ' || relname || ': seq_scans=' || seq_scan || 
    ', seq_tup_read=' || seq_tup_read AS suggestion
FROM pg_stat_user_tables
WHERE seq_scan > 100
  AND n_live_tup > 10000
  AND (seq_scan > idx_scan OR idx_scan IS NULL)
ORDER BY seq_tup_read DESC
LIMIT 10;
$$;

CREATE OR REPLACE FUNCTION "public"."dp_post_migration_check"("p_expected_version" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_latest TEXT;
  v_ok BOOLEAN;
BEGIN
  SELECT version INTO v_latest FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 1;
  v_ok := (v_latest = p_expected_version);
  
  -- Registrar no audit log
  INSERT INTO public.dp_audit_log(event, event_type, payload)
  VALUES('migration_validated', 'compliance', 
    jsonb_build_object('expected', p_expected_version, 'actual', v_latest, 'ok', v_ok));
  
  RETURN jsonb_build_object(
    'ok', v_ok,
    'expected_version', p_expected_version,
    'latest_version', v_latest,
    'checked_at', NOW()
  );
END;
$$;

CREATE OR REPLACE FUNCTION "public"."dp_pre_deploy_gate"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_issues JSONB := '[]'::JSONB;
  v_table TEXT;
  v_ok BOOLEAN := true;
BEGIN
  -- Verificar RLS em todas as tabelas dp_*
  FOR v_table IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname='public' AND tablename LIKE 'dp_%'
      AND tablename NOT LIKE 'dp_audit_log_20%'  -- particoes herdam
  LOOP
    BEGIN
      PERFORM dp_assert_rls(v_table);
    EXCEPTION WHEN OTHERS THEN
      v_issues := v_issues || jsonb_build_object('issue', 'RLS_DISABLED', 'table', v_table, 'severity', 'HIGH');
      v_ok := false;
    END;
  END LOOP;
  
  -- Verificar que nenhuma tabela dp_* tem owner diferente de postgres
  SELECT jsonb_agg(jsonb_build_object('issue', 'WRONG_OWNER', 'table', tablename, 'owner', tableowner, 'severity', 'MEDIUM'))
  INTO v_issues
  FROM (
    SELECT tablename, tableowner FROM pg_tables
    WHERE schemaname='public' AND tablename LIKE 'dp_%' AND tableowner != 'postgres'
  ) t;
  IF v_issues IS NOT NULL AND v_issues != 'null' THEN v_ok := false; END IF;
  
  -- Verificar que funcoes dp_* existem (baseline)
  DECLARE v_fn_count INT;
  BEGIN
    SELECT COUNT(*) INTO v_fn_count FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname LIKE 'dp_%';
    IF v_fn_count < 10 THEN
      v_issues := COALESCE(v_issues,'[]'::JSONB) || jsonb_build_object('issue', 'FN_COUNT_LOW', 'count', v_fn_count, 'expected', 10, 'severity', 'HIGH');
      v_ok := false;
    END IF;
  END;
  
  RETURN jsonb_build_object(
    'gate_passed', v_ok,
    'checked_at', NOW(),
    'issues', COALESCE(v_issues, '[]'::JSONB),
    'migrations_total', (SELECT COUNT(*) FROM supabase_migrations.schema_migrations),
    'schema_version', (SELECT config_val FROM dp_mcp_config WHERE config_key='schema_version' LIMIT 1)
  );
END;
$$;

CREATE OR REPLACE FUNCTION "public"."dp_require_role"("p_role" "public"."dp_user_role") RETURNS "void"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  IF NOT public.dp_has_role(p_role) THEN
    RAISE EXCEPTION 'Acesso negado: role % necessario. User: %', p_role, auth.uid()
    USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."dp_run_retention"("p_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
DECLARE v_p RECORD; v_n INT; v_cut TIMESTAMPTZ;
BEGIN
  -- Guard: rejeitar chamadas de anon ou authenticated nao-autorizados
  IF current_user NOT IN ('postgres','supabase_admin') AND
     current_setting('request.jwt.claim.role', true) NOT IN ('service_role') THEN
    RAISE EXCEPTION 'dp_run_retention: Unauthorized. Requires service_role.';
  END IF;
  
  SELECT * INTO v_p FROM public.dp_retention_policy WHERE id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Policy not found: %', p_id; END IF;
  IF NOT v_p.enabled THEN RETURN '{"status":"skipped","dry_run":true}'::jsonb; END IF;
  v_cut := NOW()-((v_p.retention_days||' days')::INTERVAL);
  EXECUTE 'SELECT COUNT(*) FROM public.dp_audit_log WHERE created_at<$1' USING v_cut INTO v_n;
  IF v_p.dry_run THEN
    UPDATE public.dp_retention_policy SET last_run_at=NOW(),last_run_count=v_n WHERE id=p_id;
    RETURN jsonb_build_object('dry_run',true,'would_affect',v_n,'cutoff',v_cut,'status','dry_run_ok');
  END IF;
  IF v_p.action='anonymize' THEN
    UPDATE public.dp_audit_log SET ip_address=NULL,session_id=NULL WHERE created_at<v_cut AND (ip_address IS NOT NULL OR session_id IS NOT NULL);
  ELSIF v_p.action='delete' THEN
    DELETE FROM public.dp_audit_log WHERE created_at<v_cut;
  END IF;
  UPDATE public.dp_retention_policy SET last_run_at=NOW(),last_run_count=v_n WHERE id=p_id;
  RETURN jsonb_build_object('executed',true,'action',v_p.action,'affected',v_n);
END;
$_$;


ALTER FUNCTION "public"."dp_run_retention"("p_id" "uuid") OWNER TO "postgres";

--
-- Name: dp_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION "public"."dp_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."dp_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."dp_soft_delete_trigger"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.deleted_at = NOW();
  NEW.deleted_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."dp_table_template"("p_name" "text") RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
  RETURN 
    'CREATE TABLE public.' || quote_ident(p_name) || ' (' || chr(10) ||
    '  id            dp_uuid      PRIMARY KEY,' || chr(10) ||
    '  created_at    dp_timestamp,' || chr(10) ||
    '  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),' || chr(10) ||
    '  deleted_at    TIMESTAMPTZ,' || chr(10) ||
    '  deleted_by    UUID         REFERENCES auth.users(id),' || chr(10) ||
    '  created_by    UUID         REFERENCES auth.users(id)' || chr(10) ||
    ');' || chr(10) ||
    'ALTER TABLE public.' || quote_ident(p_name) || ' ENABLE ROW LEVEL SECURITY;' || chr(10) ||
    'CREATE TRIGGER ' || p_name || '_updated_at BEFORE UPDATE ON public.' || quote_ident(p_name) || chr(10) ||
    '  FOR EACH ROW EXECUTE FUNCTION public.dp_set_updated_at();';
END;
$$;

CREATE OR REPLACE FUNCTION "public"."dp_track_pii_access"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE v_event TEXT; v_user_id UUID;
BEGIN
  v_event := left(TG_TABLE_NAME || '_' || lower(TG_OP), 150);
  BEGIN v_user_id := auth.uid(); EXCEPTION WHEN OTHERS THEN v_user_id := NULL; END;
  BEGIN
    INSERT INTO public.dp_audit_log(event,event_type,actor_user_id,request_id,payload)
    VALUES(v_event,'security',v_user_id,gen_random_uuid(),
      jsonb_build_object('table',TG_TABLE_NAME,'operation',TG_OP,'when',NOW()));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'dp_track_pii_access: audit log falhou: % %', SQLSTATE, SQLERRM;
  END;
  RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."fill_recrutamento_child_empresa"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.empresa_id IS NULL AND NEW.candidatura_id IS NOT NULL THEN
    NEW.empresa_id := (SELECT empresa_id FROM public.candidaturas WHERE id = NEW.candidatura_id LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."fill_treinamento_certificados_empresa"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.empresa_id IS NULL AND NEW.curso_id IS NOT NULL THEN
    NEW.empresa_id := (SELECT empresa_id FROM public.catalogo_cursos WHERE id = NEW.curso_id LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."fill_treinamento_instancias_empresa"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.empresa_id IS NULL AND NEW.curso_id IS NOT NULL THEN
    NEW.empresa_id := (SELECT empresa_id FROM public.catalogo_cursos WHERE id = NEW.curso_id LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$;


-- ----------------------------------------------------------------------------
-- contrato_assinar_por_token(text,text,text,inet,text)
-- Corpo = versão canônica atual (migration 20261006100000).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.contrato_assinar_por_token(
  p_token text,
  p_cpf text,
  p_nome_completo text,
  p_ip inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_token_hash text;
  cpf_normalized text := regexp_replace(COALESCE(p_cpf, ''), '[^0-9]', '', 'g');
  name_normalized text := btrim(COALESCE(p_nome_completo, ''));
  token_row public.contrato_assinatura_tokens%ROWTYPE;
  contract_row public.contratos_gerados%ROWTYPE;
  signature_hash text;
  signed_at timestamptz := clock_timestamp();
  v_ip inet;
  v_xff text;
  v_jwt_role text;
BEGIN
  IF p_token IS NULL OR length(p_token) < 16 OR length(p_token) > 512 THEN
    RAISE EXCEPTION 'Token inválido' USING ERRCODE = '22023';
  END IF;
  IF length(cpf_normalized) <> 11 THEN
    RAISE EXCEPTION 'CPF inválido' USING ERRCODE = '22023';
  END IF;
  IF length(name_normalized) < 5 OR length(name_normalized) > 200
     OR name_normalized ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'Nome completo inválido' USING ERRCODE = '22023';
  END IF;

  -- IP confiável: p_ip só é honrado para service_role; demais callers usam o
  -- rightmost XFF do gateway (elemento que o gateway anexa — não forjável).
  BEGIN
    v_jwt_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;
  IF current_user = 'service_role' OR v_jwt_role = 'service_role' THEN
    v_ip := p_ip;
  ELSE
    BEGIN
      v_xff := current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for';
    EXCEPTION WHEN OTHERS THEN
      v_xff := NULL;
    END;
    BEGIN
      v_ip := NULLIF(btrim(split_part(v_xff, ',', -1)), '')::inet;
    EXCEPTION WHEN OTHERS THEN
      v_ip := NULL;
    END;
  END IF;

  v_token_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  SELECT * INTO token_row
  FROM public.contrato_assinatura_tokens AS t
  WHERE t.token_hash = v_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Token não encontrado' USING ERRCODE = 'P0002'; END IF;
  IF token_row.revogado_em IS NOT NULL THEN RAISE EXCEPTION 'Token revogado' USING ERRCODE = '22023'; END IF;
  IF token_row.usado_em IS NOT NULL THEN RAISE EXCEPTION 'Token já utilizado' USING ERRCODE = '22023'; END IF;
  IF token_row.expira_em < now() THEN RAISE EXCEPTION 'Token expirado' USING ERRCODE = '22023'; END IF;
  IF token_row.tentativas >= 20 THEN RAISE EXCEPTION 'Muitas tentativas' USING ERRCODE = '22023'; END IF;

  IF token_row.cpf_esperado IS NULL
     OR regexp_replace(token_row.cpf_esperado, '[^0-9]', '', 'g') <> cpf_normalized THEN
    UPDATE public.contrato_assinatura_tokens SET tentativas = tentativas + 1 WHERE id = token_row.id;
    -- Returning a controlled failure is intentional. Raising after the UPDATE
    -- would roll the attempt counter back with the statement, making the
    -- brute-force limit ineffective.
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_SIGNER',
      'message', 'Dados de assinatura inválidos'
    );
  END IF;

  SELECT * INTO contract_row FROM public.contratos_gerados
  WHERE id = token_row.contrato_id AND empresa_id = token_row.empresa_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Contrato não encontrado' USING ERRCODE = 'P0002'; END IF;

  signature_hash := encode(sha256(convert_to(
    COALESCE(contract_row.sha256, '') || cpf_normalized || upper(name_normalized) ||
    signed_at::text || COALESCE(v_ip::text, ''), 'UTF8'
  )), 'hex');

  UPDATE public.contrato_assinatura_tokens
  SET usado_em = signed_at,
      assinado_ip = v_ip,
      assinado_ua = left(p_user_agent, 1024),
      assinatura_hash = signature_hash,
      tentativas = tentativas + 1
  WHERE id = token_row.id;

  UPDATE public.contratos_gerados
  SET status = 'assinado', assinado_em = signed_at,
      assinatura_metadata = jsonb_build_object(
        'cpf', cpf_normalized, 'nome', upper(name_normalized),
        'ip', v_ip::text, 'user_agent', left(p_user_agent, 1024),
        'assinatura_hash', signature_hash, 'assinado_em', signed_at
      ),
      updated_at = now()
  WHERE id = contract_row.id;

  IF to_regclass('public.audit_log_unified') IS NOT NULL THEN
    INSERT INTO public.audit_log_unified(source_table, empresa_id, action, entity, entity_id, payload, occurred_at)
    VALUES ('contrato_assinatura_tokens', token_row.empresa_id, 'CONTRATO_ASSINADO', 'contrato', contract_row.id::text,
      jsonb_build_object('token_id', token_row.id, 'cpf_mask', left(cpf_normalized,3)||'***'||right(cpf_normalized,2)), signed_at);
  END IF;

  RETURN jsonb_build_object('success', true, 'contrato_id', contract_row.id,
    'assinatura_hash', signature_hash, 'assinado_em', signed_at);
END
$function$;

REVOKE ALL ON FUNCTION public.contrato_assinar_por_token(text,text,text,inet,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contrato_assinar_por_token(text,text,text,inet,text) TO anon, authenticated, service_role;

SET check_function_bodies = on;
