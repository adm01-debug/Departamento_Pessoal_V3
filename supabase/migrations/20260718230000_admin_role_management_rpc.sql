-- Remediação de auditoria (achado R1): a tabela public.user_roles está na
-- TABLE_DENYLIST do external-db-bridge (index.ts) — nenhuma ação direta
-- (select/insert/update/delete/upsert) chega até ela via bridge, nem para
-- admins legítimos. Isso bloqueia corretamente a escalação de privilégio
-- descrita no achado original (supabase.from('user_roles').upsert(...) já
-- retorna 403 TABLE_DENIED antes de tocar o banco), mas como efeito colateral
-- também quebra a funcionalidade real de gestão de papéis para admins de
-- verdade — não há como promover/rebaixar um usuário hoje.
--
-- Correção: uma função SECURITY DEFINER que só admins podem executar,
-- invocável via RPC (que passa por uma allowlist própria, não pela
-- TABLE_DENYLIST). Mantém user_roles inacessível a escrita/leitura direta
-- via bridge, e adiciona um caminho seguro e auditável para a única
-- operação legítima necessária.
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_target_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem gerenciar papéis de usuário' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (_target_user_id, _role, auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;

  -- audit_log.acao tem CHECK (acao IN ('INSERT','UPDATE','DELETE')) — usar um
  -- valor fora dessa lista falharia a constraint e desfaria todo o UPSERT
  -- acima (mesma transação). 'UPDATE' é semanticamente o mais próximo.
  INSERT INTO public.audit_log (tabela, registro_id, acao, user_id, dados_novos)
  VALUES ('user_roles', _target_user_id, 'UPDATE', auth.uid(), jsonb_build_object('role', _role, 'action', 'admin_set_user_role'));

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(UUID, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, public.app_role) TO authenticated;

COMMENT ON FUNCTION public.admin_set_user_role(UUID, public.app_role) IS
  'Único caminho de escrita permitido para user_roles a partir do bridge (a tabela está na TABLE_DENYLIST). Verifica is_admin(auth.uid()) internamente antes de gravar — ver achado R1 da auditoria.';

-- Mesma lógica para leitura: `user_roles` está na TABLE_DENYLIST, então
-- SELECT direto (mesmo de um admin real) também retorna 403 TABLE_DENIED —
-- a listagem em UserRolesTab.tsx estava igualmente quebrada. Espelha
-- exatamente as colunas que o componente consome.
CREATE OR REPLACE FUNCTION public.admin_list_user_roles()
RETURNS TABLE (id UUID, user_id UUID, role public.app_role, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem listar papéis de usuário' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
    SELECT ur.id, ur.user_id, ur.role, ur.created_at
    FROM public.user_roles ur
    ORDER BY ur.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_user_roles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_user_roles() TO authenticated;

COMMENT ON FUNCTION public.admin_list_user_roles() IS
  'Único caminho de leitura permitido para user_roles a partir do bridge (a tabela está na TABLE_DENYLIST). Verifica is_admin(auth.uid()) internamente — ver achado R1 da auditoria.';
