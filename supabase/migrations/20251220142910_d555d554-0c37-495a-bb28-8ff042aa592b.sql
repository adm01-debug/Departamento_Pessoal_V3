-- Tabela para documentos que precisam de assinatura digital
CREATE TABLE IF NOT EXISTS public.documentos_assinatura (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo_documento TEXT NOT NULL,
  titulo TEXT NOT NULL,
  conteudo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'assinado', 'cancelado')),
  assinatura_base64 TEXT,
  assinado_em TIMESTAMP WITH TIME ZONE,
  assinado_por UUID,
  ip_assinatura TEXT,
  hash_documento TEXT,
  empresa_id UUID REFERENCES public.empresas(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.documentos_assinatura ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Authenticated users can view documentos_assinatura" ON public.documentos_assinatura;
CREATE POLICY "Authenticated users can view documentos_assinatura"
ON public.documentos_assinatura
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert documentos_assinatura" ON public.documentos_assinatura;
CREATE POLICY "Authenticated users can insert documentos_assinatura"
ON public.documentos_assinatura
FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update documentos_assinatura" ON public.documentos_assinatura;
CREATE POLICY "Authenticated users can update documentos_assinatura"
ON public.documentos_assinatura
FOR UPDATE
USING (auth.role() = 'authenticated');

-- Índices
CREATE INDEX IF NOT EXISTS idx_documentos_assinatura_colaborador ON public.documentos_assinatura(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_documentos_assinatura_status ON public.documentos_assinatura(status);
CREATE INDEX IF NOT EXISTS idx_documentos_assinatura_created ON public.documentos_assinatura(created_at DESC);
