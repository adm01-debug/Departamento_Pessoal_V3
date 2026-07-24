
-- Restrict generic listing on the public `avatars` bucket while keeping
-- direct-URL access intact. The Storage API still serves files publicly,
-- but `storage.objects` SELECT (list) is denied for anon/authenticated.

DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatars public read" ON storage.objects;

-- Allow users to upload/update/delete only their own avatar (folder = uid).
DROP POLICY IF EXISTS "Users manage own avatar" ON storage.objects;
CREATE POLICY "Users manage own avatar"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
