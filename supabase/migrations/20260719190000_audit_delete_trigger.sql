-- Audit trigger for DELETE operations on critical business tables.
-- LGPD Article 37 requires traceability of data deletion events.

CREATE OR REPLACE FUNCTION public.audit_delete_operation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    acao,
    tabela,
    registro_id,
    empresa_id,
    dados_anteriores
  ) VALUES (
    COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
    'DELETE',
    TG_TABLE_NAME,
    OLD.id,
    CASE WHEN TG_TABLE_NAME IN ('empresas') THEN OLD.id
         ELSE (OLD.empresa_id)
    END,
    to_jsonb(OLD)
  );
  RETURN OLD;
END;
$$;

-- Apply to critical tables that hold sensitive/business data
-- Inner EXCEPTION block per iteration to survive missing tables on preview branches
DO $$
DECLARE
  tbl TEXT;
  trigger_name TEXT;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'colaboradores',
      'folhas_pagamento',
      'despesas',
      'dependentes',
      'contas_bancarias',
      'ferias',
      'historico_rescisoes',
      'documentos',
      'beneficios',
      'asos'
    ])
  LOOP
    trigger_name := 'trg_audit_delete_' || tbl;
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON c.oid = t.tgrelid
        WHERE t.tgname = trigger_name AND c.relname = tbl
      ) THEN
        EXECUTE format(
          'CREATE TRIGGER %I BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_delete_operation()',
          trigger_name, tbl
        );
      END IF;
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END LOOP;
END $$;

COMMENT ON FUNCTION public.audit_delete_operation() IS
  'LGPD Art.37 — logs full row data before any DELETE on critical tables to audit_log.';
