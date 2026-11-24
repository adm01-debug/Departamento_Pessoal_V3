-- Sidecar da 20260724000500_fix_faltas_status_default.
-- Contrato: toda linha nao-vazia da saida tem de ser exatamente 'ok'.
-- Somente leitura de catalogo (roda em sessao default_transaction_read_only).
--
-- Escrito em 18/11/2026. A migration esta na main desde 24/07/2026 e nunca
-- entrou no ledger. Medido antes de aplicar: public.faltas.status tinha
-- DEFAULT 'registrada'::text, e chk_faltas_status
-- (20260713110053_...:41-43) aceita apenas
-- ('pendente','justificada','abonada','injustificada','em_analise','rejeitada').
-- 'registrada' NAO esta na lista, logo qualquer INSERT que omitisse status
-- falhava. A tabela estava VAZIA (0 linhas), entao o UPDATE da migration e
-- no-op e o efeito e DDL puro.

-- 1) o DEFAULT passou a ser 'pendente'
SELECT CASE WHEN (
    SELECT pg_get_expr(d.adbin, d.adrelid)
    FROM pg_attrdef d
    JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
    WHERE d.adrelid = 'public.faltas'::regclass AND a.attname = 'status'
  ) = '''pendente''::text'
  THEN 'ok' ELSE 'FALHOU: faltas.status nao tem DEFAULT ''pendente''' END;

-- 2) e o CHECK aceita esse DEFAULT. Esta e a assercao que importa: nao basta o
--    default ter mudado, ele tem de ser um valor que a constraint permite —
--    era exatamente essa a incompatibilidade.
SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_faltas_status'
      AND conrelid = 'public.faltas'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%''pendente''%'
  ) THEN 'ok' ELSE 'FALHOU: chk_faltas_status ausente ou nao aceita ''pendente''' END;

-- 3) nenhuma linha restou com o valor legado 'ativo' que a migration migrava
SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM public.faltas WHERE status = 'ativo')
  THEN 'ok' ELSE 'FALHOU: ainda existe falta com status ''ativo''' END;
