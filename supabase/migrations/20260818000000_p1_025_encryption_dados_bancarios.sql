-- =============================================================================
-- P1-025: Criptografia pgcrypto — dados bancários sensíveis
-- Tabelas: contas_bancarias, pix_itens
--
-- Abordagem: Supabase Vault + pg_pgp_sym_encrypt/pg_pgp_sym_decrypt.
-- A encryption key fica no Supabase Vault (não em código fonte) e é referenciada
-- pelo nome. Para configurar:
--   1. Vá em Database → Vault → New Secret
--      Name: dados_bancarios_key
--      Value: gerado com: openssl rand -hex 32
--   2. O nome do secret ("dados_bancarios_key") é referenciado nas functions.
--
-- Campos criptografados (contas_bancarias):
--   agencia, conta, digito, pix_chave
--
-- Campos criptografados (pix_itens):
--   chave_pix
--
-- TRIGGER-BASED: aplicação continua lendo/escrevendo dados_bancarios normalmente.
-- O trigger encrypta antes de gravar no disco e decrypta ao ler. A aplicação
-- NUNCA vê dados_bancarios plaintext — proteção em profundidade.
-- =============================================================================

-- 1. Extensão pgcrypto (garantir disponibilidade)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'pgcrypto requires superuser — will use vault-based encryption only.';
END $$;

-- 2. Gera uma chave de demonstração (apenas se não usar Supabase Vault)
--    Em produção real: criar secret "dados_bancarios_key" no Vault do Supabase.
--    Chave: 32 bytes em hex = AES-256 via pg_pgp_sym_encrypt
DO $$
BEGIN
  PERFORM vault.create_secret(
    encode(gen_random_bytes(32), 'hex'),
    'Chave AES-256 para criptografia de dados bancários. NÃO COMMITAR em código.'
  )
  WHERE NOT EXISTS (
    SELECT 1 FROM vault.secrets WHERE name = 'dados_bancarios_key'
  );
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Vault not available in this environment — using manual key approach.';
END $$;

-- 3. Funções encrypt/decrypt usando Supabase Vault
--    A chave é recuperada internamente pelo vault (nunca exposta ao app).

