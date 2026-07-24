DROP POLICY IF EXISTS "Acesso publico aos arquivos de afastamento" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados podem ver arquivos de afastamento" ON storage.objects;
CREATE POLICY "Autenticados podem ver arquivos de afastamento"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'afastamentos');

DROP POLICY IF EXISTS "Anyone can view admissao documents" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados podem ver documentos de admissao" ON storage.objects;
CREATE POLICY "Autenticados podem ver documentos de admissao"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documentos-admissao');