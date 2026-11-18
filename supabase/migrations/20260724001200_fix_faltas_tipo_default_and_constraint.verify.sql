-- Sidecar da 20260724001200_fix_faltas_tipo_default_and_constraint.
-- Contrato: toda linha nao-vazia da saida tem de ser exatamente 'ok'.
-- Somente leitura de catalogo (roda em sessao default_transaction_read_only).
--
-- Escrito em 18/11/2026. A migration esta na main desde 24/07/2026 e nunca
-- entrou no ledger. Medido antes de aplicar: public.faltas.tipo era
-- text NOT NULL DEFAULT 'falta'::text (posto por
-- 20260317001934_fixup_faltas_cols.sql:8), e chk_faltas_tipo
-- (20260713110053_...:44-50) aceita 15 valores, nenhum deles 'falta'.
-- Como a coluna e NOT NULL, nem passar NULL escapava: qualquer INSERT que
-- omitisse tipo pegava o DEFAULT e violava a constraint. A tabela estava VAZIA
-- (0 linhas), entao o UPDATE de backfill e no-op e o efeito e DDL puro.

-- 1) o DEFAULT passou a ser 'falta_injustificada'
SELECT CASE WHEN (
    SELECT pg_get_expr(d.adbin, d.adrelid)
    FROM pg_attrdef d
    JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
    WHERE d.adrelid = 'public.faltas'::regclass AND a.attname = 'tipo'
  ) = '''falta_injustificada''::text'
  THEN 'ok' ELSE 'FALHOU: faltas.tipo nao tem DEFAULT ''falta_injustificada''' END;

-- 2) a constraint foi RECRIADA (a migration a derruba para fazer o backfill;
--    se o passo 4 nao rodasse, a tabela ficaria sem validacao de tipo — pior
--    que o problema original).
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_faltas_tipo'
      AND conrelid = 'public.faltas'::regclass
      AND contype = 'c'
  ) THEN 'ok' ELSE 'FALHOU: chk_faltas_tipo nao existe apos a migration' END;

-- 3) e o CHECK aceita o novo DEFAULT. E a assercao central: era a
--    incompatibilidade entre os dois que quebrava o INSERT.
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_faltas_tipo'
      AND conrelid = 'public.faltas'::regclass
      AND pg_get_constraintdef(oid) LIKE '%''falta_injustificada''%'
  ) THEN 'ok' ELSE 'FALHOU: chk_faltas_tipo nao aceita ''falta_injustificada''' END;

-- 4) o valor velho 'falta' NAO voltou para a lista. A correcao certa foi trocar
--    o default, nao afrouxar a constraint; se alguem "consertasse" somando
--    'falta' aos valores validos, o dado voltaria a aceitar um tipo que nao
--    existe no dominio de negocio.
SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_faltas_tipo'
      AND conrelid = 'public.faltas'::regclass
      AND pg_get_constraintdef(oid) ~ '''falta'''
  ) THEN 'ok' ELSE 'FALHOU: chk_faltas_tipo voltou a aceitar o valor ''falta''' END;

-- 5) a coluna continua NOT NULL (a migration nao deve relaxar isso)
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid = 'public.faltas'::regclass
      AND attname = 'tipo' AND attnotnull
  ) THEN 'ok' ELSE 'FALHOU: faltas.tipo deixou de ser NOT NULL' END;

-- 6) nenhuma linha com tipo fora do dominio
SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM public.faltas
    WHERE tipo IS NOT NULL AND tipo NOT IN (
      'atestado_medico','falta_injustificada','falta_justificada','licenca',
      'ausencia_parcial','atraso','saida_antecipada','luto','casamento',
      'doacao_sangue','servico_militar','doenca_familiar','maternidade',
      'paternidade','outros'
    )
  ) THEN 'ok' ELSE 'FALHOU: existe falta com tipo fora da lista valida' END;
