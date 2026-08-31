-- ============================================================================
-- PLANO_100 · Suíte de asserts comportamentais (assertion-based)
-- Executar APÓS 00_setup_stubs.sql e as migrations 2026083000000{1,2,3}.
-- Falha = RAISE EXCEPTION (psql -v ON_ERROR_STOP=1 aborta com exit ≠ 0).
-- ============================================================================
\set ON_ERROR_STOP on

-- ── Infra de asserção ──────────────────────────────────────────────────────
CREATE TABLE public._asserts(id serial PRIMARY KEY, nome text, ok boolean, detalhe text);
CREATE FUNCTION public._assert(nome text, cond boolean, detalhe text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  INSERT INTO public._asserts(nome, ok, detalhe) VALUES (nome, COALESCE(cond, false), detalhe);
END $$;

-- ── Contexto de teste ──────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='u1') THEN CREATE ROLE u1 NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='u2') THEN CREATE ROLE u2 NOLOGIN; END IF;
END $$;
GRANT authenticated TO u1, u2;
CREATE TABLE public._test_ctx(k text PRIMARY KEY, v uuid);
GRANT SELECT ON public._test_ctx TO authenticated;
DO $$
DECLARE E1 uuid := gen_random_uuid(); E2 uuid := gen_random_uuid();
BEGIN
  INSERT INTO public._test_ctx VALUES ('e1', E1), ('e2', E2);
  INSERT INTO public.user_empresas VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001', E1, 'gestor', 'gestor'),
    ('aaaaaaaa-0000-0000-0000-000000000002', E1, 'colaborador', 'colaborador');
END $$;
DELETE FROM public.audit_log_unified WHERE action = 'PII_ACCESS_ANOMALY';

-- ── T1: E-028 buckets ──────────────────────────────────────────────────────
DO $$
DECLARE pub int; novos int; avatars boolean; h uuid; nl uuid;
BEGIN
  SELECT count(*) INTO pub FROM storage.buckets
    WHERE public AND id IN ('documentos-admissao','ponto-biometria');
  SELECT count(*) INTO novos FROM storage.buckets
    WHERE id IN ('comprovantes-despesas','contabilidade-anexos','relatorios-privados','sst-programas');
  SELECT public INTO avatars FROM storage.buckets WHERE id='avatars';
  PERFORM _assert('T1.1 buckets vulneráveis agora privados (0)', pub = 0, 'pub=' || pub);
  PERFORM _assert('T1.2 buckets novos criados (4)', novos = 4, 'novos=' || novos);
  PERFORM _assert('T1.3 avatars público mantido (exceção de produto)', avatars IS TRUE);

  h := public.storage_path_empresa_id('11111111-2222-3333-4444-555555555555/doc.pdf');
  nl := public.storage_path_empresa_id('pasta-livre/doc.pdf');
  PERFORM _assert('T1.4 helper extrai uuid do 1º segmento', h = '11111111-2222-3333-4444-555555555555'::uuid);
  PERFORM _assert('T1.5 helper devolve NULL p/ path não-uuid (sem cast error)', nl IS NULL);
END $$;

-- ── T2: E-036 RLS da trilha PII ────────────────────────────────────────────
DO $$
DECLARE n int; e1 text;
BEGIN
  SET LOCAL ROLE u1;
  PERFORM auth._set_uid('aaaaaaaa-0000-0000-0000-000000000001');
  INSERT INTO public.pii_access_logs (user_id, empresa_id, tabela, acao, registro_count)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001', (SELECT v FROM public._test_ctx WHERE k='e1'), 'holerites', 'select', 1);
  SELECT count(*) INTO n FROM public.pii_access_logs;
  PERFORM _assert('T2.1 authenticated insere trilha própria (1)', n = 1, 'n=' || n);

  BEGIN  -- inserir user_id de outrem DEVE violar RLS
    INSERT INTO public.pii_access_logs (user_id, empresa_id, tabela)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000002', (SELECT v FROM public._test_ctx WHERE k='e1'), 'x');
    PERFORM _assert('T2.2 RLS bloqueia insert user_id alheio', false, 'insert NÃO bloqueado');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS e1 = MESSAGE_TEXT;
    PERFORM _assert('T2.2 RLS bloqueia insert user_id alheio', e1 ILIKE '%row-level security%', e1);
  END;
  RESET ROLE;
