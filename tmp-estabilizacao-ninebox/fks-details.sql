select jsonb_pretty(jsonb_build_object(
  'ciclos_columns', (
    select coalesce(jsonb_agg(jsonb_build_object('column', column_name, 'type', data_type, 'nullable', is_nullable)
      order by ordinal_position), '[]'::jsonb)
    from information_schema.columns
    where table_schema='public' and table_name='ciclos_avaliacao'
  ),
  'audit_fks', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', c.relname, 'name', con.conname, 'definition', pg_get_constraintdef(con.oid)
    )), '[]'::jsonb)
    from pg_constraint con join pg_class c on c.oid=con.conrelid
    where con.contype='f' and con.confrelid='public.audit_log'::regclass
  ),
  'cycle_trigger_defs', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', t.tgname, 'function', p.proname, 'definition', pg_get_functiondef(p.oid)
    )), '[]'::jsonb)
    from pg_trigger t join pg_proc p on p.oid=t.tgfoid
    where t.tgrelid='public.ciclos_avaliacao'::regclass and not t.tgisinternal
  ),
  'pdi_cycle_columns', (
    select coalesce(jsonb_agg(jsonb_build_object('table', table_name, 'column', column_name, 'type', data_type)
      order by table_name, column_name), '[]'::jsonb)
    from information_schema.columns
    where table_schema='public' and table_name in ('pdis','pdi_plano_desenvolvimento')
      and column_name in ('ciclo_id','ciclo_avaliacao_id')
  )
)) as result;
