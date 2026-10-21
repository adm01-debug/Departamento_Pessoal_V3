select jsonb_pretty(jsonb_build_object(
  'classes', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', c.relname,
      'fk', con.conname,
      'definition', pg_get_constraintdef(con.oid),
      'delete_action', con.confdeltype,
      'update_action', con.confupdtype
    ) order by c.relname, con.conname), '[]'::jsonb)
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and con.contype = 'f'
      and con.confrelid = 'public.ciclos_avaliacao'::regclass
  ),
  'pdi_tables', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', table_name, 'column', column_name, 'type', data_type, 'nullable', is_nullable
    ) order by table_name, ordinal_position), '[]'::jsonb)
    from information_schema.columns
    where table_schema='public'
      and table_name in ('pdis','pdi_plano_desenvolvimento')
  ),
  'pdi_fks', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', c.relname, 'name', con.conname, 'definition', pg_get_constraintdef(con.oid)
    ) order by c.relname), '[]'::jsonb)
    from pg_constraint con
    join pg_class c on c.oid=con.conrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and con.contype='f'
      and (c.relname in ('pdis','pdi_plano_desenvolvimento')
           or con.confrelid in ('public.pdis'::regclass, 'public.pdi_plano_desenvolvimento'::regclass))
  ),
  'ciclo_id_columns', (
    select coalesce(jsonb_agg(jsonb_build_object('table', table_name, 'column', column_name, 'type', data_type)
      order by table_name), '[]'::jsonb)
    from information_schema.columns
    where table_schema='public' and column_name in ('ciclo_id','ciclo_avaliacao_id')
  )
)) as result;
