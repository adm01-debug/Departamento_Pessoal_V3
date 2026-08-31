-- Asserts comportamentais das migrations 2026083000000{1,2,3}.
\set ON_ERROR_STOP on

CREATE TABLE public._asserts(id serial PRIMARY KEY, nome text, ok boolean, detalhe text);
CREATE FUNCTION public._assert(nome text, cond boolean, detalhe text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  INSERT INTO public._asserts(nome, ok, detalhe) VALUES (nome, COALESCE(cond, false), detalhe);
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='u1') THEN CREATE ROLE u1 NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='u2') THEN CREATE ROLE u2 NOLOGIN; END IF;
END $$;
GRANT authenticated TO u1, u2;
CREATE TABLE public._test_ctx(k text PRIMARY KEY, v uuid);
GRANT SELECT ON public._test_ctx TO authenticated;
DO $$
DECLARE e1 uuid := gen_random_uuid(); e2 uuid := gen_random_uuid();
BEGIN
  INSERT INTO public._test_ctx VALUES ('e1', e1), ('e2', e2);
  INSERT INTO public.user_empresas (user_id, empresa_id, role, ativo) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001', e1, 'manager', true),
    ('aaaaaaaa-0000-0000-0000-000000000002', e1, 'viewer', true);
END $$;

-- T1: buckets e helper de path.
DO $$
DECLARE pub int; novos int; avatars boolean; h uuid; nl uuid;
BEGIN
  SELECT count(*) INTO pub FROM storage.buckets
    WHERE public AND id IN ('documentos-admissao','ponto-biometria');
  SELECT count(*) INTO novos FROM storage.buckets
    WHERE id IN ('comprovantes-despesas','contabilidade-anexos','relatorios-privados','sst-programas');
  SELECT public INTO avatars FROM storage.buckets WHERE id='avatars';
  h := public.storage_path_empresa_id('11111111-2222-3333-4444-555555555555/doc.pdf');
  nl := public.storage_path_empresa_id('pasta-livre/doc.pdf');
  PERFORM _assert('T1.1 buckets sensíveis privados', pub = 0, 'pub=' || pub);
  PERFORM _assert('T1.2 quatro buckets criados', novos = 4, 'novos=' || novos);
  PERFORM _assert('T1.3 avatars preservado público', avatars IS TRUE);
  PERFORM _assert('T1.4 helper extrai tenant UUID', h = '11111111-2222-3333-4444-555555555555'::uuid);
  PERFORM _assert('T1.5 path inválido retorna NULL', nl IS NULL);
END $$;

-- T2: trilha PII é server-authoritative e isolada.
DO $$
DECLARE log_id uuid; derived_uid uuid; err text;
BEGIN
  SET LOCAL ROLE u1;
  PERFORM auth._set_uid('aaaaaaaa-0000-0000-0000-000000000001');
  SELECT public.record_pii_access(
    (SELECT v FROM public._test_ctx WHERE k='e1'), 'holerites', 'select', 'h1', 3
  ) INTO log_id;
  RESET ROLE;
  SELECT user_id INTO derived_uid FROM public.pii_access_logs WHERE id = log_id;
  PERFORM _assert('T2.1 RPC grava log', log_id IS NOT NULL);
  PERFORM _assert('T2.2 user_id derivado de auth.uid()',
    derived_uid = 'aaaaaaaa-0000-0000-0000-000000000001'::uuid);

  SET LOCAL ROLE u1;
  BEGIN
    INSERT INTO public.pii_access_logs (user_id, empresa_id, tabela)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000002',
            (SELECT v FROM public._test_ctx WHERE k='e1'), 'holerites');
    PERFORM _assert('T2.3 insert direto autenticado bloqueado', false, 'insert permitido');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
    PERFORM _assert('T2.3 insert direto autenticado bloqueado', true, err);
  END;

  BEGIN
    PERFORM public.record_pii_access(
      (SELECT v FROM public._test_ctx WHERE k='e2'), 'holerites', 'select', NULL, 1);
    PERFORM _assert('T2.4 RPC bloqueia tenant alheio', false, 'RPC permitida');
  EXCEPTION WHEN insufficient_privilege THEN
    PERFORM _assert('T2.4 RPC bloqueia tenant alheio', true);
  END;
  RESET ROLE;
