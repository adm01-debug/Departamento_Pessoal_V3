-- =========================================================
-- 1. VAGAS: remove política legada exposta a anon
-- =========================================================
DROP POLICY IF EXISTS "Multi-tenant access" ON public.vagas;

-- =========================================================
-- 2. CANDIDATURAS: empresa_id derivado da vaga (fonte de verdade)
-- =========================================================
UPDATE public.candidaturas c
   SET empresa_id = v.empresa_id
  FROM public.vagas v
 WHERE v.id = c.vaga_id
   AND (c.empresa_id IS DISTINCT FROM v.empresa_id);

CREATE OR REPLACE FUNCTION public.fn_candidatura_set_empresa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT v.empresa_id INTO NEW.empresa_id
    FROM public.vagas v
   WHERE v.id = NEW.vaga_id;

  IF NEW.empresa_id IS NULL THEN
    RAISE EXCEPTION 'Vaga % inexistente ou sem empresa vinculada', NEW.vaga_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_candidatura_set_empresa ON public.candidaturas;
CREATE TRIGGER trg_candidatura_set_empresa
  BEFORE INSERT OR UPDATE OF vaga_id, empresa_id ON public.candidaturas
  FOR EACH ROW EXECUTE FUNCTION public.fn_candidatura_set_empresa();

ALTER TABLE public.candidaturas ALTER COLUMN empresa_id SET NOT NULL;

DROP POLICY IF EXISTS "Users can manage candidaturas via vaga empresa" ON public.candidaturas;
DROP POLICY IF EXISTS candidaturas_tenant_select ON public.candidaturas;
DROP POLICY IF EXISTS candidaturas_tenant_insert ON public.candidaturas;
DROP POLICY IF EXISTS candidaturas_tenant_update ON public.candidaturas;
DROP POLICY IF EXISTS candidaturas_tenant_delete ON public.candidaturas;

CREATE POLICY candidaturas_tenant_select ON public.candidaturas
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vagas v
    WHERE v.id = candidaturas.vaga_id
      AND v.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));
CREATE POLICY candidaturas_tenant_insert ON public.candidaturas
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.vagas v
    WHERE v.id = candidaturas.vaga_id
      AND v.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));
CREATE POLICY candidaturas_tenant_update ON public.candidaturas
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vagas v
    WHERE v.id = candidaturas.vaga_id
      AND v.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vagas v
    WHERE v.id = candidaturas.vaga_id
      AND v.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));
CREATE POLICY candidaturas_tenant_delete ON public.candidaturas
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vagas v
    WHERE v.id = candidaturas.vaga_id
      AND v.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- =========================================================
-- 3. Predicado canônico: candidatura pertence a empresa do usuario
-- =========================================================
CREATE OR REPLACE FUNCTION public.candidatura_na_minha_empresa(_candidatura_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.candidaturas c
      JOIN public.vagas v ON v.id = c.vaga_id
     WHERE c.id = _candidatura_id
       AND v.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))
  );
$$;

