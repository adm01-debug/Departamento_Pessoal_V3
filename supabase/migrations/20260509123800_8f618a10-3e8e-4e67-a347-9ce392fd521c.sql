-- Create scheduled reports table
CREATE TABLE IF NOT EXISTS public.relatorios_agendados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    tipo_relatorio TEXT NOT NULL,
    frequencia TEXT NOT NULL, -- 'diario', 'semanal', 'mensal'
    dia_semana INTEGER, -- 0-6 (Sunday-Saturday)
    dia_mes INTEGER, -- 1-31
    hora_envio TIME NOT NULL DEFAULT '08:00',
    email_destinatario TEXT NOT NULL,
    formato TEXT DEFAULT 'pdf', -- 'pdf', 'excel', 'csv'
    parametros JSONB DEFAULT '{}',
    ativo BOOLEAN DEFAULT true,
    ultimo_envio TIMESTAMP WITH TIME ZONE,
    proximo_envio TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.relatorios_agendados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their company's schedules" ON public.relatorios_agendados;
CREATE POLICY "Users can manage their company's schedules"
    ON public.relatorios_agendados FOR ALL
    USING (empresa_id IN (
        SELECT empresa_id FROM public.user_empresas WHERE user_id = auth.uid()
    ));

-- Create delivery log table
CREATE TABLE IF NOT EXISTS public.log_envio_relatorios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agendamento_id UUID REFERENCES public.relatorios_agendados(id) ON DELETE SET NULL,
    status TEXT NOT NULL, -- 'sucesso', 'erro'
    mensagem TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.log_envio_relatorios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company's delivery logs" ON public.log_envio_relatorios;
CREATE POLICY "Users can view their company's delivery logs"
    ON public.log_envio_relatorios FOR SELECT
    USING (agendamento_id IN (
        SELECT id FROM public.relatorios_agendados
    ));
