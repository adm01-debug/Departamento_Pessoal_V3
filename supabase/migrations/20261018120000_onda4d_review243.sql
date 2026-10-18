-- ═══════════════════════════════════════════════════════════════════════════
-- Onda 4d — correções dos achados do Devin Review na PR #243 (mergeada).
--
-- SEC-1: vincular_colaborador_ao_usuario contava apenas cadastros SEM vínculo.
--        Com 2 colaboradores de mesmo e-mail na empresa (um já vinculado), o
--        outro virava candidato único e qualquer conta com esse e-mail assumia
--        o cadastro restante. Agora a unicidade conta TODOS os cadastros do
--        e-mail na empresa — duplicidade não vincula ninguém.
--
-- SEC-2: empresa_id (backfill onda 4c) ficou só na leitura inicial — nada
--        impedia gravar documento/histórico de um colaborador com a empresa de
--        outra, e as policies por colaborador aceitariam a linha (contaminação
--        cross-tenant). Trigger FORÇA empresa_id = empresa do colaborador em
--        toda linha com colaborador_id; backfill corrige divergências existentes.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. vínculo por e-mail: unicidade conta cadastros vinculados também ────────
CREATE OR REPLACE FUNCTION public.vincular_colaborador_ao_usuario()
RETURNS TABLE (colaborador_id uuid, empresa_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
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
$fn$;

-- ── 2. empresa_id sempre derivado do colaborador (documentos e afins) ─────────
CREATE OR REPLACE FUNCTION public.dp_sync_empresa_from_colaborador()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE v_emp uuid;
BEGIN
  IF NEW.colaborador_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT c.empresa_id INTO v_emp
    FROM public.colaboradores c WHERE c.id = NEW.colaborador_id;
  IF v_emp IS NOT NULL THEN
    NEW.empresa_id := v_emp;
  END IF;
  RETURN NEW;
END;
$fn$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['documentos','historico_cargo','colaborador_beneficios','documentos_colaborador']
  LOOP
    IF to_regclass('public.' || t) IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name=t AND column_name='colaborador_id'
       )
       OR NOT EXISTS (
         SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name=t AND column_name='empresa_id'
       )
    THEN
      RAISE NOTICE '% sem colaborador_id/empresa_id — pulando', t;
      CONTINUE;
    END IF;

    -- Backfill de divergências (empresa_id NULL ou de outra empresa)
    EXECUTE format(
      'UPDATE public.%I x SET empresa_id = c.empresa_id
         FROM public.colaboradores c
        WHERE x.colaborador_id = c.id
          AND x.empresa_id IS DISTINCT FROM c.empresa_id', t);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_sync_empresa_colaborador ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_sync_empresa_colaborador
         BEFORE INSERT OR UPDATE OF colaborador_id, empresa_id ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.dp_sync_empresa_from_colaborador()', t);
  END LOOP;
END $$;

-- Trigger helper não é RPC de usuário — fecha EXECUTE público (só é chamada
-- pelo trigger, que roda como owner/SECURITY não depende de GRANT).
REVOKE EXECUTE ON FUNCTION public.dp_sync_empresa_from_colaborador() FROM PUBLIC, anon, authenticated;
