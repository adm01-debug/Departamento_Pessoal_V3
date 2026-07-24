-- Issue 31: Aplica NOT NULL em desligamentos.empresa_id.
--
-- 20260719191000_empresa_id_not_null_constraints.sql iterava o array de tabelas
-- mas usava 'rescisoes' em vez de 'desligamentos' (a tabela real).
-- A restrição foi aplicada em todas as outras tabelas da lista exceto esta,
-- deixando desligamentos sem isolamento garantido por banco.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'desligamentos'
      AND column_name = 'empresa_id'
      AND is_nullable = 'YES'
  ) THEN
    -- Remover rows sem empresa_id (são inválidas — não pertencem a nenhuma empresa).
    -- Em produção com rows legadas órfãs, o DELETE as remove antes do constraint.
    -- Em bancos frescos (preview) esta query é no-op (sem rows).
    DELETE FROM public.desligamentos WHERE empresa_id IS NULL;
    ALTER TABLE public.desligamentos ALTER COLUMN empresa_id SET NOT NULL;
  END IF;
END $$;
