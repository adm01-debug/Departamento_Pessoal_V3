-- =============================================================================
-- TESTES REAIS DO CLAIM ATÔMICO — PostgreSQL local (não é simulação)
-- =============================================================================
-- Exercita a implementação SQL efetiva de public.claim_training_image:
-- idempotência, trabalho em andamento, recuperação de trabalho interrompido,
-- conteúdo editado, limite de tentativas, isolamento entre empresas e tipos.
--
-- Uso: psql -v ON_ERROR_STOP=1 -d training_images_test -f claim.test.sql
-- =============================================================================
\set ON_ERROR_STOP on
SET client_min_messages TO notice;

TRUNCATE public.training_images CASCADE;

-- ─── 1. Primeira reivindicação ───────────────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.claim_training_image(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
    'a0000001-0000-4000-8000-000000000001', 'hash-a-v1', 'v2', 3);

  IF r.reclamado IS DISTINCT FROM true THEN RAISE EXCEPTION '1: deveria reclamar'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION '1: status esperado pending, veio %', r.status; END IF;
  IF r.attempts <> 1 THEN RAISE EXCEPTION '1: attempts esperado 1, veio %', r.attempts; END IF;
  RAISE NOTICE 'PASS 1 — primeira solicitacao reivindica (pending, attempts=1)';
END $$;

-- ─── 2. Mesmo hash e trabalho recente: NÃO reivindica (idempotência) ─────────
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.claim_training_image(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
    'a0000001-0000-4000-8000-000000000001', 'hash-a-v1');

  IF r.reclamado IS DISTINCT FROM false THEN RAISE EXCEPTION '2: NAO deveria reclamar'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION '2: status %', r.status; END IF;
  IF r.attempts <> 1 THEN RAISE EXCEPTION '2: attempts nao deveria subir, veio %', r.attempts; END IF;
  RAISE NOTICE 'PASS 2 — solicitacao duplicada NAO reivindica e nao consome tentativa';
END $$;

-- ─── 3. Trabalho em processamento recente ────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  UPDATE public.training_images
     SET status = 'processing', requested_at = now()
   WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND content_id = 'a0000001-0000-4000-8000-000000000001';

  SELECT * INTO r FROM public.claim_training_image(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
    'a0000001-0000-4000-8000-000000000001', 'hash-a-v1');

  IF r.reclamado IS DISTINCT FROM false THEN RAISE EXCEPTION '3: NAO deveria reclamar'; END IF;
  IF r.status <> 'processing' THEN RAISE EXCEPTION '3: status %', r.status; END IF;
  RAISE NOTICE 'PASS 3 — trabalho em processamento recente NAO e reivindicado';
END $$;

-- ─── 4. Recuperação de trabalho interrompido (stale) ─────────────────────────
DO $$
DECLARE r record;
BEGIN
  UPDATE public.training_images
     SET status = 'processing', requested_at = now() - interval '11 minutes'
   WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND content_id = 'a0000001-0000-4000-8000-000000000001';

  SELECT * INTO r FROM public.claim_training_image(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
    'a0000001-0000-4000-8000-000000000001', 'hash-a-v1');

  IF r.reclamado IS DISTINCT FROM true THEN RAISE EXCEPTION '4: deveria recuperar trabalho travado'; END IF;
  IF r.attempts <> 2 THEN RAISE EXCEPTION '4: attempts esperado 2, veio %', r.attempts; END IF;
  RAISE NOTICE 'PASS 4 — trabalho interrompido > 10 min e recuperado (attempts=2)';
END $$;

-- ─── 5. Já concluído com o MESMO hash: não regera ────────────────────────────
DO $$
DECLARE r record;
BEGIN
  UPDATE public.training_images
     SET status = 'succeeded', completed_at = now()
   WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND content_id = 'a0000001-0000-4000-8000-000000000001';

  SELECT * INTO r FROM public.claim_training_image(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
    'a0000001-0000-4000-8000-000000000001', 'hash-a-v1');

  IF r.reclamado IS DISTINCT FROM false THEN RAISE EXCEPTION '5: NAO deveria regerar'; END IF;
  IF r.status <> 'succeeded' THEN RAISE EXCEPTION '5: status %', r.status; END IF;
  RAISE NOTICE 'PASS 5 — capa concluida com mesmo hash NAO e regerada';
