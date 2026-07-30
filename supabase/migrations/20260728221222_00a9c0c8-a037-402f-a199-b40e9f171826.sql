-- Autovínculo do colaborador à conta de login.
--
-- Por que RPC e não trigger em auth.users: o schema auth é gerenciado pelo
-- Supabase e não deve receber gatilhos nossos. Além disso, o cadastro do
-- colaborador frequentemente é criado pelo RH DEPOIS de a pessoa já ter conta,
-- então um gatilho no signup perderia esse caso. A RPC roda no acesso ao
-- portal e cobre as duas ordens de acontecimento.
--
-- SEGURANÇA: o e-mail vem de auth.users pelo auth.uid() do chamador. NUNCA de
-- parâmetro. Aceitar e-mail do cliente permitiria a qualquer usuário logado se
-- vincular ao cadastro de outra pessoa e ler holerite, salário e CPF alheios.
CREATE OR REPLACE FUNCTION public.vincular_colaborador_ao_usuario()
RETURNS TABLE (colaborador_id uuid, empresa_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '28000';
  END IF;

  SELECT lower(trim(u.email)) INTO v_email FROM auth.users u WHERE u.id = v_uid;

  -- Conta sem e-mail (ex.: login apenas por telefone) não tem como casar.
  IF v_email IS NULL OR v_email = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  UPDATE public.colaboradores c
     SET user_id = v_uid
   WHERE c.user_id IS NULL              -- nunca rouba vínculo já estabelecido
     AND (
          lower(trim(c.email))            = v_email
       OR lower(trim(c.email_corporativo)) = v_email
       OR lower(trim(c.email_pessoal))     = v_email
     )
  RETURNING c.id, c.empresa_id;
END;
$$;

REVOKE ALL ON FUNCTION public.vincular_colaborador_ao_usuario() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vincular_colaborador_ao_usuario() TO authenticated;

COMMENT ON FUNCTION public.vincular_colaborador_ao_usuario() IS
  'Vincula a conta logada aos cadastros de colaborador com o mesmo e-mail. E-mail derivado de auth.uid(), nunca de parâmetro.';
