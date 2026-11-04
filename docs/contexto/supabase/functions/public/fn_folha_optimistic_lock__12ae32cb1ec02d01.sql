CREATE OR REPLACE FUNCTION public.fn_folha_optimistic_lock()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Se o cliente enviou uma versão explícita diferente da atual → CONFLITO
  IF NEW.version IS NOT NULL
     AND NEW.version <> OLD.version
     AND NEW.version <> OLD.version + 1 THEN

    -- Registra o conflito para observabilidade (best-effort)
    BEGIN
      INSERT INTO public.folha_lock_conflicts
        (folha_id, empresa_id, competencia, version_esperada, version_atual, user_id)
      VALUES
        (OLD.id, OLD.empresa_id, OLD.competencia::text, NEW.version, OLD.version, auth.uid());
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    RAISE EXCEPTION 'Conflito de concorrência em folha_pagamento (id=%): versão esperada %, versão atual %. Recarregue e tente novamente.',
      OLD.id, NEW.version, OLD.version
      USING ERRCODE = '40001'; -- serialization_failure → retry-friendly
  END IF;

  -- Auto-incremento da versão em qualquer UPDATE
  NEW.version := OLD.version + 1;
  RETURN NEW;
END;
$function$
