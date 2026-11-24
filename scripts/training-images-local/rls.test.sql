-- =============================================================================
-- TESTES REAIS DE RLS E PERMISSÕES — training_images + bucket privado
-- =============================================================================
-- Executar com psql -v ON_ERROR_STOP=1 -d training_images_test -f rls.test.sql
-- Qualquer falha levanta exceção e aborta (código de saída ≠ 0).
-- =============================================================================
\set ON_ERROR_STOP on
SET client_min_messages TO notice;

-- ─── Seed de capas e objetos (como owner, sem RLS) ───────────────────────────
TRUNCATE public.training_images CASCADE;
TRUNCATE storage.objects;

INSERT INTO public.training_images
  (empresa_id, content_type, content_id, storage_path, content_hash, status, provider, attempts)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
   'a0000001-0000-4000-8000-000000000001',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/courses/a0000001-0000-4000-8000-000000000001/cover.webp',
   'hash-empresa-a', 'succeeded', 'teste', 1),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'course',
   'b0000001-0000-4000-8000-000000000001',
   'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/courses/b0000001-0000-4000-8000-000000000001/cover.webp',
   'hash-empresa-b', 'succeeded', 'teste', 1);

INSERT INTO storage.objects (bucket_id, name) VALUES
  ('training-images', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/courses/a0000001-0000-4000-8000-000000000001/cover.webp'),
  ('training-images', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/courses/b0000001-0000-4000-8000-000000000001/cover.webp');

-- ─── 1. Estrutura criada pela migration ──────────────────────────────────────
DO $$
DECLARE
  b record;
BEGIN
  SELECT * INTO b FROM storage.buckets WHERE id = 'training-images';
  IF b IS NULL THEN RAISE EXCEPTION 'bucket training-images nao criado'; END IF;
  IF b.public THEN RAISE EXCEPTION 'bucket deveria ser PRIVADO'; END IF;
  IF b.file_size_limit <> 5242880 THEN RAISE EXCEPTION 'limite do bucket incorreto: %', b.file_size_limit; END IF;
  IF NOT ('image/webp' = ANY (b.allowed_mime_types)) THEN RAISE EXCEPTION 'allowlist sem image/webp'; END IF;
  IF NOT ('image/png' = ANY (b.allowed_mime_types)) THEN RAISE EXCEPTION 'allowlist sem image/png'; END IF;
  IF NOT ('image/jpeg' = ANY (b.allowed_mime_types)) THEN RAISE EXCEPTION 'allowlist sem image/jpeg'; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_training_images_updated_at') THEN
    RAISE EXCEPTION 'trigger de updated_at ausente';
  END IF;

  IF EXISTS (SELECT 1 PUBLIC FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = 'training_images' AND NOT c.relrowsecurity) THEN
    RAISE EXCEPTION 'RLS nao esta ativa em training_images';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'claim_training_image') THEN
    RAISE EXCEPTION 'funcao claim_training_image ausente';
  END IF;

  IF (SELECT count(*) FROM pg_indexes
       WHERE schemaname = 'public' AND tablename = 'training_images'
         AND indexname IN ('idx_training_images_empresa',
                           'idx_training_images_status',
                           'idx_training_images_origem')) <> 3 THEN
    RAISE EXCEPTION 'indices de tenant/status/origem ausentes';
  END IF;

  IF (SELECT count(*) FROM pg_constraint
       WHERE conrelid = 'public.training_images'::regclass AND contype = 'u') < 2 THEN
    RAISE EXCEPTION 'UNIQUE por conteudo/caminho ausente';
  END IF;

  RAISE NOTICE 'PASS 1 — bucket privado, tabela, indices, constraints, trigger, RLS e funcao';
END $$;

-- ─── 2. Isolamento de LEITURA na tabela: Empresa A só vê a própria capa ──────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111"}';
DO $$
DECLARE
  total int;
  vazou int;
BEGIN
  SELECT count(*) INTO total FROM public.training_images;
  IF total <> 1 THEN RAISE EXCEPTION 'empresa A deveria ver 1 capa, viu %', total; END IF;

  SELECT count(*) INTO vazou FROM public.training_images
   WHERE empresa_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  IF vazou <> 0 THEN RAISE EXCEPTION 'VAZAMENTO: empresa A leu % capa(s) da empresa B', vazou; END IF;

  RAISE NOTICE 'PASS 2 — leitura de training_images isolada por tenant';
END $$;
ROLLBACK;

-- ─── 3. Isolamento de LEITURA no Storage (bucket privado) ────────────────────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111"}';
DO $$
DECLARE
  total int;
  vazou int;
BEGIN
  SELECT count(*) INTO total FROM storage.objects WHERE bucket_id = 'training-images';
  IF total <> 1 THEN RAISE EXCEPTION 'empresa A deveria ver 1 objeto, viu %', total; END IF;

  SELECT count(*) INTO vazou FROM storage.objects
   WHERE bucket_id = 'training-images' AND name LIKE 'bbbbbbbb%';
  IF vazou <> 0 THEN RAISE EXCEPTION 'VAZAMENTO: empresa A leu % objeto(s) da empresa B', vazou; END IF;

  RAISE NOTICE 'PASS 3 — leitura do Storage isolada pelo 1o segmento do caminho';
END $$;
ROLLBACK;


-- ─── 4. Escrita do navegador é proibida (só backend/service role) ────────────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111"}';
DO $$
BEGIN
  BEGIN
    INSERT INTO public.training_images
      (empresa_id, content_type, content_id, storage_path, content_hash, status, provider, attempts)
    VALUES
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
       gen_random_uuid(), 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/courses/x/cover.webp',
       'hash-novo', 'pending', 'x', 1);
    RAISE EXCEPTION 'INSERT por authenticated deveria falhar';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.training_images SET status = 'disabled';
    RAISE EXCEPTION 'UPDATE por authenticated deveria falhar';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    DELETE FROM public.training_images;
    RAISE EXCEPTION 'DELETE por authenticated deveria falhar';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  RAISE NOTICE 'PASS 4 — authenticated nao escreve em training_images';
