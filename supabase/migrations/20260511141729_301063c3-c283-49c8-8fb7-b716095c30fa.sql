-- Adicionar colunas necessárias na rubricas_folha
ALTER TABLE public.rubricas_folha 
ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS codigo_esocial TEXT,
ADD COLUMN IF NOT EXISTS natureza_rubrica TEXT;

-- Habilitar RLS
ALTER TABLE public.rubricas_folha ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "Usuários podem visualizar rubricas da empresa" ON public.rubricas_folha;
DROP POLICY IF EXISTS "Admins podem gerenciar rubricas" ON public.rubricas_folha;

-- Políticas de acesso por empresa (incluindo rubricas globais onde empresa_id é nulo)
DROP POLICY IF EXISTS "Visualização por empresa ou global" ON public.rubricas_folha;
CREATE POLICY "Visualização por empresa ou global" 
ON public.rubricas_folha FOR SELECT 
TO authenticated
USING (
  (empresa_id::uuid = (auth.jwt()->>'empresa_id')::uuid) OR 
  (empresa_id IS NULL)
);

-- Somente administradores da empresa podem gerenciar rubricas
DROP POLICY IF EXISTS "Gerenciamento por admin" ON public.rubricas_folha;
CREATE POLICY "Gerenciamento por admin" 
ON public.rubricas_folha FOR ALL 
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') AND 
  (empresa_id::uuid = (auth.jwt()->>'empresa_id')::uuid OR empresa_id IS NULL)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') AND 
  (empresa_id::uuid = (auth.jwt()->>'empresa_id')::uuid OR empresa_id IS NULL)
);

-- Garantir que rubricas padrão existam (exemplo eSocial)
INSERT INTO public.rubricas_folha (codigo, descricao, tipo, incide_inss, incide_irrf, incide_fgts, automatico, codigo_esocial)
VALUES 
('1000', 'Salário Base', 'provento', true, true, true, true, '1000'),
('5000', 'INSS', 'desconto', false, false, false, true, '9201'),
('5001', 'IRRF', 'desconto', false, false, false, true, '9202')
ON CONFLICT (codigo) DO UPDATE 
SET codigo_esocial = EXCLUDED.codigo_esocial;