END $$;

DO $$
DECLARE n int;
BEGIN
  SET LOCAL ROLE u2;
  PERFORM auth._set_uid('aaaaaaaa-0000-0000-0000-000000000002');
  SELECT count(*) INTO n FROM public.pii_access_logs;
  PERFORM _assert('T2.3 colaborador (sem papel rh/gestor) lê 0 linhas', n = 0, 'n=' || n);
  RESET ROLE;
END $$;

DO $$
DECLARE e1 text;
BEGIN
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM count(*) FROM public.pii_access_logs;
    PERFORM _assert('T2.4 anon não lê trilha (permission denied)', false, 'anon LEU a trilha');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS e1 = MESSAGE_TEXT;
    PERFORM _assert('T2.4 anon não lê trilha (permission denied)', e1 ILIKE '%permission denied%', e1);
  END;
  RESET ROLE;
END $$;

-- ── T3: E-036 anomalia + dedup ─────────────────────────────────────────────
DO $$
DECLARE sus int;
BEGIN
  SET LOCAL ROLE u1;
  PERFORM auth._set_uid('aaaaaaaa-0000-0000-0000-000000000001');
  INSERT INTO public.pii_access_logs (user_id, empresa_id, tabela, acao, registro_count, created_at)
  SELECT 'aaaaaaaa-0000-0000-0000-000000000001', (SELECT v FROM public._test_ctx WHERE k='e1'),
         'colaboradores', 'select', 1, date_trunc('hour', now())
  FROM generate_series(1, 250);
  RESET ROLE;

  SELECT count(*) INTO sus FROM public.v_pii_access_suspeitos;
  PERFORM _assert('T3.1 view detecta >200 leituras/h', sus >= 1, 'sus=' || sus);
END $$;

DO $$
DECLARE a1 int; a2 int; a3 int; ev int;
BEGIN
  a1 := public.fn_alert_pii_access_anomaly(24);
  SELECT count(*) INTO ev FROM public.audit_log_unified WHERE action='PII_ACCESS_ANOMALY';
  PERFORM _assert('T3.2 fn_alert 1ª execução cria evento', ev = 1, 'ev=' || ev);
  a2 := public.fn_alert_pii_access_anomaly(24);
  a3 := public.fn_alert_pii_access_anomaly(24);
  SELECT count(*) INTO ev FROM public.audit_log_unified WHERE action='PII_ACCESS_ANOMALY';
  PERFORM _assert('T3.3 dedup: 3 execuções → 1 evento (sem duplicar)', ev = 1,
                  format('ev=%s (runs=%s/%s/%s)', ev, a1, a2, a3));
END $$;

-- ── T4: E-036 purge com retenção mínima ────────────────────────────────────
DO $$
DECLARE r int; old int;
BEGIN
  INSERT INTO public.pii_access_logs (user_id, empresa_id, tabela, created_at)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000001', (SELECT v FROM public._test_ctx WHERE k='e1'),
          'holerites', now() - interval '400 days');
  r := public.purge_pii_access_logs(180);
  SELECT count(*) INTO old FROM public.pii_access_logs WHERE created_at < now() - interval '300 days';
  PERFORM _assert('T4.1 purge remove >180d e respeita piso de 30d', r >= 1 AND old = 0,
                  format('removidos=%s restantes=%s', r, old));
  -- piso: pedir 1 dia não pode apagar registros com <30d
  r := public.purge_pii_access_logs(1);
  SELECT count(*) INTO old FROM public.pii_access_logs WHERE created_at > now() - interval '30 days';
  PERFORM _assert('T4.2 piso de 30 dias preservado', old >= 1, 'restantes_recentes=' || old);
END $$;