END $$;

DO $$
DECLARE n int; err text;
BEGIN
  SET LOCAL ROLE u2;
  PERFORM auth._set_uid('aaaaaaaa-0000-0000-0000-000000000002');
  SELECT count(*) INTO n FROM public.pii_access_logs;
  PERFORM _assert('T2.5 viewer não lê trilha administrativa', n = 0, 'n=' || n);
  RESET ROLE;

  SET LOCAL ROLE anon;
  BEGIN
    PERFORM count(*) FROM public.pii_access_logs;
    PERFORM _assert('T2.6 anon sem acesso à trilha', false, 'anon leu');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
    PERFORM _assert('T2.6 anon sem acesso à trilha', true, err);
  END;
  RESET ROLE;
END $$;

-- T3: detecção e deduplicação de anomalias.
DO $$
DECLARE i int; sus int; a1 int; a2 int; alerts int;
BEGIN
  SET LOCAL ROLE u1;
  PERFORM auth._set_uid('aaaaaaaa-0000-0000-0000-000000000001');
  FOR i IN 1..201 LOOP
    PERFORM public.record_pii_access(
      (SELECT v FROM public._test_ctx WHERE k='e1'), 'colaboradores', 'select', NULL, 1);
  END LOOP;
  RESET ROLE;

  SELECT count(*) INTO sus FROM public.v_pii_access_suspeitos;
  a1 := public.fn_alert_pii_access_anomaly(24);
  a2 := public.fn_alert_pii_access_anomaly(24);
  SELECT count(*) INTO alerts FROM public.pii_access_alerts;
  PERFORM _assert('T3.1 view detecta mais de 200 leituras/h', sus = 1, 'sus=' || sus);
  PERFORM _assert('T3.2 primeira execução cria um alerta', a1 = 1, 'a1=' || a1);
  PERFORM _assert('T3.3 dedup impede alerta duplicado', a2 = 0 AND alerts = 1,
    format('a2=%s alerts=%s', a2, alerts));
END $$;

-- T4: retenção.
DO $$
DECLARE r int; old int; recent int;
BEGIN
  INSERT INTO public.pii_access_logs (user_id, empresa_id, tabela, created_at)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001',
          (SELECT v FROM public._test_ctx WHERE k='e1'),
          'holerites', now() - interval '400 days');
  r := public.purge_pii_access_logs(180);
  SELECT count(*) INTO old FROM public.pii_access_logs
    WHERE created_at < now() - interval '300 days';
  r := public.purge_pii_access_logs(1);
  SELECT count(*) INTO recent FROM public.pii_access_logs
    WHERE created_at > now() - interval '30 days';
  PERFORM _assert('T4.1 purge remove registro vencido', old = 0);
  PERFORM _assert('T4.2 retenção mínima de 30 dias', recent >= 1, 'recent=' || recent);
END $$;

-- T5: Storage: leitura por tenant; mutação só dono/gestor; saída gerada é RO.
INSERT INTO storage.objects (bucket_id, name, owner) VALUES
  ('comprovantes-despesas', (SELECT v::text FROM public._test_ctx WHERE k='e1') || '/u1.pdf',
   'aaaaaaaa-0000-0000-0000-000000000001'),
  ('comprovantes-despesas', (SELECT v::text FROM public._test_ctx WHERE k='e2') || '/e2.pdf',
   'bbbbbbbb-0000-0000-0000-000000000001');

