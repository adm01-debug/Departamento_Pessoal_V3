-- Function for audit logging
CREATE OR REPLACE FUNCTION public.processar_auditoria_premiacao()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Try to get current user ID (might be null in some contexts)
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    INSERT INTO public.premiacoes_auditoria (
        entidade_tipo,
        entidade_id,
        usuario_id,
        acao,
        dados_anteriores,
        dados_novos,
        created_at
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_user_id,
        TG_OP,
        CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        to_jsonb(NEW),
        now()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for Campaigns
DROP TRIGGER IF EXISTS tr_auditoria_premiacoes_campanhas ON public.premiacoes_campanhas;
CREATE TRIGGER tr_auditoria_premiacoes_campanhas
AFTER INSERT OR UPDATE ON public.premiacoes_campanhas
FOR EACH ROW EXECUTE FUNCTION public.processar_auditoria_premiacao();

-- Triggers for Payments
DROP TRIGGER IF EXISTS tr_auditoria_premiacoes_pagamentos ON public.premiacoes_pagamentos;
CREATE TRIGGER tr_auditoria_premiacoes_pagamentos
AFTER INSERT OR UPDATE ON public.premiacoes_pagamentos
FOR EACH ROW EXECUTE FUNCTION public.processar_auditoria_premiacao();

-- Enable RLS for rewards tables (ensuring they are enabled)
ALTER TABLE public.premiacoes_campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premiacoes_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premiacoes_regras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premiacoes_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premiacoes_roi_cenarios ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Simplified for demo, usually tied to empresa_id)
-- Using a permissive policy for testing but in production should be tied to user/empresa
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permissive access for rewards') THEN
        CREATE POLICY "Permissive access for rewards" ON public.premiacoes_campanhas FOR ALL USING (true);
        CREATE POLICY "Permissive access for rewards" ON public.premiacoes_pagamentos FOR ALL USING (true);
        CREATE POLICY "Permissive access for rewards" ON public.premiacoes_regras FOR ALL USING (true);
        CREATE POLICY "Permissive access for rewards" ON public.premiacoes_auditoria FOR ALL USING (true);
        CREATE POLICY "Permissive access for rewards" ON public.premiacoes_roi_cenarios FOR ALL USING (true);
    END IF;
END $$;
