-- =============================================================================
-- Onda 4c — correções do Devin Review (#229) + empresa_id faltante
--
-- 1. vincular_colaborador_ao_usuario: exige e-mail confirmado e só vincula
--    quando o match é unívoco por empresa (e-mail duplicado não quebra nem
--    vincula o cadastro errado).
-- 2. encrypt/decrypt_dados_bancarios: remove fallback app.encryption_key —
--    qualquer sessão pode SET esse GUC; chave vem só do Vault.
-- 3. run_lgpd_purge: desliga app.audit_log_purge ao final (defesa em
--    profundidade — o bypass não vaza para writes posteriores na transação).
-- 4. documentos: policy de RH para documentos sem colaborador (empresa-level).
-- 5. empresa_id + backfill + índice em historico_cargo, colaborador_beneficios,
--    documentos_colaborador e logs_sistema (gaps confirmados por diagnóstico).
-- =============================================================================

-- ── 1. Vínculo conta ↔ colaborador: e-mail verificado + match unívoco ──────────
CREATE OR REPLACE FUNCTION public.vincular_colaborador_ao_usuario()
RETURNS TABLE (colaborador_id uuid, empresa_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid       uuid := auth.uid();
  v_email     text;
  v_confirmed boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '28000';
  END IF;

  SELECT lower(trim(u.email)), (u.email_confirmed_at IS NOT NULL)
    INTO v_email, v_confirmed
    FROM auth.users u WHERE u.id = v_uid;

  -- Sem posse comprovada do endereço não há vínculo: uma conta criada com o
  -- e-mail de outra pessoa não pode tomar o cadastro dela (SEC_0002).
  IF v_email IS NULL OR v_email = '' OR NOT v_confirmed THEN
    RETURN;
  END IF;

  -- Só vincula quando o e-mail identifica UM colaborador sem vínculo por
  -- empresa. Duplicidade (2 cadastros com o mesmo e-mail na mesma empresa)
  -- não vincula ninguém nem estoura o índice único — fica para o RH resolver
  -- o cadastro (BUG_0001).
  RETURN QUERY
  WITH cand AS (
    SELECT c.id, c.empresa_id AS emp,
           count(*) OVER (PARTITION BY c.empresa_id) AS n
      FROM public.colaboradores c
     WHERE c.user_id IS NULL
       AND (   lower(trim(c.email))             = v_email
            OR lower(trim(c.email_corporativo)) = v_email
            OR lower(trim(c.email_pessoal))     = v_email)
  )
  UPDATE public.colaboradores c
     SET user_id = v_uid
    FROM cand
   WHERE c.id = cand.id
     AND cand.n = 1
  RETURNING c.id, c.empresa_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.vincular_colaborador_ao_usuario() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vincular_colaborador_ao_usuario() TO authenticated;

-- ── 2. Criptografia: chave só do Vault (sem GUC controlável pela sessão) ───────
CREATE OR REPLACE FUNCTION public.encrypt_dados_bancarios(plaintext text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  secret_key text;
BEGIN
  IF plaintext IS NULL THEN RETURN NULL; END IF;

  BEGIN
    SELECT ds.decrypted_secret INTO secret_key
      FROM vault.decrypted_secrets ds
     WHERE ds.name = 'dados_bancarios_key'
     LIMIT 1;
  EXCEPTION WHEN undefined_table OR undefined_function OR object_not_in_prerequisite_state THEN
    secret_key := NULL;
  END;

  -- Sem fallback por GUC configurável pela sessão (SEC_0001): a chave só
  -- pode vir do Vault — um GUC controlado pelo cliente permitiria escolher
  -- a chave de cifragem dos dados bancários.
  IF secret_key IS NULL OR length(secret_key) < 32 THEN
    RAISE EXCEPTION 'Encryption key not configured or too weak (>=32 chars). Configure vault secret "dados_bancarios_key".';
  END IF;

  RETURN pgp_sym_encrypt(plaintext::text, secret_key, 'cipher-algo=aes256')::text;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.decrypt_dados_bancarios(ciphertext text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
DECLARE
  secret_key text;
BEGIN
  IF ciphertext IS NULL THEN RETURN NULL; END IF;

  BEGIN
    SELECT ds.decrypted_secret INTO secret_key
      FROM vault.decrypted_secrets ds
     WHERE ds.name = 'dados_bancarios_key'
     LIMIT 1;
  EXCEPTION WHEN undefined_table OR undefined_function OR object_not_in_prerequisite_state THEN
    secret_key := NULL;
  END;

  IF secret_key IS NULL OR secret_key = '' THEN
    RAISE EXCEPTION 'Encryption key not configured. Configure vault secret "dados_bancarios_key".';
  END IF;

  RETURN pgp_sym_decrypt(ciphertext::bytea, secret_key)::text;
END;
$fn$;

-- ── 3. run_lgpd_purge: desliga o bypass ao final ───────────────────────────────
CREATE OR REPLACE FUNCTION public.run_lgpd_purge(p_dry_run boolean DEFAULT false)
RETURNS TABLE(tabela text, deleted integer, batches integer)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  p            record;
  v_batch      constant integer := 5000;
  v_max_batch  constant integer := 40;
  v_deleted    integer;
  v_total      integer;
  v_batches    integer;
BEGIN
  IF NOT p_dry_run THEN
    PERFORM set_config('app.audit_log_purge', 'on', true);
  END IF;

  FOR p IN
    SELECT r.tabela AS t, r.coluna_data AS c, r.dias AS d
      FROM public.lgpd_retencao_logs r
     WHERE r.ativo
     ORDER BY r.tabela
  LOOP
    CONTINUE WHEN to_regclass('public.' || quote_ident(p.t)) IS NULL;
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = p.t AND column_name = p.c
    );

    v_total := 0;
    v_batches := 0;

    BEGIN
      IF p.t = 'audit_log'
         AND NOT p_dry_run
         AND to_regprocedure('public._purge_audit_log_internal(integer)') IS NOT NULL
      THEN
        v_total   := public._purge_audit_log_internal(GREATEST(p.d, 30));
        v_batches := 1;
      ELSIF p_dry_run THEN
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
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'run_lgpd_purge: tabela % falhou (%) — lote segue', p.t, SQLERRM;
      v_total := 0;
    END;

    tabela  := p.t;
    deleted := v_total;
    batches := v_batches;
    RETURN NEXT;
  END LOOP;

  -- O bypass do append-only não pode vazar para writes posteriores na mesma
  -- transação (SEC_0003). Em erro, a transação aborta e o GUC morre com ela.
  IF NOT p_dry_run THEN
    PERFORM set_config('app.audit_log_purge', 'off', true);
  END IF;
END;
$fn$;

REVOKE ALL ON FUNCTION public.run_lgpd_purge(boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_lgpd_purge(boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_lgpd_purge(boolean) TO service_role;

-- ── 4. documentos sem colaborador: RH gerencia pelo escopo da empresa ──────────
-- A policy tenant original filtra via colaborador; documentos de empresa
-- (sem colaborador_id) ficavam ilegíveis e o cadastro era rejeitado (BUG_0002).
-- audit-migration-style: allow-silent-drop policy criada logo abaixo; IF EXISTS só evita erro em re-run idempotente
DROP POLICY IF EXISTS documentos_rh_empresa_manage ON public.documentos;
CREATE POLICY documentos_rh_empresa_manage
  ON public.documentos FOR ALL TO authenticated
  USING (colaborador_id IS NULL AND empresa_id IS NOT NULL AND public.pode_gerir_rh(empresa_id))
  WITH CHECK (colaborador_id IS NULL AND empresa_id IS NOT NULL AND public.pode_gerir_rh(empresa_id));

-- ── 5. empresa_id faltante (drift confirmado por diagnóstico) ──────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['historico_cargo','colaborador_beneficios','documentos_colaborador','logs_sistema']
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE '% ausente — pulando', t;
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name=t AND column_name='empresa_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN empresa_id uuid REFERENCES public.empresas(id)', t);
    END IF;
  END LOOP;
END $$;

-- Backfill via colaborador onde aplicável (guardado: só roda se a tabela e
-- a coluna colaborador_id existirem de fato no canônico)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['historico_cargo','colaborador_beneficios','documentos_colaborador']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name=t AND column_name='colaborador_id'
       ) THEN
      EXECUTE format(
        'UPDATE public.%I x SET empresa_id = c.empresa_id
           FROM public.colaboradores c
          WHERE x.colaborador_id = c.id AND x.empresa_id IS NULL', t);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['historico_cargo','colaborador_beneficios','documentos_colaborador','logs_sistema']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name=t AND column_name='empresa_id'
       ) THEN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS idx_%I_empresa ON public.%I (empresa_id) WHERE empresa_id IS NOT NULL',
        t, t);
    END IF;
  END LOOP;
END $$;
