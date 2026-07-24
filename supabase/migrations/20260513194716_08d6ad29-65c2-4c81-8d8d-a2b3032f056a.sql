-- View para projeção de passivo trabalhista (Férias + 1/3 + Provisão de Rescisão)
CREATE OR REPLACE VIEW public.vw_passivo_trabalhista_consolidado AS
SELECT 
    c.id as colaborador_id,
    c.nome_completo,
    c.salario_base,
    c.data_admissao,
    pa.data_inicio as periodo_aquisitivo_inicio,
    pa.data_fim as periodo_aquisitivo_fim,
    -- Cálculo simplificado de dias de direito (proporcional)
    LEAST(30, floor(extract(day from (now() - pa.data_inicio))/30)*2.5) as dias_direito,
    -- Valor projetado das férias + 1/3
    (c.salario_base / 30 * LEAST(30, floor(extract(day from (now() - pa.data_inicio))/30)*2.5)) * 1.33 as valor_ferias_projetado,
    -- Alerta de risco de férias em dobro (período concessivo vencendo em 90 dias)
    CASE 
        WHEN (pa.data_fim + INTERVAL '9 months') < now() THEN 'critico'
        WHEN (pa.data_fim + INTERVAL '6 months') < now() THEN 'alerta'
        ELSE 'normal'
    END as status_risco_ferias
FROM public.colaboradores c
JOIN public.periodos_aquisitivos pa ON c.id = pa.colaborador_id
WHERE c.status = 'ativo' AND pa.status = 'aberto';

-- Tabela para alertas proativos de IA
CREATE TABLE IF NOT EXISTS public.ia_provisoes_alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id),
    tipo_alerta TEXT, -- 'FERIAS_EM_DOBRO', 'BANCO_HORAS_EXPIRANDO', 'RESCISAO_ALTO_CUSTO'
    descricao TEXT,
    impacto_financeiro_estimado NUMERIC,
    sugestao_acao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ia_provisoes_alertas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Gestores podem ver alertas de IA" ON public.ia_provisoes_alertas;
CREATE POLICY "Gestores podem ver alertas de IA" ON public.ia_provisoes_alertas FOR SELECT USING (true);

-- Função para popular alertas (Simulada para rodar via cron)
CREATE OR REPLACE FUNCTION public.gerar_alertas_preditivos_ia()
RETURNS VOID AS $$
BEGIN
    -- Alerta de Férias em Dobro
    INSERT INTO public.ia_provisoes_alertas (empresa_id, tipo_alerta, descricao, impacto_financeiro_estimado, sugestao_acao)
    SELECT 
        c.empresa_id, 
        'FERIAS_EM_DOBRO', 
        'Colaborador ' || c.nome_completo || ' entrará em período de férias em dobro em breve.',
        c.salario_base * 1.33,
        'Agendar gozo de férias para antes de ' || (pa.data_fim + INTERVAL '12 months')::date
    FROM public.colaboradores c
    JOIN public.periodos_aquisitivos pa ON c.id = pa.colaborador_id
    WHERE pa.status = 'aberto' AND (pa.data_fim + INTERVAL '10 months') < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
