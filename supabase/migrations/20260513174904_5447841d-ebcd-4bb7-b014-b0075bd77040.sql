-- Tabela para log de execução de automações
CREATE TABLE IF NOT EXISTS public.automacao_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID,
    entidade_id UUID,
    tipo_evento TEXT,
    status TEXT DEFAULT 'pendente',
    detalhes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.automacao_logs ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Logs de automação visíveis para gestores" ON public.automacao_logs;
CREATE POLICY "Logs de automação visíveis para gestores" 
ON public.automacao_logs 
FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('admin', 'gestor')));

-- Função para processar workflow de admissão
CREATE OR REPLACE FUNCTION public.fn_processar_workflow_admissao()
RETURNS TRIGGER AS $$
BEGIN
    -- Loga o início da automação
    INSERT INTO public.automacao_logs (entidade_id, tipo_evento, status, detalhes)
    VALUES (NEW.id, 'ADMISSAO_CRIADA', 'processando', jsonb_build_object(
        'nome', NEW.nome_completo,
        'empresa_id', NEW.empresa_id
    ));

    -- Dispara notificação para o RH (Simulado via tabela de notificações)
    INSERT INTO public.notificacoes (user_id, titulo, mensagem, tipo, lida)
    SELECT 
        ur.user_id, 
        'Nova Admissão Iniciada', 
        'O processo de admissão para ' || NEW.nome_completo || ' foi iniciado automaticamente.',
        'info',
        false
    FROM public.user_roles ur
    WHERE ur.role IN ('admin', 'gestor') 
    AND ur.user_id IS NOT NULL;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para novas admissões
DROP TRIGGER IF EXISTS trg_workflow_admissao ON public.admissoes;
CREATE TRIGGER trg_workflow_admissao
AFTER INSERT ON public.admissoes
FOR EACH ROW
EXECUTE FUNCTION public.fn_processar_workflow_admissao();
