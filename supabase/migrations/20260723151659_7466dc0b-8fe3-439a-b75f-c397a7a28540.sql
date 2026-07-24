
CREATE TABLE IF NOT EXISTS public.contrato_token_eventos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  token_id UUID NOT NULL REFERENCES public.contrato_assinatura_tokens(id) ON DELETE CASCADE,
  contrato_id UUID NOT NULL REFERENCES public.contratos_gerados(id) ON DELETE CASCADE,
  evento TEXT NOT NULL CHECK (evento IN (
    'gerado','reenviado','revogado','estendido','lembrete_enviado',
    'acesso_link','tentativa_invalida','assinado','expirado'
  )),
  detalhes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ator_id UUID REFERENCES auth.users(id),
  ip INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.contrato_token_eventos TO authenticated;
GRANT ALL ON public.contrato_token_eventos TO service_role;

ALTER TABLE public.contrato_token_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contrato_token_eventos_read"
  ON public.contrato_token_eventos FOR SELECT
  TO authenticated
  USING (public.user_belongs_to_empresa(auth.uid(), empresa_id));

CREATE INDEX IF NOT EXISTS idx_ctk_eventos_token ON public.contrato_token_eventos(token_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ctk_eventos_contrato ON public.contrato_token_eventos(contrato_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ctk_eventos_empresa ON public.contrato_token_eventos(empresa_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.contrato_token_evento_registrar(
  p_token_id UUID,
  p_evento TEXT,
  p_detalhes JSONB DEFAULT '{}'::jsonb,
  p_ip INET DEFAULT NULL,
  p_ua TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa UUID;
  v_contrato UUID;
  v_id UUID;
BEGIN
  SELECT empresa_id, contrato_id INTO v_empresa, v_contrato
  FROM public.contrato_assinatura_tokens WHERE id = p_token_id;
  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'Token % não encontrado', p_token_id;
  END IF;

  INSERT INTO public.contrato_token_eventos(
    empresa_id, token_id, contrato_id, evento, detalhes, ator_id, ip, user_agent
  ) VALUES (
    v_empresa, p_token_id, v_contrato, p_evento,
    COALESCE(p_detalhes, '{}'::jsonb), auth.uid(), p_ip, p_ua
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.contrato_token_evento_registrar(UUID, TEXT, JSONB, INET, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contrato_token_evento_registrar(UUID, TEXT, JSONB, INET, TEXT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_contrato_token_auditar()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.contrato_token_eventos(empresa_id, token_id, contrato_id, evento, detalhes, ator_id)
    VALUES (NEW.empresa_id, NEW.id, NEW.contrato_id, 'gerado',
      jsonb_build_object('expira_em', NEW.expira_em, 'email', NEW.email_destinatario),
      NEW.created_by);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.revogado_em IS NOT NULL AND OLD.revogado_em IS NULL THEN
      INSERT INTO public.contrato_token_eventos(empresa_id, token_id, contrato_id, evento, detalhes, ator_id)
      VALUES (NEW.empresa_id, NEW.id, NEW.contrato_id, 'revogado',
        jsonb_build_object('motivo', NEW.revogacao_motivo), NEW.revogado_por);
    END IF;

    IF NEW.expira_em > OLD.expira_em THEN
      INSERT INTO public.contrato_token_eventos(empresa_id, token_id, contrato_id, evento, detalhes, ator_id)
      VALUES (NEW.empresa_id, NEW.id, NEW.contrato_id, 'estendido',
        jsonb_build_object('de', OLD.expira_em, 'para', NEW.expira_em), auth.uid());
    END IF;

    IF NEW.usado_em IS NOT NULL AND OLD.usado_em IS NULL THEN
      INSERT INTO public.contrato_token_eventos(empresa_id, token_id, contrato_id, evento, detalhes, ip, user_agent)
      VALUES (NEW.empresa_id, NEW.id, NEW.contrato_id, 'assinado',
        jsonb_build_object('hash', NEW.assinatura_hash), NEW.assinado_ip, NEW.assinado_ua);
    END IF;

    IF NEW.reminders_enviados > OLD.reminders_enviados THEN
      INSERT INTO public.contrato_token_eventos(empresa_id, token_id, contrato_id, evento, detalhes)
      VALUES (NEW.empresa_id, NEW.id, NEW.contrato_id, 'lembrete_enviado',
        jsonb_build_object('total', NEW.reminders_enviados, 'em', NEW.ultimo_reminder_at));
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contrato_token_auditar ON public.contrato_assinatura_tokens;
CREATE TRIGGER trg_contrato_token_auditar
AFTER INSERT OR UPDATE ON public.contrato_assinatura_tokens
FOR EACH ROW EXECUTE FUNCTION public.trg_contrato_token_auditar();

CREATE OR REPLACE VIEW public.v_contrato_token_timeline
WITH (security_invoker = true) AS
SELECT
  e.id,
  e.empresa_id,
  e.contrato_id,
  e.token_id,
  e.evento,
  e.detalhes,
  e.ator_id,
  p.nome AS ator_nome,
  e.ip,
  e.user_agent,
  e.created_at
FROM public.contrato_token_eventos e
LEFT JOIN public.profiles p ON p.user_id = e.ator_id;

GRANT SELECT ON public.v_contrato_token_timeline TO authenticated;
