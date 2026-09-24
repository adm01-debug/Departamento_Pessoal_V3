-- E50-33: autenticar de verdade o quiosque de ponto.
--
-- Hoje (src/pages/PontoKioskPage.tsx) a matrícula é o ÚNICO fator: ela é um
-- identificador público dentro da empresa (visível em holerites, crachás,
-- listagens), então qualquer pessoa que a conheça registra ponto por outro
-- colaborador sem nenhuma verificação. Esta migration cria a infraestrutura
-- de PIN pessoal: hash nunca sai do banco (só um booleano via RPC), com
-- lockout progressivo contra força bruta.
--
-- Rollout: `empresas.exigir_pin_quiosque` nasce `false` — habilitar exige
-- que o RH primeiro cadastre o PIN de cada colaborador (fricção no chão de
-- fábrica citada no PLANO_50), então o toggle é opt-in por empresa, não
-- um flag-day forçado para todo mundo.

ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS exigir_pin_quiosque boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.colaboradores_pin (
  colaborador_id uuid PRIMARY KEY REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.colaboradores_pin ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy de SELECT/INSERT/UPDATE/DELETE para `authenticated`: o hash
-- e os contadores de tentativa só são tocados pelas RPCs SECURITY DEFINER
-- abaixo. Isso evita que a leitura tenant-wide de `colaboradores` (mantida
-- deliberadamente ampla por causa do dashboard/sidebar/busca) chegue perto
-- do hash de ninguém.

CREATE OR REPLACE FUNCTION public.admin_definir_pin_quiosque(p_colaborador_id uuid, p_pin text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_empresa_id uuid;
BEGIN
  SELECT empresa_id INTO v_empresa_id FROM public.colaboradores WHERE id = p_colaborador_id;
  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'colaborador não encontrado';
  END IF;
  IF NOT public.pode_gerir_rh(v_empresa_id) THEN
    RAISE EXCEPTION 'sem permissão para definir PIN deste colaborador';
  END IF;
  IF p_pin !~ '^[0-9]{4,6}$' THEN
    RAISE EXCEPTION 'PIN deve ter de 4 a 6 dígitos numéricos';
  END IF;

  INSERT INTO public.colaboradores_pin (colaborador_id, pin_hash, failed_attempts, locked_until, updated_by)
  VALUES (p_colaborador_id, crypt(p_pin, gen_salt('bf')), 0, NULL, auth.uid())
  ON CONFLICT (colaborador_id) DO UPDATE
    SET pin_hash = excluded.pin_hash,
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = now(),
        updated_by = auth.uid();
END;
$function$;

CREATE OR REPLACE FUNCTION public.verificar_pin_quiosque(p_colaborador_id uuid, p_pin text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_row public.colaboradores_pin%ROWTYPE;
  v_ok boolean;
BEGIN
  SELECT * INTO v_row FROM public.colaboradores_pin WHERE colaborador_id = p_colaborador_id;
  IF NOT FOUND THEN
    RETURN false; -- sem PIN cadastrado ainda — chamador decide como tratar
  END IF;

  IF v_row.locked_until IS NOT NULL AND v_row.locked_until > now() THEN
    RAISE EXCEPTION 'PIN_BLOQUEADO' USING ERRCODE = 'P0001';
  END IF;

  v_ok := (crypt(p_pin, v_row.pin_hash) = v_row.pin_hash);

  IF v_ok THEN
    UPDATE public.colaboradores_pin
      SET failed_attempts = 0, locked_until = NULL
      WHERE colaborador_id = p_colaborador_id;
  ELSE
    UPDATE public.colaboradores_pin
      SET failed_attempts = failed_attempts + 1,
          locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN now() + interval '5 minutes' ELSE NULL END
      WHERE colaborador_id = p_colaborador_id;
  END IF;

  RETURN v_ok;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_definir_pin_quiosque(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_definir_pin_quiosque(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.verificar_pin_quiosque(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verificar_pin_quiosque(uuid, text) TO authenticated;
