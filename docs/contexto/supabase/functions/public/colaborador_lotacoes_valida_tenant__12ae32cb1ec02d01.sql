CREATE OR REPLACE FUNCTION public.colaborador_lotacoes_valida_tenant()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  colaborador_empresa UUID;
  lotacao_empresa UUID;
BEGIN
  SELECT empresa_id INTO colaborador_empresa FROM public.colaboradores WHERE id = NEW.colaborador_id;
  SELECT empresa_id INTO lotacao_empresa FROM public.lotacoes WHERE id = NEW.lotacao_id;

  IF colaborador_empresa IS DISTINCT FROM NEW.empresa_id THEN
    RAISE EXCEPTION 'colaborador_lotacoes: colaborador_id pertence a outra empresa (colaborador.empresa_id=%, linha.empresa_id=%)',
      colaborador_empresa, NEW.empresa_id;
  END IF;

  IF lotacao_empresa IS DISTINCT FROM NEW.empresa_id THEN
    RAISE EXCEPTION 'colaborador_lotacoes: lotacao_id pertence a outra empresa (lotacao.empresa_id=%, linha.empresa_id=%)',
      lotacao_empresa, NEW.empresa_id;
  END IF;

  RETURN NEW;
END;
$function$
