-- 1) FK estruturada colaboradores -> cargos ---------------------------------
ALTER TABLE public.colaboradores
  ADD COLUMN IF NOT EXISTS cargo_id uuid REFERENCES public.cargos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_colaboradores_cargo_id
  ON public.colaboradores (cargo_id) WHERE cargo_id IS NOT NULL;

-- Backfill: cria cargos ausentes a partir do texto livre, por empresa.
INSERT INTO public.cargos (empresa_id, nome, ativo)
SELECT DISTINCT c.empresa_id, btrim(c.cargo), true
  FROM public.colaboradores c
 WHERE c.cargo IS NOT NULL
   AND btrim(c.cargo) <> ''
   AND c.empresa_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.cargos g
      WHERE g.empresa_id = c.empresa_id
        AND lower(btrim(g.nome)) = lower(btrim(c.cargo))
   );

UPDATE public.colaboradores c
   SET cargo_id = g.id
  FROM public.cargos g
 WHERE c.cargo_id IS NULL
   AND c.empresa_id = g.empresa_id
   AND c.cargo IS NOT NULL
   AND lower(btrim(c.cargo)) = lower(btrim(g.nome));

-- Mantém o texto denormalizado em sincronia com a FK (compat. retroativa).
CREATE OR REPLACE FUNCTION public.fn_colaborador_sync_cargo_texto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome text;
BEGIN
  IF NEW.cargo_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.cargo_id IS DISTINCT FROM OLD.cargo_id) THEN
    SELECT nome INTO v_nome FROM public.cargos WHERE id = NEW.cargo_id;
    IF v_nome IS NOT NULL THEN
      NEW.cargo := v_nome;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_colaborador_sync_cargo_texto ON public.colaboradores;
CREATE TRIGGER trg_colaborador_sync_cargo_texto
BEFORE INSERT OR UPDATE OF cargo_id ON public.colaboradores
FOR EACH ROW EXECUTE FUNCTION public.fn_colaborador_sync_cargo_texto();

-- 2) Enquadramento usando a FK, com fallback por nome -----------------------
CREATE OR REPLACE FUNCTION public.pcs_enquadramento(p_plano_id uuid)
RETURNS TABLE(colaborador_id uuid, colaborador_nome text, cargo_nome text, departamento text,
              salario_atual numeric, grade_nome text, grade_ordem integer, salario_min numeric,
              salario_medio numeric, salario_max numeric, comparatio numeric, situacao text,
              ajuste_necessario numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH plano AS (
    SELECT p.* FROM public.pcs_planos p
     WHERE p.id = p_plano_id
       AND public.user_belongs_to_empresa(auth.uid(), p.empresa_id)
  ),
  cargo_grade AS (
    SELECT a.cargo_id, c.nome AS cargo_nome, g.*
      FROM public.pcs_avaliacoes_cargo a
      JOIN public.cargos c ON c.id = a.cargo_id
      JOIN public.pcs_grades g
        ON g.plano_id = a.plano_id
       AND a.pontos_total >= g.pontos_min
       AND a.pontos_total <= g.pontos_max
     WHERE a.plano_id = p_plano_id
  )
  SELECT
    col.id,
    col.nome_completo,
    cg.cargo_nome,
    col.departamento,
    col.salario_base,
    cg.nome,
    cg.ordem,
    cg.salario_min,
    cg.salario_medio,
    cg.salario_max,
    ROUND(col.salario_base / NULLIF(cg.salario_medio, 0), 4),
    CASE
      WHEN col.salario_base < cg.salario_min THEN 'abaixo_faixa'
      WHEN col.salario_base > cg.salario_max THEN 'acima_faixa'
      ELSE 'dentro_faixa'
    END,
    CASE
      WHEN col.salario_base < cg.salario_min THEN ROUND(cg.salario_min - col.salario_base, 2)
      ELSE 0
    END
  FROM plano pl
  JOIN public.colaboradores col
    ON col.empresa_id = pl.empresa_id
   AND col.status = 'ativo'
   AND col.salario_base IS NOT NULL
  JOIN cargo_grade cg
    ON (col.cargo_id IS NOT NULL AND col.cargo_id = cg.cargo_id)
    OR (col.cargo_id IS NULL AND lower(btrim(col.cargo)) = lower(btrim(cg.cargo_nome)))
  ORDER BY cg.ordem DESC, col.nome_completo;
$function$;

-- 3) Comparação da matriz com o P50 de mercado ------------------------------
CREATE OR REPLACE FUNCTION public.pcs_grades_mercado(p_plano_id uuid)
RETURNS TABLE(grade_id uuid, grade_nome text, ordem integer, pontos_min integer, pontos_max integer,
              salario_min numeric, salario_medio numeric, salario_max numeric,
              mercado_p50 numeric, cargos_com_mercado integer, posicionamento numeric, aderencia text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH plano AS (
    SELECT p.* FROM public.pcs_planos p
     WHERE p.id = p_plano_id
       AND public.user_belongs_to_empresa(auth.uid(), p.empresa_id)
  ),
  -- P50 mais recente por cargo de referência dentro da empresa do plano.
  mercado AS (
    SELECT DISTINCT ON (lower(btrim(ps.cargo_referencia)))
           lower(btrim(ps.cargo_referencia)) AS chave, ps.p50
      FROM public.pcs_pesquisa_salarial ps
      JOIN plano pl ON pl.empresa_id = ps.empresa_id
     WHERE ps.p50 IS NOT NULL
     ORDER BY lower(btrim(ps.cargo_referencia)), ps.data_referencia DESC
  ),
  por_grade AS (
    SELECT g.id, g.nome, g.ordem, g.pontos_min, g.pontos_max,
           g.salario_min, g.salario_medio, g.salario_max,
           AVG(m.p50)::numeric AS mercado_p50,
           COUNT(m.p50)::int   AS cargos_com_mercado
      FROM plano pl
      JOIN public.pcs_grades g ON g.plano_id = pl.id
      LEFT JOIN public.pcs_avaliacoes_cargo a
        ON a.plano_id = g.plano_id
       AND a.pontos_total BETWEEN g.pontos_min AND g.pontos_max
      LEFT JOIN public.cargos c ON c.id = a.cargo_id
      LEFT JOIN mercado m ON m.chave = lower(btrim(c.nome))
     GROUP BY g.id, g.nome, g.ordem, g.pontos_min, g.pontos_max,
              g.salario_min, g.salario_medio, g.salario_max
  )
  SELECT id, nome, ordem, pontos_min, pontos_max, salario_min, salario_medio, salario_max,
         ROUND(mercado_p50, 2),
         cargos_com_mercado,
         ROUND(salario_medio / NULLIF(mercado_p50, 0), 4),
         CASE
           WHEN mercado_p50 IS NULL THEN 'sem_referencia'
           WHEN salario_medio < mercado_p50 * 0.95 THEN 'abaixo_mercado'
           WHEN salario_medio > mercado_p50 * 1.05 THEN 'acima_mercado'
           ELSE 'alinhado'
         END
    FROM por_grade
   ORDER BY ordem;
$function$;

REVOKE ALL ON FUNCTION public.pcs_grades_mercado(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pcs_grades_mercado(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.pcs_enquadramento(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pcs_enquadramento(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.fn_colaborador_sync_cargo_texto() FROM PUBLIC, anon;