-- Tabela de Inscrições Push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    device_info TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias inscrições push" ON public.push_subscriptions;
CREATE POLICY "Usuários podem gerenciar suas próprias inscrições push"
ON public.push_subscriptions
FOR ALL
USING (auth.uid() = user_id);

-- Configurações globais (VAPID)
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS vapid_public_key TEXT;
ALTER TABLE public.configuracoes ADD COLUMN IF NOT EXISTS vapid_private_key TEXT;
