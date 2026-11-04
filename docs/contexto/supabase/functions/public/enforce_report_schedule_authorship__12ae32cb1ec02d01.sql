CREATE OR REPLACE FUNCTION public.enforce_report_schedule_authorship()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
DECLARE
  actor_id uuid := auth.uid();
  destination_allowed boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.created_by := OLD.created_by;
    IF actor_id IS NOT NULL AND (
      NEW.dispatch_claim_token IS DISTINCT FROM OLD.dispatch_claim_token
      OR NEW.dispatch_claimed_at IS DISTINCT FROM OLD.dispatch_claimed_at
    ) THEN
      RAISE EXCEPTION 'report dispatch lease is service-owned' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Requests made with a human JWT must never choose their author. Internal
  -- service-role updates have no auth.uid() and retain the persisted author.
  IF actor_id IS NOT NULL THEN
    IF public.pode_gerir_rh(NEW.empresa_id) IS NOT TRUE THEN
      RAISE EXCEPTION 'report schedule requires RH authorization';
    END IF;
    IF TG_OP = 'INSERT' THEN
      NEW.created_by := actor_id;
    END IF;

    SELECT public.report_destination_is_allowed(
      NEW.email_destinatario,
      NEW.empresa_id
    ) INTO destination_allowed;
    IF destination_allowed IS NOT TRUE THEN
      RAISE EXCEPTION 'report destination is outside the company';
    END IF;
  ELSIF TG_OP = 'INSERT' AND NEW.created_by IS NULL THEN
    RAISE EXCEPTION 'service-created report schedule requires an explicit author';
  END IF;

  -- The tenant carried inside report parameters is derived by the database,
  -- not trusted from a mutable browser payload.
  NEW.parametros := jsonb_set(
    COALESCE(NEW.parametros, '{}'::jsonb),
    '{empresaId}',
    to_jsonb(NEW.empresa_id::text),
    true
  );
  RETURN NEW;
END
$function$
