CREATE OR REPLACE FUNCTION public.impedir_alteracao_afastamento_encerrado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IN ('encerrado','cancelado') OR OLD.aprovado_em IS NOT NULL THEN
    IF NEW.status = OLD.status THEN
      IF NEW.colaborador_id     IS DISTINCT FROM OLD.colaborador_id
         OR NEW.empresa_id      IS DISTINCT FROM OLD.empresa_id
         OR NEW.tipo            IS DISTINCT FROM OLD.tipo
         OR NEW.data_inicio     IS DISTINCT FROM OLD.data_inicio
         OR NEW.data_fim_prevista IS DISTINCT FROM OLD.data_fim_prevista
         OR NEW.data_fim_real   IS DISTINCT FROM OLD.data_fim_real
         OR NEW.dias_empresa    IS DISTINCT FROM OLD.dias_empresa
         OR NEW.dias_inss       IS DISTINCT FROM OLD.dias_inss
         OR NEW.cid             IS DISTINCT FROM OLD.cid
         OR NEW.numero_beneficio IS DISTINCT FROM OLD.numero_beneficio
         OR NEW.medico_nome     IS DISTINCT FROM OLD.medico_nome
         OR NEW.medico_crm      IS DISTINCT FROM OLD.medico_crm
         OR NEW.atestado_numero IS DISTINCT FROM OLD.atestado_numero
         OR NEW.data_pericia    IS DISTINCT FROM OLD.data_pericia
         OR NEW.aprovado_em     IS DISTINCT FROM OLD.aprovado_em
         OR NEW.aprovado_por    IS DISTINCT FROM OLD.aprovado_por
         OR NEW.hash_integridade IS DISTINCT FROM OLD.hash_integridade THEN
        RAISE EXCEPTION 'Afastamento encerrado/aprovado é imutável (eSocial S-2230). Registre novo evento ou prorrogação oficial.'
          USING ERRCODE = 'check_violation';
      END IF;
    ELSE
      IF NEW.status NOT IN ('cancelado','encerrado') THEN
        RAISE EXCEPTION 'Transição de status inválida em afastamento encerrado/aprovado.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
