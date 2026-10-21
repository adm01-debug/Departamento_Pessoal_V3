select jsonb_pretty(jsonb_build_object(
  'feedbacks_policies', (
    select coalesce(jsonb_agg(jsonb_build_object('name', policyname, 'cmd', cmd, 'roles', roles, 'qual', qual)), '[]'::jsonb)
    from pg_policies where schemaname='public' and tablename='feedbacks_360'
  ),
  'consolidacoes_policies', (
    select coalesce(jsonb_agg(jsonb_build_object('name', policyname, 'cmd', cmd, 'roles', roles)), '[]'::jsonb)
    from pg_policies where schemaname='public' and tablename='feedbacks_360_consolidacoes'
  )
)) as result;
