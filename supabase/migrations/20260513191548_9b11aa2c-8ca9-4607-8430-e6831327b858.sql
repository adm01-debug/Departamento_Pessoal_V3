-- 1. Tabela de Logs do Sistema
CREATE TABLE IF NOT EXISTS public.logs_sistema (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nivel TEXT NOT NULL, -- 'info', 'warn', 'error', 'fatal'
    mensagem TEXT NOT NULL,
    contexto JSONB,
    stack_trace TEXT,
    user_id UUID, -- Opcional
    url TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.logs_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Apenas administradores veem logs do sistema" ON public.logs_sistema;
CREATE POLICY "Apenas administradores veem logs do sistema"
ON public.logs_sistema FOR SELECT
USING (auth.uid() IN (
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
));

-- 2. Função de limpeza automática (mantém apenas 30 dias)
CREATE OR REPLACE FUNCTION public.fn_cleanup_old_logs()
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.logs_sistema WHERE created_at < now() - interval '30 days';
END;
$$ LANGUAGE plpgsql;
