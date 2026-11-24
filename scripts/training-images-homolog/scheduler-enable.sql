-- =============================================================================
-- AGENDAMENTO DO WORKER — ATIVAÇÃO MANUAL E IDEMPOTENTE (NÃO EXECUTAR AQUI)
-- =============================================================================
-- Pré-requisitos (ver README deste diretório):
--   • extensões pg_cron e pg_net disponíveis no projeto;
--   • segredos no Vault:
--       training_image_dispatch_url    = https://<ref>.supabase.co/functions/v1/training-image-dispatch
--       training_image_dispatch_secret = <mesmo valor de TRAINING_IMAGE_DISPATCH_SECRET>
--   • Edge Function publicada com as flags DESLIGADAS (o worker responde 503 e
--     preserva a fila; agendar com flags desligadas é seguro).
--
-- Frequência: a cada 2 minutos. Cada execução processa no máximo
-- TRAINING_IMAGE_DISPATCH_BATCH (padrão 2) itens; o teto de 20/h por empresa
-- continua valendo no worker.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE EXCEPTION 'pg_cron_ausente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE EXCEPTION 'pg_net_ausente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'training_image_dispatch_url') THEN
    RAISE EXCEPTION 'segredo_training_image_dispatch_url_ausente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'training_image_dispatch_secret') THEN
    RAISE EXCEPTION 'segredo_training_image_dispatch_secret_ausente';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.dispatch_training_image_worker()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url     text;
  v_secret  text;
  v_request bigint;
BEGIN
  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'training_image_dispatch_url';

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'training_image_dispatch_secret';

  IF coalesce(v_url, '') = '' OR coalesce(v_secret, '') = '' THEN
    RAISE EXCEPTION 'segredos_do_worker_ausentes';
  END IF;

  SELECT net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', v_secret
    ),
    body := '{}'::jsonb
  ) INTO v_request;

  RETURN v_request;
END
$$;

REVOKE ALL ON FUNCTION public.dispatch_training_image_worker() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dispatch_training_image_worker() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_training_image_worker() TO service_role;

-- Idempotência: remove o job anterior antes de recriar.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'training-image-dispatch') THEN
    PERFORM cron.unschedule('training-image-dispatch');
  END IF;
END $$;

SELECT cron.schedule(
  'training-image-dispatch',
  '*/2 * * * *',
  $$ SELECT public.dispatch_training_image_worker(); $$
);
