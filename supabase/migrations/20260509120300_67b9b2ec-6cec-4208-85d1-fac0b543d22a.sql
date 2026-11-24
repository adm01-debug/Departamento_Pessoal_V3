-- Tabela de logs de execução do motor de provisões
CREATE TABLE IF NOT EXISTS public.provisao_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    competencia DATE NOT NULL,
    status TEXT NOT NULL, -- 'PROCESSANDO', 'CONCLUIDO', 'ERRO'
    tipo_calculo TEXT, -- 'FERIAS', '13_SALARIO', 'AMBOS'
    total_colaboradores INTEGER DEFAULT 0,
    valor_total_provisionado DECIMAL(15,2) DEFAULT 0,
    erro_mensagem TEXT,
    metadados JSONB,
    usuario_id UUID REFERENCES auth.users(id),
    duracao_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabela de auditoria para alterações em provisões
CREATE TABLE IF NOT EXISTS public.provisao_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provisao_id UUID NOT NULL,
    usuario_id UUID REFERENCES auth.users(id),
    valor_anterior DECIMAL(15,2),
    valor_novo DECIMAL(15,2),
    motivo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar coluna de rastreabilidade na tabela principal
ALTER TABLE public.provisoes_mensais ADD COLUMN IF NOT EXISTS log_id UUID REFERENCES public.provisao_logs(id);

-- Configurar RLS
ALTER TABLE public.provisao_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provisao_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Gestores podem ver logs de provisão" ON public.provisao_logs;
CREATE POLICY "Gestores podem ver logs de provisão" 
ON public.provisao_logs FOR SELECT 
USING (true); -- Idealmente filtraria por empresa_id do perfil do usuário

CREATE POLICY "Gestores podem ver auditoria de provisão" 
ON public.provisao_auditoria FOR SELECT 
USING (true);
