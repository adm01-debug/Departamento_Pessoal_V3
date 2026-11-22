-- Recibos de férias: a tabela nunca chegou ao canônico.
--
-- `FeriasActions.tsx` grava o registro do recibo depois de baixar o PDF
-- (`supabase.from('recibos_ferias').insert`). As migrations
-- 2025122813134213_ e 20251228131628_ declaram a tabela, mas a versão
-- 2025122813134213 tem 14 dígitos — o ledger do Supabase guarda `version`
-- como texto curto e ela nunca entrou; a de 16 dígitos ficou fora do lote
-- canônico. Resultado em produção: `PGRST205`, o PDF baixa e o recibo não é
-- gravado, sem erro visível para o RH.
--
-- Aditiva e idempotente: cria a tabela só se faltar, no formato que
-- `tableColumns.ts`/`types.ts` já declaram (13 colunas).
--
-- RLS alinhada às demais tabelas de férias: `ferias_rh_manage` usa
-- `pode_gerir_rh(empresa_id)` (migration 20260924140000), não a claim do
-- token em `get_auth_empresa_id()` — o token carrega uma única empresa e o
-- RH que troca de empresa na tela gravaria com a empresa errada. O recibo é
-- registro de RH: leitura e escrita só para quem gere RH na empresa da linha
-- (admin ou papel `rh` com vínculo em `user_empresas`).
--
-- O gestor da empresa (`pode_gerir_pessoas`) lê a solicitação de férias, mas
-- não emite recibo: `FeriasActions` só grava quando o usuário pode gerir RH.
--
-- `created_by`/`updated_by` usam `ON DELETE SET NULL`: excluir a conta de um
-- usuário do RH não pode ficar bloqueada por causa de um recibo antigo.

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
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_recibos_ferias_colaborador
  ON public.recibos_ferias (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_recibos_ferias_empresa_data
  ON public.recibos_ferias (empresa_id, data_inicio DESC);

-- O colaborador precisa ser da empresa da linha e quem grava fica registrado.
CREATE OR REPLACE FUNCTION public.recibos_ferias_validar()
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
    IF TG_OP = 'INSERT' THEN
      NEW.created_by := auth.uid();
    END IF;
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.recibos_ferias_validar() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_recibos_ferias_validar ON public.recibos_ferias;
CREATE TRIGGER trg_recibos_ferias_validar
  BEFORE INSERT OR UPDATE ON public.recibos_ferias
  FOR EACH ROW EXECUTE FUNCTION public.recibos_ferias_validar();

DROP TRIGGER IF EXISTS trg_recibos_ferias_updated_at ON public.recibos_ferias;
CREATE TRIGGER trg_recibos_ferias_updated_at
  BEFORE UPDATE ON public.recibos_ferias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.recibos_ferias ENABLE ROW LEVEL SECURITY;

-- Policies guardadas por pg_policies para a migração ser reaplicável. As policies
-- de empresa que a 20260724002100 e a órfã de 2025 criavam ficam de fora: elas
-- autorizam qualquer autenticado da empresa (mesmo sem papel de RH) a ler e
-- apagar recibos de colegas.
DO $$
BEGIN
  DROP POLICY IF EXISTS recibos_ferias_tenant ON public.recibos_ferias;
  DROP POLICY IF EXISTS "recibos_ferias_select" ON public.recibos_ferias;
  DROP POLICY IF EXISTS "recibos_ferias_insert" ON public.recibos_ferias;
  DROP POLICY IF EXISTS "recibos_ferias_update" ON public.recibos_ferias;
  DROP POLICY IF EXISTS "recibos_ferias_delete" ON public.recibos_ferias;
  DROP POLICY IF EXISTS "recibos_ferias_select_empresa" ON public.recibos_ferias;
  DROP POLICY IF EXISTS "recibos_ferias_insert_empresa" ON public.recibos_ferias;
  DROP POLICY IF EXISTS "recibos_ferias_update_empresa" ON public.recibos_ferias;
  DROP POLICY IF EXISTS "recibos_ferias_delete_empresa" ON public.recibos_ferias;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'recibos_ferias'
       AND policyname = 'recibos_ferias_rh_select'
  ) THEN
    CREATE POLICY recibos_ferias_rh_select ON public.recibos_ferias
      FOR SELECT TO authenticated
      USING (public.pode_gerir_rh(empresa_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'recibos_ferias'
       AND policyname = 'recibos_ferias_rh_insert'
  ) THEN
    CREATE POLICY recibos_ferias_rh_insert ON public.recibos_ferias
      FOR INSERT TO authenticated
      WITH CHECK (public.pode_gerir_rh(empresa_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'recibos_ferias'
       AND policyname = 'recibos_ferias_rh_update'
  ) THEN
    CREATE POLICY recibos_ferias_rh_update ON public.recibos_ferias
      FOR UPDATE TO authenticated
      USING (public.pode_gerir_rh(empresa_id))
      WITH CHECK (public.pode_gerir_rh(empresa_id));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'recibos_ferias'
       AND policyname = 'recibos_ferias_rh_delete'
  ) THEN
    CREATE POLICY recibos_ferias_rh_delete ON public.recibos_ferias
      FOR DELETE TO authenticated
      USING (public.pode_gerir_rh(empresa_id));
  END IF;
END
$$;

REVOKE ALL ON public.recibos_ferias FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recibos_ferias TO authenticated;
GRANT ALL ON public.recibos_ferias TO service_role;

COMMENT ON TABLE public.recibos_ferias IS
  'Registro do recibo de férias baixado pelo RH (FeriasActions.tsx). Metadado de emissão — o PDF é gerado no navegador e não é arquivado aqui.';
