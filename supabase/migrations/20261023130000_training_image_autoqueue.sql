-- =============================================================================
-- FILA AUTOMÁTICA DE CAPAS — disparo após o cadastro, PERSISTENTE e DESLIGADO
-- =============================================================================
-- PROBLEMA
--   A Edge Function `training-image-generate` já existe, mas nada a aciona após
--   o cadastro de um curso/trilha. Um disparo no navegador (fire-and-forget)
--   perderia o trabalho se o usuário fechasse a página.
--
-- SOLUÇÃO (reutiliza a infraestrutura já criada)
--   1. `catalogo_cursos` / `trilhas_aprendizado` recebem um TRIGGER AFTER INSERT
--      que grava uma linha em `training_image_requests` (fila persistente).
--   2. Um worker (`training-image-dispatch`) reivindica a fila com
--      `FOR UPDATE SKIP LOCKED` e executa o pipeline existente
--      (`gerarCapaDeTreinamento` → `claim_training_image`).
--   3. A unicidade por (empresa, tipo, conteúdo) e o claim atômico impedem
--      geração/duplicação.
--
-- DESLIGADO POR PADRÃO
--   `training_image_settings.autoqueue_enabled = false`. Sem a flag, o trigger
--   retorna imediatamente e NADA é enfileirado. A ativação é uma decisão
--   operacional (service role) combinada com `TRAINING_IMAGE_AUTOQUEUE_ENABLED`
--   no ambiente da Edge Function. Nenhuma geração real acontece nesta fase.
--
-- O trigger NUNCA bloqueia o cadastro: qualquer erro é registrado como WARNING
-- e o INSERT original segue normalmente.
-- =============================================================================

-- ─── 1. Flag de servidor (singleton) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_image_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  autoqueue_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.training_image_settings (id, autoqueue_enabled)
VALUES (true, false)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS update_training_image_settings_updated_at ON public.training_image_settings;
CREATE TRIGGER update_training_image_settings_updated_at
  BEFORE UPDATE ON public.training_image_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.training_image_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.training_image_settings FROM anon, authenticated;
GRANT ALL ON public.training_image_settings TO service_role;

COMMENT ON TABLE public.training_image_settings IS
  'Flags de servidor da integração de imagens. autoqueue_enabled=false por padrão: nenhum cadastro enfileira geração.';

