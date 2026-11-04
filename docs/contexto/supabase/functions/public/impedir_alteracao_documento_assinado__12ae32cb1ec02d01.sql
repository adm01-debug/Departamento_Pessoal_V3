CREATE OR REPLACE FUNCTION public.impedir_alteracao_documento_assinado()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'assinado' OR OLD.assinatura_base64 IS NOT NULL OR OLD.assinado_em IS NOT NULL THEN
    -- Permitido apenas: status -> 'cancelado' (com motivo em outro campo se aplicável)
    IF NEW.status = OLD.status THEN
      IF NEW.colaborador_id     IS DISTINCT FROM OLD.colaborador_id
         OR NEW.empresa_id      IS DISTINCT FROM OLD.empresa_id
         OR NEW.tipo_documento  IS DISTINCT FROM OLD.tipo_documento
         OR NEW.titulo          IS DISTINCT FROM OLD.titulo
         OR NEW.conteudo_url    IS DISTINCT FROM OLD.conteudo_url
         OR NEW.assinatura_base64 IS DISTINCT FROM OLD.assinatura_base64
         OR NEW.assinado_em     IS DISTINCT FROM OLD.assinado_em
         OR NEW.assinado_por    IS DISTINCT FROM OLD.assinado_por
         OR NEW.ip_assinatura   IS DISTINCT FROM OLD.ip_assinatura
         OR NEW.hash_documento  IS DISTINCT FROM OLD.hash_documento
         OR NEW.validade_assinatura IS DISTINCT FROM OLD.validade_assinatura THEN
        RAISE EXCEPTION 'Documento assinado digitalmente é imutável (MP 2.200-2/2001 - ICP-Brasil). Cancele oficialmente e emita novo documento.'
          USING ERRCODE = 'check_violation';
      END IF;
    ELSE
      IF NEW.status <> 'cancelado' THEN
        RAISE EXCEPTION 'Transição inválida em documento assinado. Permitido apenas: cancelado.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
