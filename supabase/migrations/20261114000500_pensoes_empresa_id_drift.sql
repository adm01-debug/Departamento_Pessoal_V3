-- Remediação de drift: public.pensoes.empresa_id
--
-- O ledger registra 20260728172359 como aplicada, mas o schema vivo do canônico
-- (frjbfeamybqsejlvmqbl, consultado em 12/11/2026) não tem a coluna empresa_id,
-- nem a função/trigger fn_pensoes_set_empresa, nem os índices por empresa.
-- src/pages/PensoesPage.tsx filtra e exclui por empresa_id → listar/excluir pensões
-- falha em produção.
--
-- Reaplica as partes 1–4 daquela migration (coluna, backfill, trigger, índices),
-- com FK para empresas(id). A policy tenant_pensoes viva (USING/WITH CHECK por
-- colaborador_id) é mantida: já isola por empresa e não depende desta coluna.
-- Idempotente: pode rodar 2x sem erro e sem efeito extra.

-- 0. Preflight fail-closed
DO $$
DECLARE
  v_tipo text;
BEGIN
  IF to_regclass('public.pensoes') IS NULL
     OR to_regclass('public.colaboradores') IS NULL
     OR to_regclass('public.empresas') IS NULL THEN
    RAISE EXCEPTION 'preflight: pensoes, colaboradores ou empresas ausente';
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod) INTO v_tipo
  FROM pg_attribute a
  WHERE a.attrelid = 'public.colaboradores'::regclass
    AND a.attname = 'empresa_id' AND NOT a.attisdropped;
  IF v_tipo IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'preflight: colaboradores.empresa_id ausente ou não-uuid (%)', v_tipo;
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod) INTO v_tipo
  FROM pg_attribute a
  WHERE a.attrelid = 'public.pensoes'::regclass
    AND a.attname = 'empresa_id' AND NOT a.attisdropped;
  IF v_tipo IS NOT NULL AND v_tipo <> 'uuid' THEN
    RAISE EXCEPTION 'preflight: pensoes.empresa_id já existe com tipo inesperado (%)', v_tipo;
  END IF;
END
$$;

-- 1. Coluna denormalizada de tenant + FK
ALTER TABLE public.pensoes ADD COLUMN IF NOT EXISTS empresa_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.pensoes'::regclass
      AND contype = 'f'
      AND confrelid = 'public.empresas'::regclass
      AND conkey = ARRAY[(SELECT attnum FROM pg_attribute
                          WHERE attrelid = 'public.pensoes'::regclass
                            AND attname = 'empresa_id')]::int2[]
  ) THEN
    ALTER TABLE public.pensoes
      ADD CONSTRAINT pensoes_empresa_id_fkey
      FOREIGN KEY (empresa_id) REFERENCES public.empresas(id);
  END IF;
END
$$;

-- 2. Backfill a partir do colaborador (fonte da verdade)
UPDATE public.pensoes p
SET empresa_id = c.empresa_id
FROM public.colaboradores c
WHERE p.colaborador_id = c.id
  AND p.empresa_id IS DISTINCT FROM c.empresa_id;

-- 3. Trigger para manter sincronizado
CREATE OR REPLACE FUNCTION public.fn_pensoes_set_empresa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
BEGIN
  IF NEW.colaborador_id IS NOT NULL THEN
    SELECT c.empresa_id INTO NEW.empresa_id
    FROM public.colaboradores c
    WHERE c.id = NEW.colaborador_id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_pensoes_set_empresa() FROM PUBLIC, anon, authenticated;

-- Também dispara em UPDATE OF empresa_id: o cliente não consegue gravar um
-- empresa_id divergente do colaborador.
DROP TRIGGER IF EXISTS trg_pensoes_set_empresa ON public.pensoes;
CREATE TRIGGER trg_pensoes_set_empresa
BEFORE INSERT OR UPDATE OF colaborador_id, empresa_id ON public.pensoes
FOR EACH ROW EXECUTE FUNCTION public.fn_pensoes_set_empresa();

-- 4. Índices para filtro multi-tenant (idx_pensoes_colaborador_id já existe no vivo)
CREATE INDEX IF NOT EXISTS idx_pensoes_empresa_id ON public.pensoes (empresa_id);
CREATE INDEX IF NOT EXISTS idx_pensoes_colaborador_id ON public.pensoes (colaborador_id);
CREATE INDEX IF NOT EXISTS idx_pensoes_empresa_ativo ON public.pensoes (empresa_id) WHERE ativo IS TRUE;

-- 5. Pós-condição fail-closed: nenhuma pensão divergente do colaborador
DO $$
DECLARE
  v_div bigint;
BEGIN
  SELECT count(*) INTO v_div
  FROM public.pensoes p
  JOIN public.colaboradores c ON c.id = p.colaborador_id
  WHERE p.empresa_id IS DISTINCT FROM c.empresa_id;
  IF v_div > 0 THEN
    RAISE EXCEPTION 'pós-condição: % pensões com empresa_id divergente do colaborador', v_div;
  END IF;
END
$$;
