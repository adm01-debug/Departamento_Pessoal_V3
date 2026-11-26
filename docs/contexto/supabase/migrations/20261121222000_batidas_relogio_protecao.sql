-- Proteção da batida do relógio (Henry + Ponto AtecSoft) e convivência com o
-- app/quiosque. Plano: docs/PLANO_INTEGRACAO_PONTO_HENRY_ATECSOFT.md, etapas 66,
-- 77 e 78. Decisão do dono (D2): quem bate no relógio bate SÓ no relógio, e a
-- batida original do relógio nunca é alterada nem apagada fora do backend.
--
-- Origens gravadas hoje em batidas_ponto.origem (texto livre, default 'manual'):
--   'web'                -> registrar_batida_ponto (app do colaborador e quiosque
--                           online, via pontoService.registrar)
--   'offline'            -> processar-ponto-offline (fila offline do app e do
--                           quiosque; antes desta entrega gravava o default
--                           'manual', a Edge passa a declarar 'offline')
--   'ajuste_manual'      -> processar_ajuste_aprovado (ajuste aprovado pelo RH)
--   'afdt_reconciliacao' -> criar_batida_da_divergencia_afdt (RH)
--   'manual'             -> default da coluna (lançamento direto; decisão D6)
--   'relogio'            -> ingest-ponto-rep (service_role), batida do relógio
-- Autoatendimento = 'web' e 'offline'. Só essas são recusadas para quem usa o
-- relógio. "Usa o relógio" = vínculo em ponto_rep_funcionarios com dispositivo
-- ativo. "Backend" = mesmo critério dos gatilhos/RPCs do repo:
-- current_user = 'service_role' OR request.jwt.claims->>'role' = 'service_role'.
-- Aditiva e idempotente.

-- 1. Núcleo: o colaborador usa o relógio? Interna — sem GRANT a ninguém; só é
--    chamada pelas funções SECURITY DEFINER abaixo (rodam como owner).
CREATE OR REPLACE FUNCTION public.ponto_rep_colaborador_usa_relogio(_colaborador_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _colaborador_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.ponto_rep_funcionarios f
    JOIN public.ponto_rep_dispositivos d ON d.id = f.dispositivo_id
    WHERE f.colaborador_id = _colaborador_id
      AND d.ativo = true
  );
$$;

REVOKE ALL ON FUNCTION public.ponto_rep_colaborador_usa_relogio(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ponto_rep_colaborador_usa_relogio(uuid) TO service_role;

-- 2. "Sou eu" — para o Meu Ponto. O vínculo login <-> colaborador no repo tem
--    duas convenções vivas: colaboradores.id = auth.uid() (sou_o_colaborador) e
--    colaboradores.user_id = auth.uid() (portal). Aceita as duas.
CREATE OR REPLACE FUNCTION public.colaborador_usa_relogio()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.colaboradores c
    WHERE (c.id = auth.uid() OR c.user_id = auth.uid())
      AND public.ponto_rep_colaborador_usa_relogio(c.id)
  );
$$;

REVOKE ALL ON FUNCTION public.colaborador_usa_relogio() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.colaborador_usa_relogio() TO authenticated, service_role;

