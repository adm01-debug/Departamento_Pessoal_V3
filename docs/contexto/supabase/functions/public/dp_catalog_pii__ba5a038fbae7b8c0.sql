CREATE OR REPLACE FUNCTION public.dp_catalog_pii(p_table text, p_column text, p_sensitivity dp_pii_sensitivity, p_category text, p_basis text, p_retention integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
  INSERT INTO public.dp_data_catalog (table_name, column_name, sensitivity, lgpd_category, legal_basis, retention_days)
  VALUES (p_table, p_column, p_sensitivity, p_category, p_basis, p_retention)
  ON CONFLICT (table_name, column_name) DO UPDATE SET
    sensitivity=EXCLUDED.sensitivity,
    lgpd_category=EXCLUDED.lgpd_category,
    legal_basis=EXCLUDED.legal_basis,
    retention_days=EXCLUDED.retention_days,
    updated_at=NOW();
$function$
