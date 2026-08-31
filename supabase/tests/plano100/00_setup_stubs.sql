-- Setup de teste: stubs mínimos fiéis ao ambiente Supabase do projeto
-- + DRIFT SIMULADO de produção (sobrecargas legadas com grant a anon).
\set ON_ERROR_STOP on

CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE SCHEMA auth;
CREATE SCHEMA storage;

-- auth.uid() stub: valor controlável em teste
CREATE TABLE auth._test_uid(uid uuid);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS
  $$ SELECT uid FROM auth._test_uid LIMIT 1 $$;
-- Setter determinístico (linha única) usável sob SET ROLE:
CREATE FUNCTION auth._set_uid(u uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, pg_catalog AS
  $$ BEGIN DELETE FROM auth._test_uid; INSERT INTO auth._test_uid VALUES (u); END $$;
GRANT EXECUTE ON FUNCTION auth._set_uid(uuid) TO anon, authenticated, service_role;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

-- ── storage (DDL mínima fiel ao Supabase) ────────────────────────────────
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
  owner text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (bucket_id, name)
);
CREATE FUNCTION storage.foldername("name" text) RETURNS text[]
LANGUAGE sql IMMUTABLE AS
  $$ SELECT string_to_array("name", '/') $$;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT SELECT ON storage.buckets TO anon, authenticated, service_role;
-- Grants padrão do Supabase em storage.objects (RLS controla o que cada
-- role efetivamente enxerga):
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated, service_role;
GRANT SELECT ON storage.objects TO anon;

-- ── app_role + funções de autorização (como no repo) ─────────────────────
CREATE TYPE public.app_role AS ENUM ('admin','gestor','rh','colaborador');
CREATE TABLE public.user_empresas (
  user_id uuid NOT NULL,
  empresa_id uuid NOT NULL,
  papel text,
  role text,
  PRIMARY KEY (user_id, empresa_id)
);
CREATE FUNCTION public.has_role(_uid uuid, _r public.app_role) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS
  $$ SELECT EXISTS (SELECT 1 FROM public.user_empresas ue
      WHERE ue.user_id = _uid AND (ue.papel = _r::text OR ue.role = _r::text)) $$;
CREATE FUNCTION public.get_user_empresas(_uid uuid) RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS
  $$ SELECT empresa_id FROM public.user_empresas WHERE user_id = _uid $$;
CREATE FUNCTION public.user_belongs_to_empresa(_uid uuid, _e uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS
  $$ SELECT EXISTS (SELECT 1 FROM public.user_empresas WHERE user_id=_uid AND empresa_id=_e) $$;

-- ── audit_log_unified (colunas usadas pelas migrations) ──────────────────
CREATE TABLE public.audit_log_unified (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text, entity text, entity_id text, action text,
  empresa_id uuid, payload jsonb, user_id uuid, created_at timestamptz DEFAULT now()
);

-- ── DRIFT SIMULADO (estado de produção pré-migration) ────────────────────
-- Sobrecarga legada com grant público: o cenário que E-012 deve endurecer.
CREATE FUNCTION public.get_my_permissions(p_other_user uuid)
RETURNS TABLE(permissao text, empresa_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER AS
  $$ SELECT papel, empresa_id FROM public.user_empresas WHERE user_id = p_other_user $$;
REVOKE ALL ON FUNCTION public.get_my_permissions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_permissions(uuid) TO anon, authenticated;

-- Buckets pré-existentes com o defeito que E-028 corrige:
INSERT INTO storage.buckets (id, name, public) VALUES
  ('documentos-admissao', 'documentos-admissao', true),
  ('ponto-biometria', 'ponto-biometria', true),
  ('avatars', 'avatars', true);
