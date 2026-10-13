-- =============================================================================
-- Onda 4b — reconciliar banco × repositório (P2-01, P2-02, E-098, P1-025)
--
-- Estado confirmado no canônico (diag 2026-10-13): NENHUM destes objetos
-- existe em produção apesar de as migrations estarem no repo (drift de ledger):
--   colaboradores.user_id, RPC vincular_colaborador_ao_usuario(),
--   documentos.empresa_id, run_lgpd_purge/drenar_fila_limpeza_lgpd,
--   contas_bancarias.*_encrypted / pix_itens.chave_pix_encrypted.
-- Tudo abaixo é idempotente (IF NOT EXISTS / OR REPLACE / DO-guarded).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. P2-01 — vínculo conta de login ↔ colaborador
--    Fonte: 20260728221052_cc8fdde4 + 20260728221222_00a9c0c8
--    Sem o vínculo o Portal do Colaborador não identifica quem está logado.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.colaboradores.user_id IS
  'Conta de login vinculada. NULL = colaborador cadastrado pelo RH sem acesso ao portal.';

-- Um login não pode ocupar dois cadastros na mesma empresa; NULLs não conflitam.
CREATE UNIQUE INDEX IF NOT EXISTS colaboradores_user_id_empresa_uniq
  ON public.colaboradores (user_id, empresa_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS colaboradores_user_id_idx
  ON public.colaboradores (user_id)
  WHERE user_id IS NOT NULL;

-- A pessoa colaboradora lê o PRÓPRIO cadastro (as demais policies cobrem só
-- RH/admin). Escopo mínimo: a própria linha.
-- audit-migration-style: allow-silent-drop policy ainda não existe no canônico; DROP é idempotência do re-run.
DROP POLICY IF EXISTS "Colaborador vê o próprio cadastro" ON public.colaboradores;
CREATE POLICY "Colaborador vê o próprio cadastro"
  ON public.colaboradores
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.vincular_colaborador_ao_usuario()
RETURNS TABLE (colaborador_id uuid, empresa_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '28000';
  END IF;

  SELECT lower(trim(u.email)) INTO v_email FROM auth.users u WHERE u.id = v_uid;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.colaboradores c
     SET user_id = v_uid
   WHERE c.user_id IS NULL              -- nunca rouba vínculo já estabelecido
     AND (
          lower(trim(c.email))            = v_email
       OR lower(trim(c.email_corporativo)) = v_email
       OR lower(trim(c.email_pessoal))     = v_email
     )
  RETURNING c.id, c.empresa_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.vincular_colaborador_ao_usuario() FROM PUBLIC, anon;
DO $guard$
BEGIN
  IF to_regprocedure('public.vincular_colaborador_ao_usuario()') IS NOT NULL THEN
    EXECUTE $sql$GRANT EXECUTE ON FUNCTION public.vincular_colaborador_ao_usuario() TO authenticated;$sql$;
  END IF;
END $guard$;

COMMENT ON FUNCTION public.vincular_colaborador_ao_usuario() IS
  'Vincula a conta logada aos cadastros de colaborador com o mesmo e-mail. E-mail derivado de auth.uid(), nunca de parâmetro.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. P2-02 — documentos.empresa_id
--    Fonte: 20260712214642_fixup_documentos_empresa_id.sql.
--    O app filtra/grava por empresa e a coluna não existe em produção → o
--    cadastro do documento falha (o arquivo sobe, o registro não).
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.documentos ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id);

UPDATE public.documentos d
   SET empresa_id = c.empresa_id
  FROM public.colaboradores c
 WHERE d.colaborador_id = c.id
   AND d.empresa_id IS NULL;

CREATE INDEX IF NOT EXISTS documentos_empresa_id_idx
  ON public.documentos (empresa_id)
  WHERE empresa_id IS NOT NULL;

-- Documentos sem colaborador vinculado não têm empresa dedutível: ficam NULL
-- (já eram invisíveis na policy tenant_documentos, que filtra via colaborador).
-- A contagem sai no log do apply para reconciliação manual.
DO $$
DECLARE v_orfaos integer;
BEGIN
  SELECT count(*) INTO v_orfaos
    FROM public.documentos
   WHERE empresa_id IS NULL;
  IF v_orfaos > 0 THEN
    RAISE NOTICE 'documentos.empresa_id: % linha(s) sem empresa dedutível (colaborador_id nulo ou inexistente) — reconciliar manualmente', v_orfaos;
  END IF;
END $$;

-- Trigger garante que empresa_id nunca diverge do colaborador do documento
-- (a policy de acesso filtra via colaborador; divergência = leak cross-tenant).
-- SECURITY DEFINER para ler o colaborador mesmo fora do escopo RLS do writer.
CREATE OR REPLACE FUNCTION public.documentos_sync_empresa_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE v_emp uuid;
BEGIN
  IF NEW.colaborador_id IS NOT NULL THEN
    SELECT c.empresa_id INTO v_emp
      FROM public.colaboradores c
     WHERE c.id = NEW.colaborador_id;
    IF FOUND THEN
      NEW.empresa_id := v_emp;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.documentos_sync_empresa_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.documentos_sync_empresa_id() TO service_role;

DROP TRIGGER IF EXISTS trg_documentos_sync_empresa_id ON public.documentos;
CREATE TRIGGER trg_documentos_sync_empresa_id
  BEFORE INSERT OR UPDATE OF colaborador_id ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.documentos_sync_empresa_id();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. E-098 — LGPD: expurgo de logs + drenagem da fila de anonimização
--    Fonte: 20260728180353_8aa2e680 (versão corrigida do contrato —
--    run_lgpd_purge retorna 3 colunas). A variante antiga (p3_065, 4 colunas)
--    não é aplicada porque o contrato canônico é este e nada ainda existe.
--    Chamadores: edge `limpeza` + job cron já agendado em produção.
-- ─────────────────────────────────────────────────────────────────────────────
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

-- audit-migration-style: allow-silent-drop tabela acabou de ser criada; DROP é idempotência do re-run.
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

-- O trigger genérico audit_log_append_only (migrations 20260712*) não honrava
-- o GUC de bypass que prevent_audit_log_modification já honra — sem isso,
-- NENHUMA tabela append-only poderia ser expurgada nem pela rotina autorizada.
CREATE OR REPLACE FUNCTION public.audit_log_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $fn$
BEGIN
  -- Bypass autorizado e restrito: o expurgo LGPD (só service_role) liga o
  -- GUC só nesta transação; qualquer outro UPDATE/DELETE segue proibido.
  IF current_setting('app.audit_log_purge', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Trilha de auditoria é append-only. UPDATE/DELETE não são permitidos em %.', TG_TABLE_NAME;
END;
$fn$;

DROP FUNCTION IF EXISTS public.run_lgpd_purge(boolean);
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
  v_max_batch  constant integer := 40;     -- teto por execução: evita lock longo
  v_deleted    integer;
  v_total      integer;
  v_batches    integer;
BEGIN
  IF NOT p_dry_run THEN
    -- Bypass autorizado do append-only: só nesta transação (is_local) e só
    -- por quem executa esta função (service_role). Tabelas cujo trigger não
    -- honre o GUC caem no EXCEPTION por tabela abaixo — sem derrubar o lote.
    PERFORM set_config('app.audit_log_purge', 'on', true);
  END IF;

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

    BEGIN  -- subtransação por tabela: uma protegida não derruba o lote inteiro
      IF p.t = 'audit_log'
         AND NOT p_dry_run
         AND to_regprocedure('public._purge_audit_log_internal(integer)') IS NOT NULL
      THEN
        -- audit_log tem rotina própria com mínimo de 30 dias + autolog.
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
END;
$fn$;

REVOKE ALL ON FUNCTION public.run_lgpd_purge(boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.run_lgpd_purge(boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_lgpd_purge(boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.drenar_fila_limpeza_lgpd(p_limite integer DEFAULT 200)
RETURNS TABLE(id uuid, tabela text, registro_id uuid, sucesso boolean, erro text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
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
        -- Simulação registrada uma única vez e marcada executada: sem isso
        -- os itens dry_run voltavam a ser selecionados em todo run e
        -- famintavam os itens reais da fila.
        UPDATE public.lgpd_fila_limpeza
           SET executado = true, processed_at = now()
         WHERE lgpd_fila_limpeza.id = item.id;
        sucesso := true;
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
      sucesso := false;
      erro    := SQLERRM;
    END;

    RETURN NEXT;
  END LOOP;
END;
$fn$;

REVOKE ALL ON FUNCTION public.drenar_fila_limpeza_lgpd(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.drenar_fila_limpeza_lgpd(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.drenar_fila_limpeza_lgpd(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.process_lgpd_cleanup_queue()
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
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
$fn$;

-- Rotina interna de cron/service_role — sem authz própria, não pode ficar
-- executável por anon/authenticated (gate secdef-authz).
REVOKE ALL ON FUNCTION public.process_lgpd_cleanup_queue() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.process_lgpd_cleanup_queue() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_lgpd_cleanup_queue() TO service_role;

COMMENT ON FUNCTION public.run_lgpd_purge(boolean) IS
  'Expurga logs conforme public.lgpd_retencao_logs, em lotes de 5000 (teto 40 lotes/tabela/execução).';
COMMENT ON FUNCTION public.drenar_fila_limpeza_lgpd(integer) IS
  'Processa itens vencidos de lgpd_fila_limpeza chamando anonimizar_dados_pessoais. Isolado por item.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. P1-025 — criptografia de dados bancários (contas_bancarias, pix_itens)
--    Fonte: 20260818000000_p1_025_encryption_dados_bancarios.sql, com 3
--    correções em relação ao texto original:
--    a) vault.create_secret recebia (valor, DESCRIÇÃO) — a chave nascia com o
--       nome da descrição e nunca era encontrada; agora (valor, nome, descrição)
--       e, se a chave não existir, a função falha alto em vez de gravar NULL.
--    b) a view decrypted roda como owner e originalmente não filtrava tenant —
--       agora restringe por get_user_empresas(auth.uid()) ou admin, a mesma
--       regra das policies da tabela.
--    c) o backfill "SET agencia = agencia" jamais disparava o trigger
--       (IS DISTINCT FROM é falso) — o backfill criptografa direto.
--    Comportamento preservado: escrita/leitura da app continuam na tabela; as
--    colunas _encrypted são cópia cifrada para migração futura e a view é o
--    caminho de leitura protegido.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
  -- pgcrypto já existe no canônico; em ambientes sem permissão segue sem.
  RAISE NOTICE 'pgcrypto: %', SQLERRM;
END $$;

DO $$
BEGIN
  PERFORM vault.create_secret(
    encode(gen_random_bytes(32), 'hex'),
    'dados_bancarios_key',
    'Chave AES-256 para criptografia de dados bancários. NÃO COMMITAR em código.'
  )
  WHERE NOT EXISTS (
    SELECT 1 FROM vault.secrets WHERE name = 'dados_bancarios_key'
  );
EXCEPTION WHEN undefined_table OR undefined_function THEN
  RAISE NOTICE 'Vault indisponível — configure app.encryption_key ou o secret manualmente.';
END $$;

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
    SELECT decrypted_secret INTO secret_key
    FROM vault.decrypt_secret((
      SELECT id FROM vault.secrets WHERE name = 'dados_bancarios_key'
    ))
    LIMIT 1;
  EXCEPTION WHEN undefined_table OR undefined_function OR object_not_in_prerequisite_state THEN
    secret_key := NULL;
  END;

  IF secret_key IS NULL OR secret_key = '' THEN
    secret_key := current_setting('app.encryption_key', true);
  END IF;
  IF secret_key IS NULL OR length(secret_key) < 32 THEN
    RAISE EXCEPTION 'Encryption key not configured or too weak (>=32 chars). Set "app.encryption_key" or configure vault secret "dados_bancarios_key".';
  END IF;

  -- pgcrypto aceita 'aes256' (sem hífen); 'aes-256' lança "Unsupported cipher".
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
    SELECT decrypted_secret INTO secret_key
    FROM vault.decrypt_secret((
      SELECT id FROM vault.secrets WHERE name = 'dados_bancarios_key'
    ))
    LIMIT 1;
  EXCEPTION WHEN undefined_table OR undefined_function OR object_not_in_prerequisite_state THEN
    secret_key := NULL;
  END;

  IF secret_key IS NULL OR secret_key = '' THEN
    secret_key := current_setting('app.encryption_key', true);
  END IF;
  IF secret_key IS NULL OR secret_key = '' THEN
    RAISE EXCEPTION 'Encryption key not configured.';
  END IF;

  RETURN pgp_sym_decrypt(ciphertext::bytea, secret_key)::text;
END;
$fn$;

-- Rotinas internas (trigger/vault) — ninguém invoca direto; gate secdef-authz.
REVOKE ALL ON FUNCTION public.encrypt_dados_bancarios(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decrypt_dados_bancarios(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_dados_bancarios(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrypt_dados_bancarios(text) TO service_role;

ALTER TABLE public.contas_bancarias
  ADD COLUMN IF NOT EXISTS agencia_encrypted      text,
  ADD COLUMN IF NOT EXISTS conta_encrypted        text,
  ADD COLUMN IF NOT EXISTS digito_encrypted       text,
  ADD COLUMN IF NOT EXISTS pix_chave_encrypted    text;

ALTER TABLE public.pix_itens
  ADD COLUMN IF NOT EXISTS chave_pix_encrypted text;

CREATE OR REPLACE FUNCTION public.encrypt_contas_bancarias_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.agencia IS DISTINCT FROM OLD.agencia THEN
    NEW.agencia_encrypted := public.encrypt_dados_bancarios(NEW.agencia);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.conta IS DISTINCT FROM OLD.conta THEN
    NEW.conta_encrypted := public.encrypt_dados_bancarios(NEW.conta);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.digito IS DISTINCT FROM OLD.digito THEN
    NEW.digito_encrypted := public.encrypt_dados_bancarios(NEW.digito);
  END IF;
  IF TG_OP = 'INSERT' OR NEW.pix_chave IS DISTINCT FROM OLD.pix_chave THEN
    NEW.pix_chave_encrypted := public.encrypt_dados_bancarios(NEW.pix_chave);
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_contas_bancarias_encrypt ON public.contas_bancarias;
CREATE TRIGGER trg_contas_bancarias_encrypt
  BEFORE INSERT OR UPDATE ON public.contas_bancarias
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_contas_bancarias_fields();

CREATE OR REPLACE FUNCTION public.encrypt_pix_itens_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.chave_pix IS DISTINCT FROM OLD.chave_pix THEN
    NEW.chave_pix_encrypted := public.encrypt_dados_bancarios(NEW.chave_pix);
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS trg_pix_itens_encrypt ON public.pix_itens;
CREATE TRIGGER trg_pix_itens_encrypt
  BEFORE INSERT OR UPDATE ON public.pix_itens
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_pix_itens_fields();

-- Trigger functions são rotinas internas (disparam independente de EXECUTE).
REVOKE ALL ON FUNCTION public.encrypt_contas_bancarias_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.encrypt_pix_itens_fields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_contas_bancarias_fields() TO service_role;
GRANT EXECUTE ON FUNCTION public.encrypt_pix_itens_fields() TO service_role;

-- Backfill das linhas existentes (12 linhas em prod na data da migration).
UPDATE public.contas_bancarias
   SET agencia_encrypted   = public.encrypt_dados_bancarios(agencia),
       conta_encrypted     = public.encrypt_dados_bancarios(conta),
       digito_encrypted    = public.encrypt_dados_bancarios(digito),
       pix_chave_encrypted = public.encrypt_dados_bancarios(pix_chave)
 WHERE agencia_encrypted IS NULL
   AND (agencia IS NOT NULL OR conta IS NOT NULL OR digito IS NOT NULL OR pix_chave IS NOT NULL);

UPDATE public.pix_itens
   SET chave_pix_encrypted = public.encrypt_dados_bancarios(chave_pix)
 WHERE chave_pix_encrypted IS NULL
   AND chave_pix IS NOT NULL;

-- View de leitura descriptografada com o MESMO gate da policy da tabela
-- (pode_gerir_rh, não só membership de empresa) — a view roda como owner,
-- então o WHERE é o que isola. Preflight garante que as funções existem.
DO $$
BEGIN
  IF to_regprocedure('public.pode_gerir_rh(uuid)') IS NULL
     OR to_regprocedure('public.is_admin(uuid)') IS NULL THEN
    RAISE EXCEPTION 'onda4b requer pode_gerir_rh(uuid) e is_admin(uuid) em produção';
  END IF;
END $$;

CREATE OR REPLACE VIEW public.contas_bancarias_decrypted AS
SELECT
  id, colaborador_id, empresa_id,
  banco_nome, banco_codigo,
  public.decrypt_dados_bancarios(agencia_encrypted)   AS agencia,
  public.decrypt_dados_bancarios(conta_encrypted)     AS conta,
  public.decrypt_dados_bancarios(digito_encrypted)    AS digito,
  tipo_conta,
  public.decrypt_dados_bancarios(pix_chave_encrypted) AS pix_chave,
  pix_tipo, modalidade, principal, ativo, created_at, updated_at
FROM public.contas_bancarias
WHERE public.pode_gerir_rh(empresa_id)
   OR public.is_admin(auth.uid());

REVOKE ALL ON public.contas_bancarias_decrypted FROM PUBLIC, anon;
GRANT SELECT ON public.contas_bancarias_decrypted TO authenticated;

-- Auditoria de acesso a dados bancários (LGPD/ISO 27001).
CREATE TABLE IF NOT EXISTS public.auditoria_acesso_bancario (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id),
  action      text NOT NULL,  -- 'VIEW_DECRYPTED', 'EXPORT', 'PRINT'
  table_name  text NOT NULL,
  record_id   uuid,
  campos      text[],
  ip_address  text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.auditoria_acesso_bancario ENABLE ROW LEVEL SECURITY;
-- audit-migration-style: allow-silent-drop tabela nova; DROP é idempotência do re-run.
DROP POLICY IF EXISTS "auditoria_bancario_insert" ON public.auditoria_acesso_bancario;
CREATE POLICY "auditoria_bancario_insert" ON public.auditoria_acesso_bancario
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

COMMENT ON TABLE public.auditoria_acesso_bancario IS
  'LGPD/ISO 27001: auditoria de todo acesso a dados bancários descriptografados.';
COMMENT ON VIEW public.contas_bancarias_decrypted IS
  'Leitura descriptografada de contas bancárias, restrita às empresas do usuário (ou admin).';
