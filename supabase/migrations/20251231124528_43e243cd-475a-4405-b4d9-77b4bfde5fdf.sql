-- Tabela para armazenar credenciais WebAuthn/Passkeys
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  device_type TEXT,
  transports TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  friendly_name TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON public.webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_credential_id ON public.webauthn_credentials(credential_id);

-- Enable RLS
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Users can view their own credentials" ON public.webauthn_credentials;
CREATE POLICY "Users can view their own credentials"
ON public.webauthn_credentials FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own credentials" ON public.webauthn_credentials;
CREATE POLICY "Users can insert their own credentials"
ON public.webauthn_credentials FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own credentials" ON public.webauthn_credentials;
CREATE POLICY "Users can update their own credentials"
ON public.webauthn_credentials FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own credentials" ON public.webauthn_credentials;
CREATE POLICY "Users can delete their own credentials"
ON public.webauthn_credentials FOR DELETE
USING (auth.uid() = user_id);

-- Tabela para desafios WebAuthn temporários
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Limpar desafios expirados automaticamente
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON public.webauthn_challenges(expires_at);

-- RLS para challenges (sem restrição de user pois authentication pode ser anônimo)
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on challenges" ON public.webauthn_challenges;
CREATE POLICY "Allow all operations on challenges"
ON public.webauthn_challenges FOR ALL
USING (true)
WITH CHECK (true);