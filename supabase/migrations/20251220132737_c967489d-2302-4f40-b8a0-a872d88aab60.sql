-- Create audit log table (idempotent)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tabela TEXT NOT NULL,
  registro_id UUID NOT NULL,
  acao TEXT NOT NULL CHECK (acao IN ('INSERT', 'UPDATE', 'DELETE')),
  dados_anteriores JSONB,
  dados_novos JSONB,
  campos_alterados TEXT[],
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent)
DO $$ BEGIN
  CREATE POLICY "Authenticated users can view audit_log"
  ON public.audit_log FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create indexes for performance (idempotent)
CREATE INDEX IF NOT EXISTS idx_audit_log_tabela ON public.audit_log(tabela);
CREATE INDEX IF NOT EXISTS idx_audit_log_registro_id ON public.audit_log(registro_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_acao ON public.audit_log(acao);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);

-- Function to log changes
CREATE OR REPLACE FUNCTION public.log_audit_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed_fields TEXT[];
  current_user_id UUID;
  current_user_email TEXT;
BEGIN
  current_user_id := auth.uid();
  current_user_email := (SELECT email FROM auth.users WHERE id = current_user_id);

  IF (TG_OP = 'DELETE') THEN
    old_data := to_jsonb(OLD);
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores, user_id, user_email)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', old_data, current_user_id, current_user_email);
    RETURN OLD;

  ELSIF (TG_OP = 'UPDATE') THEN
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);

    SELECT array_agg(key) INTO changed_fields
    FROM (
      SELECT key FROM jsonb_each(old_data)
      EXCEPT
      SELECT key FROM jsonb_each(new_data)
      UNION
      SELECT key FROM jsonb_each(new_data)
      EXCEPT
      SELECT key FROM jsonb_each(old_data)
      UNION
      SELECT o.key FROM jsonb_each(old_data) o
      JOIN jsonb_each(new_data) n ON o.key = n.key
      WHERE o.value IS DISTINCT FROM n.value
    ) changed;

    IF changed_fields IS NOT NULL AND array_length(changed_fields, 1) > 0 THEN
      INSERT INTO public.audit_log (tabela, registro_id, acao, dados_anteriores, dados_novos, campos_alterados, user_id, user_email)
      VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', old_data, new_data, changed_fields, current_user_id, current_user_email);
    END IF;
    RETURN NEW;

  ELSIF (TG_OP = 'INSERT') THEN
    new_data := to_jsonb(NEW);
    INSERT INTO public.audit_log (tabela, registro_id, acao, dados_novos, user_id, user_email)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', new_data, current_user_id, current_user_email);
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Create triggers for main tables (idempotent)
DROP TRIGGER IF EXISTS audit_colaboradores ON public.colaboradores;
CREATE TRIGGER audit_colaboradores
  AFTER INSERT OR UPDATE OR DELETE ON public.colaboradores
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_admissoes ON public.admissoes;
CREATE TRIGGER audit_admissoes
  AFTER INSERT OR UPDATE OR DELETE ON public.admissoes
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_desligamentos ON public.desligamentos;
CREATE TRIGGER audit_desligamentos
  AFTER INSERT OR UPDATE OR DELETE ON public.desligamentos
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_ferias ON public.ferias;
CREATE TRIGGER audit_ferias
  AFTER INSERT OR UPDATE OR DELETE ON public.ferias
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_afastamentos ON public.afastamentos;
CREATE TRIGGER audit_afastamentos
  AFTER INSERT OR UPDATE OR DELETE ON public.afastamentos
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_registros_ponto ON public.registros_ponto;
CREATE TRIGGER audit_registros_ponto
  AFTER INSERT OR UPDATE OR DELETE ON public.registros_ponto
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_folhas_pagamento ON public.folhas_pagamento;
CREATE TRIGGER audit_folhas_pagamento
  AFTER INSERT OR UPDATE OR DELETE ON public.folhas_pagamento
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();

DROP TRIGGER IF EXISTS audit_holerites ON public.holerites;
CREATE TRIGGER audit_holerites
  AFTER INSERT OR UPDATE OR DELETE ON public.holerites
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_change();
