CREATE OR REPLACE FUNCTION public.dp_check_log_rotation()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
DECLARE
  v_settings JSONB;
  v_warning TEXT := '';
BEGIN
  SELECT jsonb_build_object(
    'log_rotation_age', current_setting('log_rotation_age'),
    'log_rotation_size', current_setting('log_rotation_size'),
    'log_filename', current_setting('log_filename'),
    'log_directory', current_setting('log_directory'),
    'logging_collector', current_setting('logging_collector')
  ) INTO v_settings;
  
  IF current_setting('log_rotation_age') = '0' AND current_setting('log_rotation_size') = '0' THEN
    v_warning := 'CRITICO: Rotacao de log desabilitada! Disco pode encher. '
              || 'Configurar via Supabase Dashboard > Database > Configuration > '
              || 'log_rotation_age=1d, log_rotation_size=100MB';
  END IF;
  
  RETURN jsonb_build_object(
    'settings', v_settings,
    'warning', v_warning,
    'action_required', v_warning != '',
    'dashboard_url', 'https://supabase.com/dashboard/project/frjbfeamybqsejlvmqbl/database/configuration',
    'settings_to_apply', jsonb_build_object(
      'log_rotation_age', '1d',
      'log_rotation_size', '102400',
      'log_truncate_on_rotation', 'on',
      'log_filename', 'postgresql-%Y-%m-%d_%H%M%S.log'
    )
  );
END;
$function$
