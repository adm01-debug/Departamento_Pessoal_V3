-- Criar tabela para mapear roles a permissões
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  permission_code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(role, permission_code)
);

-- Habilitar RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Admins podem gerenciar role_permissions" ON public.role_permissions;
CREATE POLICY "Admins podem gerenciar role_permissions"
  ON public.role_permissions
  FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Usuários autenticados podem visualizar role_permissions" ON public.role_permissions;
CREATE POLICY "Usuários autenticados podem visualizar role_permissions"
  ON public.role_permissions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Índices
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions(permission_code);