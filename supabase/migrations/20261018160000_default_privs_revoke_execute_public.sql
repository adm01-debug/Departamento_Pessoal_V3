-- GAP MÉDIO (sessão 14, agentes de validação): futuras funções SECURITY DEFINER
-- herdam EXECUTE para PUBLIC por padrão do PostgreSQL, contornando a política
-- estabelecida em 20261015170000_ci_auditor_revoke_public_secdef.sql.
--
-- Solução: `ALTER DEFAULT PRIVILEGES` global no schema public.
-- Efeito: todas as funções criadas FUTURAMENTE (qualquer criador) herdam
-- REVOKE EXECUTE FROM PUBLIC — o GRANT explícito continua obrigatório.
-- Funções existentes NÃO são afetadas; a migration anterior (20261015170000)
-- já cobre todas as funções presentes.

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Confirmação do estado esperado: nenhuma função nova herda PUBLIC automaticamente.
-- Verificação: scripts/audit-rls-pii.mjs já valida execução por ci_auditor
-- (information_schema → pg_attribute/pg_class), que NÃO deve ter EXECUTE em
-- funções SECURITY DEFINER sem GRANT explícito.
