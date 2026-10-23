-- =============================================================================
-- CONTROLE DE CUSTO — rate limit atômico e PERSISTENTE (PostgreSQL real)
-- =============================================================================
\set ON_ERROR_STOP on
SET client_min_messages TO notice;

TRUNCATE public.rate_limits;

-- ─── 1. Limite de 5 por janela, contado no banco ────────────────────────────
DO $$
DECLARE
  r jsonb;
  n int;
BEGIN
  FOR i IN 1..5 LOOP
    r := public.edge_rate_limit_check('training-image-generate:user-a', 5, 3600, 1000000);
    IF NOT (r ->> 'allowed')::boolean THEN
      RAISE EXCEPTION 'chamada % bloqueada antes do limite', i;
    END IF;
    IF (r ->> 'current')::int <> i THEN
      RAISE EXCEPTION 'contador esperado %, veio %', i, r ->> 'current';
    END IF;
  END LOOP;

  SELECT count(*) INTO n FROM public.rate_limits WHERE key = 'training-image-generate:user-a';
  IF n <> 5 THEN RAISE EXCEPTION 'esperava 5 linhas persistidas, veio %', n; END IF;

  r := public.edge_rate_limit_check('training-image-generate:user-a', 5, 3600, 1000000);
  IF (r ->> 'allowed')::boolean THEN RAISE EXCEPTION '6a chamada deveria ser bloqueada'; END IF;
  IF (r ->> 'remaining')::int <> 0 THEN RAISE EXCEPTION 'remaining deveria ser 0'; END IF;

  RAISE NOTICE 'PASS 1 — limite de 5/hora aplicado e persistido no banco';
END $$;

-- ─── 2. Chaves diferentes (usuários diferentes) são independentes ───────────
DO $$
DECLARE r jsonb;
BEGIN
  r := public.edge_rate_limit_check('training-image-generate:user-b', 5, 3600, 1000000);
  IF NOT (r ->> 'allowed')::boolean THEN
    RAISE EXCEPTION 'usuario B nao deveria ser afetado pelo limite do usuario A';
  END IF;
  RAISE NOTICE 'PASS 2 — usuario B tem quota propria (isolamento por chave)';
END $$;

-- ─── 3. Janela deslizante: expira e libera novamente ────────────────────────
DO $$
DECLARE r jsonb;
  n int;
BEGIN
  r := public.edge_rate_limit_check('training-image-generate:user-a', 5, 3600, 1000000 + 3601);
  IF NOT (r ->> 'allowed')::boolean THEN
    RAISE EXCEPTION 'apos a janela a primeira chamada deveria ser permitida';
  END IF;

  SELECT count(*) INTO n FROM public.rate_limits
   WHERE key = 'training-image-generate:user-a' AND timestamp < 1000000 + 1;
  IF n <> 0 THEN RAISE EXCEPTION 'linhas expiradas deveriam ter sido limpas'; END IF;

  RAISE NOTICE 'PASS 3 — janela expira, limpa registros antigos e libera quota';
END $$;

-- ─── 4. Acesso direto à tabela é negado para o navegador ────────────────────
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-4111-8111-111111111111"}';
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.rate_limits;
  IF n <> 0 THEN RAISE EXCEPTION 'authenticated nao deveria ler rate_limits'; END IF;
  RAISE NOTICE 'PASS 4 — rate_limits invisivel para authenticated (RLS)';
END $$;
ROLLBACK;

-- ─── 5. RPC exclusivo do backend ────────────────────────────────────────────
BEGIN;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.edge_rate_limit_check('x', 1, 60, 1000000);
    RAISE EXCEPTION 'authenticated nao deveria executar edge_rate_limit_check';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS 5 — edge_rate_limit_check negado para authenticated';
END $$;
ROLLBACK;

-- ─── 6. Quota DUPLA: teto da empresa compartilhado entre usuários ───────────
DO $$
DECLARE r jsonb; n int;
BEGIN
  DELETE FROM public.rate_limits WHERE key LIKE 'dual:%';

  r := public.edge_rate_limit_check_dual(
    'dual:empresa:E1', 2, 'dual:usuario:U1', 5, 3600, 2000000);
  IF NOT (r ->> 'allowed')::boolean OR (r ->> 'empresa_current')::int <> 1 THEN
    RAISE EXCEPTION 'U1 deveria consumir a 1a vaga da empresa: %', r;
  END IF;

  r := public.edge_rate_limit_check_dual(
    'dual:empresa:E1', 2, 'dual:usuario:U2', 5, 3600, 2000000);
  IF NOT (r ->> 'allowed')::boolean OR (r ->> 'empresa_current')::int <> 2 THEN
    RAISE EXCEPTION 'U2 deveria consumir a 2a vaga da empresa: %', r;
  END IF;

  r := public.edge_rate_limit_check_dual(
    'dual:empresa:E1', 2, 'dual:usuario:U3', 5, 3600, 2000000);
  IF (r ->> 'allowed')::boolean THEN
    RAISE EXCEPTION 'U3 deveria ser bloqueado pelo teto da EMPRESA';
  END IF;
  IF (r ->> 'reason') <> 'empresa' THEN RAISE EXCEPTION 'motivo esperado empresa: %', r; END IF;

  SELECT count(*) INTO n FROM public.rate_limits WHERE key = 'dual:empresa:E1';
  IF n <> 2 THEN RAISE EXCEPTION 'empresa E1 deveria ter 2 consumos, tem %', n; END IF;

  SELECT count(*) INTO n FROM public.rate_limits WHERE key = 'dual:usuario:U3';
  IF n <> 0 THEN RAISE EXCEPTION 'usuario bloqueado NAO deveria consumir quota'; END IF;

  RAISE NOTICE 'PASS 6 — teto da empresa vale para usuários diferentes (sem consumo parcial)';
