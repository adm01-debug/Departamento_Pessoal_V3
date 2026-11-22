CREATE OR REPLACE FUNCTION public.bloquear_autoatendimento_quem_usa_relogio()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.origem IN ('web', 'offline')
     AND public.ponto_rep_colaborador_usa_relogio(NEW.colaborador_id) THEN
    RAISE EXCEPTION 'Este colaborador registra o ponto no relógio da unidade.'
      USING ERRCODE = 'PT409', HINT = 'COLABORADOR_USA_RELOGIO';
  END IF;
  RETURN NEW;
END;
$function$
