-- Garantir que a coluna exige_cid exista na config_afastamentos
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='config_afastamentos' AND column_name='exige_cid') THEN
        ALTER TABLE public.config_afastamentos ADD COLUMN exige_cid BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Tabela de Referência CID-10
CREATE TABLE IF NOT EXISTS public.cid10 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    descricao TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Atualizar Tabela Principal de Afastamentos (adicionando colunas se faltarem)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='afastamentos' AND column_name='cid_id') THEN
        ALTER TABLE public.afastamentos ADD COLUMN cid_id UUID REFERENCES public.cid10(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='afastamentos' AND column_name='crm_medico') THEN
        ALTER TABLE public.afastamentos ADD COLUMN crm_medico TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='afastamentos' AND column_name='nome_medico') THEN
        ALTER TABLE public.afastamentos ADD COLUMN nome_medico TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='afastamentos' AND column_name='data_pericia') THEN
        ALTER TABLE public.afastamentos ADD COLUMN data_pericia TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='afastamentos' AND column_name='local_pericia') THEN
        ALTER TABLE public.afastamentos ADD COLUMN local_pericia TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='afastamentos' AND column_name='dias_empresa') THEN
        ALTER TABLE public.afastamentos ADD COLUMN dias_empresa INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='afastamentos' AND column_name='dias_inss') THEN
        ALTER TABLE public.afastamentos ADD COLUMN dias_inss INTEGER DEFAULT 0;
    END IF;
END $$;

-- Tabela de Documentos
CREATE TABLE IF NOT EXISTS public.documentos_afastamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    afastamento_id UUID REFERENCES public.afastamentos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    nome_arquivo TEXT NOT NULL,
    url TEXT NOT NULL,
    validado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Histórico de Prorrogações
CREATE TABLE IF NOT EXISTS public.prorrogacoes_afastamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    afastamento_id UUID REFERENCES public.afastamentos(id) ON DELETE CASCADE,
    data_fim_antiga DATE NOT NULL,
    data_fim_nova DATE NOT NULL,
    motivo TEXT,
    documento_id UUID REFERENCES public.documentos_afastamento(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ativar RLS e Criar Políticas se necessário
ALTER TABLE public.cid10 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_afastamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prorrogacoes_afastamento ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'cid10' AND policyname = 'Users can view CID10') THEN
        CREATE POLICY "Users can view CID10" ON public.cid10 FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documentos_afastamento' AND policyname = 'Users can manage their company docs') THEN
        CREATE POLICY "Users can manage their company docs" ON public.documentos_afastamento FOR ALL USING (afastamento_id IN (SELECT id FROM public.afastamentos));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'prorrogacoes_afastamento' AND policyname = 'Users can manage their company prorrogacoes') THEN
        CREATE POLICY "Users can manage their company prorrogacoes" ON public.prorrogacoes_afastamento FOR ALL USING (afastamento_id IN (SELECT id FROM public.afastamentos));
    END IF;
END $$;

-- Dados iniciais
INSERT INTO public.cid10 (codigo, descricao)
VALUES 
('Z76.0', 'Emissão de receita médica repetida'),
('M54.5', 'Dor lombar baixa'),
('B34.9', 'Infecção viral não especificada'),
('J11.1', 'Influenza [gripe] com outras manifestações respiratórias, vírus não identificado')
ON CONFLICT (codigo) DO NOTHING;
