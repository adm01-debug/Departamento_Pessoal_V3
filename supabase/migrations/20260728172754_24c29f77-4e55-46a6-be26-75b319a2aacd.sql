ALTER TABLE public.documentos_afastamento
  ADD COLUMN IF NOT EXISTS validado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS validado_em timestamptz,
  ADD COLUMN IF NOT EXISTS validado_por uuid,
  ADD COLUMN IF NOT EXISTS metadados jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_documentos_afastamento_afastamento
  ON public.documentos_afastamento (afastamento_id, created_at DESC);

-- Carimba automaticamente quem validou e quando
CREATE OR REPLACE FUNCTION public.fn_documentos_afastamento_validacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.validado IS DISTINCT FROM OLD.validado THEN
    IF NEW.validado THEN
      NEW.validado_em := now();
      NEW.validado_por := auth.uid();
    ELSE
      NEW.validado_em := NULL;
      NEW.validado_por := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_documentos_afastamento_validacao() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_documentos_afastamento_validacao ON public.documentos_afastamento;
CREATE TRIGGER trg_documentos_afastamento_validacao
BEFORE UPDATE OF validado ON public.documentos_afastamento
FOR EACH ROW EXECUTE FUNCTION public.fn_documentos_afastamento_validacao();