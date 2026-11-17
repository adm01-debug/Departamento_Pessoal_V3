-- Sidecar da 20261117190000_permissions_matriz_seed.
-- Contrato: toda linha nao-vazia da saida tem de ser exatamente 'ok'.
-- Somente leitura de catalogo/dados — nenhuma escrita.

-- 1) a matriz deixou de estar vazia
SELECT CASE WHEN (SELECT count(*) FROM public.permissions) >= 43
  THEN 'ok' ELSE 'FALHOU: matriz com menos de 43 linhas' END;

-- 2) os 4 papeis semeados estao presentes
SELECT CASE WHEN (SELECT count(DISTINCT role::text) FROM public.permissions
                  WHERE role::text IN ('admin','gestor','rh','user')) = 4
  THEN 'ok' ELSE 'FALHOU: falta papel na matriz' END;

-- 3) admin tem as 4 acoes em colaboradores (o caso que o atalho do admin cobre)
SELECT CASE WHEN (SELECT count(*) FROM public.permissions
                  WHERE role::text = 'admin' AND resource = 'colaboradores'
                    AND action IN ('create','read','update','delete') AND allowed) = 4
  THEN 'ok' ELSE 'FALHOU: admin sem as 4 acoes em colaboradores' END;

-- 4) `user` NAO ganhou escrita por acidente — o seed e so leitura para ele
SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM public.permissions
    WHERE role::text = 'user' AND action IN ('create','update','delete') AND allowed
  ) THEN 'ok' ELSE 'FALHOU: papel user com permissao de escrita' END;

-- 5) `gestor` nao ganhou exclusao
SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM public.permissions
    WHERE role::text = 'gestor' AND action = 'delete' AND allowed
  ) THEN 'ok' ELSE 'FALHOU: gestor com permissao de exclusao' END;

-- 6) nenhuma linha duplicada (prova que o indice unico seguiu valendo)
SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM public.permissions GROUP BY role, resource, action HAVING count(*) > 1
  ) THEN 'ok' ELSE 'FALHOU: par (role,resource,action) duplicado' END;

-- 7) RLS segue ligada na tabela (o seed nao pode ter afrouxado nada)
SELECT CASE WHEN (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                  WHERE n.nspname='public' AND c.relname='permissions')
  THEN 'ok' ELSE 'FALHOU: RLS desligada em public.permissions' END;

-- 8) a versao ficou registrada no ledger
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '20261117190000'
  ) THEN 'ok' ELSE 'FALHOU: versao ausente do ledger' END;
