-- E50-34: cria as constraints que o upsert do Bitrix (sincronizar-bitrix)
-- sempre pressupôs mas nunca existiram — `departamentos` só tinha PK,
-- `colaboradores` não tinha unique em email, então `onConflict:'nome'`/
-- `onConflict:'email'` falhava em toda sincronização em runtime.
--
-- Medido nesta sessão via MCP (supabase_db_select em produção, projeto
-- frjbfeamybqsejlvmqbl): 10 linhas em `departamentos` (todas de uma única
-- empresa, nomes distintos) e 13 em `colaboradores` (1 email nulo, o resto
-- distinto) — zero duplicatas em (empresa_id, nome) e (empresa_id, email).
-- Sem necessidade de limpeza prévia.
--
-- CREATE INDEX CONCURRENTLY não funciona dentro do BEGIN;...COMMIT; que o
-- workflow canonical-migrations.yml usa para todo o lote — com as tabelas
-- nesse tamanho (dezenas de linhas), o lock breve de um CREATE INDEX comum
-- é imperceptível; CONCURRENTLY só se paga em tabelas grandes.

DO $preflight$
DECLARE dup_departamentos integer; dup_colaboradores integer;
BEGIN
  SELECT count(*) INTO dup_departamentos FROM (
    SELECT empresa_id, nome FROM public.departamentos
    GROUP BY empresa_id, nome HAVING count(*) > 1
  ) d;
  SELECT count(*) INTO dup_colaboradores FROM (
    SELECT empresa_id, email FROM public.colaboradores
    WHERE email IS NOT NULL
    GROUP BY empresa_id, email HAVING count(*) > 1
  ) c;
  IF dup_departamentos > 0 THEN
    RAISE EXCEPTION 'departamentos tem % grupo(s) duplicado(s) em (empresa_id,nome) — limpar antes', dup_departamentos;
  END IF;
  IF dup_colaboradores > 0 THEN
    RAISE EXCEPTION 'colaboradores tem % grupo(s) duplicado(s) em (empresa_id,email) — limpar antes', dup_colaboradores;
  END IF;
END
$preflight$;

-- Sem WHERE: um índice único parcial não é usado como arbiter por
-- `ON CONFLICT (empresa_id, email)` a menos que o predicado apareça também
-- no ON CONFLICT — o que o upsert do PostgREST/Supabase não gera. Um índice
-- único comum já trata múltiplos NULLs em `email` como não-conflitantes
-- (regra padrão do Postgres), então não precisa de partial index aqui.
CREATE UNIQUE INDEX IF NOT EXISTS departamentos_empresa_nome_key ON public.departamentos (empresa_id, nome);
CREATE UNIQUE INDEX IF NOT EXISTS colaboradores_empresa_email_key ON public.colaboradores (empresa_id, email);
