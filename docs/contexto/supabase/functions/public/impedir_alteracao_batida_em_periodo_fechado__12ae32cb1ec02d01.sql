CREATE OR REPLACE FUNCTION public.impedir_alteracao_batida_em_periodo_fechado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_row RECORD;
  v_fechado BOOLEAN := false;
BEGIN
  v_row := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;

  SELECT EXISTS (
    SELECT 1 FROM public.periodos_ponto pp
    WHERE pp.status IN ('fechado','fechada','closed','homologado')
      AND v_row.data BETWEEN pp.data_inicio AND pp.data_fim
  ) INTO v_fechado;

  IF v_fechado THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Batida de ponto em período fechado não pode ser deletada (Portaria 671 MTP).'
        USING ERRCODE = 'check_violation';
    ELSE
      -- Só permitimos flags de conciliação/observação, jamais alterar essência da batida
      IF NEW.data           IS DISTINCT FROM OLD.data
         OR NEW.hora        IS DISTINCT FROM OLD.hora
         OR NEW.tipo        IS DISTINCT FROM OLD.tipo
         OR NEW.colaborador_id IS DISTINCT FROM OLD.colaborador_id
         OR NEW.dispositivo_id IS DISTINCT FROM OLD.dispositivo_id
         OR NEW.hash_integridade IS DISTINCT FROM OLD.hash_integridade THEN
        RAISE EXCEPTION 'Batida de ponto em período fechado é imutável. Use ajuste oficial com aprovação e trilha de auditoria.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$
