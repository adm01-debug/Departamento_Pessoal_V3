-- Complementa a migration 20261018160000 que usou ALTER DEFAULT PRIVILEGES sem
-- FOR ROLE. Sem a cláusula, o REVOKE só se aplica ao role executor (postgres).
-- Funções criadas por supabase_admin continuariam herdando PUBLIC EXECUTE.
-- Cada role exige um ALTER separado (PostgreSQL não aceita lista no FOR ROLE).

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
