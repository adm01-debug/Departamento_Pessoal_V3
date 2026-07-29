-- Defesa em profundidade: `anon` tinha SELECT em 307 tabelas.
-- Hoje isso e inerte (o RLS nega tudo: verificado via PostgREST, respostas []),
-- mas mantem o sistema a UMA politica malfeita de distancia de um vazamento
-- publico. Removendo o grant, o RLS deixa de ser a unica barreira.
--
-- Excecoes: cid10 e taxas_cambio sao catalogos de referencia com politica
-- `USING (true)` deliberada e sem dado de pessoa ou de empresa.
--
-- Nao se toca em `authenticated` nem em `service_role`.
DO $$
DECLARE
  r record;
  manter CONSTANT text[] := ARRAY['cid10','taxas_cambio'];
  n int := 0;
BEGIN
  FOR r IN
    SELECT c.oid, c.relname
    FROM pg_class c
    JOIN pg_namespace ns ON ns.oid = c.relnamespace
    WHERE ns.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT (c.relname = ANY (manter))
      AND (
        has_table_privilege('anon', c.oid, 'SELECT')
        OR has_table_privilege('anon', c.oid, 'INSERT')
        OR has_table_privilege('anon', c.oid, 'UPDATE')
        OR has_table_privilege('anon', c.oid, 'DELETE')
        OR has_table_privilege('anon', c.oid, 'TRUNCATE')
        OR has_table_privilege('anon', c.oid, 'REFERENCES')
        OR has_table_privilege('anon', c.oid, 'TRIGGER')
      )
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', r.relname);
    n := n + 1;
  END LOOP;
  RAISE NOTICE 'anon revogado em % tabela(s)', n;
END $$;

-- Impede que a permissao volte sozinha em tabelas criadas daqui pra frente.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
