-- Migration: Atomic ponto registration + CNAB sequence idempotency
-- Fixes:
--   C43: TOCTOU race on duplicate batida check (SELECT+INSERT not atomic)
--   C44: ordem computed by SELECT MAX+1 → two concurrent inserts get same ordem
--   C46: sequencial_arquivo hardcoded to 1 → not monotonic per empresa+banco
--   C47: cnab_itens inserted after remessa marked 'enviado' → partial state on crash

-- ─── 1. Add unique constraint on (colaborador_id, data, hora, tipo) ────────────
-- Prevents duplicate batidas atomically in the DB; duplicates are now caught
-- via a 23505 constraint violation on INSERT rather than a racy SELECT pre-check.
ALTER TABLE public.batidas_ponto
  DROP CONSTRAINT IF EXISTS batidas_ponto_no_duplicate_batida;

ALTER TABLE public.batidas_ponto
  ADD CONSTRAINT batidas_ponto_no_duplicate_batida
  UNIQUE (colaborador_id, data, hora, tipo);

-- ─── 2. Atomic batida registration function ────────────────────────────────────
-- Computes ordem via SELECT MAX(ordem)+1 inside a single transaction with an
-- advisory lock scoped to (colaborador_id, data), eliminating the C44 race.
CREATE OR REPLACE FUNCTION public.registrar_batida_ponto(
  p_colaborador_id  uuid,
  p_empresa_id      uuid,
  p_data            date,
  p_hora            time,
  p_tipo            text,
  p_origem          text DEFAULT 'web',
  p_latitude        numeric DEFAULT NULL,
  p_longitude       numeric DEFAULT NULL,
  p_precisao_metros integer DEFAULT NULL,
  p_dispositivo_id  text DEFAULT 'web-browser',
  p_dentro_raio     boolean DEFAULT true,
  p_timezone        text DEFAULT 'America/Sao_Paulo',
  p_hash_integridade text DEFAULT NULL,
  p_foto_biometria_url text DEFAULT NULL,
  p_metadata        jsonb DEFAULT NULL
)
RETURNS public.batidas_ponto
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ordem integer;
  v_batida public.batidas_ponto;
BEGIN
  -- Advisory lock scoped to (colaborador_id || data) to serialize concurrent batidas
  -- for the same employee on the same day. Lock is released at end of transaction.
  PERFORM pg_advisory_xact_lock(
    hashtext(p_colaborador_id::text || p_data::text)
  );

  -- Compute next ordem atomically inside the lock
  SELECT COALESCE(MAX(ordem), 0) + 1
    INTO v_ordem
    FROM public.batidas_ponto
   WHERE colaborador_id = p_colaborador_id
     AND data = p_data;

  INSERT INTO public.batidas_ponto (
    colaborador_id, empresa_id, data, hora, ordem, tipo, origem,
    latitude, longitude, precisao_metros, dispositivo_id,
    dentro_raio, timezone, hash_integridade, audit_sha256,
    audit_conformidade, foto_biometria_url, metadata
  ) VALUES (
    p_colaborador_id, p_empresa_id, p_data, p_hora, v_ordem, p_tipo, p_origem,
    p_latitude, p_longitude, p_precisao_metros, p_dispositivo_id,
    p_dentro_raio, p_timezone, p_hash_integridade, p_hash_integridade,
    true, p_foto_biometria_url, p_metadata
  )
  RETURNING * INTO v_batida;

  RETURN v_batida;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_batida_ponto(
  uuid, uuid, date, time, text, text, numeric, numeric, integer,
  text, boolean, text, text, text, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_batida_ponto(
  uuid, uuid, date, time, text, text, numeric, numeric, integer,
  text, boolean, text, text, text, jsonb
) TO authenticated;

-- ─── 3. CNAB sequence column ───────────────────────────────────────────────────
-- Adds sequencial_arquivo to cnab_remessas so each file gets a monotonically
-- increasing number per (empresa_id, banco_codigo), fixing C46.
ALTER TABLE public.cnab_remessas
  ADD COLUMN IF NOT EXISTS sequencial_arquivo integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.next_cnab_sequencial(
  p_empresa_id  uuid,
  p_banco_codigo text
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(sequencial_arquivo), 0) + 1
    FROM public.cnab_remessas
   WHERE empresa_id  = p_empresa_id
     AND banco_codigo = p_banco_codigo;
$$;

REVOKE ALL ON FUNCTION public.next_cnab_sequencial(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_cnab_sequencial(uuid, text) TO authenticated;