END $$;

-- ─── 6. Conteúdo editado (hash novo): nova geração ───────────────────────────
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.claim_training_image(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
    'a0000001-0000-4000-8000-000000000001', 'hash-a-v2');

  IF r.reclamado IS DISTINCT FROM true THEN RAISE EXCEPTION '6: edicao deveria liberar nova geracao'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION '6: status %', r.status; END IF;
  -- Versão NOVA (hash diferente) começa com 1 tentativa: falhas da versão
  -- anterior não bloqueiam conteúdo legítimo editado.
  IF r.attempts <> 1 THEN RAISE EXCEPTION '6: attempts esperado 1, veio %', r.attempts; END IF;
  RAISE NOTICE 'PASS 6 — conteudo editado (hash novo) reivindica e zera tentativas';
END $$;

-- ─── 7. Limite de tentativas da MESMA versão ────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  UPDATE public.training_images
     SET status = 'failed', attempts = 3, last_error = 'falha anterior'
   WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND content_id = 'a0000001-0000-4000-8000-000000000001';

  SELECT * INTO r FROM public.claim_training_image(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
    'a0000001-0000-4000-8000-000000000001', 'hash-a-v2');

  IF r.reclamado IS DISTINCT FROM false THEN RAISE EXCEPTION '7: limite deveria bloquear'; END IF;
  IF r.attempts <> 3 THEN RAISE EXCEPTION '7: attempts %', r.attempts; END IF;
  RAISE NOTICE 'PASS 7 — limite de tentativas bloqueia a MESMA versao';
END $$;

-- ─── 7b. Versão NOVA não é bloqueada por tentativas da versão antiga ────────
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.claim_training_image(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
    'a0000001-0000-4000-8000-000000000001', 'hash-a-v4');

  IF r.reclamado IS DISTINCT FROM true THEN
    RAISE EXCEPTION '7b: conteudo novo NAO deveria ser bloqueado por falhas antigas';
  END IF;
  IF r.attempts <> 1 THEN RAISE EXCEPTION '7b: attempts esperado 1, veio %', r.attempts; END IF;
  RAISE NOTICE 'PASS 7b — falhas antigas NAO bloqueiam versao nova';
END $$;

-- ─── 8. Isolamento entre empresas via conteúdo ───────────────────────────────
DO $$
DECLARE bloqueou boolean := false;
BEGIN
  BEGIN
    PERFORM public.claim_training_image(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
      'b0000001-0000-4000-8000-000000000001', 'hash-b-v1');
  EXCEPTION WHEN OTHERS THEN
    IF position('conteudo_nao_pertence_a_empresa' in SQLERRM) = 0 THEN RAISE; END IF;
    bloqueou := true;
  END;
  IF NOT bloqueou THEN RAISE EXCEPTION '8: empresa A reivindicou curso da empresa B'; END IF;
  RAISE NOTICE 'PASS 8 — empresa A NAO reivindica conteudo da empresa B';
END $$;

-- ─── 9. Trilha (learning_path) ───────────────────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.claim_training_image(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'learning_path',
    'a0000002-0000-4000-8000-000000000002', 'hash-trilha-a');
  IF r.reclamado IS DISTINCT FROM true THEN RAISE EXCEPTION '9: trilha A deveria reivindicar'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION '9: status %', r.status; END IF;
  RAISE NOTICE 'PASS 9 — trilha da empresa A reivindica';
END $$;

DO $$
DECLARE bloqueou boolean := false;
BEGIN
  BEGIN
    PERFORM public.claim_training_image(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'learning_path',
      'b0000002-0000-4000-8000-000000000002', 'hash-trilha-b');
  EXCEPTION WHEN OTHERS THEN
    IF position('conteudo_nao_pertence_a_empresa' in SQLERRM) = 0 THEN RAISE; END IF;
    bloqueou := true;
  END;
  IF NOT bloqueou THEN RAISE EXCEPTION '9b: trilha B vazou para empresa A'; END IF;
  RAISE NOTICE 'PASS 10 — trilha B NAO pertence a empresa A';
