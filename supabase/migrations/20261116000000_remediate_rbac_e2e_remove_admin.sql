-- Remediacao: conta E2E nao-admin (user@teste.local) recebeu role 'admin'
-- espuria no banco canonico.
--
-- Diagnostico (nao e bug de codigo): docs/prod-readiness.md (B12) documenta
-- que a linha de role 'admin' para user@teste.local foi criada em
-- 2026-10-28 21:13Z por admin@teste.local (acao do proprio seed/rodada
-- anterior). O AuthContext le as roles via get_user_roles e o AdminRoute,
-- corretamente, deixa a conta ver a pagina admin -- por isso o spec
-- e2e/authenticated-non-admin/rbac-admin-blocked.spec.ts falha de forma
-- honesta (a conta REALMENTE tinha admin). O fix e remover o papel espurio
-- e garantir que a conta mantenha apenas o papel 'user'.
--
-- Seguranca: usa SECURITY DEFINER local na transacao e confere, via EXISTS,
-- que o papel a remover existe ANTES de apagar; nao mexe em outras contas.

DO $remediate_rbac$
DECLARE
  v_user_id uuid;
  v_removed boolean := false;
  v_audit_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'user@teste.local'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Conta user@teste.local nao encontrada no auth.users do canonico';
  END IF;

  -- Remove apenas o papel 'admin' espurio. O papel 'user' e preservado.
  IF EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_user_id AND role = 'admin'
  ) THEN
    DELETE FROM public.user_roles
    WHERE user_id = v_user_id AND role = 'admin';
    v_removed := true;
  END IF;

  IF NOT v_removed THEN
    RAISE NOTICE 'Role admin nao estava presente para user@teste.local (nada a remover)';
  END IF;

  -- Trilha de auditoria (audit_log existe desde 20251220132737).
  INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores, user_email)
  VALUES (
    'user_roles',
    v_user_id,
    'DELETE',
    jsonb_build_object('user_id', v_user_id, 'role', 'admin', 'motivo', 'remocao de role admin espuria em conta E2E nao-admin (RBAC)'),
    'canonical-migrations@automation'
  )
  RETURNING id INTO v_audit_id;
END
$remediate_rbac$;