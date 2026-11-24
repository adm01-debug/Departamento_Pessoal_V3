\set ON_ERROR_STOP on

-- O schema Auth da imagem local é compatível com o canônico, mas não contém
-- quatro índices operacionais existentes no projeto hospedado. Aplicar apenas
-- em restore/staging após comparar canonical_auth_schema.sql.
CREATE INDEX IF NOT EXISTS idx_users_created_at_desc
  ON auth.users USING btree (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_email
  ON auth.users USING btree (email);

CREATE INDEX IF NOT EXISTS idx_users_last_sign_in_at_desc
  ON auth.users USING btree (last_sign_in_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_name
  ON auth.users USING btree ((raw_user_meta_data ->> 'name'::text))
  WHERE (raw_user_meta_data ->> 'name'::text) IS NOT NULL;
