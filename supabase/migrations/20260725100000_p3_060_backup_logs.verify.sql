SELECT CASE WHEN to_regclass('public.backup_logs') IS NOT NULL THEN 'ok' ELSE 'FALHOU: backup_logs ausente' END;
