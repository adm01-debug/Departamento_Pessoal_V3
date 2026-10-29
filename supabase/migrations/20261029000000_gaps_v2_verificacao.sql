-- Gaps da verificação V2 (Ponto/Jornada/Férias/13º) — levantamento
-- docs/auditoria/LEVANTAMENTO_PENDENCIAS_2026-10-12.md §4/#24 e §6.2.
--
-- (1) parametros_sistema: policy de escrita por tenant — a tela de
--     configurações de folha passa a gravar parâmetros por empresa
--     (antes: só SELECT; qualquer gravação era negada por RLS).
-- (2) faltas → periodos_aquisitivos.faltas_periodo: alimentação
--     automática (antes: campo só era escrito manualmente, então a
--     redução de dias_direito do art. 130 nunca disparava).
-- (3) afd_geracoes: metadata da geração do AFD (Portaria MTP 671/21) —
--     espelha aej_geracoes (a edge gerar-afd a persiste via service_role).

-- ---------------------------------------------------------------
-- (1) parametros_sistema — write por tenant (padrão configuracoes_*)
-- ---------------------------------------------------------------
-- audit-migration-style: allow-silent-drop substituição idempotente — a policy é recriada logo abaixo no estado final
DROP POLICY IF EXISTS "parametros_sistema_tenant_manage" ON public.parametros_sistema;
CREATE POLICY "parametros_sistema_tenant_manage"
  ON public.parametros_sistema FOR ALL TO authenticated
  USING (public.rls_tenant_or_admin(empresa_id))
  WITH CHECK (public.rls_tenant_or_admin(empresa_id));

-- ---------------------------------------------------------------
-- (2) faltas → faltas_periodo (art. 130 CLT)
--     Reconta faltas NÃO justificadas e não rejeitadas do colaborador
--     dentro de cada período aquisitivo. O trigger existente
--     (BEFORE INSERT OR UPDATE OF faltas_periodo em periodos_aquisitivos)
--     já recalcula dias_direito quando o valor muda.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_faltas_sync_faltas_periodo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions, pg_temp
AS $$
DECLARE
  v_colab uuid;
BEGIN
  FOREACH v_colab IN ARRAY ARRAY[NEW.colaborador_id, OLD.colaborador_id] LOOP
    IF v_colab IS NULL THEN CONTINUE; END IF;
    UPDATE public.periodos_aquisitivos pa
    SET faltas_periodo = (
      SELECT COALESCE(SUM(COALESCE(f.dias_total, 1)), 0)::int
      FROM public.faltas f
      WHERE f.colaborador_id = v_colab
        AND f.justificada IS NOT TRUE
        AND COALESCE(f.status, '') NOT IN ('rejeitada')
        AND f.data >= pa.data_inicio AND f.data <= pa.data_fim
    )
    WHERE pa.colaborador_id = v_colab;
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_faltas_sync_faltas_periodo() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_faltas_sync_faltas_periodo() TO service_role;

DROP TRIGGER IF EXISTS trg_faltas_sync_faltas_periodo ON public.faltas;
CREATE TRIGGER trg_faltas_sync_faltas_periodo
  AFTER INSERT OR UPDATE OR DELETE
  ON public.faltas
  FOR EACH ROW EXECUTE FUNCTION public.fn_faltas_sync_faltas_periodo();

-- Backfill: recalcula o faltas_periodo de todos os períodos existentes.
UPDATE public.periodos_aquisitivos pa
SET faltas_periodo = (
  SELECT COALESCE(SUM(COALESCE(f.dias_total, 1)), 0)::int
  FROM public.faltas f
  WHERE f.colaborador_id = pa.colaborador_id
    AND f.justificada IS NOT TRUE
    AND COALESCE(f.status, '') NOT IN ('rejeitada')
    AND f.data >= pa.data_inicio AND f.data <= pa.data_fim
);

-- ---------------------------------------------------------------
-- (3) afd_geracoes — espelha aej_geracoes (metadata + hash + RLS)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.afd_geracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  total_colaboradores integer,
  total_marcacoes integer,
  colaboradores_sem_pis integer,
  tamanho_bytes integer,
  hash_sha256 text,
  status text DEFAULT 'gerado',
  erro text,
  gerado_por uuid,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_afd_geracoes_hash
  ON public.afd_geracoes (empresa_id, periodo_inicio, periodo_fim, hash_sha256);

GRANT SELECT, INSERT ON public.afd_geracoes TO authenticated;
GRANT ALL ON public.afd_geracoes TO service_role;

ALTER TABLE public.afd_geracoes ENABLE ROW LEVEL SECURITY;

-- audit-migration-style: allow-silent-drop substituição idempotente — policies recriadas logo abaixo no estado final
DROP POLICY IF EXISTS "afd_geracoes_select_membros" ON public.afd_geracoes;
CREATE POLICY "afd_geracoes_select_membros"
  ON public.afd_geracoes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_empresas ue
      WHERE ue.user_id = auth.uid() AND ue.empresa_id = afd_geracoes.empresa_id
    )
  );

-- audit-migration-style: allow-silent-drop substituição idempotente — policy recriada logo abaixo no estado final
DROP POLICY IF EXISTS "afd_geracoes_insert_membros" ON public.afd_geracoes;
CREATE POLICY "afd_geracoes_insert_membros"
  ON public.afd_geracoes FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_empresas ue
      WHERE ue.user_id = auth.uid() AND ue.empresa_id = afd_geracoes.empresa_id
    )
  );
