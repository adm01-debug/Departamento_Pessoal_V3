CREATE OR REPLACE FUNCTION public.documentos_admissao_marcar_anteriores()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  -- Envios SIMULTANEOS da mesma admissao (duas abas, duplo clique) nao podem
  -- terminar com duas versoes vigentes: o UPDATE de um nao enxerga a linha que o
  -- outro acabou de inserir. O lock transacional por admissao serializa os dois
  -- INSERTs — o segundo espera o commit do primeiro e entao fecha a versao que
  -- ele inseriu. O lock e liberado no fim da transacao, sem estado global.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(NEW.admissao_id::text, 0)
  );

  UPDATE public.documentos_admissao
     SET substituido_em = now()
   WHERE admissao_id = NEW.admissao_id
     AND tipo = NEW.tipo
     AND id <> NEW.id
     AND substituido_em IS NULL;

  RETURN NEW;
END;
$function$
