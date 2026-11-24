-- ok só se o papel da conexão pode ASSUMIR ci_auditor via SET ROLE.
--
-- 'MEMBER' não serve: ele responde verdadeiro para uma associação existente,
-- inclusive com SET FALSE — exatamente o estado em que
-- scripts/diag/run-sql-diag.mjs:225 (`SET LOCAL ROLE ci_auditor`) falha com
-- "permission denied to set role" antes de rodar a consulta. O que a migration
-- tem de provar é a permissão de assumir o papel, então a asserção usa 'SET'.
-- A mensagem é um CASE para que a falha diga o motivo em vez de saída vazia.
SELECT CASE
         WHEN pg_has_role(session_user, 'ci_auditor', 'SET') THEN 'ok'
         ELSE 'FALHOU: o papel da conexao nao pode SET ROLE ci_auditor'
       END;
