
-- 1. Colunas de assinatura eletrônica do aviso de férias
ALTER TABLE public.ferias
  ADD COLUMN IF NOT EXISTS aviso_pdf_url text,
  ADD COLUMN IF NOT EXISTS aviso_assinatura_hash text,
  ADD COLUMN IF NOT EXISTS aviso_assinatura_em timestamptz,
  ADD COLUMN IF NOT EXISTS aviso_assinatura_por uuid,
  ADD COLUMN IF NOT EXISTS aviso_assinatura_ip inet,
  ADD COLUMN IF NOT EXISTS aviso_assinatura_user_agent text,
  ADD COLUMN IF NOT EXISTS aviso_gerado_em timestamptz;

-- 2. RPC de assinatura RH — atômica, security definer, com auditoria
CREATE OR REPLACE FUNCTION public.assinar_aviso_ferias(
  p_ferias_id uuid,
  p_hash text,
  p_pdf_url text,
  p_ip inet DEFAULT NULL,
  p_ua text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_empresa uuid;
  v_aprovado_gestor boolean;
  v_ja_assinado boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT (public.has_role(v_uid, 'admin') OR public.has_role(v_uid, 'rh')) THEN
    RAISE EXCEPTION 'forbidden: apenas admin/rh podem assinar aviso' USING ERRCODE = '42501';
  END IF;

  IF p_hash IS NULL OR length(p_hash) <> 64 THEN
    RAISE EXCEPTION 'hash SHA-256 inválido' USING ERRCODE = '22023';
  END IF;

  SELECT empresa_id, COALESCE(aprovado_gestor,false), (aviso_assinatura_hash IS NOT NULL)
    INTO v_empresa, v_aprovado_gestor, v_ja_assinado
  FROM public.ferias
  WHERE id = p_ferias_id
  FOR UPDATE;

  IF v_empresa IS NULL THEN
    RAISE EXCEPTION 'ferias não encontrada' USING ERRCODE = '02000';
  END IF;

  IF NOT v_aprovado_gestor THEN
    RAISE EXCEPTION 'aviso requer aprovação prévia do gestor' USING ERRCODE = '22023';
  END IF;

  -- Idempotência: se hash idêntico já foi assinado, retornar sucesso sem regravar
  IF v_ja_assinado THEN
    IF EXISTS (SELECT 1 FROM public.ferias WHERE id = p_ferias_id AND aviso_assinatura_hash = p_hash) THEN
      RETURN jsonb_build_object('status','replay','ferias_id',p_ferias_id);
    END IF;
    RAISE EXCEPTION 'aviso já assinado com hash divergente' USING ERRCODE = '23505';
  END IF;

  UPDATE public.ferias SET
    aviso_pdf_url             = p_pdf_url,
    aviso_assinatura_hash     = p_hash,
    aviso_assinatura_em       = now(),
    aviso_assinatura_por      = v_uid,
    aviso_assinatura_ip       = p_ip,
    aviso_assinatura_user_agent = p_ua,
    aviso_gerado_em           = COALESCE(aviso_gerado_em, now()),
    aprovado_rh               = true,
    aprovado_rh_em            = now(),
    aprovado_rh_por           = v_uid,
    status_aprovacao_rh       = 'aprovada',
    updated_at                = now()
  WHERE id = p_ferias_id;

  INSERT INTO public.audit_log_unified
    (source_table, source_id, empresa_id, user_id, action, entity, entity_id, payload, ip_address, user_agent)
  VALUES
    ('ferias', p_ferias_id, v_empresa, v_uid, 'ferias.aviso_assinado', 'ferias', p_ferias_id,
     jsonb_build_object('hash', p_hash, 'pdf_url', p_pdf_url),
     p_ip, p_ua);

  RETURN jsonb_build_object('status','ok','ferias_id',p_ferias_id,'assinado_em', now());
END;
$$;

REVOKE ALL ON FUNCTION public.assinar_aviso_ferias(uuid,text,text,inet,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assinar_aviso_ferias(uuid,text,text,inet,text) TO authenticated;

-- 3. RLS storage.objects para bucket ferias-avisos (path: {empresa_id}/{ferias_id}.pdf)
DROP POLICY IF EXISTS "ferias_avisos_select_tenant" ON storage.objects;
DROP POLICY IF EXISTS "ferias_avisos_insert_tenant" ON storage.objects;
DROP POLICY IF EXISTS "ferias_avisos_update_tenant" ON storage.objects;

CREATE POLICY "ferias_avisos_select_tenant"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'ferias-avisos'
  AND EXISTS (
    SELECT 1 FROM public.user_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "ferias_avisos_insert_tenant"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'ferias-avisos'
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rh'))
  AND EXISTS (
    SELECT 1 FROM public.user_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "ferias_avisos_update_tenant"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'ferias-avisos'
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'rh'))
);
