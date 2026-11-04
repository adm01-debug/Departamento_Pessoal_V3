CREATE OR REPLACE FUNCTION public.maintenance_weekly_analyze()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  tables text[] := ARRAY[
    'registros_ponto',
    'batidas_ponto',
    'folhas_pagamento',
    'folha_itens',
    'colaboradores',
    'audit_log_unified',
    'notificacoes',
    'esocial_eventos'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r'
    ) THEN
      EXECUTE format('ANALYZE public.%I', t);
    END IF;
  END LOOP;
END;
$function$
