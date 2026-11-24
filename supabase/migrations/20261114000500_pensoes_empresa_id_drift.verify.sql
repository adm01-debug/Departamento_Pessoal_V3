-- ok = coluna, FK, trigger, função, índices e backfill de pensoes.empresa_id presentes.
SELECT 'ok'
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pensoes'
      AND column_name = 'empresa_id' AND data_type = 'uuid'
  )
  AND EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.pensoes'::regclass AND contype = 'f'
      AND confrelid = 'public.empresas'::regclass
      AND pg_get_constraintdef(oid) LIKE 'FOREIGN KEY (empresa_id)%'
  )
  AND to_regprocedure('public.fn_pensoes_set_empresa()') IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.pensoes'::regclass
      AND tgname = 'trg_pensoes_set_empresa' AND NOT tgisinternal
  )
  AND to_regclass('public.idx_pensoes_empresa_id') IS NOT NULL
  AND to_regclass('public.idx_pensoes_empresa_ativo') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.pensoes p
    JOIN public.colaboradores c ON c.id = p.colaborador_id
    WHERE p.empresa_id IS DISTINCT FROM c.empresa_id
  );
