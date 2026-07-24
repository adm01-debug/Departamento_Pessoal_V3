-- Create personnel_budget table
CREATE TABLE IF NOT EXISTS public.personnel_budget (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    departamento TEXT NOT NULL,
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    valor_orcado DECIMAL(15,2) NOT NULL DEFAULT 0,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(empresa_id, departamento, ano, mes)
);

-- Enable RLS
ALTER TABLE public.personnel_budget ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified)
DROP POLICY IF EXISTS "Users can view budgets of their own company" ON public.personnel_budget;
CREATE POLICY "Users can view budgets of their own company"
    ON public.personnel_budget FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND empresa_id = personnel_budget.empresa_id
    ));

DROP POLICY IF EXISTS "Users can manage budgets of their own company" ON public.personnel_budget;
CREATE POLICY "Users can manage budgets of their own company"
    ON public.personnel_budget FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND empresa_id = personnel_budget.empresa_id
    ));

-- Function for projections
CREATE OR REPLACE FUNCTION public.get_personnel_cost_projection(p_empresa_id UUID, p_months INTEGER)
RETURNS TABLE (
    mes_ref DATE,
    total_estimado DECIMAL(15,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE months AS (
        SELECT date_trunc('month', now())::date as m
        UNION ALL
        SELECT (m + interval '1 month')::date
        FROM months
        WHERE m < (date_trunc('month', now()) + (p_months - 1 || ' months')::interval)::date
    )
    SELECT 
        m as mes_ref,
        (
            -- Average monthly payroll from last 3 months + monthly provisions
            COALESCE((SELECT AVG(total_liquido) FROM public.folhas_pagamento WHERE empresa_id = p_empresa_id), 5000) +
            COALESCE((SELECT SUM(total) FROM public.provisoes_mensais WHERE empresa_id = p_empresa_id AND competencia = to_char(m, 'YYYY-MM')), 0)
        )::DECIMAL(15,2) as total_estimado
    FROM months;
END;
$$ LANGUAGE plpgsql STABLE;
