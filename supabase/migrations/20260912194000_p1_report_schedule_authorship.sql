-- P1: report schedule authorship is server-owned and immutable. Creation and
-- maintenance require persisted RH/admin membership; destinations must be an
-- account belonging to the same company (or a global administrator).

DO $preflight$
BEGIN
  IF to_regclass('public.relatorios_agendados') IS NULL
     OR to_regclass('auth.users') IS NULL
     OR to_regclass('public.user_empresas') IS NULL
     OR to_regprocedure('public.pode_gerir_rh(uuid)') IS NULL
     OR to_regprocedure('public.is_admin(uuid)') IS NULL THEN
    RAISE EXCEPTION 'report schedule authorship requires schedules, auth users, membership and authorization RPCs';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.relatorios_agendados
    WHERE empresa_id IS NULL OR created_by IS NULL
  ) THEN
    RAISE EXCEPTION 'report schedule authorship requires existing rows with empresa_id and created_by';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.report_destination_is_allowed(
  p_email text,
  p_empresa_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
  SELECT p_email IS NOT NULL
     AND btrim(p_email) <> ''
     AND p_empresa_id IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM auth.users AS u
       WHERE lower(u.email) = lower(btrim(p_email))
         AND (
           EXISTS (
             SELECT 1 FROM public.user_empresas AS ue
             WHERE ue.user_id = u.id AND ue.empresa_id = p_empresa_id
           )
           OR public.is_admin(u.id)
         )
     )
$function$;

REVOKE ALL ON FUNCTION public.report_destination_is_allowed(text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.report_destination_is_allowed(text, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_report_schedule_authorship()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  actor_id uuid := auth.uid();
  destination_allowed boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.created_by := OLD.created_by;
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
$function$;

ALTER TABLE public.relatorios_agendados
  ALTER COLUMN empresa_id SET NOT NULL,
  ALTER COLUMN created_by SET NOT NULL;

DROP TRIGGER IF EXISTS tr_enforce_report_schedule_authorship
  ON public.relatorios_agendados;
CREATE TRIGGER tr_enforce_report_schedule_authorship
BEFORE INSERT OR UPDATE OF created_by, empresa_id, email_destinatario, parametros
ON public.relatorios_agendados
FOR EACH ROW EXECUTE FUNCTION public.enforce_report_schedule_authorship();

DROP POLICY IF EXISTS "Users can manage their company's schedules"
  ON public.relatorios_agendados;
DROP POLICY IF EXISTS tenant_relatorios_agendados ON public.relatorios_agendados;
DROP POLICY IF EXISTS relatorios_agendados_select ON public.relatorios_agendados;
DROP POLICY IF EXISTS relatorios_agendados_insert ON public.relatorios_agendados;
DROP POLICY IF EXISTS relatorios_agendados_update ON public.relatorios_agendados;
DROP POLICY IF EXISTS relatorios_agendados_delete ON public.relatorios_agendados;

CREATE POLICY relatorios_agendados_select ON public.relatorios_agendados
  FOR SELECT TO authenticated USING (public.pode_gerir_rh(empresa_id));
CREATE POLICY relatorios_agendados_insert ON public.relatorios_agendados
  FOR INSERT TO authenticated WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY relatorios_agendados_update ON public.relatorios_agendados
  FOR UPDATE TO authenticated
  USING (public.pode_gerir_rh(empresa_id))
  WITH CHECK (public.pode_gerir_rh(empresa_id));
CREATE POLICY relatorios_agendados_delete ON public.relatorios_agendados
  FOR DELETE TO authenticated USING (public.pode_gerir_rh(empresa_id));

REVOKE ALL ON FUNCTION public.enforce_report_schedule_authorship() FROM PUBLIC;
