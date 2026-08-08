DO $$
DECLARE
  v_uid uuid;
  v_empresa uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'teste@sistemadp.com';
  IF v_uid IS NULL THEN
    RAISE NOTICE 'Usuário de QA não encontrado; nada a fazer.';
    RETURN;
  END IF;

  INSERT INTO public.profiles (user_id, nome, cargo, role_display)
  VALUES (v_uid, 'Usuário QA', 'QA', 'admin')
  ON CONFLICT (user_id) DO UPDATE
    SET nome = EXCLUDED.nome, cargo = EXCLUDED.cargo, role_display = EXCLUDED.role_display;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'admin'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  FOR v_empresa IN SELECT id FROM public.empresas LOOP
    INSERT INTO public.user_empresas (user_id, empresa_id)
    VALUES (v_uid, v_empresa)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;