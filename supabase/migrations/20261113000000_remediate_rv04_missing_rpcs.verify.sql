-- ok = as 5 RPCs de vínculo/autorização (RV-04) existem após a remediação.
SELECT 'ok'
WHERE to_regprocedure('public.get_my_user_empresas()') IS NOT NULL
  AND to_regprocedure('public.set_own_default_empresa(uuid)') IS NOT NULL
  AND to_regprocedure('public.admin_associar_usuario_empresa(uuid,uuid,boolean)') IS NOT NULL
  AND to_regprocedure('public.pode_gerir_rh_para(uuid,uuid)') IS NOT NULL
  AND to_regprocedure('public.pode_gerir_pessoas_para(uuid,uuid)') IS NOT NULL;