-- ─── 2. Fila persistente ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_image_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id    uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  content_type  text NOT NULL CHECK (content_type IN ('course', 'learning_path')),
  content_id    uuid NOT NULL,
  -- Usuário que cadastrou o conteúdo (auth.uid() no INSERT). Pode ser NULL
  -- (seed, service role, importação). Nunca é inventado.
  requested_by  uuid,
  status        text NOT NULL DEFAULT 'queued'
                CHECK (status IN ('queued', 'processing', 'done', 'skipped', 'failed')),
  attempts      integer NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 5),
  last_error    text,
  requested_at  timestamptz NOT NULL DEFAULT now(),
  -- Adiamento (ex.: quota esgotada): o claim só pega quando chegar a hora.
  available_at  timestamptz NOT NULL DEFAULT now(),
  started_at    timestamptz,
  finished_at   timestamptz,
  CONSTRAINT training_image_requests_unico
    UNIQUE (empresa_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_training_image_requests_status
  ON public.training_image_requests (status, available_at, requested_at);
CREATE INDEX IF NOT EXISTS idx_training_image_requests_empresa
  ON public.training_image_requests (empresa_id, content_type);

ALTER TABLE public.training_image_requests ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy: o navegador não lê nem escreve a fila. Só o backend.
REVOKE ALL ON public.training_image_requests FROM anon, authenticated;
GRANT ALL ON public.training_image_requests TO service_role;

COMMENT ON TABLE public.training_image_requests IS
  'Fila persistente de geração automática. Uma linha por conteúdo; reivindicada com FOR UPDATE SKIP LOCKED pelo worker.';

-- ─── 3. Trigger de enfileiramento (flag-guarded, nunca bloqueia o cadastro) ──
CREATE OR REPLACE FUNCTION public.enqueue_training_image_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled boolean;
BEGIN
  SELECT autoqueue_enabled INTO v_enabled
  FROM public.training_image_settings
  WHERE id = true;

  IF coalesce(v_enabled, false) IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF NEW.empresa_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.training_image_requests (empresa_id, content_type, content_id, requested_by)
  VALUES (NEW.empresa_id, TG_ARGV[0], NEW.id, auth.uid())
  ON CONFLICT (empresa_id, content_type, content_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- O cadastro é soberano: falha na fila nunca impede o INSERT original.
    RAISE WARNING 'training_image autoqueue ignorado: %', SQLERRM;
    RETURN NEW;
END
$$;

COMMENT ON FUNCTION public.enqueue_training_image_request() IS
  'Enfileira a capa de um conteúdo recém-criado quando a flag de servidor está ligada. Nunca bloqueia o cadastro.';

DROP TRIGGER IF EXISTS enqueue_training_image_course ON public.catalogo_cursos;
CREATE TRIGGER enqueue_training_image_course
  AFTER INSERT ON public.catalogo_cursos
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_training_image_request('course');

DROP TRIGGER IF EXISTS enqueue_training_image_learning_path ON public.trilhas_aprendizado;
CREATE TRIGGER enqueue_training_image_learning_path
  AFTER INSERT ON public.trilhas_aprendizado
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_training_image_request('learning_path');


-- ─── 4. Reivindicação atômica do lote (worker) ───────────────────────────────
-- `FOR UPDATE SKIP LOCKED` permite vários workers/instâncias sem duplicidade.
-- Trabalho travado (processing > 10 min) volta a ser reivindicável, com o
-- mesmo teto de tentativas da fila (5).
CREATE OR REPLACE FUNCTION public.claim_training_image_requests(p_limit integer DEFAULT 5)
RETURNS SETOF public.training_image_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := least(greatest(coalesce(p_limit, 5), 1), 20);
BEGIN
  RETURN QUERY
  WITH alvo AS (
    SELECT r.id
    FROM public.training_image_requests r
    WHERE (r.status = 'queued' AND r.available_at <= now())
       OR (
         r.status = 'processing'
         -- 30 min >> wall clock máximo da plataforma (400 s) e timeout do
         -- provedor (90 s): reduz a chance de recuperar algo ainda em execução.
         AND r.started_at < now() - interval '30 minutes'
         AND r.attempts < 5
       )
    ORDER BY r.available_at, r.requested_at
    FOR UPDATE SKIP LOCKED
    LIMIT v_limit
  )
  UPDATE public.training_image_requests r
     SET status = 'processing',
         attempts = r.attempts + 1,
         started_at = now(),
         available_at = now(),
         finished_at = NULL,
         last_error = NULL
    FROM alvo
   WHERE r.id = alvo.id
  RETURNING r.*;
END
$$;

COMMENT ON FUNCTION public.claim_training_image_requests(integer) IS
  'Reivindica um lote da fila de capas com FOR UPDATE SKIP LOCKED. Exclusivo do backend.';

REVOKE ALL ON FUNCTION public.claim_training_image_requests(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_training_image_requests(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_training_image_requests(integer) TO service_role;

-- ─── 5. Conclusão de uma requisição ─────────────────────────────────────────
-- `p_retry_after_seconds` permite DEVOLVER à fila com adiamento (ex.: quota
-- esgotada), sem loop de retentativa imediata.
DROP FUNCTION IF EXISTS public.finish_training_image_request(uuid, text, text);
CREATE OR REPLACE FUNCTION public.finish_training_image_request(
  p_id uuid,
  p_status text,
  p_error text DEFAULT NULL,
  p_retry_after_seconds integer DEFAULT NULL
)
RETURNS public.training_image_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linha public.training_image_requests;
BEGIN
  IF p_status NOT IN ('done', 'skipped', 'failed', 'queued') THEN
    RAISE EXCEPTION 'status_invalido';
  END IF;

  UPDATE public.training_image_requests
     SET status = p_status,
         last_error = left(coalesce(p_error, ''), 500),
         finished_at = CASE WHEN p_status IN ('done', 'skipped', 'failed') THEN now() ELSE NULL END,
         available_at = CASE
           WHEN p_status = 'queued'
             THEN now() + make_interval(secs => greatest(coalesce(p_retry_after_seconds, 300), 30))
           ELSE now()
         END
   WHERE id = p_id
  RETURNING * INTO v_linha;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'requisicao_inexistente';
  END IF;

  RETURN v_linha;
END
$$;

COMMENT ON FUNCTION public.finish_training_image_request(uuid, text, text, integer) IS
  'Fecha (done/skipped/failed) ou devolve à fila (queued) com adiamento. Exclusivo do backend.';

REVOKE ALL ON FUNCTION public.finish_training_image_request(uuid, text, text, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finish_training_image_request(uuid, text, text, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_training_image_request(uuid, text, text, integer) TO service_role;

-- ─── 6. Ativação controlada da flag (service role) ──────────────────────────
CREATE OR REPLACE FUNCTION public.set_training_image_autoqueue(p_enabled boolean)
RETURNS public.training_image_settings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_linha public.training_image_settings;
BEGIN
  INSERT INTO public.training_image_settings (id, autoqueue_enabled)
  VALUES (true, coalesce(p_enabled, false))
  ON CONFLICT (id) DO UPDATE
    SET autoqueue_enabled = excluded.autoqueue_enabled,
        updated_at = now()
  RETURNING * INTO v_linha;
  RETURN v_linha;
END
$$;

REVOKE ALL ON FUNCTION public.set_training_image_autoqueue(boolean) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_training_image_autoqueue(boolean) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_training_image_autoqueue(boolean) TO service_role;

-- ─── 6b. Backfill idempotente de conteúdos sem capa ─────────────────────────
-- Cobre o Risco A: conteúdo salvo enquanto a fila estava desligada (ou cujo
-- trigger falhou) fica sem solicitação. Pode ser executado quantas vezes quiser:
--   • só considera conteúdo SEM capa e SEM linha na fila;
--   • `ON CONFLICT DO NOTHING` garante idempotência;
--   • quem não tiver capa nem fila entra como `queued` (requested_by NULL).
-- Executar SOMENTE pelo backend, após ligar as flags de geração.
CREATE OR REPLACE FUNCTION public.backfill_training_image_requests(p_limit integer DEFAULT 50)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit      integer := least(greatest(coalesce(p_limit, 50), 1), 500);
  v_inseridos  integer;
BEGIN
  WITH candidatos AS (
    SELECT c.empresa_id, 'course'::text AS content_type, c.id AS content_id
    FROM public.catalogo_cursos c
    WHERE c.empresa_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.training_images ti
        WHERE ti.empresa_id = c.empresa_id
          AND ti.content_type = 'course'
          AND ti.content_id = c.id
          AND ti.status IN ('succeeded', 'pending', 'processing')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.training_image_requests r
        WHERE r.empresa_id = c.empresa_id
          AND r.content_type = 'course'
          AND r.content_id = c.id
      )
    UNION ALL
    SELECT t.empresa_id, 'learning_path'::text, t.id
    FROM public.trilhas_aprendizado t
    WHERE t.empresa_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.training_images ti
        WHERE ti.empresa_id = t.empresa_id
          AND ti.content_type = 'learning_path'
          AND ti.content_id = t.id
          AND ti.status IN ('succeeded', 'pending', 'processing')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.training_image_requests r
        WHERE r.empresa_id = t.empresa_id
          AND r.content_type = 'learning_path'
          AND r.content_id = t.id
      )
  ), alvo AS (
    SELECT empresa_id, content_type, content_id
    FROM candidatos
    ORDER BY empresa_id, content_type, content_id
    LIMIT v_limit
  )
  INSERT INTO public.training_image_requests (empresa_id, content_type, content_id, requested_by)
  SELECT empresa_id, content_type, content_id, NULL FROM alvo
  ON CONFLICT (empresa_id, content_type, content_id) DO NOTHING;

  GET DIAGNOSTICS v_inseridos = ROW_COUNT;
  RETURN v_inseridos;
END
$$;

COMMENT ON FUNCTION public.backfill_training_image_requests(integer) IS
  'Enfileira (idempotente) conteúdos sem capa e sem solicitação. Executar apenas no backend, após ativar a integração.';

REVOKE ALL ON FUNCTION public.backfill_training_image_requests(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.backfill_training_image_requests(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_training_image_requests(integer) TO service_role;

-- ─── 7. Agendamento (ATIVAÇÃO MANUAL — NÃO executado nesta migration) ────────
-- O worker precisa ser chamado periodicamente. Exemplo com pg_cron + pg_net,
-- usando segredos do Vault (nunca hardcode chave/URL no repositório):
--
--   SELECT cron.schedule(
--     'training-image-dispatch',
--     '*/2 * * * *',
--     $$
--       SELECT net.http_post(
--         url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'training_image_dispatch_url'),
--         headers := jsonb_build_object(
--           'Content-Type', 'application/json',
--           'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'training_image_dispatch_secret')
--         ),
--         body := '{}'::jsonb
--       );
--     $$
--   );
--
-- Pré-requisitos: `TRAINING_IMAGE_AUTOQUEUE_ENABLED=true`,
-- `TRAINING_IMAGE_GENERATION_ENABLED=true` e `OPENAI_API_KEY` configurados no
-- ambiente da função; `set_training_image_autoqueue(true)` no banco.
-- Enquanto qualquer um estiver desligado, o worker responde 503 e a fila fica
-- intacta (nenhuma cobrança).
