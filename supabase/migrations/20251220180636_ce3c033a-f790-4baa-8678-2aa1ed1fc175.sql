-- Create storage bucket for signatures (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('assinaturas', 'assinaturas', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for signatures bucket
DROP POLICY IF EXISTS "Authenticated users can upload signatures" ON storage.objects;
CREATE POLICY "Authenticated users can upload signatures"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assinaturas' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can view signatures" ON storage.objects;
CREATE POLICY "Authenticated users can view signatures"
ON storage.objects FOR SELECT
USING (bucket_id = 'assinaturas' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public can upload signatures via token" ON storage.objects;
CREATE POLICY "Public can upload signatures via token"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assinaturas');

DROP POLICY IF EXISTS "Public can view signatures via token" ON storage.objects;
CREATE POLICY "Public can view signatures via token"
ON storage.objects FOR SELECT
USING (bucket_id = 'assinaturas');

-- Add signature_url column to admissao_tokens if not exists
ALTER TABLE public.admissao_tokens 
ADD COLUMN IF NOT EXISTS assinatura_url TEXT;