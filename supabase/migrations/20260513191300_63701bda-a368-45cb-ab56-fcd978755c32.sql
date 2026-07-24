-- 1. Modelos de WhatsApp (Templates aprovados)
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    nome TEXT NOT NULL, -- ex: 'boas_vindas_colaborador'
    conteudo TEXT NOT NULL,
    status TEXT DEFAULT 'pendente', -- 'pendente', 'aprovado', 'rejeitado'
    categoria TEXT, -- 'UTILITY', 'MARKETING', 'AUTHENTICATION'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores veem templates WhatsApp" ON public.whatsapp_templates;
CREATE POLICY "Gestores veem templates WhatsApp"
ON public.whatsapp_templates FOR SELECT
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'gestor', 'rh')
));

-- 2. Logs de Mensagens WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapp_mensagens_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    telefone TEXT NOT NULL,
    template_id UUID REFERENCES public.whatsapp_templates(id),
    status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
    mensagem_id_externo TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.whatsapp_mensagens_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores veem logs de mensagens WhatsApp" ON public.whatsapp_mensagens_logs;
CREATE POLICY "Gestores veem logs de mensagens WhatsApp"
ON public.whatsapp_mensagens_logs FOR SELECT
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'gestor', 'rh')
));

-- 3. Função para disparar WhatsApp automático
CREATE OR REPLACE FUNCTION public.fn_trigger_whatsapp_on_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Exemplo: Notificar colaborador na Admissão
    IF (TG_TABLE_NAME = 'colaboradores') THEN
        -- Aqui o backend monitoraria esta tabela para disparar via Edge Function
        -- Por enquanto, registramos a intenção no log para processamento
        INSERT INTO public.whatsapp_mensagens_logs (
            empresa_id,
            colaborador_id,
            telefone,
            status
        ) VALUES (
            NEW.empresa_id,
            NEW.id,
            NEW.telefone_pessoal, -- Assume-se este campo no esquema
            'pending_trigger'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para novas admissões
DROP TRIGGER IF EXISTS tr_whatsapp_on_new_hiring ON public.colaboradores;
CREATE TRIGGER tr_whatsapp_on_new_hiring
AFTER INSERT ON public.colaboradores
FOR EACH ROW
EXECUTE FUNCTION public.fn_trigger_whatsapp_on_event();
