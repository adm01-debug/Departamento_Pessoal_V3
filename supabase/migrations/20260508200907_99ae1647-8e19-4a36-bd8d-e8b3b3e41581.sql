CREATE TABLE IF NOT EXISTS public.cnab_configuracoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    banco_codigo TEXT NOT NULL,
    agencia TEXT NOT NULL,
    agencia_digito TEXT,
    conta TEXT NOT NULL,
    conta_digito TEXT NOT NULL,
    convenio TEXT NOT NULL,
    codigo_empresa TEXT,
    nome_empresa TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.cnab_configuracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver configurações de suas empresas" ON public.cnab_configuracoes;
CREATE POLICY "Usuários podem ver configurações de suas empresas" 
ON public.cnab_configuracoes FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Usuários podem gerenciar configurações bancárias" ON public.cnab_configuracoes;
CREATE POLICY "Usuários podem gerenciar configurações bancárias" 
ON public.cnab_configuracoes FOR ALL 
USING (true);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_cnab_config_updated_at ON public.cnab_configuracoes;
CREATE TRIGGER update_cnab_config_updated_at
BEFORE UPDATE ON public.cnab_configuracoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