END $$;

-- ─── 10. Turma (training_session) valida pelo curso ──────────────────────────
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.claim_training_image(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'training_session',
    'a0000003-0000-4000-8000-000000000003', 'hash-turma-a');
  IF r.reclamado IS DISTINCT FROM true THEN RAISE EXCEPTION '10: turma A deveria reivindicar'; END IF;
  RAISE NOTICE 'PASS 11 — turma da empresa A reivindica (via curso)';
END $$;

DO $$
DECLARE bloqueou boolean := false;
BEGIN
  BEGIN
    PERFORM public.claim_training_image(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'training_session',
      'b0000003-0000-4000-8000-000000000003', 'hash-turma-b');
  EXCEPTION WHEN OTHERS THEN
    IF position('conteudo_nao_pertence_a_empresa' in SQLERRM) = 0 THEN RAISE; END IF;
    bloqueou := true;
  END;
  IF NOT bloqueou THEN RAISE EXCEPTION '10b: turma B vazou para empresa A'; END IF;
  RAISE NOTICE 'PASS 12 — turma B NAO pertence a empresa A';
END $$;

-- ─── 11. Certificado valida pelo colaborador ─────────────────────────────────
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.claim_training_image(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'certificate',
    'a0000004-0000-4000-8000-000000000004', 'hash-cert-a');
  IF r.reclamado IS DISTINCT FROM true THEN RAISE EXCEPTION '11: certificado A deveria reivindicar'; END IF;
  RAISE NOTICE 'PASS 13 — certificado da empresa A reivindica (via colaborador)';
END $$;

DO $$
DECLARE bloqueou boolean := false;
BEGIN
  BEGIN
    PERFORM public.claim_training_image(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'certificate',
      'b0000004-0000-4000-8000-000000000004', 'hash-cert-b');
  EXCEPTION WHEN OTHERS THEN
    IF position('conteudo_nao_pertence_a_empresa' in SQLERRM) = 0 THEN RAISE; END IF;
    bloqueou := true;
  END;
  IF NOT bloqueou THEN RAISE EXCEPTION '11b: certificado B vazou para empresa A'; END IF;
  RAISE NOTICE 'PASS 14 — certificado B NAO pertence a empresa A';
END $$;

