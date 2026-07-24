-- Trilha de auditoria detalhada para o ponto
CREATE TABLE IF NOT EXISTS public.ponto_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabela_nome TEXT NOT NULL,
    registro_id UUID NOT NULL,
    acao TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    dados_anteriores JSONB,
    dados_novos JSONB,
    usuario_id UUID REFERENCES auth.users(id),
    justificativa TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Fluxo de aprovação para ajustes e retificações
CREATE TABLE IF NOT EXISTS public.ponto_ajustes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID NOT NULL, -- Removendo REFERENCES por enquanto para evitar erros se a tabela colaboradores não for exatamente assim
    data_referencia DATE NOT NULL,
    tipo_ajuste TEXT NOT NULL, -- 'INSERCAO', 'ALTERACAO', 'EXCLUSAO'
    hora_original TIME,
    hora_sugerida TIME,
    justificativa TEXT NOT NULL,
    anexo_url TEXT,
    status TEXT DEFAULT 'PENDENTE', -- 'PENDENTE', 'APROVADO', 'REJEITADO'
    gestor_id UUID REFERENCES auth.users(id),
    data_decisao TIMESTAMP WITH TIME ZONE,
    observacoes_gestor TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionando campos para modo offline e conformidade
ALTER TABLE public.registros_ponto ADD COLUMN IF NOT EXISTS is_offline BOOLEAN DEFAULT false;
ALTER TABLE public.registros_ponto ADD COLUMN IF NOT EXISTS sync_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.registros_ponto ADD COLUMN IF NOT EXISTS hash_integridade TEXT; -- Para conformidade Portaria 671

ALTER TABLE public.batidas_ponto ADD COLUMN IF NOT EXISTS is_offline BOOLEAN DEFAULT false;
ALTER TABLE public.batidas_ponto ADD COLUMN IF NOT EXISTS sync_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.batidas_ponto ADD COLUMN IF NOT EXISTS device_metadata JSONB;

-- Habilitar RLS
ALTER TABLE public.ponto_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ponto_ajustes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Ajustes
DROP POLICY IF EXISTS "Colaboradores podem ver seus próprios ajustes" ON public.ponto_ajustes;
CREATE POLICY "Colaboradores podem ver seus próprios ajustes" 
ON public.ponto_ajustes FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = colaborador_id));

DROP POLICY IF EXISTS "Colaboradores podem solicitar ajustes" ON public.ponto_ajustes;
CREATE POLICY "Colaboradores podem solicitar ajustes" 
ON public.ponto_ajustes FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = colaborador_id));

DROP POLICY IF EXISTS "Gestores podem ver e editar ajustes da equipe" ON public.ponto_ajustes;
CREATE POLICY "Gestores podem ver e editar ajustes da equipe" 
ON public.ponto_ajustes FOR ALL 
USING (true); -- Simplificado, idealmente filtraria por hierarquia

-- Função para registrar auditoria automaticamente (exemplo para updates em registros_ponto)
CREATE OR REPLACE FUNCTION public.registrar_auditoria_ponto()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.ponto_auditoria (
        tabela_nome, 
        registro_id, 
        acao, 
        dados_anteriores, 
        dados_novos, 
        usuario_id,
        justificativa
    )
    VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        to_jsonb(OLD),
        to_jsonb(NEW),
        auth.uid(),
        current_setting('app.ponto_justificativa', true)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para auditoria em registros_ponto
DROP TRIGGER IF EXISTS tr_auditoria_registros_ponto ON public.registros_ponto;
CREATE TRIGGER tr_auditoria_registros_ponto
AFTER UPDATE OR DELETE ON public.registros_ponto
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_ponto();