-- ── T5: E-028 policies de storage (isolamento tenant) ─────────────────────
INSERT INTO storage.objects (bucket_id, name) VALUES
  ('comprovantes-despesas', (SELECT v::text FROM public._test_ctx WHERE k='e1') || '/recibo.pdf'),
  ('comprovantes-despesas', (SELECT v::text FROM public._test_ctx WHERE k='e2') || '/recibo.pdf');

DO $$
DECLARE own int; other int; anon_n int;
BEGIN
  SET LOCAL ROLE u2;
  PERFORM auth._set_uid('aaaaaaaa-0000-0000-0000-000000000002');
  SELECT count(*) INTO own FROM storage.objects
    WHERE bucket_id='comprovantes-despesas'
      AND name LIKE (SELECT v::text FROM public._test_ctx WHERE k='e1') || '%';
  SELECT count(*) INTO other FROM storage.objects
    WHERE bucket_id='comprovantes-despesas'
      AND name LIKE (SELECT v::text FROM public._test_ctx WHERE k='e2') || '%';
  PERFORM _assert('T5.1 membro da empresa vê objetos do próprio tenant', own = 1, 'own=' || own);
  PERFORM _assert('T5.2 membro NÃO vê objetos de outra empresa', other = 0, 'other=' || other);
  RESET ROLE;

  SET LOCAL ROLE anon;
  SELECT count(*) INTO anon_n FROM storage.objects;
  PERFORM _assert('T5.3 anon lê 0 objetos (buckets privados)', anon_n = 0, 'anon=' || anon_n);
  RESET ROLE;
END $$;

-- ── T6: grants das funções (E-012 anti-drift + E-036) ──────────────────────
DO $$
DECLARE drift_anon boolean; new_auth boolean; new_anon boolean; alert_anon boolean;
BEGIN
  drift_anon := has_function_privilege('anon','public.get_my_permissions(uuid)','EXECUTE');
  new_auth   := has_function_privilege('authenticated','public.get_my_permissions()','EXECUTE');
  new_anon   := has_function_privilege('anon','public.get_my_permissions()','EXECUTE');
  alert_anon := has_function_privilege('anon','public.fn_alert_pii_access_anomaly(integer)','EXECUTE');
  PERFORM _assert('T6.1 sobrecarga drift (uuid) executável por anon = false', NOT drift_anon);
  PERFORM _assert('T6.2 get_my_permissions() executável por authenticated', new_auth);
  PERFORM _assert('T6.3 get_my_permissions() NÃO executável por anon', NOT new_anon);
  PERFORM _assert('T6.4 fn_alert só service_role (anon=false)', NOT alert_anon);
END $$;

-- ── T7: queries de verificação do runbook E-026 §5 ────────────────────────
DO $$
DECLARE rls boolean; anon_pii boolean; npol int; secdef_bad int;
BEGIN
  anon_pii := has_table_privilege('anon','public.pii_access_logs','SELECT');
  SELECT relrowsecurity INTO rls FROM pg_class WHERE oid='public.pii_access_logs'::regclass;
  SELECT count(*) INTO npol FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname LIKE 'tenant\_%';
  SELECT count(*) INTO secdef_bad FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('get_my_permissions','get_user_tenants')
      AND pg_get_function_identity_arguments(p.oid) = ''
      AND NOT (p.prosecdef AND COALESCE(array_to_string(p.proconfig,''), '') LIKE '%search_path%');
  PERFORM _assert('T7.1 runbook §5.5: anon sem SELECT em pii_access_logs', NOT anon_pii);
  PERFORM _assert('T7.2 runbook §5.5: pii_access_logs com RLS ativo', rls IS TRUE);
  PERFORM _assert('T7.3 runbook §5.4: 16 policies tenant em storage.objects', npol = 16, 'npol=' || npol);
  PERFORM _assert('T7.4 runbook §5.6: canônicas secdef+search_path', secdef_bad = 0, 'bad=' || secdef_bad);
END $$;

-- ── Veredito ───────────────────────────────────────────────────────────────
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

