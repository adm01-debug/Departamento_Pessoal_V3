-- Melhoria 38: Canonical audit_log_unified + write-forwarding triggers
-- Consolida escritas das 8 tabelas de auditoria em uma view canônica para queries cross-domain

CREATE TABLE IF NOT EXISTS public.audit_log_unified (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_table TEXT NOT NULL,
  source_id UUID,
  empresa_id UUID,
  user_id UUID,
  action TEXT,
  entity TEXT,
  entity_id TEXT,
  payload JSONB,
  ip_address INET,
  user_agent TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_log_unified TO authenticated;
GRANT ALL ON public.audit_log_unified TO service_role;

ALTER TABLE public.audit_log_unified ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view unified audit log" ON public.audit_log_unified;
CREATE POLICY "Admins can view unified audit log"
  ON public.audit_log_unified FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role manages unified audit log" ON public.audit_log_unified;
CREATE POLICY "Service role manages unified audit log"
  ON public.audit_log_unified FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_unified_occurred_desc
  ON public.audit_log_unified (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_unified_empresa_occurred
  ON public.audit_log_unified (empresa_id, occurred_at DESC)
  WHERE empresa_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_unified_user_occurred
  ON public.audit_log_unified (user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_unified_source
  ON public.audit_log_unified (source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_audit_unified_entity
  ON public.audit_log_unified (entity, entity_id);

-- Forwarding trigger genérico: extrai colunas comuns e insere no unified
CREATE OR REPLACE FUNCTION public.fwd_to_audit_unified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID;
  v_user UUID;
  v_action TEXT;
  v_entity TEXT;
  v_entity_id TEXT;
  v_ip INET;
  v_ua TEXT;
  v_occurred TIMESTAMPTZ;
  v_payload JSONB;
  v_row JSONB;
BEGIN
  v_row := to_jsonb(NEW);

  BEGIN v_empresa := (v_row->>'empresa_id')::UUID; EXCEPTION WHEN OTHERS THEN v_empresa := NULL; END;
  BEGIN v_user := COALESCE((v_row->>'user_id')::UUID, (v_row->>'usuario_id')::UUID, (v_row->>'created_by')::UUID); EXCEPTION WHEN OTHERS THEN v_user := NULL; END;

  v_action := COALESCE(v_row->>'action', v_row->>'acao', v_row->>'operation', v_row->>'operacao', v_row->>'event_type', v_row->>'tipo');
  v_entity := COALESCE(v_row->>'entity', v_row->>'entidade', v_row->>'table_name', v_row->>'tabela', v_row->>'resource', v_row->>'recurso');
  v_entity_id := COALESCE(v_row->>'entity_id', v_row->>'record_id', v_row->>'registro_id', v_row->>'resource_id');

  BEGIN v_ip := COALESCE((v_row->>'ip_address')::INET, (v_row->>'ip')::INET); EXCEPTION WHEN OTHERS THEN v_ip := NULL; END;
  v_ua := COALESCE(v_row->>'user_agent', v_row->>'useragent');

  BEGIN
    v_occurred := COALESCE(
      (v_row->>'created_at')::TIMESTAMPTZ,
      (v_row->>'occurred_at')::TIMESTAMPTZ,
      (v_row->>'timestamp')::TIMESTAMPTZ,
      (v_row->>'data')::TIMESTAMPTZ,
      now()
    );
  EXCEPTION WHEN OTHERS THEN v_occurred := now();
  END;

  v_payload := v_row - 'id' - 'empresa_id' - 'user_id' - 'usuario_id' - 'created_by'
             - 'ip_address' - 'ip' - 'user_agent' - 'useragent'
             - 'created_at' - 'occurred_at' - 'timestamp';

  INSERT INTO public.audit_log_unified (
    source_table, source_id, empresa_id, user_id, action, entity, entity_id,
    payload, ip_address, user_agent, occurred_at
  ) VALUES (
    TG_TABLE_NAME, NEW.id, v_empresa, v_user, v_action, v_entity, v_entity_id,
    v_payload, v_ip, v_ua, v_occurred
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca quebrar a escrita original por falha no forwarding
  RETURN NEW;
END;
$$;

-- Instala trigger em cada tabela de auditoria existente
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'audit_log', 'audit_logs', 'auditoria', 'auditoria_contratual',
    'auditoria_logs', 'folha_auditoria', 'folha_eventos_auditoria',
    'ponto_auditoria', 'ponto_auditoria_fraude', 'premiacoes_auditoria',
    'provisao_auditoria', 'ferias_audit_log', 'trilha_auditoria_ponto'
  ]
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_fwd_audit_unified ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER trg_fwd_audit_unified AFTER INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fwd_to_audit_unified()',
        t
      );
    END IF;
  END LOOP;
END $$;

-- RPC para busca cross-domain paginada
CREATE OR REPLACE FUNCTION public.search_audit_unified(
  _empresa_id UUID DEFAULT NULL,
  _user_id UUID DEFAULT NULL,
  _source_table TEXT DEFAULT NULL,
  _from TIMESTAMPTZ DEFAULT (now() - INTERVAL '30 days'),
  _to TIMESTAMPTZ DEFAULT now(),
  _limit INT DEFAULT 100
)
RETURNS TABLE (
  id UUID, source_table TEXT, source_id UUID, empresa_id UUID, user_id UUID,
  action TEXT, entity TEXT, entity_id TEXT, payload JSONB,
  ip_address INET, occurred_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.source_table, a.source_id, a.empresa_id, a.user_id,
         a.action, a.entity, a.entity_id, a.payload, a.ip_address, a.occurred_at
  FROM public.audit_log_unified a
  WHERE a.occurred_at BETWEEN _from AND _to
    AND (_empresa_id IS NULL OR a.empresa_id = _empresa_id)
    AND (_user_id IS NULL OR a.user_id = _user_id)
    AND (_source_table IS NULL OR a.source_table = _source_table)
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY a.occurred_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 1000);
$$;

REVOKE ALL ON FUNCTION public.search_audit_unified(UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_audit_unified(UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, INT) TO authenticated, service_role;