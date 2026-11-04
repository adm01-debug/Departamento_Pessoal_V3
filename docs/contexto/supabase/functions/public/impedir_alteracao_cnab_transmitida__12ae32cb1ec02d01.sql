CREATE OR REPLACE FUNCTION public.impedir_alteracao_cnab_transmitida()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('transmitida','enviada','processada','confirmada') THEN
    IF NEW.banco_codigo        IS DISTINCT FROM OLD.banco_codigo
       OR NEW.sequencial_arquivo IS DISTINCT FROM OLD.sequencial_arquivo
       OR NEW.data_geracao     IS DISTINCT FROM OLD.data_geracao
       OR NEW.total_pagamentos IS DISTINCT FROM OLD.total_pagamentos
       OR NEW.valor_total      IS DISTINCT FROM OLD.valor_total
       OR NEW.arquivo_url      IS DISTINCT FROM OLD.arquivo_url
       OR NEW.empresa_id       IS DISTINCT FROM OLD.empresa_id
       OR NEW.hash_integridade IS DISTINCT FROM OLD.hash_integridade THEN
      RAISE EXCEPTION 'Remessa CNAB transmitida é imutável. Gere uma nova remessa de estorno/complementar.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
