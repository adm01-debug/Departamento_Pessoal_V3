
CREATE TABLE IF NOT EXISTS public.aej_geracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  total_colaboradores int NOT NULL DEFAULT 0,
  total_marcacoes int NOT NULL DEFAULT 0,
  colaboradores_sem_pis int NOT NULL DEFAULT 0,
  tamanho_bytes int NOT NULL DEFAULT 0,
  hash_sha256 text NOT NULL,
  status text NOT NULL DEFAULT 'gerado' CHECK (status IN ('gerando','gerado','erro')),
  erro text,
  gerado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aej_geracoes_empresa_periodo
  ON public.aej_geracoes (empresa_id, periodo_inicio DESC, periodo_fim DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_aej_geracoes_hash
  ON public.aej_geracoes (empresa_id, periodo_inicio, periodo_fim, hash_sha256);

GRANT SELECT, INSERT ON public.aej_geracoes TO authenticated;
GRANT ALL ON public.aej_geracoes TO service_role;

ALTER TABLE public.aej_geracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aej_geracoes_select_membros" ON public.aej_geracoes;
CREATE POLICY "aej_geracoes_select_membros"
  ON public.aej_geracoes FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_empresas ue
      WHERE ue.user_id = auth.uid() AND ue.empresa_id = aej_geracoes.empresa_id
    )
  );

DROP POLICY IF EXISTS "aej_geracoes_insert_membros" ON public.aej_geracoes;
CREATE POLICY "aej_geracoes_insert_membros"
  ON public.aej_geracoes FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_empresas ue
      WHERE ue.user_id = auth.uid() AND ue.empresa_id = aej_geracoes.empresa_id
    )
  );
