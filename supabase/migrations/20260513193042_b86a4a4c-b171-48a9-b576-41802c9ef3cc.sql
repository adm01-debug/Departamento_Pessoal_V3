-- 1. Melhorar a tabela de medidas disciplinares para conformidade jurídica
ALTER TABLE public.medidas_disciplinares
ADD COLUMN IF NOT EXISTS evidenciado_por JSONB DEFAULT '[]'::jsonb, -- ['foto', 'video', 'testemunha', 'log_sistema']
ADD COLUMN IF NOT EXISTS recorrencia_infrafacao BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS id_registro_anterior UUID;

-- 2. Tabela para Anexos de Evidências
CREATE TABLE IF NOT EXISTS public.medidas_disciplinares_anexos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medida_id UUID REFERENCES public.medidas_disciplinares(id) ON DELETE CASCADE,
    nome_arquivo TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    tipo_arquivo TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.medidas_disciplinares_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores e RH gerenciam anexos disciplinares" ON public.medidas_disciplinares_anexos;
CREATE POLICY "Gestores e RH gerenciam anexos disciplinares"
ON public.medidas_disciplinares_anexos FOR ALL
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'rh', 'gestor')
));

-- 3. Base de Conhecimento: Punições Sugeridas (Regimento Interno Digital)
CREATE TABLE IF NOT EXISTS public.sst_regimento_interno (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    infracao_tipo TEXT NOT NULL, -- 'atraso', 'insubordinacao', 'falta_injustificada'
    puniciao_sugerida TEXT NOT NULL, -- 'advertencia_verbal', 'advertencia_escrita', 'suspensao'
    artigo_clt_base TEXT,
    pontos_gravidade INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Função para disparar alerta em caso de Falta Grave
CREATE OR REPLACE FUNCTION public.fn_alert_severe_disciplinary_measure()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.tipo = 'justa_causa' OR NEW.tipo = 'suspensao') THEN
        INSERT INTO public.notificacoes (
            user_id,
            titulo,
            mensagem,
            tipo,
            lida
        )
        SELECT 
            user_id,
            'ALERTA CRÍTICO: Medida Disciplinar Grave',
            'O colaborador ' || (SELECT nome_completo FROM public.colaboradores WHERE id = NEW.colaborador_id) || ' recebeu uma ' || NEW.tipo || '.',
            'urgente',
            false
        FROM public.user_roles 
        WHERE role IN ('admin', 'rh');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS tr_alert_severe_measure ON public.medidas_disciplinares;
CREATE TRIGGER tr_alert_severe_measure
AFTER INSERT ON public.medidas_disciplinares
FOR EACH ROW
EXECUTE FUNCTION public.fn_alert_severe_disciplinary_measure();
