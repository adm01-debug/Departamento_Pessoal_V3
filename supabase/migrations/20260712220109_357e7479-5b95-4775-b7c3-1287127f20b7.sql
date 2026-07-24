
-- Try to create view (may fail on preview if any underlying audit table is missing or has wrong schema)
DO $$
BEGIN
  EXECUTE $q$
    CREATE OR REPLACE VIEW public.v_audit_events_unified
    WITH (security_invoker = true) AS
      SELECT 'audit_log'::text AS source_table, tabela::text AS entidade, registro_id::text AS entidade_id,
             acao::text, user_id, dados_anteriores, dados_novos, created_at
      FROM public.audit_log
      UNION ALL
      SELECT 'audit_logs', entity::text, entity_id::text, action::text, user_id, old_values, new_values, created_at
      FROM public.audit_logs
      UNION ALL
      SELECT 'auditoria', entidade::text, entidade_id::text, acao::text, usuario_id, dados_anteriores, dados_novos, created_at
      FROM public.auditoria
      UNION ALL
      SELECT 'auditoria_logs', entidade::text, entidade_id::text, acao::text, user_id, dados_anteriores, dados_novos, created_at
      FROM public.auditoria_logs
      UNION ALL
      SELECT 'ferias_audit_log', entidade_tipo::text, entidade_id::text, acao::text, usuario_id, dados_anteriores, dados_novos, created_at
      FROM public.ferias_audit_log
      UNION ALL
      SELECT 'premiacoes_auditoria', entidade_tipo::text, entidade_id::text, acao::text, usuario_id, dados_anteriores, dados_novos, created_at
      FROM public.premiacoes_auditoria
      UNION ALL
      SELECT 'ponto_auditoria', tabela_nome::text, registro_id::text, acao::text, usuario_id, dados_anteriores, dados_novos, created_at
      FROM public.ponto_auditoria
      UNION ALL
      SELECT 'folha_auditoria', 'folha_pagamento'::text, folha_id::text, tipo_evento::text, criado_por,
             NULL::jsonb, detalhes, created_at
      FROM public.folha_auditoria
  $q$;
EXCEPTION WHEN others THEN NULL; END $$;

-- Grant on view only if it was created
DO $$
BEGIN
  REVOKE ALL ON public.v_audit_events_unified FROM PUBLIC, anon;
  GRANT SELECT ON public.v_audit_events_unified TO authenticated;
EXCEPTION WHEN others THEN NULL; END $$;

-- LANGUAGE plpgsql: bodies are NOT validated at CREATE time, so these always succeed
-- even when v_audit_events_unified does not yet exist on preview branches.
CREATE OR REPLACE FUNCTION public.get_audit_trail_by_user(_user_id uuid, _limit integer DEFAULT 500)
RETURNS TABLE(source_table text, entidade text, entidade_id text, acao text, dados_anteriores jsonb, dados_novos jsonb, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
    SELECT v.source_table, v.entidade, v.entidade_id, v.acao, v.dados_anteriores, v.dados_novos, v.created_at
    FROM public.v_audit_events_unified v
    WHERE v.user_id = _user_id
      AND (public.has_role(auth.uid(), 'admin'::app_role) OR auth.uid() = _user_id)
    ORDER BY v.created_at DESC LIMIT _limit;
END;
$$;
REVOKE ALL ON FUNCTION public.get_audit_trail_by_user(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_audit_trail_by_user(uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_audit_trail_by_entity(_entidade text, _entidade_id uuid, _limit integer DEFAULT 200)
RETURNS TABLE(source_table text, acao text, user_id uuid, dados_anteriores jsonb, dados_novos jsonb, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
    SELECT v.source_table, v.acao, v.user_id, v.dados_anteriores, v.dados_novos, v.created_at
    FROM public.v_audit_events_unified v
    WHERE v.entidade = _entidade
      AND v.entidade_id = _entidade_id::text
      AND public.has_role(auth.uid(), 'admin'::app_role)
    ORDER BY v.created_at DESC LIMIT _limit;
END;
$$;
REVOKE ALL ON FUNCTION public.get_audit_trail_by_entity(text, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_audit_trail_by_entity(text, uuid, integer) TO authenticated;
