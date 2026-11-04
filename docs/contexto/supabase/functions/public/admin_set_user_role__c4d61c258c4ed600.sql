CREATE OR REPLACE FUNCTION public.admin_set_user_role(_target_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas administradores podem gerenciar papéis de usuário' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (_target_user_id, _role, auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.audit_log (tabela, registro_id, acao, user_id, dados_novos)
  VALUES ('user_roles', _target_user_id, 'UPDATE', auth.uid(), jsonb_build_object('role', _role, 'action', 'admin_set_user_role'));

  RETURN TRUE;
END;
$function$