-- ─── 12. Mesmo hash em empresas diferentes: linhas independentes ─────────────
DO $$
DECLARE r record;
BEGIN
  SELECT * INTO r FROM public.claim_training_image(
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'course',
    'b0000001-0000-4000-8000-000000000001', 'hash-compartilhado');
  IF r.reclamado IS DISTINCT FROM true THEN
    RAISE EXCEPTION '12: empresa B deveria reivindicar a propria capa';
  END IF;

  IF (SELECT count(*) FROM public.training_images
       WHERE content_type = 'course'
         AND content_id = 'b0000001-0000-4000-8000-000000000001'
         AND empresa_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') <> 1 THEN
    RAISE EXCEPTION '12: linha da empresa B ausente/duplicada';
  END IF;
  RAISE NOTICE 'PASS 15 — empresas diferentes tem linhas independentes (mesmo hash)';
END $$;

-- ─── 13. Entradas inválidas ──────────────────────────────────────────────────
DO $$
DECLARE falhou boolean;
BEGIN
  falhou := false;
  BEGIN
    PERFORM public.claim_training_image(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'podcast',
      'a0000001-0000-4000-8000-000000000001', 'hash-a-v1');
  EXCEPTION WHEN OTHERS THEN
    IF position('tipo_de_conteudo_invalido' in SQLERRM) = 0 THEN RAISE; END IF;
    falhou := true;
  END;
  IF NOT falhou THEN RAISE EXCEPTION '13: tipo invalido aceito'; END IF;

  falhou := false;
  BEGIN
    PERFORM public.claim_training_image(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
      'a0000001-0000-4000-8000-000000000001', 'curto');
  EXCEPTION WHEN OTHERS THEN
    IF position('content_hash_invalido' in SQLERRM) = 0 THEN RAISE; END IF;
    falhou := true;
  END;
  IF NOT falhou THEN RAISE EXCEPTION '13: hash curto aceito'; END IF;

  RAISE NOTICE 'PASS 16 — tipo e hash invalidos sao recusados';
END $$;

-- ─── 14. p_max_attempts é limitado entre 1 e 5 ──────────────────────────────
DO $$
DECLARE r record;
BEGIN
  DELETE FROM public.training_images
   WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND content_type = 'course'
     AND content_id = 'a0000001-0000-4000-8000-000000000001';

  SELECT * INTO r FROM public.claim_training_image(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
    'a0000001-0000-4000-8000-000000000001', 'hash-limite', 'v2', 0);
  IF r.reclamado IS DISTINCT FROM true THEN
    RAISE EXCEPTION '14: primeira com max=0 deveria reclamar';
  END IF;
  IF r.attempts <> 1 THEN RAISE EXCEPTION '14: attempts %', r.attempts; END IF;

  UPDATE public.training_images SET status = 'failed'
   WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND content_id = 'a0000001-0000-4000-8000-000000000001';

  SELECT * INTO r FROM public.claim_training_image(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
    'a0000001-0000-4000-8000-000000000001', 'hash-limite', 'v2', 0);
  IF r.reclamado IS DISTINCT FROM false THEN
    RAISE EXCEPTION '14: max_attempts=0 deveria ser elevado a 1';
  END IF;
  RAISE NOTICE 'PASS 17 — p_max_attempts e limitado (0 -> 1)';
END $$;

-- ─── 15. Contadores por conceito (trigger de desfecho) ──────────────────────
DO $$
DECLARE v record;
BEGIN
  -- Estado limpo para medir os contadores desde zero.
  DELETE FROM public.training_images
   WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND content_id = 'a0000001-0000-4000-8000-000000000001';

  PERFORM public.claim_training_image(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
    'a0000001-0000-4000-8000-000000000001', 'hash-contadores');

  UPDATE public.training_images
     SET status = 'succeeded', completed_at = now()
   WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND content_id = 'a0000001-0000-4000-8000-000000000001';

  SELECT generations, failures, unknown_outcomes INTO v
  FROM public.training_images
  WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    AND content_id = 'a0000001-0000-4000-8000-000000000001';

  IF v.generations <> 1 OR v.failures <> 0 OR v.unknown_outcomes <> 0 THEN
    RAISE EXCEPTION 'contadores de sucesso incorretos: %/%/%', v.generations, v.failures, v.unknown_outcomes;
  END IF;

  UPDATE public.training_images
     SET status = 'failed', last_error = 'provedor recusou'
   WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND content_id = 'a0000001-0000-4000-8000-000000000001';

  UPDATE public.training_images
     SET status = 'pending'
   WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND content_id = 'a0000001-0000-4000-8000-000000000001';
  UPDATE public.training_images
     SET status = 'failed', last_error = 'resultado_desconhecido: timeout'
   WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND content_id = 'a0000001-0000-4000-8000-000000000001';

  -- Reaplicar failed NÃO duplica contadores.
  UPDATE public.training_images
     SET last_error = 'resultado_desconhecido: timeout'
   WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND content_id = 'a0000001-0000-4000-8000-000000000001';

  SELECT generations, failures, unknown_outcomes INTO v
  FROM public.training_images
  WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    AND content_id = 'a0000001-0000-4000-8000-000000000001';

  IF v.generations <> 1 OR v.failures <> 1 OR v.unknown_outcomes <> 1 THEN
    RAISE EXCEPTION 'contadores incorretos: ger=% fal=% inc=%', v.generations, v.failures, v.unknown_outcomes;
  END IF;

  RAISE NOTICE 'PASS 18 — contadores separam sucesso, falha e incerteza';
END $$;

-- ─── 16. Reconciliação de resultado desconhecido ────────────────────────────
DO $$
DECLARE falhou boolean; v public.training_images;
BEGIN
  falhou := false;
  BEGIN
    PERFORM public.reconcile_training_image(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
      'a0000001-0000-4000-8000-000000000001', 'confirmar_nao_gerado', '', 'notas');
  EXCEPTION WHEN OTHERS THEN
    IF position('operador_obrigatorio' in SQLERRM) = 0 THEN RAISE; END IF;
    falhou := true;
  END;
  IF NOT falhou THEN RAISE EXCEPTION 'reconciliar sem operador deveria falhar'; END IF;

  falhou := false;
  BEGIN
    PERFORM public.reconcile_training_image(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
      'a0000001-0000-4000-8000-000000000001', 'confirmar_nao_gerado', 'ana', '   ');
  EXCEPTION WHEN OTHERS THEN
    IF position('notas_obrigatorias' in SQLERRM) = 0 THEN RAISE; END IF;
    falhou := true;
  END;
  IF NOT falhou THEN RAISE EXCEPTION 'reconciliar sem notas deveria falhar'; END IF;

  falhou := false;
  BEGIN
    PERFORM public.reconcile_training_image(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
      'a0000001-0000-4000-8000-000000000001', 'decisao_qualquer', 'ana', 'notas');
  EXCEPTION WHEN OTHERS THEN
    IF position('decisao_invalida' in SQLERRM) = 0 THEN RAISE; END IF;
    falhou := true;
  END;
  IF NOT falhou THEN RAISE EXCEPTION 'decisao invalida deveria falhar'; END IF;

  v := public.reconcile_training_image(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
    'a0000001-0000-4000-8000-000000000001', 'confirmar_nao_gerado', 'ana.silva',
    'Conferido no painel OpenAI: nenhuma geracao para o operation_id nas ultimas 24h.');

  IF v.status <> 'disabled' OR v.attempts <> 0 THEN
    RAISE EXCEPTION 'reconciliacao deveria liberar a linha (status=%, attempts=%)', v.status, v.attempts;
  END IF;
  IF v.reconciled_by <> 'ana.silva' OR v.reconciled_at IS NULL OR v.reconciliation_notes IS NULL THEN
    RAISE EXCEPTION 'auditoria da reconciliacao ausente';
  END IF;

  IF (SELECT reclamado FROM public.claim_training_image(
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
        'a0000001-0000-4000-8000-000000000001', 'hash-contadores')) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'apos reconciliar, a solicitacao deveria ser aceita';
  END IF;

  RAISE NOTICE 'PASS 19 — reconciliacao exige operador/notas e audita a decisao';
END $$;


-- ─── 17. Reconciliação NÃO funciona em estado conhecido ─────────────────────
DO $$
DECLARE falhou boolean := false;
BEGIN
  UPDATE public.training_images
     SET status = 'failed', last_error = 'provedor recusou'
   WHERE empresa_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
     AND content_id = 'a0000001-0000-4000-8000-000000000001';

  BEGIN
    PERFORM public.reconcile_training_image(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
      'a0000001-0000-4000-8000-000000000001', 'confirmar_nao_gerado', 'ana', 'notas');
  EXCEPTION WHEN OTHERS THEN
    IF position('registro_nao_esta_em_estado_desconhecido' in SQLERRM) = 0 THEN RAISE; END IF;
    falhou := true;
  END;

  IF NOT falhou THEN RAISE EXCEPTION 'reconciliar estado conhecido deveria falhar'; END IF;
  RAISE NOTICE 'PASS 20 — attempts de estado conhecido NAO pode ser zerado por reconciliacao';
END $$;

-- ─── 18. Reconciliação é exclusiva do backend ───────────────────────────────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111"}';
DO $$
BEGIN
  BEGIN
    PERFORM public.reconcile_training_image(
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'course',
      'a0000001-0000-4000-8000-000000000001', 'confirmar_nao_gerado', 'ana', 'notas');
    RAISE EXCEPTION 'authenticated nao deveria reconciliar';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS 21 — reconciliacao negada para authenticated';
END $$;
ROLLBACK;

\echo 'CLAIM TESTS: TODOS OS CENARIOS SEQUENCIAIS PASSARAM'

