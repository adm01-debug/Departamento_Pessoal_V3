-- Adicionando colunas de assinatura
ALTER TABLE public.esocial_eventos ADD COLUMN IF NOT EXISTS assinatura_xml TEXT;
ALTER TABLE public.esocial_eventos ADD COLUMN IF NOT EXISTS hash_seguranca TEXT;
ALTER TABLE public.esocial_eventos ADD COLUMN IF NOT EXISTS xml_retorno TEXT;
ALTER TABLE public.esocial_eventos ADD COLUMN IF NOT EXISTS recibo TEXT;

-- Tabela para gerenciar certificados (apenas metadados)
CREATE TABLE IF NOT EXISTS public.certificados_digitais (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    subject TEXT,
    issuer TEXT,
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_to TIMESTAMP WITH TIME ZONE,
    thumbprint TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS
ALTER TABLE public.certificados_digitais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage certificates" ON public.certificados_digitais;
CREATE POLICY "Users can manage certificates" ON public.certificados_digitais FOR ALL USING (true);
