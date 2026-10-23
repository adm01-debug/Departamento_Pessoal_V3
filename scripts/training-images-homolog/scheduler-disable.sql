-- =============================================================================
-- DESATIVAR O AGENDAMENTO DO WORKER (idempotente)
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'training-image-dispatch') THEN
    PERFORM cron.unschedule('training-image-dispatch');
  END IF;
END $$;

-- Opcional: remover a função de ponte. Não remove segredos do Vault.
-- DROP FUNCTION IF EXISTS public.dispatch_training_image_worker();
