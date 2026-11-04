CREATE OR REPLACE FUNCTION public.trg_ferias_reconciliacao_alert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid;
  v_titulo text;
  v_msg    text;
  v_data   date := (NEW.executado_em AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF NEW.restantes IS NULL OR NEW.restantes <= 0 THEN
    RETURN NEW;
  END IF;

  v_titulo := 'Férias: ' || NEW.restantes || ' divergência(s) após reconciliação';
  v_msg := 'A rotina automática verificou ' || NEW.verificadas
         || ' registros e corrigiu ' || NEW.corrigidas
         || ', porém ainda restam ' || NEW.restantes
         || ' divergência(s) entre férias e folha. Abra Férias → Dashboard para tratar.';

  FOR v_user IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    JOIN public.user_empresas ue ON ue.user_id = ur.user_id
    WHERE ur.role IN ('admin','gestor','rh')
      AND (NEW.empresa_id IS NULL OR ue.empresa_id = NEW.empresa_id)
  LOOP
    INSERT INTO public.notificacoes (
      user_id, empresa_id, tipo, titulo, mensagem, entidade_tipo, entidade_id, data_referencia
    )
    SELECT v_user, NEW.empresa_id, 'ferias_reconciliacao', v_titulo, v_msg,
           'ferias_reconciliacao_log', NEW.id, v_data
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notificacoes n
      WHERE n.user_id = v_user
        AND n.tipo = 'ferias_reconciliacao'
        AND n.data_referencia = v_data
        AND (n.empresa_id IS NOT DISTINCT FROM NEW.empresa_id)
    );
  END LOOP;

  RETURN NEW;
END;
$function$
