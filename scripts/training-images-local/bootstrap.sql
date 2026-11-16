-- =============================================================================
-- AMBIENTE LOCAL ISOLADO — subconjunto MÍNIMO do schema real do Supabase
-- =============================================================================
-- Usado APENAS para aplicar e validar
--   supabase/migrations/20261023120000_training_images_infrastructure.sql
-- em um PostgreSQL local (nenhum acesso a banco remoto/produção).
--
-- Reproduz do Supabase: roles, `auth.uid()` via `request.jwt.claims`, schema
-- storage (`buckets`, `objects`, `foldername()`), helpers de RLS e as tabelas de
-- treinamento com os MESMOS nomes de coluna do schema gerado
-- (`src/integrations/supabase/types.ts`): `trilhas_aprendizado.nome`,
-- `treinamento_instancias` SEM empresa_id, `treinamento_certificados` SEM
-- empresa_id.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

-- ─── auth.uid() ──────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, email text);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    coalesce(current_setting('request.jwt.claims', true), '{}')::jsonb ->> 'sub',
    ''
  )::uuid
$$;

-- ─── storage (espelho do Supabase Storage) ───────────────────────────────────
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text NOT NULL,
  owner uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Mesma semântica do Storage: devolve só as PASTAS (sem o nome do arquivo).
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  _parts text[];
BEGIN
  _parts := string_to_array(name, '/');
  RETURN _parts[1:array_length(_parts, 1) - 1];
END
$$;

GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON storage.buckets TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;

-- ─── Tabelas de negócio relevantes ───────────────────────────────────────────
CREATE TABLE public.empresas (id uuid PRIMARY KEY, nome text NOT NULL);

CREATE TABLE public.colaboradores (
  id uuid PRIMARY KEY,
  empresa_id uuid REFERENCES public.empresas(id),
  nome_completo text
);

CREATE TABLE public.catalogo_cursos (
  id uuid PRIMARY KEY,
  empresa_id uuid REFERENCES public.empresas(id),
  nome text NOT NULL,
  descricao text,
  categoria text,
  modalidade text,
  carga_horaria numeric,
  obrigatorio boolean,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.trilhas_aprendizado (
  id uuid PRIMARY KEY,
  empresa_id uuid REFERENCES public.empresas(id),
  nome text NOT NULL,
  descricao text,
  nivel text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.trilhas_cursos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trilha_id uuid REFERENCES public.trilhas_aprendizado(id) ON DELETE CASCADE,
  curso_id uuid REFERENCES public.catalogo_cursos(id) ON DELETE CASCADE,
  ordem integer DEFAULT 0,
  obrigatorio boolean DEFAULT true
);

CREATE TABLE public.treinamento_instancias (
  id uuid PRIMARY KEY,
  curso_id uuid REFERENCES public.catalogo_cursos(id) ON DELETE CASCADE,
  instrutor_id uuid REFERENCES public.colaboradores(id),
  data_inicio timestamptz NOT NULL,
  data_fim timestamptz,
  local_link text,
  capacidade_maxima integer,
  status text DEFAULT 'planejado',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.treinamento_certificados (
  id uuid PRIMARY KEY,
  colaborador_id uuid REFERENCES public.colaboradores(id),
  curso_id uuid REFERENCES public.catalogo_cursos(id),
  inscricao_id uuid,
  arquivo_url text,
  codigo_autenticacao text,
  data_emissao date NOT NULL,
  data_validade date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.user_empresas (
  user_id uuid NOT NULL,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, empresa_id)
);

CREATE TABLE public.user_roles (
  user_id uuid NOT NULL,
  role text NOT NULL,
  PRIMARY KEY (user_id, role)
);

CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  timestamp bigint NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_rate_limits_key_timestamp ON public.rate_limits (key, timestamp);
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service Role only access" ON public.rate_limits
  FOR ALL USING (false) WITH CHECK (false);

-- ─── Helpers usados pela migration ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_empresa(p_user uuid, p_empresa uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_empresas ue
    WHERE ue.user_id = p_user AND ue.empresa_id = p_empresa
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = p_user AND r.role = 'admin'
  )
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_empresa(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated, service_role;

GRANT ALL ON storage.objects TO service_role;
