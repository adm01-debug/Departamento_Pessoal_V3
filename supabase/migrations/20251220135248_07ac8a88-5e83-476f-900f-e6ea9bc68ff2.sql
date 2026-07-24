-- Create enum for app roles
DO $$ BEGIN
CREATE TYPE public.app_role AS ENUM ('admin', 'gestor', 'rh', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- RLS Policies for user_roles table
-- Only admins can view all roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);

-- Only admins can insert roles
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Only admins can update roles
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Only admins can delete roles
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.is_admin(auth.uid()));

-- Create permissions table for granular access control
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (role, resource, action)
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage permissions
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.permissions;
CREATE POLICY "Authenticated users can view permissions"
ON public.permissions
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage permissions" ON public.permissions;
CREATE POLICY "Admins can manage permissions"
ON public.permissions
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Insert default permissions
INSERT INTO public.permissions (role, resource, action, allowed) VALUES
-- Admin can do everything
('admin', 'colaboradores', 'create', true),
('admin', 'colaboradores', 'read', true),
('admin', 'colaboradores', 'update', true),
('admin', 'colaboradores', 'delete', true),
('admin', 'admissoes', 'create', true),
('admin', 'admissoes', 'read', true),
('admin', 'admissoes', 'update', true),
('admin', 'admissoes', 'delete', true),
('admin', 'desligamentos', 'create', true),
('admin', 'desligamentos', 'read', true),
('admin', 'desligamentos', 'update', true),
('admin', 'desligamentos', 'delete', true),
('admin', 'folha', 'create', true),
('admin', 'folha', 'read', true),
('admin', 'folha', 'update', true),
('admin', 'folha', 'delete', true),
('admin', 'usuarios', 'create', true),
('admin', 'usuarios', 'read', true),
('admin', 'usuarios', 'update', true),
('admin', 'usuarios', 'delete', true),
('admin', 'auditoria', 'read', true),
-- Gestor permissions
('gestor', 'colaboradores', 'read', true),
('gestor', 'colaboradores', 'update', true),
('gestor', 'admissoes', 'read', true),
('gestor', 'admissoes', 'update', true),
('gestor', 'desligamentos', 'read', true),
('gestor', 'folha', 'read', true),
('gestor', 'auditoria', 'read', true),
-- RH permissions
('rh', 'colaboradores', 'create', true),
('rh', 'colaboradores', 'read', true),
('rh', 'colaboradores', 'update', true),
('rh', 'admissoes', 'create', true),
('rh', 'admissoes', 'read', true),
('rh', 'admissoes', 'update', true),
('rh', 'desligamentos', 'create', true),
('rh', 'desligamentos', 'read', true),
('rh', 'desligamentos', 'update', true),
('rh', 'folha', 'read', true),
('rh', 'auditoria', 'read', true),
-- User permissions (básico)
('user', 'colaboradores', 'read', true),
('user', 'admissoes', 'read', true),
('user', 'folha', 'read', true);

-- Add role column to profiles for display (not for security checks)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_display TEXT DEFAULT 'user';

-- Create trigger to assign default role on new user
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- Trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();