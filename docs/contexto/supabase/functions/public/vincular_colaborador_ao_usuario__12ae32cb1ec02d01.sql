CREATE OR REPLACE FUNCTION public.vincular_colaborador_ao_usuario()
 RETURNS TABLE(colaborador_id uuid, empresa_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid       uuid := auth.uid();
  v_email     text;
  v_confirmed boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '28000';
  END IF;

  SELECT lower(trim(u.email)), (u.email_confirmed_at IS NOT NULL)
    INTO v_email, v_confirmed
    FROM auth.users u WHERE u.id = v_uid;

  -- Sem posse comprovada do endereço não há vínculo: uma conta criada com o
  -- e-mail de outra pessoa não pode tomar o cadastro dela (SEC_0002).
  IF v_email IS NULL OR v_email = '' OR NOT v_confirmed THEN
    RETURN;
  END IF;

  -- Só vincula quando o e-mail identifica UM colaborador por empresa — contando
  -- TODOS os cadastros (vinculados ou não). Se um duplicado já está vinculado,
  -- o restante NÃO vira candidato único para outra conta assumir (SEC-1/review).
  RETURN QUERY
  WITH cand AS (
    SELECT c.id, c.empresa_id AS emp,
           count(*) OVER (PARTITION BY c.empresa_id) AS n
      FROM public.colaboradores c
     WHERE (   lower(trim(c.email))             = v_email
            OR lower(trim(c.email_corporativo)) = v_email
            OR lower(trim(c.email_pessoal))     = v_email)
  )
  UPDATE public.colaboradores c
     SET user_id = v_uid
    FROM cand
   WHERE c.id = cand.id
     AND cand.n = 1
     AND c.user_id IS NULL
   RETURNING c.id, c.empresa_id;
END;
$function$
