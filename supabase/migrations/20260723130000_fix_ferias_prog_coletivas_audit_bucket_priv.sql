-- ============================================================================
-- Correções DBA (23/07/2026) — análise adversarial do DDL das migrações de
-- férias PROGRAMAÇÃO (20260723104000) e COMUNICADOS de férias coletivas
-- (20260723104455), confrontadas com o schema real de public.audit_log_unified
-- (id, source_table [NOT NULL], source_id, empresa_id, user_id, action, entity,
--  entity_id, payload, ip_address, user_agent, occurred_at, ingested_at).
--
--   A1 [CRÍTICO] As 5 RPCs de programação (aprovar_gestor/aprovar_rh/rejeitar/
--       mover/converter) inserem em audit_log_unified SEM a coluna source_table,
--       que é NOT NULL e não tem default -> toda ação falhava (rollback total).
--   A2 [CRÍTICO] registrar_comunicado_ferias_coletivas inseria em colunas
--       INEXISTENTES (actor_id, metadata) -> a RPC falhava 100%.
--   B  [ALTO] O bucket 'ferias-coletivas-comunicados' nunca foi criado (as
--       policies de storage.objects existem, o bucket não) -> upload do PDF
--       falhava em runtime com "Bucket not found".
--   C  [MÉDIO] programacao_ferias_mover NÃO checava papel (gestor/rh/admin),
--       ao contrário das demais RPCs e da policy UPDATE. Como a RPC é SECURITY
--       DEFINER (ignora RLS), qualquer membro autenticado da empresa podia mover
--       a programação -> brecha de privilégio dentro do tenant.
--   E  [BAIXO] registrar_comunicado sem FOR UPDATE -> corrida em regeneração.
--
-- Estratégia: (A1) trigger de defesa que preenche source_table a partir de
-- entity quando omitido — conserta as 5 RPCs de uma vez E previne a repetição
-- do mesmo padrão em inserts futuros. (A2/E/C) redefinição cirúrgica das duas
-- RPCs afetadas. (B) criação idempotente do bucket. Tudo idempotente.
-- ============================================================================

-- ---- A1: defesa sistêmica de source_table (NOT NULL) ----
CREATE OR REPLACE FUNCTION public.audit_log_unified_default_source()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.source_table IS NULL THEN
    NEW.source_table := COALESCE(NEW.entity, 'app_rpc');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_audit_default_source ON public.audit_log_unified;
CREATE TRIGGER trg_audit_default_source
BEFORE INSERT ON public.audit_log_unified
FOR EACH ROW EXECUTE FUNCTION public.audit_log_unified_default_source();

-- ---- B: bucket ausente (privado, 10 MB, apenas PDF) ----
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ferias-coletivas-comunicados', 'ferias-coletivas-comunicados', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ---- A2 + E: colunas corretas do audit + FOR UPDATE ----
CREATE OR REPLACE FUNCTION public.registrar_comunicado_ferias_coletivas(
  _coletiva_id UUID,
  _mte_path TEXT,
  _mte_hash TEXT,
  _sindicato_path TEXT,
  _sindicato_hash TEXT,
  _sindicato_nome TEXT
) RETURNS public.ferias_coletivas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ferias_coletivas;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.ferias_coletivas WHERE id = _coletiva_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Férias coletivas não encontradas' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.user_belongs_to_empresa(auth.uid(), v_row.empresa_id) THEN
    RAISE EXCEPTION 'Sem acesso a essa empresa' USING ERRCODE = '42501';
  END IF;

  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'rh'::app_role)) THEN
    RAISE EXCEPTION 'Apenas RH ou Admin podem gerar comunicados' USING ERRCODE = '42501';
  END IF;

  UPDATE public.ferias_coletivas SET
    comunicado_mte_path       = _mte_path,
    comunicado_mte_hash       = _mte_hash,
    comunicado_sindicato_path = _sindicato_path,
    comunicado_sindicato_hash = _sindicato_hash,
    comunicado_sindicato_nome = _sindicato_nome,
    comunicado_gerado_em      = now(),
    comunicado_gerado_por     = auth.uid(),
    updated_at                = now()
  WHERE id = _coletiva_id
  RETURNING * INTO v_row;

  -- Colunas REAIS de audit_log_unified (antes: actor_id/metadata inexistentes).
  INSERT INTO public.audit_log_unified
    (source_table, entity, entity_id, action, user_id, empresa_id, payload)
  VALUES
    ('ferias_coletivas', 'ferias_coletivas', v_row.id::text, 'comunicado_gerado',
     auth.uid(), v_row.empresa_id,
     jsonb_build_object('mte_hash', _mte_hash, 'sindicato_hash', _sindicato_hash, 'sindicato_nome', _sindicato_nome));

  RETURN v_row;
