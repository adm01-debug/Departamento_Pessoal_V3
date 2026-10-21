select jsonb_pretty(jsonb_agg(jsonb_build_object(
  'name', p.proname,
  'definition', pg_get_functiondef(p.oid)
))) as result
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'decidir_aprovacao_gestor','sincronizar_consolidacao_avaliacao',
    'finalizar_feedback','pode_aprovar_colaborador'
  );
