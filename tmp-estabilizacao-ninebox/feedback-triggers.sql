select jsonb_pretty(jsonb_build_object(
  'feedback_triggers', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', t.tgname, 'function', p.proname, 'definition', pg_get_triggerdef(t.oid)
    )), '[]'::jsonb)
    from pg_trigger t join pg_proc p on p.oid=t.tgfoid
    where t.tgrelid='public.feedbacks_360'::regclass and not t.tgisinternal
  ),
  'sync_function', (
    select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='sincronizar_consolidacao_avaliacao'
  )
)) as result;
