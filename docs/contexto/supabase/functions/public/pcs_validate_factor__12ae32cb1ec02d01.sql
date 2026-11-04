CREATE OR REPLACE FUNCTION public.pcs_validate_factor()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
BEGIN
  IF jsonb_typeof(NEW.graus) <> 'array' OR jsonb_array_length(NEW.graus) = 0 THEN
    RAISE EXCEPTION 'graus must be a non-empty JSON array' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(NEW.graus) AS item
    WHERE jsonb_typeof(item) <> 'object'
      OR jsonb_typeof(item->'grau') <> 'number'
      OR jsonb_typeof(item->'pontos') <> 'number'
      OR (item->>'pontos')::numeric < 0
      OR length(btrim(COALESCE(item->>'rotulo', ''))) = 0
  ) THEN
    RAISE EXCEPTION 'each PCS grade must contain numeric grau/pontos and a rotulo' USING ERRCODE = '22023';
  END IF;
  IF (
    SELECT count(*) FROM jsonb_array_elements(NEW.graus)
  ) <> (
    SELECT count(DISTINCT item->>'grau') FROM jsonb_array_elements(NEW.graus) AS item
  ) THEN
    RAISE EXCEPTION 'PCS factor grade identifiers must be unique' USING ERRCODE = '22023';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END
$function$
