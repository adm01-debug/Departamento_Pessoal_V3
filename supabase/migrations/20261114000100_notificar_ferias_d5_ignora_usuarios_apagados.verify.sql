-- ok = notificar_ferias_pagamento_d5 só notifica usuários que existem no Auth.
SELECT 'ok'
FROM pg_proc p
WHERE p.oid = to_regprocedure('public.notificar_ferias_pagamento_d5()')
  AND p.prosecdef
  AND p.prosrc LIKE '%JOIN auth.users au ON au.id = ur.user_id%'
  AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE');
