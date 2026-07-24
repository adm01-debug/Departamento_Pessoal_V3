-- Create the provisoes_mensais table
CREATE TABLE IF NOT EXISTS public.provisoes_mensais (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    competencia DATE NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('ferias', '13_salario')),
    valor_principal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    encargos_inss NUMERIC(15, 2) NOT NULL DEFAULT 0,
    encargos_fgts NUMERIC(15, 2) NOT NULL DEFAULT 0,
    total NUMERIC(15, 2) GENERATED ALWAYS AS (valor_principal + encargos_inss + encargos_fgts) STORED,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provisoes_mensais ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Usuários podem ver provisões da sua empresa" ON public.provisoes_mensais;
CREATE POLICY "Usuários podem ver provisões da sua empresa" 
ON public.provisoes_mensais 
FOR SELECT 
TO authenticated
USING (empresa_id IN (SELECT get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Usuários podem inserir provisões na sua empresa" ON public.provisoes_mensais;
CREATE POLICY "Usuários podem inserir provisões na sua empresa" 
ON public.provisoes_mensais 
FOR INSERT 
TO authenticated
WITH CHECK (empresa_id IN (SELECT get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Usuários podem atualizar provisões da sua empresa" ON public.provisoes_mensais;
CREATE POLICY "Usuários podem atualizar provisões da sua empresa" 
ON public.provisoes_mensais 
FOR UPDATE 
TO authenticated
USING (empresa_id IN (SELECT get_user_empresas(auth.uid())));

DROP POLICY IF EXISTS "Usuários podem deletar provisões da sua empresa" ON public.provisoes_mensais;
CREATE POLICY "Usuários podem deletar provisões da sua empresa" 
ON public.provisoes_mensais 
FOR DELETE 
TO authenticated
USING (empresa_id IN (SELECT get_user_empresas(auth.uid())));

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_provisoes_mensais_updated_at ON public.provisoes_mensais;
CREATE TRIGGER update_provisoes_mensais_updated_at
BEFORE UPDATE ON public.provisoes_mensais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
