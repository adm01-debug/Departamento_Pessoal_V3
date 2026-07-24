-- Tabela para configuração de WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE UNIQUE,
    instancia_url TEXT,
    api_key TEXT,
    instancia_nome TEXT,
    status TEXT DEFAULT 'desconectado',
    notificar_ponto BOOLEAN DEFAULT false,
    notificar_ferias BOOLEAN DEFAULT false,
    notificar_holerite BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresas gerenciam seu próprio WhatsApp" ON public.whatsapp_config;
CREATE POLICY "Empresas gerenciam seu próprio WhatsApp" 
ON public.whatsapp_config FOR ALL
USING (auth.uid() IN (
    SELECT user_id FROM public.user_empresas WHERE empresa_id = whatsapp_config.empresa_id
));

DROP TRIGGER IF EXISTS update_whatsapp_config_updated_at ON public.whatsapp_config;
CREATE TRIGGER update_whatsapp_config_updated_at
BEFORE UPDATE ON public.whatsapp_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