REVOKE ALL ON FUNCTION public.candidatura_na_minha_empresa(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.candidatura_na_minha_empresa(uuid) TO authenticated, service_role;

-- =========================================================
-- 4. Vinculos obrigatorios (tabelas vazias: seguro)
-- =========================================================
DELETE FROM public.recrutamento_anotacoes WHERE candidatura_id IS NULL;
DELETE FROM public.recrutamento_entrevistas WHERE candidatura_id IS NULL;
DELETE FROM public.recrutamento_testes WHERE candidatura_id IS NULL;
DELETE FROM public.log_envio_relatorios WHERE agendamento_id IS NULL;

ALTER TABLE public.recrutamento_anotacoes   ALTER COLUMN candidatura_id SET NOT NULL;
ALTER TABLE public.recrutamento_entrevistas ALTER COLUMN candidatura_id SET NOT NULL;
ALTER TABLE public.recrutamento_testes      ALTER COLUMN candidatura_id SET NOT NULL;
ALTER TABLE public.log_envio_relatorios     ALTER COLUMN agendamento_id SET NOT NULL;

-- =========================================================
-- 5. RECRUTAMENTO_ANOTACOES
-- =========================================================
DROP POLICY IF EXISTS recrutamento_anotacoes_tenant_all ON public.recrutamento_anotacoes;
DROP POLICY IF EXISTS recrutamento_anotacoes_tenant_write ON public.recrutamento_anotacoes;
DROP POLICY IF EXISTS recrutamento_anotacoes_tenant_select ON public.recrutamento_anotacoes;
DROP POLICY IF EXISTS recrutamento_anotacoes_tenant_insert ON public.recrutamento_anotacoes;
DROP POLICY IF EXISTS recrutamento_anotacoes_tenant_update ON public.recrutamento_anotacoes;
DROP POLICY IF EXISTS recrutamento_anotacoes_tenant_delete ON public.recrutamento_anotacoes;

CREATE POLICY recrutamento_anotacoes_tenant_select ON public.recrutamento_anotacoes
  FOR SELECT TO authenticated
  USING (
    public.candidatura_na_minha_empresa(candidatura_id)
    AND (privada IS NOT TRUE OR usuario_id = auth.uid() OR public.is_admin(auth.uid()))
  );
CREATE POLICY recrutamento_anotacoes_tenant_insert ON public.recrutamento_anotacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.candidatura_na_minha_empresa(candidatura_id)
    AND usuario_id = auth.uid()
  );
CREATE POLICY recrutamento_anotacoes_tenant_update ON public.recrutamento_anotacoes
  FOR UPDATE TO authenticated
  USING (
    public.candidatura_na_minha_empresa(candidatura_id)
    AND (usuario_id = auth.uid() OR public.is_admin(auth.uid()))
  )
  WITH CHECK (
    public.candidatura_na_minha_empresa(candidatura_id)
    AND (usuario_id = auth.uid() OR public.is_admin(auth.uid()))
  );
CREATE POLICY recrutamento_anotacoes_tenant_delete ON public.recrutamento_anotacoes
  FOR DELETE TO authenticated
  USING (
    public.candidatura_na_minha_empresa(candidatura_id)
    AND (usuario_id = auth.uid() OR public.is_admin(auth.uid()))
  );

-- =========================================================
-- 6. RECRUTAMENTO_ENTREVISTAS
-- =========================================================
DROP POLICY IF EXISTS recrutamento_entrevistas_tenant_all ON public.recrutamento_entrevistas;
DROP POLICY IF EXISTS recrutamento_entrevistas_tenant_select ON public.recrutamento_entrevistas;
DROP POLICY IF EXISTS recrutamento_entrevistas_tenant_insert ON public.recrutamento_entrevistas;
DROP POLICY IF EXISTS recrutamento_entrevistas_tenant_update ON public.recrutamento_entrevistas;
DROP POLICY IF EXISTS recrutamento_entrevistas_tenant_delete ON public.recrutamento_entrevistas;

CREATE POLICY recrutamento_entrevistas_tenant_select ON public.recrutamento_entrevistas
  FOR SELECT TO authenticated USING (public.candidatura_na_minha_empresa(candidatura_id));
CREATE POLICY recrutamento_entrevistas_tenant_insert ON public.recrutamento_entrevistas
  FOR INSERT TO authenticated WITH CHECK (public.candidatura_na_minha_empresa(candidatura_id));
CREATE POLICY recrutamento_entrevistas_tenant_update ON public.recrutamento_entrevistas
  FOR UPDATE TO authenticated
  USING (public.candidatura_na_minha_empresa(candidatura_id))
  WITH CHECK (public.candidatura_na_minha_empresa(candidatura_id));
