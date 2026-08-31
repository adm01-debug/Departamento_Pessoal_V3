-- Stubs mínimos alinhados ao schema canônico self-hosted (31/08/2026).
\set ON_ERROR_STOP on

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;
CREATE SCHEMA storage;

CREATE TABLE auth._test_uid(uid uuid);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS
  $$ SELECT uid FROM auth._test_uid LIMIT 1 $$;
CREATE FUNCTION auth._set_uid(u uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, pg_catalog AS
  $$ BEGIN DELETE FROM auth._test_uid; INSERT INTO auth._test_uid VALUES (u); END $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth._set_uid(uuid) TO anon, authenticated, service_role;

CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean NOT NULL DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[],
  owner text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text NOT NULL,
  owner uuid,
  owner_id text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (bucket_id, name)
);
CREATE FUNCTION storage.foldername("name" text) RETURNS text[]
LANGUAGE sql IMMUTABLE AS $$ SELECT string_to_array("name", '/') $$;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT SELECT ON storage.buckets TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated, service_role;
GRANT SELECT ON storage.objects TO anon;

CREATE TYPE public.app_role AS ENUM (
  'admin', 'manager', 'supervisor', 'agent', 'special_agent', 'dev',
  'financeiro', 'operacional', 'visualizador', 'contador', 'operator', 'viewer'
);
CREATE TABLE public.user_empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  role public.app_role NOT NULL,
  is_default boolean DEFAULT false,
  provisioned_via text,
  scim_external_id text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, empresa_id)
);
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS
  $$ SELECT EXISTS (
       SELECT 1 FROM public.user_empresas ue
       WHERE ue.user_id = _user_id AND ue.role = _role AND ue.ativo IS TRUE
     ) $$;

-- Drift legado: uma sobrecarga pública que E-012 deve retirar da API.
CREATE FUNCTION public.get_my_permissions(p_other_user uuid)
RETURNS TABLE(permissao text, empresa_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER AS
  $$ SELECT role::text, empresa_id FROM public.user_empresas WHERE user_id = p_other_user $$;
REVOKE ALL ON FUNCTION public.get_my_permissions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_permissions(uuid) TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public) VALUES
  ('documentos-admissao', 'documentos-admissao', true),
  ('ponto-biometria', 'ponto-biometria', true),
  ('avatars', 'avatars', true);