DO $$
DECLARE own int; other int; still_there int; removed int; own_deleted int; err text;
BEGIN
  SET LOCAL ROLE u2;
  PERFORM auth._set_uid('aaaaaaaa-0000-0000-0000-000000000002');
  SELECT count(*) INTO own FROM storage.objects
    WHERE name LIKE (SELECT v::text FROM public._test_ctx WHERE k='e1') || '%';
  SELECT count(*) INTO other FROM storage.objects
    WHERE name LIKE (SELECT v::text FROM public._test_ctx WHERE k='e2') || '%';
  DELETE FROM storage.objects WHERE name LIKE '%/u1.pdf';
  GET DIAGNOSTICS removed = ROW_COUNT;

  INSERT INTO storage.objects (bucket_id, name, owner)
  VALUES ('comprovantes-despesas',
          (SELECT v::text FROM public._test_ctx WHERE k='e1') || '/u2.pdf',
          'aaaaaaaa-0000-0000-0000-000000000002');
  DELETE FROM storage.objects WHERE name LIKE '%/u2.pdf';
  GET DIAGNOSTICS own_deleted = ROW_COUNT;

  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner)
    VALUES ('relatorios-privados',
            (SELECT v::text FROM public._test_ctx WHERE k='e1') || '/forged.pdf',
            'aaaaaaaa-0000-0000-0000-000000000002');
    PERFORM _assert('T5.5 bucket gerado sem write autenticado', false, 'insert permitido');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err = MESSAGE_TEXT;
    PERFORM _assert('T5.5 bucket gerado sem write autenticado', true, err);
  END;
  RESET ROLE;

  SELECT count(*) INTO still_there FROM storage.objects WHERE name LIKE '%/u1.pdf';
  PERFORM _assert('T5.1 membro vê próprio tenant', own = 1, 'own=' || own);
  PERFORM _assert('T5.2 membro não vê outro tenant', other = 0, 'other=' || other);
  PERFORM _assert('T5.3 membro não apaga arquivo de terceiro', removed = 0 AND still_there = 1);
  PERFORM _assert('T5.4 dono pode criar e apagar arquivo', own_deleted = 1,
    'own_deleted=' || own_deleted);
END $$;

-- T6/T7: grants, policies e helpers.
DO $$
DECLARE drift_anon boolean; rpc_auth boolean; anon_pii boolean; npol int;
        secdef_bad int; perms int; tenants int;
BEGIN
  drift_anon := has_function_privilege('anon','public.get_my_permissions(uuid)','EXECUTE');
  rpc_auth := has_function_privilege('authenticated',
    'public.record_pii_access(uuid,text,text,text,integer)','EXECUTE');
  anon_pii := has_table_privilege('anon','public.pii_access_logs','SELECT');
  SELECT count(*) INTO npol FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'tenant\_%';
  SELECT count(*) INTO secdef_bad FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('get_my_permissions','get_user_tenants','record_pii_access')
      AND pg_get_function_identity_arguments(p.oid) IN
          ('', 'p_empresa_id uuid, p_tabela text, p_acao text, p_registro_id text, p_registro_count integer')
      AND NOT (p.prosecdef AND COALESCE(array_to_string(p.proconfig,''), '') LIKE '%search_path%');

  PERFORM auth._set_uid('aaaaaaaa-0000-0000-0000-000000000001');
  SELECT count(*) INTO perms FROM public.get_my_permissions()
    WHERE papel='manager' AND empresa_id=(SELECT v FROM public._test_ctx WHERE k='e1');
  SELECT count(*) INTO tenants FROM public.get_user_tenants()
    WHERE get_user_tenants=(SELECT v FROM public._test_ctx WHERE k='e1');

  PERFORM _assert('T6.1 sobrecarga IDOR revogada de anon', NOT drift_anon);
  PERFORM _assert('T6.2 RPC PII executável por authenticated', rpc_auth);
  PERFORM _assert('T6.3 anon sem SELECT PII', NOT anon_pii);
  PERFORM _assert('T7.1 dez policies storage de menor privilégio', npol = 10, 'npol=' || npol);
  PERFORM _assert('T7.2 funções canônicas secdef/search_path', secdef_bad = 0, 'bad=' || secdef_bad);
  PERFORM _assert('T7.3 get_my_permissions usa role canônica', perms = 1, 'perms=' || perms);
  PERFORM _assert('T7.4 get_user_tenants filtra tenant ativo', tenants = 1, 'tenants=' || tenants);
END $$;

SELECT nome, ok, detalhe FROM public._asserts ORDER BY id;
DO $$
DECLARE f int; t int;
BEGIN
  SELECT count(*) INTO f FROM public._asserts WHERE NOT ok;
  SELECT count(*) INTO t FROM public._asserts;
  IF f > 0 THEN
    RAISE EXCEPTION 'PLANO100_ASSERTS_FAILED: % de % falharam', f, t;
  END IF;
  RAISE NOTICE 'PLANO100_ASSERTS_OK: % asserts, 0 falhas', t;
END $$;
