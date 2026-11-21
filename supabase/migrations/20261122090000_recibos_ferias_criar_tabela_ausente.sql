-- Recibos de férias: a tabela nunca chegou ao canônico.
--
-- `FeriasActions.tsx` grava o recibo depois de baixar o PDF
-- (`supabase.from('recibos_ferias').insert`). As migrations
-- 2025122813134213_ e 20251228131628_ declaram a tabela, mas a versão
-- 2025122813134213 tem 14 dígitos — o ledger do Supabase guarda `version`
-- como texto curto e ela nunca entrou; a de 16 dígitos ficou fora do lote
-- canônico. Resultado em produção: `PGRST205`, o PDF baixa e o recibo não é
-- gravado, sem erro visível para o RH.
--
-- Aditiva e idempotente: cria a tabela só se faltar, no formato que
-- `tableColumns.ts`/`types.ts` já declaram (13 colunas). RLS por empresa,
-- igual às demais tabelas de folha, e sem acesso anônimo.

CREATE TABLE IF NOT EXISTS public.recibos_ferias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  colaborador_id uuid REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  descricao text,
  valor numeric(15,2) DEFAULT 0,
  data_inicio date,
  data_fim date,
  ativo boolean DEFAULT true,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_recibos_ferias_colaborador
  ON public.recibos_ferias (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_recibos_ferias_empresa_data
  ON public.recibos_ferias (empresa_id, data_inicio DESC);

ALTER TABLE public.recibos_ferias ENABLE ROW LEVEL SECURITY;

-- Policies guardadas por pg_policies para a migração ser reaplicável.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'recibos_ferias'
       AND policyname = 'recibos_ferias_select_empresa'
  ) THEN
    CREATE POLICY recibos_ferias_select_empresa ON public.recibos_ferias
      FOR SELECT TO authenticated
      USING (empresa_id = public.get_auth_empresa_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'recibos_ferias'
       AND policyname = 'recibos_ferias_insert_empresa'
  ) THEN
    CREATE POLICY recibos_ferias_insert_empresa ON public.recibos_ferias
      FOR INSERT TO authenticated
      WITH CHECK (empresa_id = public.get_auth_empresa_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'recibos_ferias'
       AND policyname = 'recibos_ferias_update_empresa'
  ) THEN
    CREATE POLICY recibos_ferias_update_empresa ON public.recibos_ferias
      FOR UPDATE TO authenticated
      USING (empresa_id = public.get_auth_empresa_id())
      WITH CHECK (empresa_id = public.get_auth_empresa_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'recibos_ferias'
       AND policyname = 'recibos_ferias_delete_empresa'
  ) THEN
    CREATE POLICY recibos_ferias_delete_empresa ON public.recibos_ferias
      FOR DELETE TO authenticated
      USING (empresa_id = public.get_auth_empresa_id());
  END IF;
END
$$;

DROP TRIGGER IF EXISTS trg_recibos_ferias_updated_at ON public.recibos_ferias;
CREATE TRIGGER trg_recibos_ferias_updated_at
  BEFORE UPDATE ON public.recibos_ferias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

REVOKE ALL ON public.recibos_ferias FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recibos_ferias TO authenticated;
GRANT ALL ON public.recibos_ferias TO service_role;

COMMENT ON TABLE public.recibos_ferias IS
  'Recibo de férias gerado em PDF pelo RH. Gravado por FeriasActions.tsx depois do download.';