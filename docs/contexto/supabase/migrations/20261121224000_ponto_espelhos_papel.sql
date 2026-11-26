-- Relógio de ponto — etapa 85: controle do espelho de ponto devolvido assinado
-- em papel. Decisão do dono: a assinatura do colaborador continua no papel; o
-- DP só registra, por competência, quem já devolveu o espelho assinado (e,
-- opcionalmente, o caminho da digitalização no bucket documentos-colaboradores).
--
-- Acesso: só admin/RH da própria empresa, em leitura e escrita. O colaborador
-- tem de ser da mesma empresa da linha (gatilho). Aditiva e idempotente.

CREATE TABLE IF NOT EXISTS public.ponto_espelhos_papel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE RESTRICT,
  colaborador_id uuid NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  competencia date NOT NULL,
  devolvido_em timestamptz,
  registrado_por uuid,
  observacao text,
  arquivo_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ponto_espelhos_papel_colaborador_competencia_key UNIQUE (colaborador_id, competencia),
  CONSTRAINT ponto_espelhos_papel_competencia_mes_check
    CHECK (competencia = date_trunc('month', competencia)::date)
);
CREATE INDEX IF NOT EXISTS idx_ponto_espelhos_papel_empresa_competencia
  ON public.ponto_espelhos_papel (empresa_id, competencia);

-- O colaborador precisa ser da empresa da linha; registrado_por = quem gravou.
CREATE OR REPLACE FUNCTION public.ponto_espelhos_papel_validar()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.colaboradores c
     WHERE c.id = NEW.colaborador_id AND c.empresa_id = NEW.empresa_id
  ) THEN
    RAISE EXCEPTION 'colaborador % não pertence à empresa %', NEW.colaborador_id, NEW.empresa_id
      USING ERRCODE = '42501';
  END IF;
  IF auth.uid() IS NOT NULL THEN
    NEW.registrado_por := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ponto_espelhos_papel_validar() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE TRIGGER trg_ponto_espelhos_papel_validar
  BEFORE INSERT OR UPDATE ON public.ponto_espelhos_papel
  FOR EACH ROW EXECUTE FUNCTION public.ponto_espelhos_papel_validar();

CREATE OR REPLACE TRIGGER trg_ponto_espelhos_papel_updated_at
  BEFORE UPDATE ON public.ponto_espelhos_papel
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ponto_espelhos_papel ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY guardado por pg_policies (sem DROP POLICY) para ser reaplicável.
DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
                 AND tablename = 'ponto_espelhos_papel' AND policyname = 'ponto_espelhos_papel_select_rh') THEN
    CREATE POLICY ponto_espelhos_papel_select_rh ON public.ponto_espelhos_papel
      FOR SELECT TO authenticated
      USING (
        public.pertence_a_empresa(empresa_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
                 AND tablename = 'ponto_espelhos_papel' AND policyname = 'ponto_espelhos_papel_insert_rh') THEN
    CREATE POLICY ponto_espelhos_papel_insert_rh ON public.ponto_espelhos_papel
      FOR INSERT TO authenticated
      WITH CHECK (
        public.pertence_a_empresa(empresa_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
                 AND tablename = 'ponto_espelhos_papel' AND policyname = 'ponto_espelhos_papel_update_rh') THEN
    CREATE POLICY ponto_espelhos_papel_update_rh ON public.ponto_espelhos_papel
      FOR UPDATE TO authenticated
      USING (
        public.pertence_a_empresa(empresa_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
      )
      WITH CHECK (
        public.pertence_a_empresa(empresa_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public'
                 AND tablename = 'ponto_espelhos_papel' AND policyname = 'ponto_espelhos_papel_delete_rh') THEN
    CREATE POLICY ponto_espelhos_papel_delete_rh ON public.ponto_espelhos_papel
      FOR DELETE TO authenticated
      USING (
        public.pertence_a_empresa(empresa_id)
        AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'rh'))
      );
  END IF;
END
$migration$;

REVOKE ALL ON public.ponto_espelhos_papel FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_espelhos_papel TO authenticated;
GRANT ALL ON public.ponto_espelhos_papel TO service_role;

COMMENT ON TABLE public.ponto_espelhos_papel IS
  'Etapa 85: espelho de ponto devolvido assinado em papel, por colaborador e competência (1º dia do mês).';
