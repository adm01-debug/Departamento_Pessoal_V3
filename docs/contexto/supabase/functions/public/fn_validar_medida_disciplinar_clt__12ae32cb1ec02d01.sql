CREATE OR REPLACE FUNCTION public.fn_validar_medida_disciplinar_clt()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dias_desde_ocorrencia integer;
  v_dias_desde_conhecimento integer;
  v_ja_existe boolean;
BEGIN
  -- Só validar em INSERT ou quando status_workflow entra em 'aplicada' vindo de outro estado
  IF (TG_OP = 'UPDATE' AND NEW.status_workflow = OLD.status_workflow) THEN
    RETURN NEW;
  END IF;

  -- Só bloqueia em rascunho quando o registro está sendo aplicado
  IF NEW.status_workflow IN ('rascunho','aguardando_aprovacao') THEN
    RETURN NEW;
  END IF;

  -- Prescrição: fato ocorrido há mais de 60 dias
  v_dias_desde_ocorrencia := (CURRENT_DATE - NEW.data_ocorrencia);
  IF v_dias_desde_ocorrencia > 60 THEN
    RAISE EXCEPTION 'Medida disciplinar prescrita: fato ocorrido há % dias (limite CLT: 60 dias sem punição = perdão tácito)', v_dias_desde_ocorrencia
      USING ERRCODE = 'check_violation';
  END IF;

  -- Imediatidade: se informou data_conhecimento_fato, não pode ter mais de 30 dias entre conhecimento e aplicação
  IF NEW.data_conhecimento_fato IS NOT NULL THEN
    v_dias_desde_conhecimento := (CURRENT_DATE - NEW.data_conhecimento_fato);
    IF v_dias_desde_conhecimento > 30 THEN
      RAISE EXCEPTION 'Princípio da imediatidade violado: empresa teve ciência há % dias (limite recomendado: 30 dias)', v_dias_desde_conhecimento
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Non bis in idem: não pode existir outra medida aplicada para o MESMO colaborador na MESMA data
  SELECT EXISTS (
    SELECT 1 FROM public.medidas_disciplinares
    WHERE colaborador_id = NEW.colaborador_id
      AND data_ocorrencia = NEW.data_ocorrencia
      AND status_workflow = 'aplicada'
      AND id <> COALESCE(NEW.id, gen_random_uuid())
  ) INTO v_ja_existe;

  IF v_ja_existe THEN
    RAISE EXCEPTION 'Dupla punição (non bis in idem): já existe medida disciplinar aplicada para este colaborador na data %', NEW.data_ocorrencia
      USING ERRCODE = 'unique_violation';
  END IF;

  RETURN NEW;
END;
$function$
