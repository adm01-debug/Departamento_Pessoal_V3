select jsonb_pretty(jsonb_build_object(
  'columns', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', column_name, 'type', data_type, 'nullable', is_nullable,
      'default', column_default
    ) order by ordinal_position), '[]'::jsonb)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'feedbacks_360_consolidacoes'
  ),
  'constraints', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', conname, 'type', contype, 'definition', pg_get_constraintdef(oid)
    ) order by conname), '[]'::jsonb)
    from pg_constraint
    where conrelid = 'public.feedbacks_360_consolidacoes'::regclass
  ),
  'operacoes_constraints', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', conname, 'definition', pg_get_constraintdef(oid)
    ) order by conname), '[]'::jsonb)
    from pg_constraint
    where conrelid = 'public.feedbacks_360_operacoes'::regclass
      and contype = 'c'
  ),
  'functions', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', p.proname,
      'args', pg_get_function_identity_arguments(p.oid),
      'security_definer', p.prosecdef,
      'acl', p.proacl
    ) order by p.proname), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'pode_finalizar_feedback','finalizar_feedback','editar_feedback_seguro',
        'decidir_aprovacao_gestor','sincronizar_consolidacao_avaliacao',
        'pode_aprovar_colaborador','bloquear_exclusao_ciclo_com_dependencias',
        'enviar_avaliacao_ao_gestor','validar_potencial_avaliacao'
      )
  ),
  'cycle_policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', policyname, 'cmd', cmd, 'roles', roles, 'qual', qual, 'with_check', with_check
    ) order by policyname), '[]'::jsonb)
    from pg_policies
    where schemaname = 'public' and tablename = 'ciclos_avaliacao'
  ),
  'cycle_triggers', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', tgname, 'definition', pg_get_triggerdef(oid)
    ) order by tgname), '[]'::jsonb)
    from pg_trigger
    where tgrelid = 'public.ciclos_avaliacao'::regclass and not tgisinternal
  ),
  'feedbacks_grants', jsonb_build_object(
    'authenticated_update', has_table_privilege('authenticated','public.feedbacks_360','UPDATE'),
    'authenticated_truncate', has_table_privilege('authenticated','public.feedbacks_360','TRUNCATE'),
    'anon_truncate', has_table_privilege('anon','public.feedbacks_360','TRUNCATE'),
    'authenticated_select', has_table_privilege('authenticated','public.feedbacks_360','SELECT')
  )
)) as result;
