-- =============================================================================
-- FILA AUTOMÁTICA — trigger, unicidade, claim SKIP LOCKED e permissões
-- =============================================================================
\set ON_ERROR_STOP on
SET client_min_messages TO notice;

TRUNCATE public.training_image_requests;
UPDATE public.training_image_settings SET autoqueue_enabled = false WHERE id = true;

-- ─── 1. Flag DESLIGADA não enfileira nada ───────────────────────────────────
INSERT INTO public.catalogo_cursos (id, empresa_id, nome)
VALUES ('a0000010-0000-4000-8000-000000000010', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Curso auto 1');

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.training_image_requests;
  IF n <> 0 THEN RAISE EXCEPTION 'flag desligada deveria enfileirar 0, veio %', n; END IF;
  RAISE NOTICE 'PASS 1 — autoqueue desligado: cadastro NAO enfileira';
END $$;

-- ─── 2. Flag LIGADA enfileira curso e trilha ───────────────────────────────
SELECT set_training_image_autoqueue(true);

INSERT INTO public.catalogo_cursos (id, empresa_id, nome)
VALUES ('a0000011-0000-4000-8000-000000000011', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Curso auto 2');

INSERT INTO public.trilhas_aprendizado (id, empresa_id, nome)
VALUES ('a0000012-0000-4000-8000-000000000012', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Trilha auto 1');

DO $$
DECLARE n int; t text;
BEGIN
  SELECT count(*) INTO n FROM public.training_image_requests;
  IF n <> 2 THEN RAISE EXCEPTION 'esperava 2 requisicoes, veio %', n; END IF;

  SELECT content_type INTO t FROM public.training_image_requests
   WHERE content_id = 'a0000011-0000-4000-8000-000000000011';
  IF t <> 'course' THEN RAISE EXCEPTION 'tipo do curso incorreto: %', t; END IF;

  SELECT content_type INTO t FROM public.training_image_requests
   WHERE content_id = 'a0000012-0000-4000-8000-000000000012';
  IF t <> 'learning_path' THEN RAISE EXCEPTION 'tipo da trilha incorreto: %', t; END IF;

  IF EXISTS (SELECT 1 FROM public.training_image_requests
              WHERE empresa_id <> 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') THEN
    RAISE EXCEPTION 'empresa_id da fila incorreto';
  END IF;

  RAISE NOTICE 'PASS 2 — curso e trilha enfileirados com o tenant correto';
END $$;

-- ─── 3. Unicidade por conteúdo (nunca duplica a mesma capa) ─────────────────
DO $$
DECLARE bloqueou boolean := false;
BEGIN
  BEGIN
    INSERT INTO public.training_image_requests (empresa_id, content_type, content_id)
    VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
            'a0000011-0000-4000-8000-000000000011');
  EXCEPTION WHEN unique_violation THEN
    bloqueou := true;
  END;
  IF NOT bloqueou THEN RAISE EXCEPTION 'duplicidade deveria ser bloqueada'; END IF;

  -- O trigger continua funcionando quando já existe linha (ON CONFLICT DO NOTHING):
  -- inserir outro curso deve funcionar normalmente.
  INSERT INTO public.catalogo_cursos (id, empresa_id, nome)
  VALUES ('a0000013-0000-4000-8000-000000000013', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Curso auto 3');

  IF (SELECT count(*) FROM public.training_image_requests) <> 3 THEN
    RAISE EXCEPTION 'o trigger deveria continuar enfileirando novos conteudos';
  END IF;
  RAISE NOTICE 'PASS 3 — unicidade por conteudo e trigger nao bloqueia cadastro';
END $$;

-- ─── 4. Claim do lote (SKIP LOCKED) ─────────────────────────────────────────
DO $$
DECLARE n int; m int;
BEGIN
  SELECT count(*) INTO n FROM public.claim_training_image_requests(10);
  IF n <> 3 THEN RAISE EXCEPTION 'primeiro claim deveria pegar 3, veio %', n; END IF;

  IF EXISTS (SELECT 1 FROM public.training_image_requests WHERE status <> 'processing') THEN
    RAISE EXCEPTION 'todas as requisicoes deveriam estar processing';
  END IF;
  IF EXISTS (SELECT 1 FROM public.training_image_requests WHERE attempts <> 1) THEN
    RAISE EXCEPTION 'attempts deveria ser 1 apos o primeiro claim';
  END IF;

  SELECT count(*) INTO m FROM public.claim_training_image_requests(10);
  IF m <> 0 THEN RAISE EXCEPTION 'segundo claim nao deveria pegar nada, veio %', m; END IF;

  RAISE NOTICE 'PASS 4 — claim atomico consome cada requisicao UMA vez';
END $$;

-- ─── 5. Recuperação de worker travado (stale > 30 min) ─────────────────────
DO $$
DECLARE r record;
BEGIN
  UPDATE public.training_image_requests
     SET started_at = now() - interval '31 minutes'
   WHERE content_id = 'a0000011-0000-4000-8000-000000000011';

  SELECT * INTO r FROM public.claim_training_image_requests(1);
  IF r.id IS NULL OR r.content_id <> 'a0000011-0000-4000-8000-000000000011' THEN
    RAISE EXCEPTION 'trabalho travado deveria ser recuperado';
  END IF;
  IF r.attempts <> 2 THEN RAISE EXCEPTION 'attempts esperado 2, veio %', r.attempts; END IF;
  RAISE NOTICE 'PASS 5 — trabalho travado e recuperado (attempts=2)';
END $$;

-- ─── 6. Teto de tentativas da fila ──────────────────────────────────────────
DO $$
DECLARE n int;
BEGIN
  UPDATE public.training_image_requests
     SET status = 'processing', attempts = 5, started_at = now() - interval '1 hour'
   WHERE content_id = 'a0000013-0000-4000-8000-000000000013';

  SELECT count(*) INTO n FROM public.claim_training_image_requests(10)
   WHERE content_id = 'a0000013-0000-4000-8000-000000000013';
  IF n <> 0 THEN RAISE EXCEPTION 'requisicao com attempts=5 nao deveria ser reivindicada'; END IF;
  RAISE NOTICE 'PASS 6 — teto de tentativas da fila respeitado';
END $$;

-- ─── 7. Finish: transições válidas e inválidas ──────────────────────────────
DO $$
DECLARE v record; falhou boolean := false;
BEGIN
  SELECT * INTO v FROM public.finish_training_image_request(
    (SELECT id FROM public.training_image_requests
      WHERE content_id = 'a0000011-0000-4000-8000-000000000011'),
    'done', NULL);
  IF v.status <> 'done' OR v.finished_at IS NULL THEN
    RAISE EXCEPTION 'finish(done) nao marcou a requisicao';
  END IF;

  BEGIN
    PERFORM public.finish_training_image_request(v.id, 'invalido');
  EXCEPTION WHEN OTHERS THEN
    IF position('status_invalido' in SQLERRM) = 0 THEN RAISE; END IF;
    falhou := true;
  END;
  IF NOT falhou THEN RAISE EXCEPTION 'status invalido deveria falhar'; END IF;
  RAISE NOTICE 'PASS 7 — finish valida transicoes';
END $$;

-- ─── 8. Desligar a flag volta a não enfileirar ──────────────────────────────
DO $$
DECLARE n int;
BEGIN
  PERFORM set_training_image_autoqueue(false);
  INSERT INTO public.catalogo_cursos (id, empresa_id, nome)
  VALUES ('a0000014-0000-4000-8000-000000000014', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Curso auto 4');
  SELECT count(*) INTO n FROM public.training_image_requests
   WHERE content_id = 'a0000014-0000-4000-8000-000000000014';
  IF n <> 0 THEN RAISE EXCEPTION 'flag desligada deveria impedir enfileiramento'; END IF;
  RAISE NOTICE 'PASS 8 — flag desligada interrompe novos enfileiramentos';
END $$;

-- ─── 9. Navegador não acessa a fila nem a flag ─────────────────────────────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111"}';
DO $$
DECLARE n int; falhou boolean;
BEGIN
  falhou := false;
  BEGIN
    SELECT count(*) INTO n FROM public.training_image_requests;
  EXCEPTION WHEN insufficient_privilege THEN
    falhou := true;
  END;
  IF NOT falhou THEN RAISE EXCEPTION 'authenticated nao deveria ler a fila'; END IF;

  falhou := false;
  BEGIN
    PERFORM public.claim_training_image_requests(1);
  EXCEPTION WHEN insufficient_privilege THEN falhou := true;
  END;
  IF NOT falhou THEN RAISE EXCEPTION 'authenticated nao deveria executar o claim da fila'; END IF;

  falhou := false;
  BEGIN
    PERFORM public.set_training_image_autoqueue(true);
  EXCEPTION WHEN insufficient_privilege THEN falhou := true;
  END;
  IF NOT falhou THEN RAISE EXCEPTION 'authenticated nao deveria alterar a flag'; END IF;

  RAISE NOTICE 'PASS 9 — fila e flag invisiveis/inacessiveis ao navegador';
END $$;
ROLLBACK;

-- ─── 10. service_role (backend) opera a fila ────────────────────────────────
BEGIN;
SET LOCAL ROLE service_role;
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.training_image_requests;
  IF n < 1 THEN RAISE EXCEPTION 'service_role deveria ver a fila'; END IF;
  RAISE NOTICE 'PASS 10 — service_role opera a fila';
END $$;
ROLLBACK;

-- ─── 11. requested_by vem do JWT do cadastro (nunca inventado) ──────────────
BEGIN;
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111"}';
UPDATE public.training_image_settings SET autoqueue_enabled = true WHERE id = true;
INSERT INTO public.catalogo_cursos (id, empresa_id, nome)
VALUES ('a0000030-0000-4000-8000-000000000030', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Curso com usuario');

DO $$
DECLARE v uuid;
BEGIN
  SELECT requested_by INTO v FROM public.training_image_requests
   WHERE content_id = 'a0000030-0000-4000-8000-000000000030';
  IF v IS DISTINCT FROM '11111111-1111-4111-8111-111111111111'::uuid THEN
    RAISE EXCEPTION 'requested_by deveria vir do JWT, veio %', v;
  END IF;
  RAISE NOTICE 'PASS 11 — fila registra o usuario do cadastro (auth.uid)';
END $$;
ROLLBACK;

-- ─── 12. Quota esgotada devolve à fila com adiamento (sem loop) ─────────────
DO $$
DECLARE r record; n int; v_id uuid;
BEGIN
  PERFORM set_training_image_autoqueue(false);
  DELETE FROM public.training_image_requests;
  INSERT INTO public.training_image_requests (empresa_id, content_type, content_id)
  VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
          'a0000031-0000-4000-8000-000000000031')
  RETURNING id INTO v_id;

  PERFORM public.claim_training_image_requests(1);
  r := public.finish_training_image_request(v_id, 'queued', 'rate_limit_empresa', 300);

  IF r.available_at <= now() THEN
    RAISE EXCEPTION 'available_at deveria estar no futuro (adiamento)';
  END IF;

  SELECT count(*) INTO n FROM public.claim_training_image_requests(1) WHERE id = v_id;
  IF n <> 0 THEN RAISE EXCEPTION 'item adiado NAO deveria ser reivindicado'; END IF;

  UPDATE public.training_image_requests SET available_at = now() - interval '1 second'
   WHERE id = v_id;
  SELECT count(*) INTO n FROM public.claim_training_image_requests(1) WHERE id = v_id;
  IF n <> 1 THEN RAISE EXCEPTION 'item deveria ser reivindicado apos o adiamento'; END IF;

  RAISE NOTICE 'PASS 12 — quota esgotada adia a fila em vez de criar loop';
END $$;

-- ─── 13. Backfill idempotente de conteúdo sem capa ──────────────────────────
DO $$
DECLARE n1 int; n2 int;
BEGIN
  DELETE FROM public.training_image_requests;
  DELETE FROM public.training_images;

  INSERT INTO public.catalogo_cursos (id, empresa_id, nome)
  VALUES ('a0000032-0000-4000-8000-000000000032', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Backfill curso');
  INSERT INTO public.trilhas_aprendizado (id, empresa_id, nome)
  VALUES ('a0000034-0000-4000-8000-000000000034', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Backfill trilha');

  INSERT INTO public.catalogo_cursos (id, empresa_id, nome)
  VALUES ('a0000033-0000-4000-8000-000000000033', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'Curso com capa');
  INSERT INTO public.training_images
    (empresa_id, content_type, content_id, storage_path, status, provider, attempts)
  VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
          'a0000033-0000-4000-8000-000000000033',
          'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/courses/a0000033-0000-4000-8000-000000000033/cover.webp',
          'succeeded', 'teste', 1);

  n1 := public.backfill_training_image_requests(500);
  IF n1 < 2 THEN RAISE EXCEPTION 'backfill deveria inserir ao menos 2, inseriu %', n1; END IF;

  n2 := public.backfill_training_image_requests(500);
  IF n2 <> 0 THEN RAISE EXCEPTION 'segundo backfill deveria inserir 0, inseriu %', n2; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.training_image_requests
                  WHERE content_id = 'a0000032-0000-4000-8000-000000000032') THEN
    RAISE EXCEPTION 'curso sem capa deveria ter sido enfileirado';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.training_image_requests
                  WHERE content_id = 'a0000034-0000-4000-8000-000000000034') THEN
    RAISE EXCEPTION 'trilha sem capa deveria ter sido enfileirada';
  END IF;

  IF EXISTS (SELECT 1 FROM public.training_image_requests
              WHERE content_id = 'a0000033-0000-4000-8000-000000000033') THEN
    RAISE EXCEPTION 'conteudo com capa NAO deveria ser enfileirado';
  END IF;

  RAISE NOTICE 'PASS 13 — backfill idempotente cobre conteudos antigos sem capa';
END $$;

-- ─── 14. Backfill é exclusivo do backend ───────────────────────────────────
BEGIN;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.backfill_training_image_requests(1);
    RAISE EXCEPTION 'authenticated nao deveria executar o backfill';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS 14 — backfill negado para authenticated';
END $$;
ROLLBACK;

\echo 'AUTOQUEUE TESTS: TODOS OS CENARIOS PASSARAM'

