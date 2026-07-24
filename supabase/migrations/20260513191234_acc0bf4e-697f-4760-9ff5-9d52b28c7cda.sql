-- 1. Tabela para Guias FGTS Digital (GFD)
CREATE TABLE IF NOT EXISTS public.guias_fgts_digital (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    competencia TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'mensal', 'rescisoria'
    valor_total NUMERIC(15,2) NOT NULL,
    vencimento DATE NOT NULL,
    status TEXT DEFAULT 'pendente', -- 'pendente', 'processando', 'emitida', 'paga', 'erro'
    gfd_protocolo TEXT,
    gfd_data_geracao TIMESTAMP WITH TIME ZONE,
    pdf_url TEXT,
    qr_code_pix TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.guias_fgts_digital ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores e RH veem guias FGTS" ON public.guias_fgts_digital;
CREATE POLICY "Gestores e RH veem guias FGTS"
ON public.guias_fgts_digital FOR SELECT
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'gestor', 'rh')
));

-- 2. Logs de Eventos FGTS Digital
CREATE TABLE IF NOT EXISTS public.fgts_digital_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guia_id UUID REFERENCES public.guias_fgts_digital(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL,
    acao TEXT NOT NULL, -- 'SOLICITACAO_GUIA', 'CONSULTA_PAGAMENTO'
    request_payload JSONB,
    response_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.fgts_digital_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores veem logs FGTS" ON public.fgts_digital_logs;
CREATE POLICY "Gestores veem logs FGTS"
ON public.fgts_digital_logs FOR SELECT
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'gestor')
));
