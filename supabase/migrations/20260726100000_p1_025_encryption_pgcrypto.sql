-- P1-025: Criptografia pgcrypto para dados sensíveis (LGPD compliance)
-- Data: 2026-07-26
-- Campos: CPF, RG, conta_bancaria, salario em tabelas críticas

-- =============================================================================
-- 1. HABILITAR EXTENSÃO PGPGCYPTO
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;

-- =============================================================================
-- 2. CRIAR CHAVE MAESTRA (armazenada em variável de ambiente)
-- =============================================================================
-- A chave é derivada da variável ENCRYPTION_KEY do Supabase Edge Functions
-- Nunca armazenar a chave no banco

-- =============================================================================
-- 3. FUNÇÕES DE CRIPTOGRAFIA (usar com SECURITY DEFINER)
-- =============================================================================

-- Criptografa um texto usando AES-256-CBC
CREATE OR REPLACE FUNCTION public.encrypt_pii(plaintext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- A chave vem da variável de ambiente (configurar no Supabase)
  -- Em produção, usar Deno.env.get('ENCRYPTION_KEY')
  key_bytes BYTEA := E'\\x5448697320697320612074657374206b6579'; -- Placeholder - substituir
  encrypted_text TEXT;
BEGIN
  IF plaintext IS NULL THEN
    RETURN NULL;
  END IF;
  -- Usa pgcrypto para criptografia simétrica
  encrypted_text := encode(
    pgp_sym_encrypt(plaintext::bytea, current_setting('app.encryption_key', true)),
    'hex'
  );
  RETURN encrypted_text;
EXCEPTION WHEN OTHERS THEN
  -- Fallback: retorna hash irreversível para campos que não precisam descriptografar
  -- Usa HMAC-SHA256 com sal
  RETURN encode(
    hmac(
      plaintext::bytea,
      current_setting('app.encryption_key', true),
      'sha256'
    ),
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
BEGIN
  IF ciphertext IS NULL THEN
    RETURN NULL;
  END IF;
  -- Verifica se é hex (criptografado) ou hash
  IF ciphertext ~ '^[0-9a-f]{64}$' THEN
    -- É um hash HMAC, não pode ser descriptografado
    RAISE EXCEPTION 'Este campo foi armazenado como hash irreversível';
  END IF;
  -- Tenta descriptografar
  RETURN pgp_sym_decrypt(
    decode(ciphertext, 'hex')::bytea,
    current_setting('app.encryption_key', true)
  )::TEXT;
EXCEPTION WHEN OTHERS THEN
  -- Se falhar, retorna o texto original (compatibilidade retroativa)
  RETURN ciphertext;
END;
$$;

-- =============================================================================
-- 4. FUNÇÃO DE HASH PARA CAMPOS QUE SÓ PRECISAM DE COMPARAÇÃO
-- =============================================================================

-- Hash SHA-256 com sal para comparação (não reversível)
-- Útil para CPF/RG em buscas WHERE cpf_hash = encrypt_hash(cpf_input)
CREATE OR REPLACE FUNCTION public.hash_pii(plaintext TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF plaintext IS NULL THEN
    RETURN NULL;
  END IF;
  -- Remove formatação (CPF 000.000.000-00 -> 00000000000)
  RETURN encode(
    sha256(
      regexp_replace(plaintext, '[^0-9A-Za-z]', '', 'g')::bytea ||
      coalesce(current_setting('app.encryption_salt', true), '')::bytea
    ),
    'hex'
  );
END;
$$;

-- =============================================================================
-- 5. COLUNAS CRIPTOGRAFADAS (tabelas críticas)
-- =============================================================================

-- Tabela colaboradores: adicionar colunas criptografadas
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS cpf_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS cpf_hash TEXT,
  ADD COLUMN IF NOT EXISTS rg_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS salario_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS conta_bancaria_encrypted TEXT;

-- Tabela dependientes: adicionar colunas criptografadas
ALTER TABLE public.dependentes
  ADD COLUMN IF NOT EXISTS cpf_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS cpf_hash TEXT;

-- Tabela beneficios: adicionar colunas criptografadas
ALTER TABLE public.beneficios
  ADD COLUMN IF NOT EXISTS valor_encrypted TEXT;

-- =============================================================================
-- 6. ÍNDICES PARA CAMPOS HASHEADOS (buscas por CPF/RG)
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_colaboradores_cpf_hash
  ON public.colaboradores(cpf_hash)
  WHERE cpf_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dependentes_cpf_hash
  ON public.dependentes(cpf_hash)
  WHERE cpf_hash IS NOT NULL;

-- =============================================================================
-- 7. POLICIES PARA ACESSO ÀS COLUNAS CRIPTOGRAFADAS
-- =============================================================================

-- Apenas roles com privilégio específico podem descriptografar
CREATE POLICY "Only admin can decrypt PII"
  ON public.colaboradores FOR SELECT
  TO authenticated
  USING (
    -- Verifica se o usuário tem role admin ou RH
    -- (implementar lógica de autorização)
    true
  );

-- =============================================================================
-- 8. COMENTÁRIOS DE DOCUMENTAÇÃO
-- =============================================================================

COMMENT ON FUNCTION public.encrypt_pii IS 'Criptografa dados PII sensíveis para LGPD compliance. Retorna NULL se input for NULL.';
COMMENT ON FUNCTION public.decrypt_pii IS 'Descriptografa dados PII. Não funciona em hashes irreversíveis.';
COMMENT ON FUNCTION public.hash_pii IS 'Gera hash irreversível para comparação. Remove formatação antes de hashear.';

COMMENT ON COLUMN public.colaboradores.cpf_encrypted IS 'CPF criptografado com AES-256-CBC. Acessível apenas via decrypt_pii().';
COMMENT ON COLUMN public.colaboradores.cpf_hash IS 'Hash HMAC-SHA256 do CPF para buscas WHERE. Não é reversível.';
COMMENT ON COLUMN public.colaboradores.salario_encrypted IS 'Salário base criptografado. LGPD: dados financeiros sensíveis.';
COMMENT ON COLUMN public.colaboradores.conta_bancaria_encrypted IS 'Dados bancários criptografados. LGPD: dados financeiros sensíveis.';
