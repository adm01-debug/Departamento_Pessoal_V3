-- Dreno da fila_notificacoes e relatorios agendados sem agendador.
--
-- `processar-agendamentos` e a unica origem que processa as agendas e a fila
-- (`index.ts:289`), mas nao existia nenhum `cron.job` que a chamasse: e-mail e
-- push enfileirados so saiam quando um admin clicava no botao do
-- SystemHealthTab (docs/prod-readiness.md:802 e :803; G-041; H-AGD-14).
--
-- Esta migration NAO inventa credencial: o job so e criado quando os dois
-- segredos existirem no Vault. Ate la ela e inerte e idempotente, e
-- `select public.agendar_dreno_fila_notificacoes()` reaplica quando os
-- segredos forem configurados.
--
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/processar-agendamentos',
--                              'agendamentos_dispatch_url');
--   select vault.create_secret('<valor de CRON_SECRET da funcao>',
--                              'agendamentos_dispatch_secret');
--
-- O comando do job le os segredos do Vault em tempo de execucao — o valor do
-- CRON_SECRET nunca fica gravado em texto plano em `cron.job`. O schema de
-- `http_post` e descoberto ao vivo: no Supabase a extensao pg_net reporta
-- `public` como extnamespace com a funcao vivendo em `net`, entao o schema da
-- funcao nao pode ser deduzido do extnamespace.
--
-- Sem isso: nenhum e-mail/push da fila sai sozinho e nenhum relatorio agendado
-- e entregue. Com isso: a cada 5 minutos a funcao processa as agendas e drena
-- ate 20 itens da fila.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.agendar_dreno_fila_notificacoes()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  v_proc text;
  v_url text;
  v_secret text;
BEGIN
  SELECT format('%I.%I', n.nspname, p.proname) INTO v_proc
  FROM pg_catalog.pg_proc p
  JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
  WHERE p.oid::regprocedure::text LIKE '%.http_post(text,jsonb,jsonb,jsonb,integer)'
  ORDER BY (n.nspname = 'net') DESC, (n.nspname = 'extensions') DESC, n.nspname
  LIMIT 1;

  IF v_proc IS NULL THEN
    RAISE EXCEPTION
      'pg_net sem http_post(text,jsonb,jsonb,jsonb,integer): sem pg_net nao ha como o cron chamar a funcao.';
  END IF;

  SELECT decrypted_secret INTO v_url
  FROM vault.decrypted_secrets
  WHERE name = 'agendamentos_dispatch_url';

  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'agendamentos_dispatch_secret';

  IF v_url IS NULL OR v_secret IS NULL THEN
    -- Sem os segredos o job so geraria 401 a cada 5 minutos. Remove um job
    -- antigo para nao deixar agendamento apontando para credencial revogada.
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'drenar-fila-notificacoes') THEN
      PERFORM cron.unschedule('drenar-fila-notificacoes');
    END IF;
    RETURN 'sem_segredos';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'drenar-fila-notificacoes') THEN
    PERFORM cron.unschedule('drenar-fila-notificacoes');
  END IF;

  PERFORM cron.schedule(
    'drenar-fila-notificacoes',
    '*/5 * * * *',
    format($job$
      SELECT %s(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'agendamentos_dispatch_url'),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'agendamentos_dispatch_secret')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
      );
    $job$, v_proc)
  );

  RETURN 'agendado';
END;
$fn$;

COMMENT ON FUNCTION public.agendar_dreno_fila_notificacoes() IS
  'Cria/revalida o cron de 5 min que chama processar-agendamentos. Inerte (sem_segredos) enquanto o par de segredos do Vault nao existir.';

REVOKE ALL ON FUNCTION public.agendar_dreno_fila_notificacoes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.agendar_dreno_fila_notificacoes() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.agendar_dreno_fila_notificacoes() TO service_role;

DO $migration$
DECLARE
  v_resultado text;
BEGIN
  v_resultado := public.agendar_dreno_fila_notificacoes();
  IF v_resultado = 'sem_segredos' THEN
    RAISE NOTICE
      'Dreno da fila NAO agendado: crie agendamentos_dispatch_url e agendamentos_dispatch_secret no Vault e rode select public.agendar_dreno_fila_notificacoes().';
  ELSE
    RAISE NOTICE 'Dreno da fila agendado a cada 5 minutos (job drenar-fila-notificacoes).';
  END IF;
END
$migration$;