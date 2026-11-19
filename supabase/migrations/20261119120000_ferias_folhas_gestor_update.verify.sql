-- Verify: a policy de UPDATE gestor existe em ferias.
-- Escopo revisado: folhas_pagamento fica sem escrita de gestor (decisão da
-- 20261119130000); o sidecar de verify dela já assevera essa não-existência.
BEGIN;
SELECT 1 / COUNT(*) FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'ferias'
  AND policyname = 'ferias_gestor_update'
  AND cmd = 'UPDATE'
  AND roles::text LIKE '%authenticated%';
ROLLBACK;
