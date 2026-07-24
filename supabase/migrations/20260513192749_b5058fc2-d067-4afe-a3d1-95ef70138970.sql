-- 1. Melhorar a tabela de férias para suporte a cálculos avançados
ALTER TABLE public.ferias
ADD COLUMN IF NOT EXISTS abono_pecuniario BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dias_abono INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS adiantamento_13o BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS periodo_aquisitivo_inicio DATE,
ADD COLUMN IF NOT EXISTS periodo_aquisitivo_fim DATE,
ADD COLUMN IF NOT EXISTS status_aprovacao_gestor TEXT DEFAULT 'pendente', -- 'pendente', 'aprovado', 'rejeitado'
ADD COLUMN IF NOT EXISTS status_aprovacao_rh TEXT DEFAULT 'pendente',
ADD COLUMN IF NOT EXISTS status_aprovacao_contabilidade TEXT DEFAULT 'pendente';

-- 2. Tabela de Histórico de Aprovações (Audit Trail)
CREATE TABLE IF NOT EXISTS public.ferias_aprovacoes_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ferias_id UUID REFERENCES public.ferias(id) ON DELETE CASCADE,
    nivel TEXT NOT NULL, -- 'gestor', 'rh', 'contabilidade'
    aprovador_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL,
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ferias_aprovacoes_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso aos logs de aprovação" ON public.ferias_aprovacoes_log;
CREATE POLICY "Acesso aos logs de aprovação"
ON public.ferias_aprovacoes_log FOR SELECT
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'rh', 'gestor')
));

-- 3. Função para atualizar status de gozo automaticamente
CREATE OR REPLACE FUNCTION public.fn_update_ferias_status_by_date()
RETURNS TRIGGER AS $$
BEGIN
    -- Se aprovada e hoje está entre início e fim, marca 'em_gozo'
    IF (NEW.status = 'aprovada' AND CURRENT_DATE BETWEEN NEW.data_inicio AND NEW.data_fim) THEN
        NEW.status = 'em_gozo';
    ELSIF (NEW.status = 'em_gozo' AND CURRENT_DATE > NEW.data_fim) THEN
        NEW.status = 'concluida';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_ferias_status ON public.ferias;
CREATE TRIGGER tr_update_ferias_status
BEFORE INSERT OR UPDATE ON public.ferias
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_ferias_status_by_date();

-- 4. Função para calcular período aquisitivo automático
CREATE OR REPLACE FUNCTION public.fn_calculate_periodo_aquisitivo(_colaborador_id UUID)
RETURNS TABLE (inicio DATE, fim DATE) AS $$
DECLARE
    data_adm DATE;
    anos_completos INTEGER;
BEGIN
    SELECT data_admissao INTO data_adm FROM public.colaboradores WHERE id = _colaborador_id;
    anos_completos := floor(EXTRACT(DAY FROM (CURRENT_DATE - data_adm)) / 365.25);
    
    RETURN QUERY SELECT 
        (data_adm + (anos_completos * interval '1 year'))::DATE,
        (data_adm + ((anos_completos + 1) * interval '1 year') - interval '1 day')::DATE;
END;
$$ LANGUAGE plpgsql;
