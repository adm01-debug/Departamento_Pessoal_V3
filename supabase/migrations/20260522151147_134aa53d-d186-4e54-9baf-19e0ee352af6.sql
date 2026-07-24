-- Tabela para métricas consolidada
CREATE TABLE IF NOT EXISTS public.metricas_processamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcao_nome TEXT NOT NULL,
    status TEXT NOT NULL, -- success, failure, timeout
    tempo_execucao_ms INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.metricas_processamento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage metrics" ON public.metricas_processamento;
CREATE POLICY "Service role can manage metrics" ON public.metricas_processamento FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- View para Alertas de Timeout (> 55 segundos para functions padrão de 60s)
CREATE OR REPLACE VIEW public.v_alertas_timeout AS
SELECT 
    funcao_nome,
    COUNT(*) as ocorrencias,
    AVG(tempo_execucao_ms) as media_ms,
    MAX(timestamp) as ultima_ocorrencia
FROM public.metricas_processamento
WHERE tempo_execucao_ms > 55000 OR status = 'timeout'
GROUP BY funcao_nome;

-- Tabela de Configuração de Alertas
CREATE TABLE IF NOT EXISTS public.configuracoes_alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metrica TEXT NOT NULL, -- 'timeout', 'queue_backlog', 'error_rate'
    threshold FLOAT NOT NULL,
    email_notificacao TEXT,
    ativa BOOLEAN DEFAULT true
);

ALTER TABLE public.configuracoes_alertas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage alert configs" ON public.configuracoes_alertas;
CREATE POLICY "Admins can manage alert configs" ON public.configuracoes_alertas FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role::text = 'admin'));
