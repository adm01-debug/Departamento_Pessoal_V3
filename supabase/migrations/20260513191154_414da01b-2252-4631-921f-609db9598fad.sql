-- 1. Tabela para sessões Gov.br
CREATE TABLE IF NOT EXISTS public.auth_gov_br_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    id_token TEXT,
    nivel_autenticacao TEXT, -- 'bronze', 'prata', 'ouro'
    cpf TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.auth_gov_br_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários veem suas próprias sessões Gov.br" ON public.auth_gov_br_sessions;
CREATE POLICY "Usuários veem suas próprias sessões Gov.br"
ON public.auth_gov_br_sessions FOR SELECT
USING (auth.uid() = user_id);

-- 2. Atributos Gov.br no Perfil
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gov_br_vinculado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS gov_br_nivel TEXT;

-- 3. Função para vincular conta por CPF
CREATE OR REPLACE FUNCTION public.fn_link_gov_br_account(
    _user_id UUID,
    _cpf TEXT,
    _nivel TEXT
) RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles 
    SET gov_br_vinculado = true,
        gov_br_nivel = _nivel
    WHERE id = _user_id;
    
    -- Se o CPF for fornecido, podemos atualizar o colaborador vinculado
    UPDATE public.colaboradores
    SET metadata = jsonb_set(COALESCE(metadata, '{}'::jsonb), '{gov_br_verified}', 'true')
    WHERE cpf = _cpf AND empresa_id IN (SELECT empresa_id FROM public.profiles WHERE id = _user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
