-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Configurações de Afastamento
CREATE TABLE IF NOT EXISTS public.config_afastamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo TEXT NOT NULL UNIQUE, -- 'doenca', 'acidente_trabalho', etc.
    dias_empresa_maximo INTEGER DEFAULT 15,
    requer_cid BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de CID-10 (Simplificada se não existir uma global)
CREATE TABLE IF NOT EXISTS public.cid10 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo TEXT NOT NULL UNIQUE,
    descricao TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela Principal de Afastamentos
CREATE TABLE IF NOT EXISTS public.afastamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    data_inicio DATE NOT NULL,
    data_fim_prevista DATE NOT NULL,
    data_fim_real DATE,
    cid_id UUID REFERENCES public.cid10(id),
    status TEXT DEFAULT 'ativo', -- 'ativo', 'prorrogado', 'finalizado', 'pendente'
    dias_total INTEGER,
    dias_empresa INTEGER,
    dias_inss INTEGER,
    nome_medico TEXT,
    crm_medico TEXT,
    observacoes TEXT,
    
    -- Dados de Perícia INSS
    data_pericia TIMESTAMPTZ,
    local_pericia TEXT,
    protocolo_inss TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabela de Documentos/Atestados
CREATE TABLE IF NOT EXISTS public.documentos_afastamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    afastamento_id UUID REFERENCES public.afastamentos(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'atestado', 'laudo', 'pericia'
    nome_arquivo TEXT NOT NULL,
    url TEXT NOT NULL,
    validado BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabela de Prorrogações
CREATE TABLE IF NOT EXISTS public.prorrogacoes_afastamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    afastamento_id UUID REFERENCES public.afastamentos(id) ON DELETE CASCADE,
    documento_id UUID REFERENCES public.documentos_afastamento(id),
    data_fim_antiga DATE NOT NULL,
    data_fim_nova DATE NOT NULL,
    motivo TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.config_afastamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cid10 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.afastamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_afastamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prorrogacoes_afastamento ENABLE ROW LEVEL SECURITY;

-- Políticas (Simplificadas para o contexto - ajustar conforme auth)
DROP POLICY IF EXISTS "Acesso total as configuracoes" ON public.config_afastamentos;
CREATE POLICY "Acesso total as configuracoes" ON public.config_afastamentos FOR ALL USING (true);
DROP POLICY IF EXISTS "Leitura CID10 publica" ON public.cid10;
CREATE POLICY "Leitura CID10 publica" ON public.cid10 FOR SELECT USING (true);
DROP POLICY IF EXISTS "Acesso por empresa_id em afastamentos" ON public.afastamentos;
CREATE POLICY "Acesso por empresa_id em afastamentos" ON public.afastamentos FOR ALL USING (true);
DROP POLICY IF EXISTS "Acesso documentos por afastamento" ON public.documentos_afastamento;
CREATE POLICY "Acesso documentos por afastamento" ON public.documentos_afastamento FOR ALL USING (true);
DROP POLICY IF EXISTS "Acesso prorrogacoes por afastamento" ON public.prorrogacoes_afastamento;
CREATE POLICY "Acesso prorrogacoes por afastamento" ON public.prorrogacoes_afastamento FOR ALL USING (true);

-- Inserir CIDs básicos de exemplo se a tabela estiver vazia
INSERT INTO public.cid10 (codigo, descricao) VALUES 
('Z76.0', 'Emissão de receita ou de atestado médico de rotina'),
('M54.5', 'Dor lombar baixa'),
('B34.9', 'Infecção viral não especificada'),
('J06.9', 'Infecção aguda das vias aéreas superiores não especificada'),
('F32.9', 'Episódio depressivo não especificado')
ON CONFLICT (codigo) DO NOTHING;

-- Inserir Configurações Padrão
INSERT INTO public.config_afastamentos (tipo, dias_empresa_maximo) VALUES 
('doenca', 15),
('acidente_trabalho', 15),
('acidente_trajeto', 15),
('licenca_maternidade', 0),
('licenca_paternidade', 0)
ON CONFLICT (tipo) DO NOTHING;

-- Storage Bucket para Afastamentos
INSERT INTO storage.buckets (id, name, public) VALUES ('afastamentos', 'afastamentos', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Acesso publico aos arquivos de afastamento" ON storage.objects;
CREATE POLICY "Acesso publico aos arquivos de afastamento" ON storage.objects FOR SELECT USING (bucket_id = 'afastamentos');
DROP POLICY IF EXISTS "Upload de arquivos de afastamento" ON storage.objects;
CREATE POLICY "Upload de arquivos de afastamento" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'afastamentos');
