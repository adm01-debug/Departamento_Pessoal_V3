-- Sidecar de verificação: confirma que ALTER DEFAULT PRIVILEGES foi aplicado.
-- Deve imprimir literalmente 'ok' (psql -t -A).

DO $$
DECLARE
  v_priv_exists boolean;
BEGIN
  -- pg_default_acl armazena ACLs padrão por schema/tipo de objeto/role
  -- type 'f' = funções; acl 'PUBLIC' com 'X' (execute) NÃO deve existir
  SELECT EXISTS (
    SELECT 1
    FROM pg_default_acl da
    JOIN pg_namespace n ON n.oid = da.defaclnamespace
    WHERE n.nspname = 'public'
      AND da.defaclobjtype = 'f'
      AND array_to_string(da.defaclacl, ',') LIKE '%=X/%'  -- PUBLIC tem execute
  ) INTO v_priv_exists;

  IF v_priv_exists THEN
    RAISE EXCEPTION 'ALTER DEFAULT PRIVILEGES não aplicado: PUBLIC ainda tem EXECUTE em funções futuras';
  END IF;
END;
$$;

SELECT 'ok';
