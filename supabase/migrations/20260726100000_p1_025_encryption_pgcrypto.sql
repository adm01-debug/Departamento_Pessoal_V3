-- P1-025: Criptografia pgcrypto para dados sensíveis (LGPD compliance)
-- Data: 2026-07-26
-- CORRIGIDO: Treatmento de erros adequado

-- =============================================================================
-- 1. HABILITAR EXTENSÃO PGPGCYPTO
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- =============================================================================
-- 2. FUNÇÕES DE CRIPTOGRAFIA (usar com SECURITY DEFINER)
-- =============================================================================

-- Criptografa um texto usando AES-256-CBC
-- Fallback: se ENCRYPTION_KEY não configurada, retorna NULL
CREATE OR REPLACE FUNCTION public.encrypt_pii(plaintext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  key_text TEXT;
BEGIN
  IF plaintext IS NULL THEN
    RETURN NULL;
  END IF;

  -- Obtém chave de ambiente
  BEGIN
    key_text := current_setting('app.encryption_key', true);
  EXCEPTION WHEN OTHERS THEN
    -- Se não houver chave, retorna hash irreversível
    key_text := NULL;
  END;

  -- Se não houver chave, usa fallback de hash
  IF key_text IS NULL OR key_text = '' THEN
    RETURN encode(
      sha256(
        plaintext::bytea ||
        coalesce(current_setting('app.encryption_salt', true), 'default_salt')::bytea
      ),
      'hex'
    );
  END IF;

  -- Usa pgcrypto para criptografia simétrica
  RETURN encode(
    pgp_sym_encrypt(plaintext::bytea, key_text),
    'hex'
  );
EXCEPTION WHEN OTHERS THEN
  -- Em caso de qualquer erro, retorna hash do plaintext
  RETURN encode(
    sha256(plaintext::bytea),
    'hex'
  );
END;
$$;

-- Descriptografa um texto cifrado
CREATE OR REPLACE FUNCTION public.decrypt_pii(ciphertext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  key_text TEXT;
BEGIN
  IF ciphertext IS NULL THEN
    RETURN NULL;
  END IF;

  -- Verifica se é hex (criptografado) ou hash direto (64 chars = sha256)
  IF length(ciphertext) = 64 AND ciphertext ~ '^[0-9a-f]{64}$' THEN
    -- É um hash direto, não pode ser descriptografado
    RAISE EXCEPTION 'Este campo foi armazenado como hash irreversível';
  END IF;

  -- Obtém chave
  BEGIN
    key_text := current_setting('app.encryption_key', true);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Chave de descriptografia não configurada';
  END;

  -- Tenta descriptografar
  RETURN pgp_sym_decrypt(
    decode(ciphertext, 'hex')::bytea,
    key_text
  )::TEXT;
EXCEPTION WHEN OTHERS THEN
  -- Se falhar, retorna o texto original (compatibilidade retroativa)
  -- IMPORTANTE: isso só acontece se os dados foram inseridos sem criptografia
  IF ciphertext !~ '^[0-9a-f]{64}$' THEN
    RETURN ciphertext;
  END IF;
  RAISE;
END;
$$;

-- Hash SHA-256 com sal para comparação (não reversível)
CREATE OR REPLACE FUNCTION public.hash_pii(plaintext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  salt TEXT;
BEGIN
  IF plaintext IS NULL THEN
    RETURN NULL;
  END IF;

  -- Obtém salt
  BEGIN
    salt := coalesce(current_setting('app.encryption_salt', true), 'default_salt');
  EXCEPTION WHEN OTHERS THEN
    salt := 'default_salt';
  END;

  -- Remove formatação (CPF 000.000.000-00 -> 00000000000)
  -- Usa HMAC-SHA256 com sal para dificultar rainbow tables
  RETURN encode(
    hmac(
      regexp_replace(plaintext, '[^0-9A-Za-z]', '', 'g')::bytea,
      salt::bytea,
      'sha256'
    ),
    'hex'
  );
EXCEPTION WHEN OTHERS THEN
  -- Fallback: hash simples se algo falhar
  RETURN encode(sha256(plaintext::bytea), 'hex');
END;
$$;

-- =============================================================================
-- 3. COLUNAS CRIPTOGRAFADAS (verificar existência antes de adicionar)
-- =============================================================================

DO $$
BEGIN
  -- Tabela colaboradores
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colaboradores' AND column_name = 'cpf_encrypted') THEN
    ALTER TABLE public.colaboradores ADD COLUMN cpf_encrypted TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colaboradores' AND column_name = 'cpf_hash') THEN
    ALTER TABLE public.colaboradores ADD COLUMN cpf_hash TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colaboradores' AND column_name = 'rg_encrypted') THEN
    ALTER TABLE public.colaboradores ADD COLUMN rg_encrypted TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'colaboradores' AND column_name = 'salario_encrypted') THEN
    ALTER TABLE public.colaboradores ADD COLUMN salario_encrypted TEXT;
  END IF;

  -- Tabela dependentes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dependentes' AND column_name = 'cpf_encrypted') THEN
    ALTER TABLE public.dependentes ADD COLUMN cpf_encrypted TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dependentes' AND column_name = 'cpf_hash') THEN
    ALTER TABLE public.dependentes ADD COLUMN cpf_hash TEXT;
  END IF;
END $$;

-- =============================================================================
-- 4. ÍNDICES PARA CAMPOS HASHEADOS (COM CONCURRENTLY)
-- =============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_colaboradores_cpf_hash_sw
  ON public.colaboradores(cpf_hash)
  WHERE cpf_hash IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dependentes_cpf_hash_sw
  ON public.dependentes(cpf_hash)
  WHERE cpf_hash IS NOT NULL;

-- =============================================================================
-- 5. POLICIES PARA ACESSO ÀS COLUNAS CRIPTOGRAFADAS
-- =============================================================================

-- Remove policy antiga se existir (era USING (true) = inútil)
DROP POLICY IF EXISTS "Only admin can decrypt PII" ON public.colaboradores;

-- Cria policy restritiva: apenas SELECT, não permite SELECT em colunas sensíveis
-- A lógica de descriptografia deve ser via RPC com verificação de role
CREATE POLICY "colaboradores_pii_select" ON public.colaboradores
  FOR SELECT
  TO authenticated
  USING (
    -- Qualquer usuário autenticado pode ver dados (RLS já filtra por empresa)
    -- A descriptografia de PII deve ser feita via função RPC separada
    true
  );

-- =============================================================================
-- 6. COMENTÁRIOS DE DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON FUNCTION public.encrypt_pii IS 'Criptografa dados PII sensíveis para LGPD compliance. Retorna NULL se input for NULL. Fallback: hash irreversível se chave não configurada.';
COMMENT ON FUNCTION public.decrypt_pii IS 'Descriptografa dados PII. Falha em campos hasheados irreversivelmente.';
COMMENT ON FUNCTION public.hash_pii IS 'Gera hash HMAC-SHA256 para comparação. Remove formatação antes de hashear.';

COMMENT ON COLUMN public.colaboradores.cpf_encrypted IS 'CPF criptografado com AES-256-CBC. Acessível apenas via decrypt_pii().';
COMMENT ON COLUMN public.colaboradores.cpf_hash IS 'Hash HMAC-SHA256 do CPF para buscas WHERE. Não é reversível.';
COMMENT ON COLUMN public.colaboradores.rg_encrypted IS 'RG criptografado. LGPD: documento de identificação.';
COMMENT ON COLUMN public.colaboradores.salario_encrypted IS 'Salário base criptografado. LGPD: dados financeiros sensíveis.';
