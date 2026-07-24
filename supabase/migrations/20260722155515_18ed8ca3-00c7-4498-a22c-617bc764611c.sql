
-- 1) Migração idempotente: usa (source_table, source_id) como chave de deduplicação.
-- Índice único parcial para permitir ON CONFLICT sem afetar linhas nativas (source_id NULL).
CREATE UNIQUE INDEX IF NOT EXISTS uq_audit_unified_source
  ON public.audit_log_unified (source_table, source_id)
  WHERE source_id IS NOT NULL;

-- audit_log
INSERT INTO public.audit_log_unified
  (source_table, source_id, user_id, action, entity, entity_id, payload, ip_address, user_agent, occurred_at)
SELECT
  'audit_log', id, user_id, acao, tabela, registro_id::text,
  jsonb_build_object(
    'user_email', user_email,
    'dados_anteriores', dados_anteriores,
    'dados_novos', dados_novos,
    'campos_alterados', campos_alterados
  ),
  NULLIF(ip_address, '')::inet, user_agent, created_at
FROM public.audit_log
ON CONFLICT (source_table, source_id) WHERE source_id IS NOT NULL DO NOTHING;

-- audit_logs
INSERT INTO public.audit_log_unified
  (source_table, source_id, empresa_id, user_id, action, entity, entity_id, payload, ip_address, user_agent, occurred_at)
SELECT
  'audit_logs', id, empresa_id, user_id, action, entity, entity_id,
  jsonb_build_object('user_email', user_email, 'old_values', old_values, 'new_values', new_values),
  NULLIF(ip_address, '')::inet, user_agent, created_at
FROM public.audit_logs
ON CONFLICT (source_table, source_id) WHERE source_id IS NOT NULL DO NOTHING;

-- auditoria — schema varia por banco (005_ vs 20260306_): usar EXECUTE para
-- evitar falha de compilação em bancos onde entidade/entidade_id/descricao
-- não existem (schema 005_ usa tabela+registro_id em vez de entidade+entidade_id).
DO $$
DECLARE
  has_entidade boolean;
  has_descricao boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'auditoria'
      AND column_name = 'entidade'
  ) INTO has_entidade;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'auditoria'
      AND column_name = 'descricao'
  ) INTO has_descricao;

  IF has_entidade THEN
    -- Schema completo (20260306_*): tem entidade, entidade_id, descricao
    EXECUTE $sql$
      INSERT INTO public.audit_log_unified
        (source_table, source_id, empresa_id, user_id, action, entity, entity_id, payload, ip_address, occurred_at)
      SELECT
        'auditoria', id,
        CASE WHEN empresa_id::text ~ '^[0-9a-f-]{36}$' THEN empresa_id::uuid ELSE NULL END,
        usuario_id, acao, entidade, entidade_id,
        jsonb_build_object(
          'usuario_nome', usuario_nome,
          'descricao', descricao,
          'dados_anteriores', dados_anteriores,
          'dados_novos', dados_novos,
          'empresa_id_raw', empresa_id::text
        ),
        NULLIF(ip_address, '')::inet, created_at
      FROM public.auditoria
      ON CONFLICT (source_table, source_id) WHERE source_id IS NOT NULL DO NOTHING
    $sql$;
  ELSE
    -- Schema 005_ (esocial): tem tabela+registro_id em vez de entidade+entidade_id
    EXECUTE $sql$
      INSERT INTO public.audit_log_unified
        (source_table, source_id, empresa_id, user_id, action, entity, entity_id, payload, ip_address, occurred_at)
      SELECT
        'auditoria', id,
        CASE WHEN empresa_id::text ~ '^[0-9a-f-]{36}$' THEN empresa_id::uuid ELSE NULL END,
        usuario_id, acao,
        tabela,
        registro_id::text,
        jsonb_build_object(
          'usuario_nome', usuario_nome,
          'dados_anteriores', dados_anteriores,
          'dados_novos', dados_novos,
          'empresa_id_raw', empresa_id::text
        ),
        NULLIF(ip_address, '')::inet, created_at
      FROM public.auditoria
      ON CONFLICT (source_table, source_id) WHERE source_id IS NOT NULL DO NOTHING
    $sql$;
  END IF;
END;
$$;

-- auditoria_logs
INSERT INTO public.audit_log_unified
  (source_table, source_id, empresa_id, user_id, action, entity, entity_id, payload, ip_address, occurred_at)
SELECT
  'auditoria_logs', id, empresa_id, user_id, acao::text, entidade::text, entidade_id::text,
  jsonb_build_object(
    'user_email', user_email,
    'descricao', descricao,
    'dados_anteriores', dados_anteriores,
    'dados_novos', dados_novos
  ),
  NULLIF(ip_address::text, '')::inet, created_at
FROM public.auditoria_logs
ON CONFLICT (source_table, source_id) WHERE source_id IS NOT NULL DO NOTHING;

-- logs_sistema
INSERT INTO public.audit_log_unified
  (source_table, source_id, user_id, action, entity, payload, user_agent, occurred_at)
SELECT
  'logs_sistema', id, user_id, nivel, 'sistema',
  jsonb_build_object('mensagem', mensagem, 'contexto', contexto, 'stack_trace', stack_trace, 'url', url),
  user_agent, created_at
FROM public.logs_sistema
ON CONFLICT (source_table, source_id) WHERE source_id IS NOT NULL DO NOTHING;

-- 2) Marcar tabelas legadas como DEPRECATED.
COMMENT ON TABLE public.audit_log       IS 'DEPRECATED — migrado para audit_log_unified na Etapa 8. Manter para observação; remover após janela de 90 dias.';
COMMENT ON TABLE public.audit_logs      IS 'DEPRECATED — migrado para audit_log_unified na Etapa 8.';
COMMENT ON TABLE public.auditoria       IS 'DEPRECATED — migrado para audit_log_unified na Etapa 8.';
COMMENT ON TABLE public.auditoria_logs  IS 'DEPRECATED — migrado para audit_log_unified na Etapa 8.';
COMMENT ON TABLE public.logs_sistema    IS 'DEPRECATED — migrado para audit_log_unified na Etapa 8.';

-- 3) View unificada de leitura (transição) — respeita RLS de audit_log_unified via security_invoker.
CREATE OR REPLACE VIEW public.v_audit_legacy
WITH (security_invoker = true)
AS
SELECT id, source_table, source_id, empresa_id, user_id, action, entity, entity_id,
       payload, ip_address, user_agent, occurred_at, ingested_at
FROM public.audit_log_unified;

GRANT SELECT ON public.v_audit_legacy TO authenticated;
COMMENT ON VIEW public.v_audit_legacy IS 'View de transição: leitura unificada de auditoria. Substitui consultas às tabelas legadas.';
