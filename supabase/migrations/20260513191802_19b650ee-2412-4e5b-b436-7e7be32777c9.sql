-- 1. Buckets para Currículos e Portfólios
INSERT INTO storage.buckets (id, name, public) 
VALUES ('recrutamento-curriculos', 'recrutamento-curriculos', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Storage
DROP POLICY IF EXISTS "Gestores e RH podem ver currículos" ON storage.objects;
CREATE POLICY "Gestores e RH podem ver currículos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'recrutamento-curriculos' AND (
    SELECT public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh') OR public.has_role(auth.uid(), 'gestor')
));

DROP POLICY IF EXISTS "Upload de currículos por usuários autenticados" ON storage.objects;
CREATE POLICY "Upload de currículos por usuários autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recrutamento-curriculos');

-- 3. Melhorias nas Tabelas de Recrutamento
ALTER TABLE public.candidaturas
ADD COLUMN IF NOT EXISTS nota_geral NUMERIC(3,1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS feedback_ia TEXT,
ADD COLUMN IF NOT EXISTS historico_etapas JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS data_proxima_etapa TIMESTAMP WITH TIME ZONE;

-- 4. Tabela de Entrevistas/Agendamentos
CREATE TABLE IF NOT EXISTS public.recrutamento_agendamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidatura_id UUID REFERENCES public.candidaturas(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL,
    titulo TEXT NOT NULL,
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    duracao_minutos INTEGER DEFAULT 30,
    local_link TEXT,
    responsavel_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'agendado', -- 'agendado', 'concluido', 'cancelado', 'no_show'
    feedback_entrevistador TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para Agendamentos
ALTER TABLE public.recrutamento_agendamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores veem seus agendamentos" ON public.recrutamento_agendamentos;
CREATE POLICY "Gestores veem seus agendamentos"
ON public.recrutamento_agendamentos FOR SELECT
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'rh', 'gestor')
));

-- 5. Trigger para atualizar histórico de etapas automaticamente
CREATE OR REPLACE FUNCTION public.fn_update_candidatura_history()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.etapa IS DISTINCT FROM NEW.etapa) THEN
        NEW.historico_etapas = COALESCE(NEW.historico_etapas, '[]'::jsonb) || jsonb_build_object(
            'etapa_anterior', OLD.etapa,
            'etapa_nova', NEW.etapa,
            'data_mudanca', now(),
            'user_id', auth.uid()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_candidatura_history ON public.candidaturas;
CREATE TRIGGER tr_update_candidatura_history
BEFORE UPDATE ON public.candidaturas
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_candidatura_history();
