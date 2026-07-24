-- 1. Melhorar a tabela de eventos do eSocial
ALTER TABLE public.esocial_eventos 
ADD COLUMN IF NOT EXISTS id_recibo TEXT,
ADD COLUMN IF NOT EXISTS tentativas_envio INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS proxima_tentativa TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS hash_arquivo TEXT;

-- 2. Criar tabela de logs de transmissão
CREATE TABLE IF NOT EXISTS public.esocial_transmissao_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID REFERENCES public.esocial_eventos(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL,
    status TEXT NOT NULL,
    request_xml TEXT,
    response_xml TEXT,
    error_details JSONB,
    duracao_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.esocial_transmissao_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso corretas
DROP POLICY IF EXISTS "Gestores e RH podem ver logs de transmissão" ON public.esocial_transmissao_logs;
CREATE POLICY "Gestores e RH podem ver logs de transmissão"
ON public.esocial_transmissao_logs
FOR SELECT
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'gestor', 'rh')
));

-- 3. Função de auditoria
CREATE OR REPLACE FUNCTION public.log_esocial_transmission()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'enviado') THEN
        INSERT INTO public.auditoria_logs (
            tabela, 
            registro_id, 
            acao, 
            dados_anteriores, 
            dados_novos, 
            user_id
        ) VALUES (
            'esocial_eventos',
            NEW.id,
            'TRANSMISSAO_ESOCIAL',
            to_jsonb(OLD),
            to_jsonb(NEW),
            auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS tr_audit_esocial_transmission ON public.esocial_eventos;
CREATE TRIGGER tr_audit_esocial_transmission
AFTER UPDATE ON public.esocial_eventos
FOR EACH ROW
EXECUTE FUNCTION public.log_esocial_transmission();
