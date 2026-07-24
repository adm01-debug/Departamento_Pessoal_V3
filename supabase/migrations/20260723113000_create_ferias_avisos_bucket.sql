-- Corrige lacuna da migração 20260723100640 (feature "assinatura de aviso de férias"):
-- as policies RLS de storage.objects foram criadas para o bucket 'ferias-avisos',
-- porém o bucket em si nunca foi criado. Sem isto, o upload do PDF assinado falha
-- em runtime com "Bucket not found" e toda a assinatura eletrônica quebra.
--
-- Bucket PRIVADO (acesso via createSignedUrl), limite 10 MB, apenas application/pdf.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ferias-avisos', 'ferias-avisos', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
