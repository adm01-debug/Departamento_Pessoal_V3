
-- documentos table (documentoService.ts, useDocumentos.ts)
CREATE TABLE IF NOT EXISTS public.documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  url TEXT,
  validado BOOLEAN DEFAULT false,
  validado_por UUID,
  data_validade DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth users manage documentos" ON public.documentos;
CREATE POLICY "Auth users manage documentos" ON public.documentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also create storage bucket for documentos if referencing it
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Auth users upload documentos" ON storage.objects;
CREATE POLICY "Auth users upload documentos" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'documentos') WITH CHECK (bucket_id = 'documentos');
