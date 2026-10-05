-- admin_list_profiles: listagem de usuários para a página /usuarios.
--
-- A RLS de public.profiles só permite SELECT da própria linha
-- (auth.uid() = user_id) — nenhum policy de admin existe. A UsuariosPage
-- (AdminRoute) fazia .from('profiles').select('*') e portanto só enxergava
-- o próprio perfil: a gestão de usuários estava funcionalmente quebrada.
--
-- Correção seguindo o padrão de 20260718230000_admin_role_management_rpc.sql:
-- RPC SECURITY DEFINER estreita, gated por is_admin(auth.uid()), que expõe
-- apenas as colunas de identificação necessárias à tela — govbr_uid,
-- cpf_validado_govbr e demais flags de verificação ficam fora (need-to-know:
-- a página admin mostra nome/telefone/cargo, não dados de verificação gov.br).
-- telefone é PII mas é exatamente o que a página admin precisa listar.
CREATE OR REPLACE FUNCTION public.admin_list_profiles()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  nome TEXT,
  telefone TEXT,
  cargo TEXT,
  departamento TEXT,
  role_display TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem listar usuários' USING ERRCODE = '42501';
  END IF;

  -- Papel efetivo vem de user_roles (fonte de verdade de admin_set_user_role/
  -- get_user_roles); profiles.role_display fica stale após promoção e serve
  -- só de fallback. Enum app_role é ordenado por privilégio, então o menor
  -- valor é o papel mais alto.
  RETURN QUERY
    SELECT p.id, p.user_id, p.nome, p.telefone, p.cargo, p.departamento,
           COALESCE(
             (SELECT ur.role::text
              FROM public.user_roles ur
              WHERE ur.user_id = p.user_id
              ORDER BY ur.role
              LIMIT 1),
             p.role_display
           ),
           p.avatar_url, p.created_at, p.updated_at
    FROM public.profiles p
    ORDER BY p.nome;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;

COMMENT ON FUNCTION public.admin_list_profiles() IS
  'Listagem admin de profiles (RLS da tabela só permite a própria linha). Verifica is_admin(auth.uid()) internamente e expõe só colunas de identificação — govbr/cpf ficam fora.';
