select jsonb_pretty(jsonb_build_object(
  'function', pg_get_functiondef(p.oid),
  'trigger', pg_get_triggerdef(t.oid)
)) as result
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
join pg_trigger t on t.tgfoid=p.oid
where n.nspname='public'
  and p.proname='trg_feedbacks_360_consolidacao'
  and t.tgrelid='public.feedbacks_360'::regclass
  and not t.tgisinternal;
