-- Tabela de políticas de retenção
CREATE TABLE IF NOT EXISTS public.lgpd_politicas_retencao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_dado TEXT NOT NULL, -- 'candidatos', 'ex_colaboradores', 'documentos_pessoais'
    prazo_meses INTEGER NOT NULL,
    acao_final TEXT DEFAULT 'anonimizar', -- 'excluir', 'anonimizar'
    base_legal TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir políticas padrão
INSERT INTO public.lgpd_politicas_retencao (categoria_dado, prazo_meses, acao_final, base_legal) VALUES
('candidatos', 24, 'excluir', 'Consentimento (Art. 7, I)'),
('ex_colaboradores_sensivel', 60, 'excluir', 'Obrigação Legal (Art. 7, II)'),
('ex_colaboradores_base', 240, 'anonimizar', 'Obrigação Legal (Previdenciário)');

-- Função para anonimizar colaborador
CREATE OR REPLACE FUNCTION public.anonimizar_dados_pessoais(target_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.colaboradores
    SET 
        nome_completo = 'COLABORADOR ANONIMIZADO (LGPD)',
        cpf = '000.000.000-00',
        rg = 'ANONIMO',
        email = 'anonimo@empresa.com.br',
        telefone = '(00) 0000-0000',
        metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{lgpd_anonimizado}', 'true'),
        updated_at = now()
    WHERE id = target_id;

    -- Registrar a ação na auditoria LGPD
    INSERT INTO public.lgpd_solicitacoes (colaborador_id, tipo, status, descricao, concluida_em)
    VALUES (target_id, 'exclusao', 'concluida', 'Anonimização automática por política de retenção', now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Job agendado (Simulado via trigger ou Edge Function Cron)
-- Para este ambiente, criaremos uma tabela de fila de limpeza
CREATE TABLE IF NOT EXISTS public.lgpd_fila_limpeza (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registro_id UUID NOT NULL,
    tabela TEXT NOT NULL,
    data_programada DATE NOT NULL,
    executado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trigger para agendar limpeza ao desligar colaborador
CREATE OR REPLACE FUNCTION public.agendar_limpeza_pos_desligamento()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status = 'desligado' AND (OLD.status IS DISTINCT FROM NEW.status)) THEN
        -- Agendar anonimização para daqui a 5 anos (60 meses)
        INSERT INTO public.lgpd_fila_limpeza (registro_id, tabela, data_programada)
        VALUES (NEW.id, 'colaboradores', (CURRENT_DATE + INTERVAL '60 months')::DATE);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lgpd_limpeza_desligamento ON public.colaboradores;
CREATE TRIGGER trigger_lgpd_limpeza_desligamento
AFTER UPDATE ON public.colaboradores
FOR EACH ROW
EXECUTE FUNCTION public.agendar_limpeza_pos_desligamento();
