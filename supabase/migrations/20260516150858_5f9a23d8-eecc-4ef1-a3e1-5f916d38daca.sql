-- 1. Limpeza de funções problemáticas antes de recriar
DROP FUNCTION IF EXISTS public.get_user_roles(uuid);
DROP FUNCTION IF EXISTS public.check_login_lock(text, text);
DROP FUNCTION IF EXISTS public.record_failed_login(text, text);

-- 2. Extensões e Tipos
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Tabelas Core
CREATE TABLE IF NOT EXISTS public.empresas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),
  cnpj CHAR(14) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'ativa',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.departamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cargos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  cbo VARCHAR(10),
  salario_base DECIMAL(12,2),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Perfis e Roles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID REFERENCES empresas(id),
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    unique (user_id, role)
);

-- 5. Colaboradores
CREATE TABLE IF NOT EXISTS public.colaboradores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  cpf CHAR(11) UNIQUE NOT NULL,
  data_admissao DATE NOT NULL,
  cargo_id UUID REFERENCES cargos(id),
  salario DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Brute Force Protection
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,
    identifier_type TEXT NOT NULL DEFAULT 'email',
    attempts INTEGER DEFAULT 1,
    last_attempt TIMESTAMPTZ DEFAULT now(),
    is_locked BOOLEAN DEFAULT false,
    lockout_until TIMESTAMPTZ,
    UNIQUE(identifier, identifier_type)
);

-- 7. Funções de Segurança e RBAC
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS app_role[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select array_agg(role)
  from public.user_roles
  where user_id = _user_id
$$;

-- 8. Funções de Proteção Brute Force
CREATE OR REPLACE FUNCTION public.check_login_lock(p_identifier TEXT, p_identifier_type TEXT DEFAULT 'email')
RETURNS TABLE (is_locked BOOLEAN, remaining_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_locked BOOLEAN;
    v_until TIMESTAMPTZ;
BEGIN
    SELECT login_attempts.is_locked, login_attempts.lockout_until INTO v_locked, v_until
    FROM login_attempts
    WHERE identifier = p_identifier AND identifier_type = p_identifier_type;

    IF v_locked AND v_until > now() THEN
        RETURN QUERY SELECT true, EXTRACT(EPOCH FROM (v_until - now()))::INTEGER;
    ELSE
        IF v_locked THEN
            UPDATE login_attempts SET is_locked = false, lockout_until = NULL, attempts = 0
            WHERE identifier = p_identifier AND identifier_type = p_identifier_type;
        END IF;
        RETURN QUERY SELECT false, 0;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_failed_login(p_identifier TEXT, p_identifier_type TEXT DEFAULT 'email')
RETURNS TABLE (attempts INTEGER, is_locked BOOLEAN, lockout_minutes INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_attempts INTEGER;
    v_locked BOOLEAN := false;
    v_lock_min INTEGER := 0;
BEGIN
    INSERT INTO login_attempts (identifier, identifier_type, attempts, last_attempt)
    VALUES (p_identifier, p_identifier_type, 1, now())
    ON CONFLICT (identifier, identifier_type)
    DO UPDATE SET 
        attempts = login_attempts.attempts + 1,
        last_attempt = now()
    RETURNING login_attempts.attempts INTO v_attempts;

    IF v_attempts >= 5 THEN
        v_locked := true;
        v_lock_min := CASE 
            WHEN v_attempts >= 10 THEN 60
            WHEN v_attempts >= 7 THEN 15
            ELSE 5
        END;
        UPDATE login_attempts 
        SET is_locked = true, lockout_until = now() + (v_lock_min || ' minutes')::interval
        WHERE identifier = p_identifier AND identifier_type = p_identifier_type;
    END IF;

    RETURN QUERY SELECT v_attempts, v_locked, v_lock_min;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_login_attempts(p_identifier TEXT, p_identifier_type TEXT DEFAULT 'email')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE login_attempts 
    SET attempts = 0, is_locked = false, lockout_until = NULL
    WHERE identifier = p_identifier AND identifier_type = p_identifier_type;
END;
$$;

-- 9. Ativação de RLS e Políticas Básicas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Profiles are viewable by own user') THEN
        CREATE POLICY "Profiles are viewable by own user" ON public.profiles FOR SELECT USING (auth.uid() = id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage roles') THEN
        CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage employees') THEN
        CREATE POLICY "Admins can manage employees" ON public.colaboradores FOR ALL USING (public.has_role(auth.uid(), 'admin'));
    END IF;
END $$;