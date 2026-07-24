-- Add CA expiration date to epis
ALTER TABLE public.epis 
ADD COLUMN IF NOT EXISTS ca_validade DATE;

-- Create portal notification settings
CREATE TABLE IF NOT EXISTS public.portal_notificacoes_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email_alertas BOOLEAN DEFAULT true,
    push_alertas BOOLEAN DEFAULT true,
    alertar_ferias BOOLEAN DEFAULT true,
    alertar_holerite BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.portal_notificacoes_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own portal settings" ON public.portal_notificacoes_settings;
CREATE POLICY "Users can manage their own portal settings"
    ON public.portal_notificacoes_settings FOR ALL
    USING (auth.uid() = user_id);
