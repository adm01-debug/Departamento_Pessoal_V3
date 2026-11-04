CREATE OR REPLACE FUNCTION public.trg_medida_aplicada_integrar()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status_workflow = 'aplicada'
     AND (OLD.status_workflow IS DISTINCT FROM NEW.status_workflow)
     AND NEW.tipo IN ('suspensao','justa_causa','demissao_justa_causa') THEN
    BEGIN
      PERFORM public.aplicar_medida_folha_ponto(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.medidas_disciplinares_integracao (
        medida_id, empresa_id, colaborador_id, tipo_integracao, status, detalhes
      ) VALUES (
        NEW.id, NEW.empresa_id, NEW.colaborador_id,
        CASE WHEN NEW.tipo = 'suspensao' THEN 'afastamento' ELSE 'desligamento' END,
        'erro',
        jsonb_build_object('erro', SQLERRM, 'sqlstate', SQLSTATE)
      );
    END;
  END IF;
  RETURN NEW;
END;
$function$
