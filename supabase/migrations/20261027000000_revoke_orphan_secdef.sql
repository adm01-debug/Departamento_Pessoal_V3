-- Audit "Integridade do banco canônico (live)" flagou duas funções SECURITY
-- DEFINER executáveis por anon/authenticated que NÃO existem no repo: são
-- órfãs criadas fora da linhagem de migrations no canônico (drift). Como
-- nenhum código versionado as chama, são rotinas internas — REVOKE EXECUTE.
-- Defensivo: cada revogação só acontece se a função existir, para não quebrar
-- o replay em schemas que nunca as tiveram.

DO $$
BEGIN
  IF to_regprocedure('public.versao_consolidada_avaliacao()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.versao_consolidada_avaliacao() FROM anon, authenticated';
  END IF;
  IF to_regprocedure('public.training_images_track_outcomes()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.training_images_track_outcomes() FROM anon, authenticated';
  END IF;
END $$;