CREATE POLICY recrutamento_entrevistas_tenant_delete ON public.recrutamento_entrevistas
  FOR DELETE TO authenticated USING (public.candidatura_na_minha_empresa(candidatura_id));

-- =========================================================
-- 7. RECRUTAMENTO_TESTES
-- =========================================================
DROP POLICY IF EXISTS recrutamento_testes_tenant_all ON public.recrutamento_testes;
DROP POLICY IF EXISTS recrutamento_testes_tenant_select ON public.recrutamento_testes;
DROP POLICY IF EXISTS recrutamento_testes_tenant_insert ON public.recrutamento_testes;
DROP POLICY IF EXISTS recrutamento_testes_tenant_update ON public.recrutamento_testes;
DROP POLICY IF EXISTS recrutamento_testes_tenant_delete ON public.recrutamento_testes;

CREATE POLICY recrutamento_testes_tenant_select ON public.recrutamento_testes
  FOR SELECT TO authenticated USING (public.candidatura_na_minha_empresa(candidatura_id));
CREATE POLICY recrutamento_testes_tenant_insert ON public.recrutamento_testes
  FOR INSERT TO authenticated WITH CHECK (public.candidatura_na_minha_empresa(candidatura_id));
CREATE POLICY recrutamento_testes_tenant_update ON public.recrutamento_testes
  FOR UPDATE TO authenticated
  USING (public.candidatura_na_minha_empresa(candidatura_id))
  WITH CHECK (public.candidatura_na_minha_empresa(candidatura_id));
CREATE POLICY recrutamento_testes_tenant_delete ON public.recrutamento_testes
  FOR DELETE TO authenticated USING (public.candidatura_na_minha_empresa(candidatura_id));

-- =========================================================
-- 8. LOG_ENVIO_RELATORIOS (somente leitura para usuarios)
-- =========================================================
DROP POLICY IF EXISTS log_envio_relatorios_tenant_select ON public.log_envio_relatorios;
CREATE POLICY log_envio_relatorios_tenant_select ON public.log_envio_relatorios
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.relatorios_agendados ra
    WHERE ra.id = log_envio_relatorios.agendamento_id
      AND ra.empresa_id IN (SELECT public.get_user_empresas(auth.uid()))));

-- =========================================================
-- 9. Privilegios
-- =========================================================
REVOKE ALL ON public.vagas, public.candidatos, public.candidaturas,
             public.recrutamento_anotacoes, public.recrutamento_entrevistas,
             public.recrutamento_testes, public.log_envio_relatorios,
             public.relatorios_agendados FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vagas, public.candidatos, public.candidaturas,
      public.recrutamento_anotacoes, public.recrutamento_entrevistas,
      public.recrutamento_testes, public.relatorios_agendados TO authenticated;
GRANT SELECT ON public.log_envio_relatorios TO authenticated;

GRANT ALL ON public.vagas, public.candidatos, public.candidaturas,
      public.recrutamento_anotacoes, public.recrutamento_entrevistas,
      public.recrutamento_testes, public.log_envio_relatorios,
      public.relatorios_agendados TO service_role;

-- =========================================================
-- 10. Indices de apoio ao RLS
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_candidaturas_vaga_id ON public.candidaturas(vaga_id);
CREATE INDEX IF NOT EXISTS idx_vagas_empresa_id ON public.vagas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_rec_anotacoes_candidatura_id ON public.recrutamento_anotacoes(candidatura_id);
CREATE INDEX IF NOT EXISTS idx_rec_entrevistas_candidatura_id ON public.recrutamento_entrevistas(candidatura_id);
CREATE INDEX IF NOT EXISTS idx_rec_testes_candidatura_id ON public.recrutamento_testes(candidatura_id);
CREATE INDEX IF NOT EXISTS idx_log_envio_relatorios_agendamento_id ON public.log_envio_relatorios(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_agendados_empresa_id ON public.relatorios_agendados(empresa_id);