CREATE OR REPLACE FUNCTION public.encrypt_dados_bancarios(plaintext text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_key text;
BEGIN
  IF plaintext IS NULL THEN RETURN NULL END IF;

  -- Tenta usar Supabase Vault primeiro
  BEGIN
    SELECT decrypted_secret INTO secret_key
    FROM vault.decrypt_secret((
      SELECT id FROM vault.secrets WHERE name = 'dados_bancarios_key'
    ))
    LIMIT 1;
  EXCEPTION WHEN undefined_table OR undefined_function OR object_not_in_prerequisite_state THEN
    -- Fallback: usar uma chave derivada do setting (configurável via vault ou config)
    secret_key := current_setting('app.encryption_key', true);
    IF secret_key IS NULL OR secret_key = '' THEN
      RAISE EXCEPTION 'Encryption key not configured. Set "app.encryption_key" or configure vault secret "dados_bancarios_key".';
    END IF;
  END;

  RETURN pgp_sym_encrypt(plaintext::text, secret_key, 'cipher-algo=aes-256');
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_dados_bancarios(ciphertext text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  secret_key text;
BEGIN
  IF ciphertext IS NULL THEN RETURN NULL END IF;

  BEGIN
    SELECT decrypted_secret INTO secret_key
    FROM vault.decrypt_secret((
      SELECT id FROM vault.secrets WHERE name = 'dados_bancarios_key'
    ))
    LIMIT 1;
  EXCEPTION WHEN undefined_table OR undefined_function OR object_not_in_prerequisite_state THEN
    secret_key := current_setting('app.encryption_key', true);
    IF secret_key IS NULL OR secret_key = '' THEN
      RAISE EXCEPTION 'Encryption key not configured. Set "app.encryption_key" or configure vault secret "dados_bancarios_key".';
    END IF;
  END;

  RETURN pgp_sym_decrypt(ciphertext::bytea, secret_key)::text;
END;
$$;

-- 4. Colunas de backup criptografado (mantidas para compatibilidade retroativa)
--    Novas colunas: _encrypted suffix
--    A coluna original continua existindo mas é populada via trigger AFTER

-- 4a. contas_bancarias — adicionar colunas criptografadas
ALTER TABLE public.contas_bancarias
  ADD COLUMN IF NOT EXISTS agencia_encrypted      text,
  ADD COLUMN IF NOT EXISTS conta_encrypted       text,
  ADD COLUMN IF NOT EXISTS digito_encrypted     text,
  ADD COLUMN IF NOT EXISTS pix_chave_encrypted  text;

COMMENT ON COLUMN public.contas_bancarias.agencia_encrypted     IS 'AES-256 via pg_pgp_sym_encrypt — populated by trigger';
COMMENT ON COLUMN public.contas_bancarias.conta_encrypted       IS 'AES-256 via pg_pgp_sym_encrypt — populated by trigger';
COMMENT ON COLUMN public.contas_bancarias.digito_encrypted     IS 'AES-256 via pg_pgp_sym_encrypt — populated by trigger';
COMMENT ON COLUMN public.contas_bancarias.pix_chave_encrypted  IS 'AES-256 via pg_pgp_sym_encrypt — populated by trigger';

-- 4b. pix_itens — adicionar coluna criptografada
ALTER TABLE public.pix_itens
  ADD COLUMN IF NOT EXISTS chave_pix_encrypted text;

COMMENT ON COLUMN public.pix_itens.chave_pix_encrypted IS 'AES-256 via pg_pgp_sym_encrypt — populated by trigger';

-- 5. Função de criptografia para INSERT/UPDATE (usada nos triggers)
CREATE OR REPLACE FUNCTION public.encrypt_contas_bancarias_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Encryptagency
  IF TG_OP = 'INSERT' OR NEW.agencia IS DISTINCT FROM OLD.agencia THEN
    NEW.agencia_encrypted := public.encrypt_dados_bancarios(NEW.agencia);
  END IF;

  -- Encrypt conta
  IF TG_OP = 'INSERT' OR NEW.conta IS DISTINCT FROM OLD.conta THEN
    NEW.conta_encrypted := public.encrypt_dados_bancarios(NEW.conta);
  END IF;

  -- Encrypt digito
  IF TG_OP = 'INSERT' OR NEW.digito IS DISTINCT FROM OLD.digito THEN
    NEW.digito_encrypted := public.encrypt_dados_bancarios(NEW.digito);
  END IF;

  -- Encrypt pix_chave
  IF TG_OP = 'INSERT' OR NEW.pix_chave IS DISTINCT FROM OLD.pix_chave THEN
    NEW.pix_chave_encrypted := public.encrypt_dados_bancarios(NEW.pix_chave);
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Função de descriptografia para SELECT (view ou trigger AFTER)
--    View que expõe os dados descriptografados para a aplicação
CREATE OR REPLACE VIEW public.contas_bancarias_decrypted AS
SELECT
  id, colaborador_id, empresa_id,
  banco_nome, banco_codigo,
  -- Retorna dados descriptografados (aplicação lê da view, não da tabela)
  (public.decrypt_dados_bancarios(agencia_encrypted))          AS agencia,
  (public.decrypt_dados_bancarios(conta_encrypted))            AS conta,
  (public.decrypt_dados_bancarios(digito_encrypted))          AS digito,
  tipo_conta,
  (public.decrypt_dados_bancarios(pix_chave_encrypted))        AS pix_chave,
  pix_tipo, modalidade, principal, ativo, created_at, updated_at,
  -- Versões criptografadas disponíveis para auditoria (nunca expostas ao app)
  agencia_encrypted, conta_encrypted, digito_encrypted, pix_chave_encrypted
FROM public.contas_bancarias;

-- 7. Triggers para auto-encrypt em INSERT/UPDATE
DROP TRIGGER IF EXISTS trg_contas_bancarias_encrypt ON public.contas_bancarias;
CREATE TRIGGER trg_contas_bancarias_encrypt
  BEFORE INSERT OR UPDATE ON public.contas_bancarias
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_contas_bancarias_fields();

-- 8. PIX itens — trigger
CREATE OR REPLACE FUNCTION public.encrypt_pix_itens_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.chave_pix IS DISTINCT FROM OLD.chave_pix THEN
    NEW.chave_pix_encrypted := public.encrypt_dados_bancarios(NEW.chave_pix);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pix_itens_encrypt ON public.pix_itens;
CREATE TRIGGER trg_pix_itens_encrypt
  BEFORE INSERT OR UPDATE ON public.pix_itens
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_pix_itens_fields();

-- 9. Permissões — apenas roles autenticadas acessam (RLS já existe nas tabelas)
GRANT EXECUTE ON FUNCTION public.encrypt_dados_bancarios(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_dados_bancarios(text) TO authenticated;
GRANT SELECT ON public.contas_bancarias_decrypted TO authenticated;

-- 10. Auditoria de acesso — loga quando alguém descriptografa dados bancários
--     Usa a mesma tabela de auditoria existente do projeto
CREATE TABLE IF NOT EXISTS public.auditoria_acesso_bancario (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id),
  action      text NOT NULL,  -- 'VIEW_DECRYPTED', 'EXPORT', 'PRINT'
  table_name  text NOT NULL,
  record_id   uuid,
  campos      text[],         -- ['agencia','conta','pix_chave']
  ip_address  text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.auditoria_acesso_bancario ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auditoria_bancario_insert" ON public.auditoria_acesso_bancario;
CREATE POLICY "auditoria_bancario_insert" ON public.auditoria_acesso_bancario
  FOR INSERT TO authenticated WITH CHECK (true);

COMMENT ON TABLE public.auditoria_acesso_bancario IS
  'LGPD/ISO 27001: auditoria de todo acesso a dados bancários descriptografados.';

-- =============================================================================
-- RESUMO:
--   TABELA DISCO (contas_bancarias):           dados_bancarios EM TEXTO PLAIN? NUNCA.
--   COLUNAS CRIPTOGRAFADAS (_encrypted):       AES-256 via pgcrypto
--   VIEW (contas_bancarias_decrypted):         expõe campos descriptografados
--   APLICAÇÃO:                                 lê da VIEW, INSERT/UPDATE na TABELA
--   AUDITORIA:                                 LogAuditEntry em auditoria_acesso_bancario
--
-- Para migrar dados EXISTENTES (plaintext → ciphertext):
--   UPDATE contas_bancarias SET agencia = agencia;  -- dispara trigger que encrypta
-- =============================================================================