END $$;

-- ─── 7. Teto do usuário atravessa empresas ─────────────────────────────────
DO $$
DECLARE r jsonb; n int;
BEGIN
  DELETE FROM public.rate_limits WHERE key LIKE 'dual:%';

  r := public.edge_rate_limit_check_dual(
    'dual:empresa:E2', 10, 'dual:usuario:U9', 1, 3600, 2000000);
  IF NOT (r ->> 'allowed')::boolean THEN RAISE EXCEPTION 'primeira empresa deveria permitir'; END IF;

  r := public.edge_rate_limit_check_dual(
    'dual:empresa:E3', 10, 'dual:usuario:U9', 1, 3600, 2000000);
  IF (r ->> 'allowed')::boolean THEN
    RAISE EXCEPTION 'mesmo usuario em outra empresa deveria ser bloqueado pelo teto individual';
  END IF;
  IF (r ->> 'reason') <> 'usuario' THEN RAISE EXCEPTION 'motivo esperado usuario: %', r; END IF;

  SELECT count(*) INTO n FROM public.rate_limits WHERE key = 'dual:empresa:E3';
  IF n <> 0 THEN RAISE EXCEPTION 'empresa bloqueada NAO deveria consumir quota'; END IF;

  RAISE NOTICE 'PASS 7 — teto individual acompanha o usuário entre empresas';
END $$;

-- ─── 8. Empresas independentes ──────────────────────────────────────────────
DO $$
DECLARE r jsonb;
BEGIN
  r := public.edge_rate_limit_check_dual(
    'dual:empresa:E4', 1, 'dual:usuario:U10', 5, 3600, 2000000);
  IF NOT (r ->> 'allowed')::boolean THEN
    RAISE EXCEPTION 'empresa E4 nao deveria ser afetada pelo consumo de E2/E3';
  END IF;
  RAISE NOTICE 'PASS 8 — quota de uma empresa nao consome a de outra';
END $$;

-- ─── 9. RPC duplo é exclusivo do backend ────────────────────────────────────
BEGIN;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.edge_rate_limit_check_dual('x', 1, 'y', 1, 60, 2000000);
    RAISE EXCEPTION 'authenticated nao deveria executar o RPC duplo';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  RAISE NOTICE 'PASS 9 — edge_rate_limit_check_dual negado para authenticated';
END $$;
ROLLBACK;

-- ─── 10. Modo EMPRESA-ONLY (worker sem usuário confiável) ──────────────────
DO $$
DECLARE r jsonb; n int;
BEGIN
  DELETE FROM public.rate_limits WHERE key LIKE 'dual:%';

  r := public.edge_rate_limit_check_dual('dual:empresa:E5', 1, NULL, 0, 3600, 3000000);
  IF NOT (r ->> 'allowed')::boolean THEN
    RAISE EXCEPTION 'primeira chamada empresa-only deveria ser permitida: %', r;
  END IF;
  IF (r ->> 'empresa_current')::int <> 1 THEN
    RAISE EXCEPTION 'empresa_current esperado 1: %', r;
  END IF;
  IF (r ->> 'usuario_limit')::int <> 0 THEN
    RAISE EXCEPTION 'sem usuario, usuario_limit deveria ser 0: %', r;
  END IF;

  r := public.edge_rate_limit_check_dual('dual:empresa:E5', 1, NULL, 0, 3600, 3000000);
  IF (r ->> 'allowed')::boolean THEN
    RAISE EXCEPTION 'segunda chamada deveria ser bloqueada pelo teto da empresa';
  END IF;
  IF (r ->> 'reason') <> 'empresa' THEN RAISE EXCEPTION 'motivo esperado empresa: %', r; END IF;

  SELECT count(*) INTO n FROM public.rate_limits WHERE key = 'dual:empresa:E5';
  IF n <> 1 THEN RAISE EXCEPTION 'empresa E5 deveria ter 1 consumo, tem %', n; END IF;

  IF EXISTS (SELECT 1 FROM public.rate_limits WHERE key LIKE 'dual:usuario:%') THEN
    RAISE EXCEPTION 'modo empresa-only NAO deveria criar balde de usuario';
  END IF;

  RAISE NOTICE 'PASS 10 — modo empresa-only aplica o teto do tenant sem inventar usuário';
END $$;

-- ─── 11. Chave de usuário com limite inválido é recusada ───────────────────
DO $$
DECLARE falhou boolean := false;
BEGIN
  BEGIN
    PERFORM public.edge_rate_limit_check_dual('dual:empresa:E6', 5, 'dual:usuario:U1', 0, 3600, 3000000);
  EXCEPTION WHEN OTHERS THEN
    IF position('limite_usuario_invalido' in SQLERRM) = 0 THEN RAISE; END IF;
    falhou := true;
  END;
  IF NOT falhou THEN RAISE EXCEPTION 'limite_usuario_invalido deveria falhar'; END IF;
  RAISE NOTICE 'PASS 11 — usuário com limite 0 é recusado (não vira bypass)';
END $$;

\echo 'RATE LIMIT TESTS: TODOS OS CENARIOS PASSARAM'
