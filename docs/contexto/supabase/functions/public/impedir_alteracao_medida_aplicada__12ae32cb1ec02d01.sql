CREATE OR REPLACE FUNCTION public.impedir_alteracao_medida_aplicada()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bloqueio BOOLEAN;
BEGIN
  v_bloqueio := (OLD.status IN ('aplicada','assinada','ciente','homologada','concluida','concluída'))
                OR OLD.colaborador_ciente = true
                OR OLD.assinado_em IS NOT NULL
                OR OLD.recusa_assinatura = true;

  IF v_bloqueio THEN
    -- Permitido: transição para 'anulada'/'cancelada' (com motivo em campo textual)
    -- e atualização de documento_url (upload de PDF assinado digitalizado uma única vez)
    IF NEW.status = OLD.status THEN
      IF NEW.colaborador_id     IS DISTINCT FROM OLD.colaborador_id
         OR NEW.empresa_id      IS DISTINCT FROM OLD.empresa_id
         OR NEW.tipo            IS DISTINCT FROM OLD.tipo
         OR NEW.data_ocorrencia IS DISTINCT FROM OLD.data_ocorrencia
         OR NEW.descricao       IS DISTINCT FROM OLD.descricao
         OR NEW.dias_suspensao  IS DISTINCT FROM OLD.dias_suspensao
         OR NEW.artigo_clt      IS DISTINCT FROM OLD.artigo_clt
         OR NEW.testemunha_1_nome IS DISTINCT FROM OLD.testemunha_1_nome
         OR NEW.testemunha_1_cpf  IS DISTINCT FROM OLD.testemunha_1_cpf
         OR NEW.testemunha_2_nome IS DISTINCT FROM OLD.testemunha_2_nome
         OR NEW.testemunha_2_cpf  IS DISTINCT FROM OLD.testemunha_2_cpf
         OR NEW.data_ciencia    IS DISTINCT FROM OLD.data_ciencia
         OR NEW.colaborador_ciente IS DISTINCT FROM OLD.colaborador_ciente
         OR NEW.recusa_assinatura  IS DISTINCT FROM OLD.recusa_assinatura
         OR NEW.assinado_em     IS DISTINCT FROM OLD.assinado_em
         OR NEW.hash_integridade IS DISTINCT FROM OLD.hash_integridade THEN
        RAISE EXCEPTION 'Medida disciplinar aplicada/ciente é imutável (CLT art. 474/482). Anule oficialmente (status=anulada) com motivo para retificar.'
          USING ERRCODE = 'check_violation';
      END IF;
    ELSE
      -- Transição de status permitida apenas para anulada/cancelada/revogada
      IF NEW.status NOT IN ('anulada','cancelada','revogada') THEN
        RAISE EXCEPTION 'Transição de status inválida em medida aplicada. Permitido apenas: anulada, cancelada, revogada.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
