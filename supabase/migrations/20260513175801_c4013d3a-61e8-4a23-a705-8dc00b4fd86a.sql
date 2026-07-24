-- 1. Adicionar coluna para URL da foto
ALTER TABLE public.batidas_ponto ADD COLUMN IF NOT EXISTS foto_biometria_url TEXT;

-- 2. Criar bucket para biometria
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ponto-biometria', 'ponto-biometria', false)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Storage
DROP POLICY IF EXISTS "Colaboradores podem fazer upload de suas fotos de ponto" ON storage.objects;
CREATE POLICY "Colaboradores podem fazer upload de suas fotos de ponto"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ponto-biometria' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Colaboradores podem ver suas próprias fotos de ponto" ON storage.objects;
CREATE POLICY "Colaboradores podem ver suas próprias fotos de ponto"
ON storage.objects FOR SELECT
USING (bucket_id = 'ponto-biometria' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Gestores podem ver fotos de ponto da empresa" ON storage.objects;
CREATE POLICY "Gestores podem ver fotos de ponto da empresa"
ON storage.objects FOR SELECT
USING (bucket_id = 'ponto-biometria' AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role IN ('admin', 'gestor')
));
