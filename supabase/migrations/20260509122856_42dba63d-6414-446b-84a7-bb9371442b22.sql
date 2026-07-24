-- Add execution log to workflows
ALTER TABLE public.workflows_execucoes 
ADD COLUMN IF NOT EXISTS log_execucao JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS metadata_automacao JSONB DEFAULT '{}';

-- Create notification queue for real delivery
CREATE TABLE IF NOT EXISTS public.fila_notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'email', 'push', 'sms'
    titulo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    status TEXT DEFAULT 'pendente', -- 'pendente', 'enviado', 'falha'
    tentativas INTEGER DEFAULT 0,
    erro_ultimo TEXT,
    metadados JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index for queue processing
CREATE INDEX IF NOT EXISTS idx_fila_notificacoes_status_scheduled ON public.fila_notificacoes(status, scheduled_for);

-- Function to trigger automation on workflow creation
CREATE OR REPLACE FUNCTION public.trigger_workflow_automation()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert a log entry for the start of automation
    NEW.log_execucao = NEW.log_execucao || jsonb_build_object(
        'timestamp', now(),
        'event', 'automation_triggered',
        'message', 'Engine de automação iniciou o processamento do workflow'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_workflows_automation_start ON public.workflows_execucoes;
CREATE TRIGGER tr_workflows_automation_start
BEFORE INSERT ON public.workflows_execucoes
FOR EACH ROW EXECUTE FUNCTION public.trigger_workflow_automation();
