-- Verify: policy de UPDATE gestor existe em ferias e folhas_pagamento.
BEGIN;
SELECT 1 / COUNT(*) FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('ferias', 'folhas_pagamento')
  AND policyname IN ('ferias_gestor_update', 'folhas_gestor_update')
  AND cmd = 'UPDATE'
  AND roles::text LIKE '%authenticated%';
ROLLBACK;
