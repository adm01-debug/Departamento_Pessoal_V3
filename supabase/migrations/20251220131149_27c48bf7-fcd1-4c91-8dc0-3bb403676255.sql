-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos-colaboradores',
  'documentos-colaboradores',
  false,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage policies for authenticated users
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
CREATE POLICY "Users can view documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'documentos-colaboradores' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can upload documents" ON storage.objects;
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'documentos-colaboradores' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;
CREATE POLICY "Users can delete documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'documentos-colaboradores' AND auth.role() = 'authenticated');