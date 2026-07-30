-- ---------------------------------------------------------------------------
-- 1) fn_start_workflow_on_colaborador_create
--    A versão anterior inseria em workflows_execucoes(colaborador_id, ...),
--    coluna que não existe, e omitia as colunas obrigatórias workflow_id,
--    entidade_tipo e entidade_id. Resultado: TODO INSERT em colaboradores
--    falhava. A tabela é genérica (entidade_tipo/entidade_id), não específica
--    de colaborador.
--    Regra: só inicia execução se houver definição de workflow de admissão
--    ativa para a empresa. Na ausência, não bloqueia o cadastro.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_start_workflow_on_colaborador_create()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_workflow_id uuid;
  v_etapa_id    uuid;
BEGIN
  SELECT d.id
    INTO v_workflow_id
    FROM public.workflows_definicoes d
   WHERE d.ativo IS TRUE
     AND d.tipo = 'admissao'
     AND d.empresa_id IS NOT DISTINCT FROM NEW.empresa_id
   ORDER BY d.created_at
   LIMIT 1;

  -- Sem fluxo de admissão configurado: o cadastro segue normalmente.
  IF v_workflow_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT e.id
    INTO v_etapa_id
    FROM public.workflows_etapas e
   WHERE e.workflow_id = v_workflow_id
   ORDER BY e.ordem NULLS LAST, e.created_at
   LIMIT 1;

  INSERT INTO public.workflows_execucoes (
    workflow_id, etapa_atual_id, entidade_tipo, entidade_id,
    status, empresa_id, dados
  ) VALUES (
    v_workflow_id, v_etapa_id, 'colaborador', NEW.id,
    'pendente', NEW.empresa_id,
    jsonb_build_object('origem', 'trigger_admissao', 'nome', NEW.nome_completo)
  );

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2) registrar_batida_ponto
--    Gravava p_hash_integridade (valor vindo do NAVEGADOR) diretamente na
--    coluna selada hash_integridade e em audit_sha256. Dois problemas:
--      a) o selo agora é verificado -> toda batida via web era recusada;
--      b) selo definido pelo cliente não prova integridade nenhuma.
--    O selo passa a ser responsabilidade exclusiva do gatilho
--    enforce_batida_ponto_hash. O hash do dispositivo vira metadado.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_batida_ponto(
  p_colaborador_id uuid, p_empresa_id uuid, p_data date,
  p_hora time without time zone, p_tipo text, p_origem text DEFAULT 'web'::text,
  p_latitude numeric DEFAULT NULL::numeric, p_longitude numeric DEFAULT NULL::numeric,
  p_precisao_metros integer DEFAULT NULL::integer,
  p_dispositivo_id text DEFAULT 'web-browser'::text,
  p_dentro_raio boolean DEFAULT true,
  p_timezone text DEFAULT 'America/Sao_Paulo'::text,
  p_hash_integridade text DEFAULT NULL::text,
  p_foto_biometria_url text DEFAULT NULL::text,
  p_metadata jsonb DEFAULT NULL::jsonb)
RETURNS batidas_ponto
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_ordem  integer;
  v_batida public.batidas_ponto;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtext(p_colaborador_id::text || p_data::text)
  );

  SELECT COALESCE(MAX(ordem), 0) + 1
    INTO v_ordem
    FROM public.batidas_ponto
   WHERE colaborador_id = p_colaborador_id
     AND data = p_data;

  INSERT INTO public.batidas_ponto (
    colaborador_id, empresa_id, data, hora, ordem, tipo, origem,
    latitude, longitude, precisao_metros, dispositivo_id,
    dentro_raio, timezone, audit_conformidade, foto_biometria_url, metadata
    -- hash_integridade: NÃO informado de propósito. O gatilho
    -- enforce_batida_ponto_hash sela a linha a partir do conteúdo gravado.
  ) VALUES (
    p_colaborador_id, p_empresa_id, p_data, p_hora, v_ordem, p_tipo, p_origem,
    p_latitude, p_longitude, p_precisao_metros, p_dispositivo_id,
    p_dentro_raio, p_timezone, true, p_foto_biometria_url,
    COALESCE(p_metadata, '{}'::jsonb)
      || jsonb_build_object('device_hash', p_hash_integridade)
  )
  RETURNING * INTO v_batida;

  RETURN v_batida;
END;
$function$;