END $$;

REVOKE ALL ON FUNCTION public.registrar_comunicado_ferias_coletivas(UUID,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_comunicado_ferias_coletivas(UUID,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;

-- ---- C: programacao_ferias_mover — adiciona checagem de papel (gestor/rh/admin) ----
CREATE OR REPLACE FUNCTION public.programacao_ferias_mover(
  _id UUID, _novo_mes INT, _nova_data_inicio DATE DEFAULT NULL
)
RETURNS TABLE(programacao public.ferias_programacao, aviso TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r public.ferias_programacao;
  v_aviso TEXT := NULL;
  v_limite DATE;
BEGIN
  IF _novo_mes < 1 OR _novo_mes > 12 THEN
    RAISE EXCEPTION 'mês inválido' USING ERRCODE='22023';
  END IF;

  SELECT * INTO r FROM public.ferias_programacao WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Programação não encontrada' USING ERRCODE='P0002'; END IF;
  IF NOT public.user_belongs_to_empresa(auth.uid(), r.empresa_id) THEN
    RAISE EXCEPTION 'Sem permissão de escopo' USING ERRCODE='42501';
  END IF;
  -- Correção C: mover é ação de gestão (mesma regra das demais RPCs e da policy UPDATE).
  IF NOT (public.has_role(auth.uid(),'gestor') OR public.has_role(auth.uid(),'rh') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Apenas gestor/RH/Admin pode mover a programação' USING ERRCODE='42501';
  END IF;
  IF r.status IN ('convertido','cancelado','rejeitado') THEN
    RAISE EXCEPTION 'Não é possível mover programação no status %', r.status USING ERRCODE='22023';
  END IF;

  IF r.periodo_aquisitivo_id IS NOT NULL THEN
    SELECT data_limite_concessao INTO v_limite
      FROM public.periodos_aquisitivos WHERE id = r.periodo_aquisitivo_id;
    IF v_limite IS NOT NULL AND make_date(r.ano, _novo_mes, 1) > v_limite THEN
      v_aviso := 'Atenção: mês selecionado ultrapassa a data limite de concessão (Art. 137 CLT — férias em dobra).';
    END IF;
  END IF;

  UPDATE public.ferias_programacao
     SET mes_previsto = _novo_mes,
         data_inicio_prevista = _nova_data_inicio,
         data_fim_prevista = CASE
           WHEN _nova_data_inicio IS NOT NULL THEN (_nova_data_inicio + (r.dias_previstos - 1) * INTERVAL '1 day')::date
           ELSE NULL END
   WHERE id = _id
  RETURNING * INTO r;

  INSERT INTO public.audit_log_unified(source_table, entity, entity_id, action, user_id, empresa_id, payload)
  VALUES ('ferias_programacao', 'ferias_programacao', _id::text, 'MOVER', auth.uid(), r.empresa_id,
          jsonb_build_object('novo_mes', _novo_mes, 'nova_data_inicio', _nova_data_inicio, 'aviso', v_aviso));

  programacao := r; aviso := v_aviso; RETURN NEXT;
END $$;

REVOKE ALL ON FUNCTION public.programacao_ferias_mover(UUID, INT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.programacao_ferias_mover(UUID, INT, DATE) TO authenticated;
