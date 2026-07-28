-- ============================================================================
-- Desduplicação de FOREIGN KEYs no schema public
--
-- Contexto: migrações sucessivas criaram duas constraints para o MESMO par
-- (tabela, coluna) -> (tabela referenciada, coluna): a nomeada pelo Postgres
-- (`<tabela>_<col>_fkey`) e uma nomeada à mão (`fk_<tabela>_<alvo>`).
--
-- Três danos concretos:
--  1. Ambiguidade no PostgREST: duas FKs entre as mesmas tabelas fazem o
--     embedding de recursos falhar com "more than one relationship was found".
--  2. Semântica de exclusão conflitante: em 76 grupos uma cópia dizia CASCADE
--     e a outra NO ACTION/RESTRICT. O Postgres avalia AMBAS, então a mais
--     restritiva sempre vence — o CASCADE era letra morta e enganava quem lia
--     o schema.
--  3. Custo duplicado de verificação em todo INSERT/UPDATE da coluna.
--
-- Política de desempate (preserva o comportamento OBSERVADO hoje, portanto
-- esta migração é semanticamente neutra): mantém a constraint mais protetiva.
--   RESTRICT > NO ACTION > SET NULL > SET DEFAULT > CASCADE
-- Empate de regra: mantém o nome canônico do Postgres (`..._fkey`).
--
-- Guarda de segurança: só remove quando a coluna de origem e a referenciada
-- são idênticas (mesmo conkey/confkey/confrelid). FKs distintas que apenas
-- compartilham tabela nunca são tocadas.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  removidas INT := 0;
BEGIN
  FOR r IN
    WITH ranked AS (
      SELECT
        c.oid,
        c.conname,
        c.conrelid::regclass::text AS tabela,
        ROW_NUMBER() OVER (
          PARTITION BY c.conrelid, c.conkey, c.confrelid, c.confkey
          ORDER BY
            CASE c.confdeltype
              WHEN 'r' THEN 1   -- RESTRICT  (mais protetiva)
              WHEN 'a' THEN 2   -- NO ACTION
              WHEN 'n' THEN 3   -- SET NULL
              WHEN 'd' THEN 4   -- SET DEFAULT
              WHEN 'c' THEN 5   -- CASCADE   (mais permissiva)
            END,
            -- desempate estável: nome canônico do Postgres primeiro
            CASE WHEN c.conname LIKE '%\_fkey' THEN 0 ELSE 1 END,
            c.conname
        ) AS rn
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE c.contype = 'f'
        AND n.nspname = 'public'
    )
    SELECT tabela, conname FROM ranked WHERE rn > 1
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tabela, r.conname);
    removidas := removidas + 1;
  END LOOP;

  RAISE NOTICE 'FKs redundantes removidas: %', removidas;
END
$$;

-- Verificação: nenhum par (tabela, coluna) -> (tabela, coluna) pode restar
-- com mais de uma FK. Falha a migração inteira se algo escapou.
DO $$
DECLARE
  restantes INT;
BEGIN
  SELECT count(*) INTO restantes
  FROM (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.contype = 'f' AND n.nspname = 'public'
    GROUP BY c.conrelid, c.conkey, c.confrelid, c.confkey
    HAVING count(*) > 1
  ) q;

  IF restantes > 0 THEN
    RAISE EXCEPTION 'Desduplicação incompleta: % grupo(s) ainda duplicado(s)', restantes;
  END IF;
END
$$;