-- 3. Por id — para o quiosque, que identifica o colaborador pela matrícula na
--    sessão do operador. Mesmo escopo que registrar_batida_ponto exige para
--    registrar a batida dessa pessoa: ela mesma, ou RH/gestão da empresa dela.
CREATE OR REPLACE FUNCTION public.colaborador_usa_relogio_por_id(_colaborador_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
  v_user_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sessão obrigatória' USING ERRCODE = '42501';
  END IF;

  SELECT c.empresa_id, c.user_id INTO v_empresa_id, v_user_id
  FROM public.colaboradores c
  WHERE c.id = _colaborador_id;

  IF v_empresa_id IS NULL THEN
    RAISE EXCEPTION 'Colaborador não encontrado' USING ERRCODE = '42501';
  END IF;

  -- COALESCE: qualquer termo NULL (ex.: user_id vazio) conta como "não".
  IF NOT COALESCE(public.sou_o_colaborador(_colaborador_id)
                  OR (v_user_id IS NOT NULL AND v_user_id = auth.uid())
                  OR public.pode_gerir_rh(v_empresa_id)
                  OR public.pode_gerir_pessoas(v_empresa_id), false) THEN
    RAISE EXCEPTION 'Sem permissão para consultar este colaborador' USING ERRCODE = '42501';
  END IF;

  RETURN public.ponto_rep_colaborador_usa_relogio(_colaborador_id);
END;
$$;

REVOKE ALL ON FUNCTION public.colaborador_usa_relogio_por_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.colaborador_usa_relogio_por_id(uuid) TO authenticated, service_role;

-- 4. Batida do relógio é do backend: fora dele não se cria, altera nem apaga
--    batida 'relogio', nem se troca a origem de/para 'relogio'. SECURITY INVOKER
--    de propósito: current_user precisa ser o do chamador.
CREATE OR REPLACE FUNCTION public.proteger_batida_relogio()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_jwt_role text;
BEGIN
  BEGIN
    v_jwt_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  EXCEPTION WHEN OTHERS THEN
    v_jwt_role := NULL;
  END;
  IF current_user = 'service_role' OR v_jwt_role = 'service_role' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.origem = 'relogio' THEN
      RAISE EXCEPTION 'Batida de origem relógio só pode ser gravada pela integração do relógio.'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.origem = 'relogio' THEN
    RAISE EXCEPTION 'Batida do relógio não pode ser %: corrija no Ponto AtecSoft.',
      CASE WHEN TG_OP = 'DELETE' THEN 'excluída' ELSE 'alterada' END
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.origem IS NOT DISTINCT FROM 'relogio' THEN
    RAISE EXCEPTION 'A origem relógio só pode ser atribuída pela integração do relógio.'
      USING ERRCODE = '42501';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

REVOKE ALL ON FUNCTION public.proteger_batida_relogio() FROM PUBLIC, anon, authenticated;

-- 5. Quem usa o relógio não bate no app nem no quiosque (D2). Vale para qualquer
--    chamador, inclusive a Edge processar-ponto-offline (service_role).
--    SECURITY DEFINER para ler ponto_rep_* (RLS só de RH); não depende de papel.
--    ERRCODE PT409: o PostgREST responde HTTP 409 com a mensagem.
CREATE OR REPLACE FUNCTION public.bloquear_autoatendimento_quem_usa_relogio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.origem IN ('web', 'offline')
     AND public.ponto_rep_colaborador_usa_relogio(NEW.colaborador_id) THEN
    RAISE EXCEPTION 'Este colaborador registra o ponto no relógio da unidade.'
      USING ERRCODE = 'PT409', HINT = 'COLABORADOR_USA_RELOGIO';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.bloquear_autoatendimento_quem_usa_relogio() FROM PUBLIC, anon, authenticated;

-- Nomes 'trg_batida_relogio_*' ordenam antes de 'trigger_imutabilidade_ponto'
-- (BEFORE DELETE genérico), então a mensagem específica do relógio aparece primeiro.
DROP TRIGGER IF EXISTS trg_batida_relogio_protecao ON public.batidas_ponto;
CREATE TRIGGER trg_batida_relogio_protecao
BEFORE INSERT OR UPDATE OR DELETE ON public.batidas_ponto
FOR EACH ROW EXECUTE FUNCTION public.proteger_batida_relogio();

DROP TRIGGER IF EXISTS trg_batida_relogio_autoatendimento ON public.batidas_ponto;
CREATE TRIGGER trg_batida_relogio_autoatendimento
BEFORE INSERT ON public.batidas_ponto
FOR EACH ROW EXECUTE FUNCTION public.bloquear_autoatendimento_quem_usa_relogio();