END $$;
ROLLBACK;

-- ─── 5. Storage: admin da empresa A não grava no prefixo da empresa B ────────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111"}';
DO $$
BEGIN
  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
    VALUES ('training-images', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/courses/x/cover.webp');
    RAISE EXCEPTION 'escrita cross-tenant no Storage deveria falhar';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- Caminho da própria empresa: permitido (admin + vínculo).
  INSERT INTO storage.objects (bucket_id, name)
  VALUES ('training-images', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/courses/x/cover.webp');

  RAISE NOTICE 'PASS 5 — Storage bloqueia cross-tenant e aceita a propria empresa';
END $$;
ROLLBACK;

-- ─── 6. Execução do claim_training_image é exclusiva do backend ──────────────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111"}';
DO $$
BEGIN
  BEGIN
    PERFORM public.claim_training_image(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
      'a0000001-0000-4000-8000-000000000001', 'hash-empresa-a');
    RAISE EXCEPTION 'authenticated nao deveria executar claim_training_image';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS 6 — claim_training_image negado para authenticated';
END $$;
ROLLBACK;

BEGIN;
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM public.claim_training_image(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
      'a0000001-0000-4000-8000-000000000001', 'hash-empresa-a');
    RAISE EXCEPTION 'anon nao deveria executar claim_training_image';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS 7 — claim_training_image negado para anon';
END $$;
ROLLBACK;

-- ─── 8. service_role (backend) enxerga os dois tenants ───────────────────────
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE total int;
BEGIN
  SELECT count(*) INTO total FROM public.training_images;
  IF total <> 2 THEN RAISE EXCEPTION 'service_role deveria ver 2 capas, viu %', total; END IF;
  RAISE NOTICE 'PASS 8 — service_role le todos os tenants';
END $$;
ROLLBACK;

-- ─── 9. Constraints do banco ─────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN
    INSERT INTO public.training_images
      (empresa_id, content_type, content_id, storage_path, status, provider, attempts)
    VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'podcast', gen_random_uuid(),
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/x/cover.webp', 'pending', 'x', 1);
    RAISE EXCEPTION 'content_type invalido deveria falhar';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.training_images
      (empresa_id, content_type, content_id, storage_path, status, provider, attempts)
    VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course', gen_random_uuid(),
            'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/x/cover.webp', 'pending', 'x', 1);
    RAISE EXCEPTION 'storage_path fora do tenant deveria falhar';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.training_images
      (empresa_id, content_type, content_id, storage_path, status, provider, attempts)
    VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
            'a0000001-0000-4000-8000-000000000001',
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/courses/y/cover.webp', 'pending', 'x', 1);
    RAISE EXCEPTION 'duplicidade por conteudo deveria falhar';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.training_images
      (empresa_id, content_type, content_id, storage_path, status, provider, attempts)
    VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'learning_path', gen_random_uuid(),
            'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/x/cover.webp', 'pending', 'x', 9);
    RAISE EXCEPTION 'attempts > 5 deveria falhar';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  RAISE NOTICE 'PASS 9 — CHECK de tipo/caminho/tentativas e UNIQUE por conteudo';
END $$;

-- ─── 10. Trigger de updated_at ───────────────────────────────────────────────
DO $$
DECLARE
  antes timestamptz;
  depois timestamptz;
BEGIN
  SELECT updated_at INTO antes FROM public.training_images
   WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  PERFORM pg_sleep(0.05);
  UPDATE public.training_images SET status = 'processing'
   WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  SELECT updated_at INTO depois FROM public.training_images
   WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  IF depois <= antes THEN RAISE EXCEPTION 'trigger nao atualizou updated_at'; END IF;
  UPDATE public.training_images SET status = 'succeeded'
   WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  RAISE NOTICE 'PASS 10 — trigger updated_at funcional';
END $$;

\echo 'RLS TESTS: TODOS OS CENARIOS PASSARAM'
