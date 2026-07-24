-- Expansão de Departamentos para Hierarquia
ALTER TABLE public.departamentos 
ADD COLUMN IF NOT EXISTS departamento_pai_id UUID REFERENCES public.departamentos(id),
ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES public.colaboradores(id),
ADD COLUMN IF NOT EXISTS codigo_centro_custo TEXT;

-- Expansão de Cargos
ALTER TABLE public.cargos
ADD COLUMN IF NOT EXISTS descricao TEXT,
ADD COLUMN IF NOT EXISTS requisitos TEXT,
ADD COLUMN IF NOT EXISTS nivel_hierarquico INTEGER DEFAULT 1;

-- Tabela de Faixas Salariais (Grades)
CREATE TABLE IF NOT EXISTS public.cargo_faixas_salariais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cargo_id UUID REFERENCES public.cargos(id) ON DELETE CASCADE,
    nivel TEXT NOT NULL, -- Ex: Junior, Pleno, Senior
    valor_minimo DECIMAL(12,2) NOT NULL,
    valor_maximo DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.cargo_faixas_salariais ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Faixas acessíveis por empresa" ON public.cargo_faixas_salariais;
CREATE POLICY "Faixas acessíveis por empresa" ON public.cargo_faixas_salariais
    FOR ALL USING (cargo_id IN (SELECT id FROM public.cargos));

-- Trigger de Updated_at
DROP TRIGGER IF EXISTS set_timestamp_cargo_faixas ON public.cargo_faixas_salariais;
CREATE TRIGGER set_timestamp_cargo_faixas
BEFORE UPDATE ON public.cargo_faixas_salariais
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
