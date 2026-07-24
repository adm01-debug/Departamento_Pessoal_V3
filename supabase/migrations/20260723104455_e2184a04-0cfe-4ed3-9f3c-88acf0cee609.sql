
ALTER TABLE public.ferias_coletivas
  ADD COLUMN IF NOT EXISTS comunicado_mte_path TEXT,
  ADD COLUMN IF NOT EXISTS comunicado_mte_hash TEXT,
  ADD COLUMN IF NOT EXISTS comunicado_sindicato_path TEXT,
  ADD COLUMN IF NOT EXISTS comunicado_sindicato_hash TEXT,
  ADD COLUMN IF NOT EXISTS comunicado_sindicato_nome TEXT,
  ADD COLUMN IF NOT EXISTS comunicado_gerado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS comunicado_gerado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;

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

  SELECT * INTO v_row FROM public.ferias_coletivas WHERE id = _coletiva_id;
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

  INSERT INTO public.audit_log_unified (
    empresa_id, entity, entity_id, action, actor_id, metadata
  ) VALUES (
    v_row.empresa_id, 'ferias_coletivas', v_row.id, 'comunicado_gerado', auth.uid(),
    jsonb_build_object('mte_hash', _mte_hash, 'sindicato_hash', _sindicato_hash, 'sindicato_nome', _sindicato_nome)
  );

  RETURN v_row;
END $$;

REVOKE ALL ON FUNCTION public.registrar_comunicado_ferias_coletivas(UUID,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_comunicado_ferias_coletivas(UUID,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;

DROP POLICY IF EXISTS "coletivas_comunicados_select" ON storage.objects;
DROP POLICY IF EXISTS "coletivas_comunicados_insert" ON storage.objects;
DROP POLICY IF EXISTS "coletivas_comunicados_update" ON storage.objects;
DROP POLICY IF EXISTS "coletivas_comunicados_delete" ON storage.objects;

CREATE POLICY "coletivas_comunicados_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'ferias-coletivas-comunicados'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "coletivas_comunicados_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ferias-coletivas-comunicados'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role))
  );

CREATE POLICY "coletivas_comunicados_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ferias-coletivas-comunicados'
    AND public.user_belongs_to_empresa(auth.uid(), ((storage.foldername(name))[1])::uuid)
    AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'rh'::app_role))
  );

CREATE POLICY "coletivas_comunicados_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'ferias-coletivas-comunicados'
    AND public.has_role(auth.uid(),'admin'::app_role)
  );
