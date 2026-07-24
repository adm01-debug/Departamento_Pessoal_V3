-- Tabela para Comunicação de Acidente de Trabalho (S-2210)
CREATE TABLE IF NOT EXISTS public.sst_cat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas(id),
    data_acidente TIMESTAMP WITH TIME ZONE NOT NULL,
    tipo_acidente TEXT NOT NULL, -- 'tipico', 'trajeto', 'doenca'
    local_acidente TEXT,
    parte_corpo_atingida TEXT,
    agente_causador TEXT,
    houve_afastamento BOOLEAN DEFAULT false,
    houve_obito BOOLEAN DEFAULT false,
    status_esocial TEXT DEFAULT 'pendente',
    protocolo_esocial TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Tabela para Condições Ambientais do Trabalho (S-2240) - Agentes Nocivos
CREATE TABLE IF NOT EXISTS public.sst_exposicao_riscos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    ambiente_id UUID, -- Referência a locais_trabalho se necessário
    agente_nocivo_codigo TEXT, -- Tabela 24 do eSocial
    intensidade_concentracao TEXT,
    tecnica_utilizada TEXT,
    epi_eficaz BOOLEAN DEFAULT true,
    data_inicio_exposicao DATE NOT NULL,
    data_fim_exposicao DATE,
    status_esocial TEXT DEFAULT 'pendente',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.sst_cat ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sst_exposicao_riscos ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Gestores de RH podem ver CATs" ON public.sst_cat;
CREATE POLICY "Gestores de RH podem ver CATs" ON public.sst_cat FOR SELECT USING (true);
DROP POLICY IF EXISTS "Gestores de RH podem ver Riscos" ON public.sst_exposicao_riscos;
CREATE POLICY "Gestores de RH podem ver Riscos" ON public.sst_exposicao_riscos FOR SELECT USING (true);

-- Trigger para log de auditoria em alterações de SST
CREATE OR REPLACE FUNCTION public.registrar_auditoria_sst()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.auditoria_logs (tabela, registro_id, acao, dados_novos, criado_por)
    VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(NEW), auth.uid());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auditoria_sst_cat ON public.sst_cat;
CREATE TRIGGER trigger_auditoria_sst_cat
AFTER INSERT OR UPDATE ON public.sst_cat
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_sst();

DROP TRIGGER IF EXISTS trigger_auditoria_sst_riscos ON public.sst_exposicao_riscos;
CREATE TRIGGER trigger_auditoria_sst_riscos
AFTER INSERT OR UPDATE ON public.sst_exposicao_riscos
FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_sst();
